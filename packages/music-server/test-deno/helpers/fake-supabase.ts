/**
 * 离线 fake infrastructure:
 *  - PostgREST (kv_store) 以内存 Map 实现
 *  - Auth / Storage 返回可预测的 JSON
 *  - OpenAI / 本地 STT 可切换成功、失败、空响应、畸形 JSON
 *
 * 用法：在测试模块顶层 `const fake = new FakeSupabase(); fake.install();`
 * 并通过 Deno.env.set 配置 SUPABASE_URL 指向任意主机（拦截器只关心 pathname）。
 */

export type OpenAIMode = 'ok' | 'error' | 'empty' | 'badjson';

export interface FakeCall {
  method: string;
  url: string;
  body: any;
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

function empty(status: number): Response {
  return new Response(null, { status });
}

function headerValue(headers: any, name: string): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    for (const [k, v] of headers) {
      if (String(k).toLowerCase() === lower) return String(v);
    }
    return null;
  }
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === lower) return String(headers[k]);
  }
  return null;
}

async function parseBody(body: any): Promise<any> {
  if (body == null) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }
  return body;
}

/** 解析 PostgREST `in.(a,b,"c,d")` 过滤值 */
function parseInFilter(raw: string): string[] {
  const inner = raw.slice(4, -1); // strip "in.(" and ")"
  if (!inner) return [];
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  for (const ch of inner) {
    if (ch === '"') {
      quoted = !quoted;
      current += ch;
      continue;
    }
    if (ch === ',' && !quoted) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts.map((p) => {
    let v = p.trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  });
}

export class FakeSupabase {
  /** key -> value（原样保存，与 PostgREST jsonb 行为一致） */
  kv = new Map<string, any>();
  /** key -> 依次返回的值队列（用于模拟读取过程中的并发修改） */
  kvSequence = new Map<string, any[]>();
  calls: FakeCall[] = [];
  buckets = new Set<string>();

  // 故障开关
  kvDown = false;
  countError = false;
  keysError = false;
  authDown = false;
  storageDown = false;
  adminSignupError: string | null = null;
  uploadError: string | null = null;
  signError: string | null = null;

  // OpenAI 行为
  openaiMode: OpenAIMode = 'ok';
  openaiContent = 'mock lyric line one\nmock lyric line two';
  openaiText = 'mock transcript';
  openaiStatus = 500;

  // 本地 STT 服务
  localSttOk = true;
  localSttBody: any = { text: 'local transcript', segments: [] };
  localSttThrow = false;

  private originalFetch: typeof fetch | null = null;

  install(): void {
    if (!this.originalFetch) this.originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: any, init?: any) => this.handle(input, init)) as typeof fetch;
  }

  restore(): void {
    if (this.originalFetch) globalThis.fetch = this.originalFetch;
  }

  reset(): void {
    this.kv.clear();
    this.kvSequence.clear();
    this.calls = [];
    this.buckets.clear();
    this.kvDown = false;
    this.countError = false;
    this.keysError = false;
    this.authDown = false;
    this.storageDown = false;
    this.adminSignupError = null;
    this.uploadError = null;
    this.signError = null;
    this.openaiMode = 'ok';
    this.openaiContent = 'mock lyric line one\nmock lyric line two';
    this.openaiText = 'mock transcript';
    this.openaiStatus = 500;
    this.localSttOk = true;
    this.localSttBody = { text: 'local transcript', segments: [] };
    this.localSttThrow = false;
  }

  // ---- KV 便捷方法 ----
  seed(key: string, value: any): void {
    this.kv.set(key, value);
  }

  seedJson(key: string, value: any): void {
    this.kv.set(key, JSON.stringify(value));
  }

  read(key: string): any {
    return this.kv.get(key);
  }

  readJson<T = any>(key: string): T | null {
    const raw = this.kv.get(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  callsTo(fragment: string): FakeCall[] {
    return this.calls.filter((c) => c.url.includes(fragment));
  }

  private async handle(input: any, init?: any): Promise<Response> {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input?.url ?? String(input);
    const url = new URL(urlStr);
    const method = String(
      init?.method ?? (typeof input === 'object' && input?.method) ?? 'GET',
    ).toUpperCase();
    const rawBody = init?.body ?? (typeof input === 'object' ? input?.body : undefined);
    const body = await parseBody(rawBody);
    this.calls.push({ method, url: urlStr, body });

    if (url.hostname === 'api.openai.com') return this.handleOpenAI(url);
    if (url.hostname === 'local.stt') return this.handleLocalStt();
    if (url.pathname.startsWith('/rest/v1/')) return this.handleRest(url, method, body);
    if (url.pathname.startsWith('/auth/v1/')) return this.handleAuth(url, method, init, body);
    if (url.pathname.startsWith('/storage/v1/')) return this.handleStorage(url, method, body);
    return json({ message: `fake-supabase: unhandled ${method} ${url.pathname}` }, 404);
  }

  private handleOpenAI(url: URL): Response {
    if (this.openaiMode === 'error') {
      return json({ error: { message: 'openai simulated failure' } }, this.openaiStatus);
    }
    if (url.pathname.includes('/audio/transcriptions')) {
      if (this.openaiMode === 'empty') return json({ text: '' }, 200);
      return json({ text: this.openaiText, language: 'zh', duration: 1.5 }, 200);
    }
    if (this.openaiMode === 'empty') return json({ choices: [] }, 200);
    if (this.openaiMode === 'badjson') {
      return json({ choices: [{ message: { content: 'this is not json' } }] }, 200);
    }
    return json({ choices: [{ message: { content: this.openaiContent } }] }, 200);
  }

  private handleLocalStt(): Response {
    if (this.localSttThrow) throw new Error('local stt exploded');
    if (!this.localSttOk) return json({ message: 'local stt down' }, 500);
    return json(this.localSttBody, 200);
  }

  private handleRest(url: URL, method: string, body: any): Response {
    if (method === 'HEAD') {
      if (this.countError) return json({ message: 'count query failed' }, 500);
      const n = this.kv.size;
      return new Response(null, {
        status: 200,
        headers: { 'content-range': n > 0 ? `0-${n - 1}/${n}` : '*/0' },
      });
    }
    if (this.kvDown) return json({ message: 'kv unavailable', code: 'XX000' }, 500);

    const select = url.searchParams.get('select') || '*';
    const keyFilter = url.searchParams.get('key');

    if (method === 'POST') {
      const rows = Array.isArray(body) ? body : [body];
      for (const row of rows) {
        if (row && typeof row.key === 'string') this.kv.set(row.key, row.value);
      }
      return empty(201);
    }

    if (method === 'DELETE') {
      this.applyFilter(keyFilter).forEach((k) => this.kv.delete(k));
      return empty(204);
    }

    if (this.keysError && select === 'key') {
      return json({ message: 'keys query failed' }, 500);
    }

    const keys = this.applyFilter(keyFilter);
    const fields = select.split(',').map((s) => s.trim());
    const rows = keys.map((key) => {
      if (select === '*') return { key, value: this.readValue(key) };
      const row: Record<string, any> = {};
      for (const f of fields) row[f] = f === 'key' ? key : this.readValue(key);
      return row;
    });
    return json(rows);
  }

  /** 读取值：优先消费 kvSequence 队列，模拟两次读取之间数据被修改 */
  private readValue(key: string): any {
    const seq = this.kvSequence.get(key);
    if (seq && seq.length > 0) return seq.shift();
    return this.kv.get(key);
  }

  private applyFilter(keyFilter: string | null): string[] {
    let keys = [...this.kv.keys()];
    if (!keyFilter) return keys;
    if (keyFilter.startsWith('eq.')) {
      const k = keyFilter.slice(3);
      keys = keys.filter((key) => key === k);
    } else if (keyFilter.startsWith('in.')) {
      const wanted = parseInFilter(keyFilter);
      keys = keys.filter((key) => wanted.includes(key));
    } else if (keyFilter.startsWith('like.')) {
      const pattern = keyFilter.slice(5);
      const prefix = pattern.endsWith('%') ? pattern.slice(0, -1) : pattern;
      keys = keys.filter((key) => key.startsWith(prefix));
    }
    return keys;
  }

  private handleAuth(url: URL, method: string, init: any, body: any): Response {
    if (this.authDown) return json({ msg: 'auth service down' }, 500);

    if (url.pathname.endsWith('/admin/users') && method === 'POST') {
      if (this.adminSignupError) {
        return json({ code: 'user_already_exists', msg: this.adminSignupError }, 422);
      }
      const email = body?.email || 'new-user@example.com';
      const id = `user-${String(email).split('@')[0]}`;
      return json(
        { user: { id, email, user_metadata: body?.user_metadata ?? {}, aud: 'authenticated' } },
        200,
      );
    }

    if (url.pathname.endsWith('/user') && method === 'GET') {
      const auth = headerValue(init?.headers, 'authorization') || '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      if (!token || token === 'invalid-token') return json({ msg: 'invalid JWT' }, 401);
      const id = token.startsWith('token-') ? token.slice(6) : token;
      return json(
        { id, email: `${id}@example.com`, aud: 'authenticated', role: 'authenticated' },
        200,
      );
    }

    return json({});
  }

  private handleStorage(url: URL, method: string, body: any): Response {
    if (this.storageDown) return json({ message: 'storage unavailable' }, 500);

    if (url.pathname === '/storage/v1/bucket') {
      if (method === 'GET') return json([...this.buckets].map((name) => ({ name })));
      if (method === 'POST') {
        if (body?.name) this.buckets.add(body.name);
        return json({ name: body?.name ?? 'bucket' }, 200);
      }
    }

    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      if (this.signError) return json({ error: 'sign failed', message: this.signError }, 400);
      const rest = url.pathname.slice('/storage/v1/object/sign/'.length);
      return json({ signedURL: `/object/sign/${rest}?token=fake-token` }, 200);
    }

    if (
      url.pathname.startsWith('/storage/v1/object/') &&
      (method === 'POST' || method === 'PUT')
    ) {
      if (this.uploadError) return json({ error: 'upload failed', message: this.uploadError }, 400);
      const key = url.pathname.slice('/storage/v1/object/'.length);
      return json({ Key: key }, 200);
    }

    if (url.pathname.startsWith('/storage/v1/object/') && method === 'DELETE') {
      return json([]);
    }

    return json({});
  }
}
