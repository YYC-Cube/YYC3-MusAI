#!/usr/bin/env node
/**
 * D-Music — WebSocket 弹幕联调压测（可复用脚本）
 *
 * 场景：N 个并发 WS 客户端加入同一房间，每客户端发 M 条弹幕；
 * 服务端按连接限频 1 条/秒（src/index.ts danmaku 处理器），故每客户端按
 * >=1s 间隔发送（默认 1.1s）以保证丢失率统计有效（0% 为通过标准）。
 *
 * 协议（ws://host:port/ws/live，WS_ALLOW_ANONYMOUS=1 时免 token）：
 *   -> { type: 'join', room }
 *   <- { type: 'welcome' | 'joined' | 'viewer_count' | ... }
 *   -> { type: 'danmaku', text }
 *   <- { type: 'danmaku', room, text, user, ts }   // 广播给房间所有人（含发送者）
 *
 * 弹幕 text 内嵌发送时间戳：LT|<clientId>|<seq>|<sendTimeMs>
 * 端到端延迟 = 客户端收到广播时刻 - 发送时间戳。
 *
 * 用法：
 *   node scripts/ws-load-test.mjs --url ws://127.0.0.1:8790/ws/live \
 *     --clients 100 --per-client 20 --room load-test
 *
 * 退出码：0 = 丢失率 0% 且无客户端异常断开；1 = 存在丢失/断连/超时。
 */
import WebSocket from 'ws';

function parseArgs() {
  const args = {
    url: process.env.WS_URL ?? 'ws://127.0.0.1:8790/ws/live',
    clients: 100,
    perClient: 20,
    room: 'load-test',
    sendIntervalMs: 1100, // 服务端限频 1/s，留 100ms 余量
    drainMs: 2500,        // 末条发出后等待广播沉淀
    connectTimeoutMs: 10_000,
  };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]?.replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (key in args) {
      const v = argv[i + 1];
      args[key] = typeof args[key] === 'number' ? Number(v) : v;
      i++;
    }
  }
  return args;
}

const pct = (sorted, p) => {
  if (!sorted.length) return NaN;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[idx];
};
const fmtMs = (v) => `${v.toFixed(1)}ms`;

async function runClient(cid, cfg) {
  return new Promise((resolve) => {
    const result = {
      cid,
      connected: false,
      joined: false,
      closedCleanly: false,
      error: null,
      sent: 0,
      sendCompleted: false,
      received: 0,          // 收到的 danmaku 广播条数（含重复）
      uniqueKeys: new Set(),// 去重后的弹幕 key
      duplicates: 0,
      latencies: [],        // 端到端延迟 ms
      firstRecvAt: null,
      lastRecvAt: null,
    };
    const finish = (err = null) => {
      if (result.done) return;
      result.done = true;
      if (err && !result.error) result.error = err;
      try { ws?.terminate(); } catch { /* noop */ }
      resolve(result);
    };

    let ws;
    try {
      ws = new WebSocket(cfg.url);
    } catch (err) {
      finish(`connect_throw: ${err.message}`);
      return;
    }

    const connectTimer = setTimeout(() => finish(`connect_timeout(${cfg.connectTimeoutMs}ms)`), cfg.connectTimeoutMs);

    ws.on('open', () => {
      result.connected = true;
      clearTimeout(connectTimer);
      ws.send(JSON.stringify({ type: 'join', room: cfg.room }));
    });

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(String(raw)); } catch { return; }
      if (msg.type === 'joined') { result.joined = true; return; }
      if (msg.type !== 'danmaku') return;
      const now = Date.now();
      result.received += 1;
      result.firstRecvAt ??= now;
      result.lastRecvAt = now;
      // text 形如 LT|<cid>|<seq>|<sendTimeMs>
      const parts = String(msg.text ?? '').split('|');
      if (parts.length === 4 && parts[0] === 'LT') {
        const key = `${parts[1]}#${parts[2]}`;
        if (result.uniqueKeys.has(key)) result.duplicates += 1;
        else {
          result.uniqueKeys.add(key);
          result.latencies.push(now - Number(parts[3]));
        }
      }
    });

    ws.on('error', (err) => { result.error ??= `socket_error: ${err.message}`; });
    ws.on('close', (code) => { result.closedCleanly = code === 1000 || code === 1005 || code === 1006; finish(result.error); });

    // 发送节奏：join 后按固定间隔发 M 条；服务端限频 1 条/秒/连接
    const startAfterJoined = setInterval(() => {
      if (result.joined) {
        clearInterval(startAfterJoined);
        for (let seq = 0; seq < cfg.perClient; seq++) {
          setTimeout(() => {
            if (result.done || !result.connected) return;
            const sendTs = Date.now();
            ws.send(JSON.stringify({ type: 'danmaku', text: `LT|${cid}|${seq}|${sendTs}` }));
            result.sent += 1;
            if (seq === cfg.perClient - 1) result.sendCompleted = true;
          }, seq * cfg.sendIntervalMs);
        }
        // 全部发完 + 沉淀期后主动收尾
        setTimeout(() => {
          if (result.done) return;
          result.sendCompleted ? finish() : finish(`send_incomplete(${result.sent}/${cfg.perClient})`);
        }, cfg.perClient * cfg.sendIntervalMs + cfg.drainMs);
      }
    }, 50);

    // 兜底看门狗
    setTimeout(() => finish(result.joined ? 'watchdog_timeout' : 'join_timeout'),
      cfg.connectTimeoutMs + cfg.perClient * cfg.sendIntervalMs + cfg.drainMs + 8_000);
  });
}

async function main() {
  const cfg = parseArgs();
  const total = cfg.clients * cfg.perClient;
  console.log('=== D-Music WS 弹幕压测 ===');
  console.log(`endpoint=${cfg.url} room=${cfg.room} clients=${cfg.clients} msgs/client=${cfg.perClient} total=${total} interval=${cfg.sendIntervalMs}ms`);
  console.log('压测中（预计 ~', Math.ceil(cfg.perClient * cfg.sendIntervalMs / 1000) + 5, 's + 连接/沉淀）...');

  const t0 = Date.now();
  const results = await Promise.all(
    Array.from({ length: cfg.clients }, (_, i) => runClient(i, cfg)),
  );
  const wallMs = Date.now() - t0;

  const connected = results.filter((r) => r.connected);
  const abnormal = results.filter((r) => !r.connected || !r.joined || r.error);
  const sent = results.reduce((s, r) => s + r.sent, 0);
  const expectedUniquePerClient = sent; // 广播含发送者，每客户端应收到全部已接受弹幕
  const receivedTotal = results.reduce((s, r) => s + r.received, 0);
  const uniqueMin = Math.min(...results.map((r) => r.uniqueKeys.size));
  const uniqueMax = Math.max(...results.map((r) => r.uniqueKeys.size));
  const duplicates = results.reduce((s, r) => s + r.duplicates, 0);
  // 丢失判定：任一客户端未收齐全部广播
  const missing = results.reduce((s, r) => s + Math.max(0, expectedUniquePerClient - r.uniqueKeys.size), 0);
  const lossRate = expectedUniquePerClient > 0 ? (missing / (results.length * expectedUniquePerClient)) * 100 : 0;
  const allLatencies = results.flatMap((r) => r.latencies).sort((a, b) => a - b);
  const avgLat = allLatencies.reduce((s, v) => s + v, 0) / (allLatencies.length || 1);

  console.log('\n--- 汇总 ---');
  console.log(`连接成功: ${connected.length}/${cfg.clients}，join 成功: ${results.filter((r) => r.joined).length}/${cfg.clients}`);
  console.log(`异常/报错客户端: ${abnormal.length}${abnormal.length ? ' -> ' + abnormal.slice(0, 5).map((r) => `#${r.cid}:${r.error ?? 'not_joined'}`).join(', ') : ''}`);
  console.log(`发送弹幕: ${sent}/${total}（接受率 ${(sent / total * 100).toFixed(2)}%，未接受即被服务端限频丢弃）`);
  console.log(`广播接收: 每客户端唯一弹幕 min=${uniqueMin} max=${uniqueMax}（期望 ${expectedUniquePerClient}），重复收到合计 ${duplicates}，总接收 ${receivedTotal}`);
  console.log(`丢失率(按唯一弹幕×客户端): ${lossRate.toFixed(4)}%`);
  console.log(`端到端延迟: avg=${fmtMs(avgLat)} P50=${fmtMs(pct(allLatencies, 0.5))} P95=${fmtMs(pct(allLatencies, 0.95))} max=${fmtMs(allLatencies.at(-1) ?? NaN)}（样本 ${allLatencies.length}）`);
  console.log(`压测耗时: ${(wallMs / 1000).toFixed(1)}s`);

  const ok = lossRate === 0 && abnormal.length === 0 && sent === total && uniqueMin === expectedUniquePerClient;
  console.log(ok ? '\nRESULT: PASS（丢失率 0%，无异常断连）' : `\nRESULT: FAIL（丢失率 ${lossRate.toFixed(4)}%，异常断连 ${abnormal.length}）`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('load test crashed:', err);
  process.exit(1);
});
