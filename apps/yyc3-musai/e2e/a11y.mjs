#!/usr/bin/env node
/**
 * YYC³ D-Music — 整站可访问性扫描（可复用脚本）
 *
 * Playwright(chromium) + axe-core（wcag2a/aa + wcag21a/aa 规则集），
 * 对 document.body 扫描：
 *   1. '/'          — SPA 根路由（路由表 '/' 与 '*'）
 *   2. /?panel=playlist  — 交互态：播放列表面板
 *   3. /?panel=upload    — 交互态：上传面板
 *
 * 判定：serious/critical 违规计数为失败；moderate/minor 仅记录清单。
 * 用法：corepack pnpm exec node e2e/a11y.mjs [--base http://localhost:4173]
 * 退出码：0 = serious+critical 为 0；1 = 存在 serious/critical 违规（如实报告，不修复）。
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const baseArgIdx = args.indexOf('--base');
const BASE = baseArgIdx >= 0 ? args[baseArgIdx + 1] : process.env.A11Y_BASE_URL ?? 'http://localhost:4173';

// --- 解析依赖（pnpm 分区 hoisting：axe-core 由 music-ui 直依赖） ---
function requireFrom(relRepoPath) {
  return createRequire(pathToFileURL(path.resolve(__dirname, relRepoPath)));
}
async function resolveDep(name) {
  const tries = [
    () => createRequire(import.meta.url).resolve(name),
    () => requireFrom('../../../packages/music-ui/package.json').resolve(name), // axe-core（music-ui 直依赖）
    () => requireFrom('../../../package.json').resolve(name), // 根
  ];
  for (const t of tries) {
    try { return t(); } catch { /* next */ }
  }
  throw new Error(`cannot resolve ${name} from node_modules`);
}

const axeDist = await resolveDep('axe-core'); // UMD（axe.js）
if (!existsSync(axeDist)) throw new Error(`axe-core dist not found: ${axeDist}`);
const { chromium } = await import('@playwright/test');

// 浏览器可执行文件解析：默认用注册表版本；若缺失（版本漂移），回退到
// 已缓存的其它 revision（CDP 兼容），避免重新下载。
const HOME = process.env.HOME ?? '';
const FALLBACK_BINS = [
  `${HOME}/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  `${HOME}/Library/Caches/ms-playwright/chromium-*/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
];
async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (err) {
    if (!/Executable doesn't exist/i.test(err.message ?? '')) throw err;
    const { globSync } = await import('node:fs');
    for (const pattern of FALLBACK_BINS) {
      const found = globSync(pattern);
      if (found.length) {
        console.warn(`[a11y] registry chromium missing, fallback binary: ${found[0]}`);
        return await chromium.launch({ executablePath: found[0], headless: true });
      }
    }
    throw err;
  }
}

const STATES = [
  { name: 'route:/', url: `${BASE}/` },
  { name: 'panel:playlist', url: `${BASE}/?panel=playlist` },
  { name: 'panel:upload', url: `${BASE}/?panel=upload` },
];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const FAIL_IMPACTS = new Set(['serious', 'critical']);

const truncate = (s, n = 120) => (s.length > n ? `${s.slice(0, n)}…` : s);

async function scanState(browser, state) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const out = { name: state.name, url: state.url, ok: false, error: null, violations: [] };
  try {
    await page.goto(state.url, { waitUntil: 'networkidle', timeout: 45_000 });
    await page.waitForTimeout(1_000); // SPA 水合/动效余量
    // http 页面不允许加载 file:// 子资源，改为 content 注入
    const axeSource = readFileSync(axeDist, 'utf8');
    await page.addScriptTag({ content: axeSource });
    out.violations = await page.evaluate(async (tags) => {
      // eslint-disable-next-line no-undef
      const axe = window.axe;
      if (!axe) throw new Error('axe failed to inject');
      axe.configure({ branding: { application: 'yyc3-musai-a11y' } });
      const res = await axe.run(document.body, {
        tags,
        resultTypes: ['violations'],
      });
      return res.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags.filter((t) => tags.includes(t)),
        nodes: v.nodes.map((nd) => ({ target: nd.target, summary: nd.failureSummary ?? '' })),
      }));
    }, TAGS);
    out.ok = true;
  } catch (err) {
    out.error = err.message ?? String(err);
  } finally {
    await page.close();
  }
  return out;
}

async function main() {
  console.log('=== YYC³ D-Music axe a11y 扫描 ===');
  console.log(`base=${BASE} tags=${TAGS.join(',')} axe=${axeDist}\n`);
  const browser = await launchBrowser();
  const results = [];
  for (const state of STATES) {
    process.stdout.write(`扫描 ${state.name} ... `);
    const r = await scanState(browser, state);
    results.push(r);
    if (r.error) console.log(`ERROR: ${truncate(r.error)}`);
    else console.log(`${r.violations.length} 类违规（serious+critical: ${r.violations.filter((v) => FAIL_IMPACTS.has(v.impact)).length}）`);
  }
  await browser.close();

  let failCriticalSerious = 0;
  let scanErrors = 0;
  const moderateMinor = [];
  for (const r of results) {
    console.log(`\n--- ${r.name} (${r.url}) ---`);
    if (r.error) { console.log(`  扫描失败: ${r.error}`); scanErrors += 1; continue; }
    if (!r.violations.length) { console.log('  无违规'); continue; }
    const sorted = [...r.violations].sort((a, b) => (FAIL_IMPACTS.has(b.impact) ? 1 : 0) - (FAIL_IMPACTS.has(a.impact) ? 1 : 0));
    for (const v of sorted) {
      const isFail = FAIL_IMPACTS.has(v.impact);
      if (isFail) failCriticalSerious += 1;
      else moderateMinor.push({ state: r.name, ...v });
      console.log(`  [${isFail ? 'FAIL' : 'INFO'}][${v.impact ?? 'unknown'}] ${v.id}: ${v.help}（节点 ${v.nodes.length}）`);
      for (const nd of v.nodes.slice(0, 3)) {
        console.log(`      target: ${JSON.stringify(nd.target)}`);
        if (!isFail && nd.summary) console.log(`      summary: ${truncate(nd.summary.replace(/\n/g, ' '), 160)}`);
      }
      console.log(`      help: ${v.helpUrl}`);
    }
  }

  if (moderateMinor.length) {
    console.log(`\n--- moderate/minor 清单（${moderateMinor.length} 类，不计失败）---`);
    for (const m of moderateMinor) console.log(`  [${m.state}] ${m.impact} ${m.id}: ${m.help}`);
  }

  console.log(`\n=== 汇总 ===`);
  console.log(`serious+critical 违规类合计: ${failCriticalSerious}（通过标准 = 0）; 扫描失败状态: ${scanErrors}`);
  const ok = failCriticalSerious === 0 && scanErrors === 0;
  console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL（如实报告，暂不修复，供决策）');
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('a11y scan crashed:', err);
  process.exit(1);
});
