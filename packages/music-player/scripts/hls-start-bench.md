# HLS 起播延迟基准（hls.js + 本地 VOD 造流）— 可复用配方

目的：在本地用 ffmpeg 造一段 12s 测试 VOD HLS，用 hls.js 起播，测量
`start（脚本开始）→ video 'playing' 事件` 的端到端起播耗时，5 轮取中位数。
**通过标准：中位数 < 1500ms**（本地环境通常 <300ms，本仓基线实测 140ms）。

## 0. 前置

- ffmpeg ≥ 6（8.1.1 验证通过），在 PATH。
- Node + 仓内 `@playwright/test`（chromium 浏览器已随 `playwright install chromium` 安装；
  若注册表版本漂移，可用缓存内任意 chromium 二进制以 `executablePath` 兜底）。
- hls.js UMD 产物来源（同源加载避免 CORS）：
  `node_modules/.pnpm/hls.js@*/node_modules/hls.js/dist/hls.min.js`
  （按当前 lock 版本取，如 `hls.js@1.7.4`）。

## 1. 造流（fixture）

```bash
rm -rf /tmp/hls-fixture && mkdir -p /tmp/hls-fixture && cd /tmp/hls-fixture
ffmpeg -y -f lavfi -i testsrc=size=640x360:rate=24 \
  -f lavfi -i sine=frequency=440 -t 12 \
  -c:v libx264 -preset veryfast -g 48 -sc_threshold 0 -c:a aac -b:a 128k \
  -f hls -hls_time 3 -hls_list_size 0 -hls_segment_filename "seg_%03d.ts" master.m3u8

# hls.js UMD 复制进 fixture（同源加载）
cp /path/to/repo/node_modules/.pnpm/hls.js@1.7.4/node_modules/hls.js/dist/hls.min.js ./hls.min.js
```

产出：`master.m3u8`（`#EXT-X-ENDLIST` VOD 播放列表）+ `seg_000.ts..seg_003.ts`（约 12s）。

## 2. 静态服务

```bash
cd /tmp/hls-fixture && python3 -m http.server 8788 &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8788/master.m3u8   # 200
```

页面与分片同源（8788），无跨域问题。

## 3. 测量页（/tmp/hls-fixture/hls-bench.html）

要点：`video muted playsinline autoplay`（无手势可起播）；`performance.now()`
在脚本执行起点记 t0；监听 `playing` 事件差值即起播耗时；结果写到
`window.__startLatencyMs` / `window.__benchDone`，供 Playwright 断言。

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>HLS start-latency bench</title>
  <style>
    body { font-family: monospace; margin: 24px; background: #111; color: #eee; }
    video { width: 640px; height: 360px; background: #000; }
    #log { white-space: pre-wrap; margin-top: 16px; }
  </style>
</head>
<body>
  <h3>HLS start-latency bench (hls.js + local VOD)</h3>
  <!-- muted+autoplay+playsinline 保证无用户手势也可起播 -->
  <video id="video" muted playsinline autoplay></video>
  <div id="log"></div>
  <!-- 同源加载，避免跨域；文件来自主仓 node_modules hls.js dist UMD -->
  <script src="./hls.min.js"></script>
  <script>
    const logEl = document.getElementById('log');
    const log = (line) => { logEl.textContent += line + '\n'; console.log(line); };

    const t0 = performance.now(); // start: 脚本开始执行即视为"发起播放"时刻
    const video = document.getElementById('video');

    window.__benchDone = false;
    window.__startLatencyMs = null;

    const markPlaying = () => {
      if (window.__benchDone) return;
      window.__benchDone = true;
      window.__startLatencyMs = performance.now() - t0;
      log(`PLAYING startLatencyMs=${window.__startLatencyMs.toFixed(1)}`);
    };

    video.addEventListener('playing', markPlaying);

    const hls = new Hls({ enableWorker: true, lowLatencyMode: false, autoStartLoad: true });
    hls.on(Hls.Events.ERROR, (_evt, data) => {
      if (data.fatal) {
        log(`HLS_FATAL type=${data.type} detail=${data.detail}`);
        window.__hlsFatal = `${data.type}:${data.detail}`;
      }
    });
    hls.loadSource('./master.m3u8');
    hls.attachMedia(video);
    log('Hls attached, t0 set');

    // 兜底：15s 未起播视为失败
    setTimeout(() => {
      if (!window.__benchDone) log('TIMEOUT no playing within 15s');
    }, 15000);
  </script>
</body>
</html>
```

## 4. Playwright 跑 5 轮取中位数（/tmp/hls-bench-runner.mjs）

```js
import { chromium } from '@playwright/test'; // 仓内 devDep；相对主仓 node_modules 解析
import { globSync } from 'node:fs';

const HOME = process.env.HOME ?? '';
const URL = 'http://localhost:8788/hls-bench.html';
const ROUNDS = 5;

// 注册表 chromium 缺失时用缓存内已有二进制兜底（CDP 兼容，免下载）
const candidates = globSync(
  `${HOME}/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell`);
const executablePath = candidates.sort().at(-1);

const browser = await chromium.launch(executablePath ? { executablePath, headless: true } : {});
const samples = [];
for (let i = 0; i < ROUNDS; i++) {
  const page = await browser.newPage();
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForFunction('window.__benchDone === true || window.__hlsFatal != null', null, { timeout: 20_000 });
    const fatal = await page.evaluate('window.__hlsFatal ?? null');
    const lat = await page.evaluate('window.__startLatencyMs');
    if (fatal || lat == null) { console.log(`round ${i + 1}: FAILED (${fatal ?? 'no latency'})`); samples.push(null); }
    else { samples.push(Number(lat)); console.log(`round ${i + 1}: ${Number(lat).toFixed(1)} ms`); }
  } catch (err) { console.log(`round ${i + 1}: ERROR ${err.message.split('\n')[0]}`); samples.push(null); }
  finally { await page.close(); }
}
await browser.close();

const ok = samples.filter((v) => v != null).sort((a, b) => a - b);
const median = ok.length % 2 ? ok[(ok.length - 1) / 2] : (ok[ok.length / 2 - 1] + ok[ok.length / 2]) / 2;
console.log(`samples(ms)=${samples.join(', ')} median=${median}ms -> ${median < 1500 ? 'PASS' : 'FAIL'}`);
if (ok.length < ROUNDS) process.exitCode = 1;
```

运行：`node /tmp/hls-bench-runner.mjs`（在主仓目录下执行以便解析 `@playwright/test`）。

## 5. 判读

- 中位数 < 1500ms → PASS；≥ 1500ms → FAIL（检查：分片是否命中 GOP 边界、
  `enableWorker`、浏览器无头性能、机器负载）。
- 单轮 FAILED/ERROR：看页面 `HLS_FATAL`（demuxer/network/buffer）与 http.server 日志。
- 本仓基线（2026-11-21，macOS arm64 本地，chromium headless）：
  `samples=223.2, 203.6, 140.0, 126.8, 140.0 → median 140.0ms → PASS`。
  首轮略高属 hls.js worker 冷启动 + HTTP 冷缓存，属正常抖动。

## 6. 清理

```bash
# 杀掉 http.server 与残留 chromium
lsof -ti :8788 | xargs kill 2>/dev/null
```
