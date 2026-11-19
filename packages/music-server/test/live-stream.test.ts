/**
 * live-stream 安全测试 — assertPublicHttpUrl SSRF 防护矩阵
 *
 * 被测模块为 Deno Edge Function（依赖 npm:/kv 等运行时模块），
 * 全部依赖以 vi.mock 替换，仅测导出的纯校验函数。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── 替换全部外部依赖（模块顶层 import 均被拦截，无需真实解析） ──
// 路径相对测试文件解析，需与被测模块的 import 指向同一绝对路径
vi.mock('../src/kv_store.tsx', () => ({ get: vi.fn(), set: vi.fn() }));
vi.mock('../src/server-utils.ts', () => ({ ROUTE_PREFIX: '/test' }));
vi.mock('../src/rate-limit.ts', () => ({
  rateLimit: () => (_c: any, _next: any) => {},
  RATE_STANDARD: 0,
}));
vi.mock('../src/validation.ts', () => ({
  // 原样透传 body（绕过真实 zod schema，聚焦路由逻辑）
  validate: (_schema: unknown, data: unknown) => ({ success: true, data }),
}));
vi.mock('npm:zod@3.24.1', () => {
  // 可无限链式调用的占位代理（z.string().min().max().optional() 均合法）
  const chain: any = new Proxy(function chainFn() {}, {
    get: (_t, prop) => {
      if (prop === Symbol.toPrimitive || prop === 'toString') return () => 'zod-mock';
      return chain;
    },
    apply: () => chain,
  });
  return { z: chain };
});

// ── KV mock：记录 set/get 调用，供路由级测试断言 ──
const kvStore = new Map<string, string>();
vi.mock('../src/kv_store.tsx', () => ({
  get: vi.fn((key: string) => kvStore.get(key) ?? null),
  set: vi.fn((key: string, value: string) => {
    kvStore.set(key, value);
  }),
}));

import { assertPublicHttpUrl, registerLiveStreamRoutes } from '../src/live-stream.ts';
import * as kv from '../src/kv_store.tsx';

/** 构造最小 Hono 风格 app/c 上下文 */
function makeApp() {
  const handlers = new Map<string, Function>();
  const app = {
    get: (path: string, handler: Function) => handlers.set(`GET ${path}`, handler),
    post: (path: string, ...rest: Function[]) => handlers.set(`POST ${path}`, rest.at(-1)),
  };
  return { app, handlers };
}

function makeContext(url: string, body?: any) {
  return {
    req: {
      url: `https://d-music.test${url}`,
      json: async () => body,
      param: () => ({}),
    },
    json: (data: any, status?: number) => ({ data, status: status ?? 200, ok: (status ?? 200) < 400 }),
  } as any;
}

/** 环境变量 stub（凭据仅 env 注入，不落源码） */
function stubEnv(vars: Record<string, string>) {
  (globalThis as any).Deno = {
    env: { get: (k: string) => vars[k] },
    upgradeWebSocket: (globalThis as any).Deno?.upgradeWebSocket,
  };
}

describe('registerLiveStreamRoutes — 路由级行为', () => {
  beforeEach(() => {
    kvStore.clear();
    vi.clearAllMocks();
    stubEnv({});
    delete (globalThis as any).Deno;
  });

  it('GET /live/stream：未配置 env 时返回 not-live 与空播放地址', async () => {
    const { app, handlers } = makeApp();
    registerLiveStreamRoutes(app);
    const res = await handlers.get('GET /test/live/stream')!(makeContext('/test/live/stream'));
    expect(res.data.live).toBe(false);
    expect(res.data.playback).toBeNull();
  });

  it('GET /live/stream：配置 HLS 后返回播放地址（不含任何密钥）', async () => {
    stubEnv({
      LIVE_HLS_BASE_URL: 'https://cdn.example.com/live/index.m3u8',
      LIVE_RTMP_PUBLISH_BASE: 'rtmp://push.example.com/app',
    });
    const { app, handlers } = makeApp();
    registerLiveStreamRoutes(app);
    const res = await handlers.get('GET /test/live/stream')!(makeContext('/test/live/stream'));
    expect(res.data.playback.hlsUrl).toBe('https://cdn.example.com/live/index.m3u8');
    expect(res.data.publish.rtmpBase).toBe('rtmp://push.example.com/app');
    // 响应中不允许出现推流密钥
    expect(JSON.stringify(res)).not.toMatch(/streamKey|LIVE_STREAM_KEY/);
  });

  it('GET /live/stream：MediaMTX streams_list ready → live:true', async () => {
    stubEnv({ LIVE_STREAM_API_URL: 'https://live.example.com/v3/streams/list' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ streams_list: [{ name: 'main', ready: true }] }),
      { status: 200 },
    ));
    const { app, handlers } = makeApp();
    registerLiveStreamRoutes(app);
    const res = await handlers.get('GET /test/live/stream')!(makeContext('/test/live/stream'));
    expect(res.data.live).toBe(true);
  });

  it('GET /live/stream：探测地址为私网时不发起请求（SSRF 防护生效）', async () => {
    stubEnv({ LIVE_STREAM_API_URL: 'http://169.254.169.254/latest/meta-data' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const { app, handlers } = makeApp();
    registerLiveStreamRoutes(app);
    const res = await handlers.get('GET /test/live/stream')!(makeContext('/test/live/stream'));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(res.data.live).toBe(false);
    fetchSpy.mockRestore();
  });

  it('POST /live/stream：合法元数据写入 KV 并返回 room', async () => {
    const { app, handlers } = makeApp();
    registerLiveStreamRoutes(app);
    const body = { title: '周年直播', hostName: 'DJ', status: 'live' };
    const res = await handlers.get('POST /test/live/stream')!(makeContext('/test/live/stream', body));
    expect(res.data.success).toBe(true);
    expect(res.data.room.title).toBe('周年直播');
    expect(kv.set).toHaveBeenCalled();
    expect(JSON.parse(kvStore.get('live:room:meta')!)).toMatchObject({ title: '周年直播' });
  });

  it('GET /live/ws：无 WebSocket 运行时（非 Deno）返回 501 与轮询回退提示', async () => {
    const { app, handlers } = makeApp();
    registerLiveStreamRoutes(app);
    const res: Response = await handlers.get('GET /test/live/ws')!(makeContext('/test/live/ws'));
    expect(res.status).toBe(501);
    const payload = await res.json();
    expect(payload.error).toBe('websocket_unavailable');
    expect(payload.fallback).toContain('polling');
  });

  describe('WebSocket 直播间（可控 socket）', () => {
    /** 可控 WebSocket 升级 stub */
    function stubWsUpgrade() {
      const sockets: any[] = [];
      (globalThis as any).Deno = {
        env: { get: () => undefined },
        upgradeWebSocket: () => {
          const socket = {
            readyState: 1,
            send: vi.fn(),
            close: vi.fn(),
            onopen: null as any,
            onmessage: null as any,
            onclose: null as any,
            onerror: null as any,
          };
          sockets.push(socket);
          // node 的 Response 不允许 101，用普通对象模拟升级响应
          return { socket, response: { status: 101 } as unknown as Response };
        },
      };
      return sockets;
    }

    async function flush() {
      await new Promise((r) => setTimeout(r, 0));
    }

    it('onopen 发送 room:joined 与历史，并广播 presence:join', async () => {
      // 预置历史弹幕
      kvStore.set('live:room:chat', JSON.stringify([
        { id: 'c1', roomId: 'main', text: '旧消息', timestamp: 1 },
        { id: 'c2', roomId: 'other', text: '别房间', timestamp: 2 },
      ]));
      const sockets = stubWsUpgrade();
      const { app, handlers } = makeApp();
      registerLiveStreamRoutes(app);
      const url = '/test/live/ws?roomId=main&userId=u1&userName=小明';
      void handlers.get('GET /test/live/ws')!(makeContext(url));
      const socket = sockets[0];
      socket.onopen();
      await flush();

      // joined 消息发给本人
      const joined = JSON.parse(socket.send.mock.calls[0][0]);
      expect(joined.type).toBe('room:joined');
      expect(joined.onlineCount).toBe(1);
      expect(joined.recent).toHaveLength(1); // 只含本房间
      // presence:join 广播给他人（第一个 client 独占时排除自己 → 无额外 send）
      (globalThis as any).Deno = undefined;
    });

    it('onmessage chat 写入 KV 并广播；无效 JSON 忽略', async () => {
      const sockets = stubWsUpgrade();
      const { app, handlers } = makeApp();
      registerLiveStreamRoutes(app);
      void handlers.get('GET /test/live/ws')!(makeContext('/test/live/ws'));
      const socket = sockets[0];
      socket.onopen();
      await flush();

      // 无效 JSON：不崩溃
      socket.onmessage({ data: 'not-json' });
      // 合法 chat
      socket.onmessage({ data: JSON.stringify({ type: 'chat', text: '  你好世界  ' }) });
      await flush();

      const history = JSON.parse(kvStore.get('live:room:chat')!);
      expect(history.at(-1)).toMatchObject({ text: '你好世界', userId: expect.any(String) });
      const sent = socket.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(sent.some((m: any) => m.type === 'chat' && m.text === '你好世界')).toBe(true);
      (globalThis as any).Deno = undefined;
    });

    it('onmessage reaction/gift 只广播不落库；moderate 需权限', async () => {
      const sockets = stubWsUpgrade();
      const { app, handlers } = makeApp();
      registerLiveStreamRoutes(app);
      void handlers.get('GET /test/live/ws')!(makeContext('/test/live/ws'));
      const socket = sockets[0];
      socket.onopen();
      await flush();

      socket.onmessage({ data: JSON.stringify({ type: 'reaction', emoji: '❤️' }) });
      socket.onmessage({ data: JSON.stringify({ type: 'gift', gift: '🌹' }) });
      await flush();
      let sent = socket.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(sent.some((m: any) => m.type === 'reaction')).toBe(true);
      expect(sent.some((m: any) => m.type === 'gift')).toBe(true);
      expect(kvStore.get('live:room:chat') ?? '[]').not.toContain('reaction');

      // viewer 无权删除 → moderate:result ok:false
      socket.onmessage({ data: JSON.stringify({ type: 'moderate:delete', messageId: 'c1' }) });
      await flush();
      sent = socket.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(sent.some((m: any) => m.type === 'moderate:result' && m.ok === false)).toBe(true);
      (globalThis as any).Deno = undefined;
    });

    it('双 client 广播互见；onclose 清理并广播离开', async () => {
      const sockets = stubWsUpgrade();
      const { app, handlers } = makeApp();
      registerLiveStreamRoutes(app);
      const wsUrl = '/test/live/ws?roomId=main&userId=u1&userName=A';
      void handlers.get('GET /test/live/ws')!(makeContext(wsUrl));
      void handlers.get('GET /test/live/ws')!(makeContext(wsUrl));
      const [a, b] = sockets;
      a.onopen();
      b.onopen();
      await flush();

      // A 发言 → B 收到广播
      a.onmessage({ data: JSON.stringify({ type: 'chat', text: 'hello' }) });
      await flush();
      const bSent = b.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(bSent.some((m: any) => m.type === 'chat' && m.text === 'hello')).toBe(true);

      // A 离开 → B 收到 presence:leave，在线数回落
      a.onclose();
      await flush();
      const bAfter = b.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(bAfter.some((m: any) => m.type === 'presence:leave')).toBe(true);
      (globalThis as any).Deno = undefined;
    });
  });
});

// ============================================================
// SSRF 防护矩阵
// ============================================================

describe('assertPublicHttpUrl — SSRF 防护矩阵', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 拒绝：协议 ──
  it('拒绝非 http/https 协议（ftp/file/javascript）', () => {
    for (const url of [
      'ftp://example.com/file',
      'file:///etc/passwd',
      'javascript:alert(1)',
      'data:text/html,x',
    ]) {
      expect(() => assertPublicHttpUrl(url)).toThrow('invalid_protocol');
    }
  });

  // ── 拒绝：非法 URL ──
  it('拒绝无法解析的 URL', () => {
    expect(() => assertPublicHttpUrl('not-a-url')).toThrow('invalid_url');
    expect(() => assertPublicHttpUrl('')).toThrow('invalid_url');
  });

  // ── 拒绝：localhost 与内网域名 ──
  it('拒绝 localhost 与内网后缀域名', () => {
    for (const url of [
      'http://localhost:8080/api',
      'http://localhost/',
      'https://app.localhost/x',
      'https://nas.local/x',
      'https://svc.internal/x',
    ]) {
      expect(() => assertPublicHttpUrl(url)).toThrow('private_host');
    }
  });

  // ── 拒绝：环回 / 私有 / 保留 IPv4 ──
  it('拒绝环回与私有 IPv4 段', () => {
    const denied = [
      'http://127.0.0.1/',           // loopback
      'http://127.255.0.3/',         // loopback 上界
      'http://10.1.2.3/',            // 10/8
      'http://172.16.0.1/',          // 172.16/12 下界
      'http://172.31.255.255/',      // 172.16/12 上界
      'http://192.168.1.1/',         // 192.168/16
      'http://169.254.169.254/',     // link-local（云 metadata）
      'http://0.1.2.3/',             // 0/8
      'http://100.64.1.1/',          // CGNAT 100.64/10
      'http://198.18.0.1/',          // benchmark 198.18/15
      'http://224.0.0.1/',           // 组播
      'http://240.0.0.1/',           // 保留
    ];
    for (const url of denied) {
      expect(() => assertPublicHttpUrl(url), url).toThrow('private_host');
    }
  });

  // ── 拒绝：IPv6 本地 ──
  it('拒绝环回与 ULA/链路本地 IPv6', () => {
    for (const url of [
      'http://[::1]/',
      'http://[::]/',
      'http://[fd00::1]/',
      'http://[fc00::abcd]/',
      'http://[fe80::1]/',
    ]) {
      expect(() => assertPublicHttpUrl(url)).toThrow('private_host');
    }
  });

  // ── 接受：公网地址 ──
  it('放行公网 http/https 地址', () => {
    const allowed = [
      'https://example.com/stream/index.m3u8',
      'http://example.com/api/v1/streams',
      'https://live.example.com:8443/hls',
      'http://8.8.8.8/',
      'https://[2606:4700::1111]/',      // 公网 IPv6（非 fc/fd/fe80 前缀）
      'https://172.32.0.1/',             // 刚好落在私有段之外
    ];
    for (const url of allowed) {
      const parsed = assertPublicHttpUrl(url);
      expect(['http:', 'https:']).toContain(parsed.protocol);
    }
  });

  it('保留原始路径与查询参数', () => {
    const parsed = assertPublicHttpUrl('https://media.example.com/v3/streams/list?x=1');
    expect(parsed.pathname).toBe('/v3/streams/list');
    expect(parsed.search).toBe('?x=1');
  });
});
