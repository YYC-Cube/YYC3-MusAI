/**
 * @file music-server Deno 集成测试
 * @description 以真实 Hono 应用（与 index.tsx 相同的注册顺序）验证健康检查、CORS、
 *              AI 歌词生成与缓存、限流降级、注册参数校验、未知路由等端到端行为。
 *
 * 运行：deno test --allow-all packages/music-server/test-deno
 * 说明：不依赖 Supabase / OpenAI 真实凭据，AI 路由自动降级到本地模板引擎。
 */
import { Hono } from 'npm:hono'
import { cors } from 'npm:hono/cors'
import { assertEquals, assertExists } from 'jsr:@std/assert@1'
import { registerAuthRoutes } from '../src/routes-auth.ts'
import { registerAiRoutes } from '../src/routes-ai.ts'
import { ROUTE_PREFIX } from '../src/server-utils.ts'

function createApp() {
  const app = new Hono()
  app.use(
    '/*',
    cors({
      origin: (origin: string) => origin || '*',
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
  )
  registerAuthRoutes(app)
  registerAiRoutes(app)
  return app
}

const app = createApp()
const ip = (value: string) => ({ 'x-forwarded-for': value, 'content-type': 'application/json' })

Deno.test('GET /health 返回 200 与 ok 状态', async () => {
  const res = await app.request(`${ROUTE_PREFIX}/health`)
  assertEquals(res.status, 200)
  assertEquals(await res.json(), { status: 'ok' })
})

Deno.test('未知路由返回 404', async () => {
  const res = await app.request(`${ROUTE_PREFIX}/not-exists`)
  assertEquals(res.status, 404)
})

Deno.test('CORS 预检返回放行头', async () => {
  const res = await app.request(`${ROUTE_PREFIX}/health`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'content-type',
    },
  })
  assertEquals(res.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  assertExists(res.headers.get('access-control-allow-methods'))
})

Deno.test('POST /ai/lyrics 无 Key 时降级模板并返回完整歌词', async () => {
  const res = await app.request(`${ROUTE_PREFIX}/ai/lyrics`, {
    method: 'POST',
    headers: ip('203.0.113.10'),
    body: JSON.stringify({ theme: 'happy', keywords: ['夏天'], lines: 8, language: 'zh' }),
  })
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.success, true)
  assertEquals(body.theme, 'happy')
  assertEquals(body.lyrics.length, 8)
  assertEquals(body.provider, 'template')
  assertEquals(body.cached, false)
})

Deno.test('相同参数的第二次请求命中缓存', async () => {
  const res = await app.request(`${ROUTE_PREFIX}/ai/lyrics`, {
    method: 'POST',
    headers: ip('203.0.113.10'),
    body: JSON.stringify({ theme: 'happy', keywords: ['夏天'], lines: 8, language: 'zh' }),
  })
  assertEquals(res.status, 200)
  assertEquals((await res.json()).cached, true)
})

Deno.test('超过 RATE_HEAVY 阈值后返回 429', async () => {
  for (let i = 0; i < 3; i += 1) {
    const res = await app.request(`${ROUTE_PREFIX}/ai/lyrics`, {
      method: 'POST',
      headers: ip('203.0.113.10'),
      body: JSON.stringify({ theme: 'calm', keywords: [`k${i}`], lines: 4 }),
    })
    assertEquals(res.status, 200)
  }

  const blocked = await app.request(`${ROUTE_PREFIX}/ai/lyrics`, {
    method: 'POST',
    headers: ip('203.0.113.10'),
    body: JSON.stringify({ theme: 'calm', keywords: ['overflow'], lines: 4 }),
  })
  assertEquals(blocked.status, 429)
  assertExists(blocked.headers.get('Retry-After'))
})

Deno.test('POST /ai/compose 返回可播放的作曲参数', async () => {
  const res = await app.request(`${ROUTE_PREFIX}/ai/compose`, {
    method: 'POST',
    headers: ip('203.0.113.11'),
    body: JSON.stringify({ theme: 'energetic', lyrics: ['一行歌词'], lineCount: 8 }),
  })
  assertEquals(res.status, 200)
  const { composition } = await res.json()
  assertEquals(composition.key, 'Em')
  assertEquals(composition.tempo, 140)
  assertEquals(composition.mood, 'energetic')
  assertEquals(composition.sections.length, 4)
  assertEquals(composition.chordProgression.length, 4)
})

Deno.test('POST /signup 缺少邮箱/密码时返回 400', async () => {
  const res = await app.request(`${ROUTE_PREFIX}/signup`, {
    method: 'POST',
    headers: ip('203.0.113.12'),
    body: JSON.stringify({ displayName: 'NoEmail' }),
  })
  assertEquals(res.status, 400)
  const body = await res.json()
  assertExists(body.error)
})
