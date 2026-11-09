#!/usr/bin/env node
/**
 * @file smoke-pack-install.mjs
 * @description 打包发布烟雾测试：pnpm pack → 校验无 workspace 协议 → 临时项目安装 → 动态导入
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 *
 * 用法：node scripts/smoke-pack-install.mjs
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const packagesDir = path.join(root, 'packages');
const workDir = path.join(os.tmpdir(), 'yyc3-pack-smoke');
const packDir = path.join(workDir, 'tarballs');
const installDir = path.join(workDir, 'app');

const publicPackages = readdirSync(packagesDir)
  .map((dir) => path.join(packagesDir, dir))
  .filter((dir) => existsSync(path.join(dir, 'package.json')))
  .map((dir) => ({ dir, pkg: JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) }))
  .filter(({ pkg }) => !pkg.private);

rmSync(workDir, { recursive: true, force: true });
mkdirSync(packDir, { recursive: true });
mkdirSync(installDir, { recursive: true });

const tarballs = [];
for (const { dir, pkg } of publicPackages) {
  execFileSync('pnpm', ['pack', '--pack-destination', packDir], {
    cwd: dir,
    stdio: ['ignore', 'ignore', 'inherit']
  });
  const filename = readdirSync(packDir).find(
    (file) => file.startsWith(`yyc3-${pkg.name.replace('@yyc3/', '')}-`) && file.endsWith('.tgz')
  );
  if (!filename) throw new Error(`未找到 ${pkg.name} 的打包产物`);
  tarballs.push(path.join(packDir, filename));
}

// 校验 tarball 内 package.json 不残留 workspace: 协议
let residue = 0;
for (const tarball of tarballs) {
  const manifest = execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' });
  if (manifest.includes('workspace:')) {
    residue += 1;
    console.error(`✗ ${path.basename(tarball)} 残留 workspace: 协议`);
  }
}
if (residue > 0) process.exit(1);

writeFileSync(path.join(installDir, 'package.json'), JSON.stringify({ name: 'yyc3-pack-smoke', version: '1.0.0', private: true, type: 'module' }, null, 2));

execFileSync('npm', ['install', ...tarballs, '--no-audit', '--no-fund', '--ignore-scripts'], {
  cwd: installDir,
  stdio: ['ignore', 'ignore', 'inherit']
});

const checks = [
  ['@yyc3/music-data', 'Array.isArray(m.DEMO_PLAYLIST)'],
  ['@yyc3/music-design-tokens', 'm.THEME_IDS.length > 0'],
  ['@yyc3/music-lyrics', "typeof m.parseLrc === 'function'"],
  ['@yyc3/music-utils', "typeof m.getSharedAudioContext === 'function'"],
  ['@yyc3/music-ui', "typeof m.DButton !== 'undefined'"]
];

const script = checks
  .map(([name, expr]) => `try { const m = await import(${JSON.stringify(name)}); console.log(${JSON.stringify('✓ ' + name)}, ${expr}); } catch (e) { console.error(${JSON.stringify('✗ ' + name)}, e.message); process.exitCode = 1; }`)
  .join('\n');

execFileSync('node', ['--input-type=module', '-e', script], { cwd: installDir, stdio: 'inherit' });

if (process.exitCode) {
  console.error('\n包安装烟雾测试失败');
  process.exit(1);
}

console.log(`\n全部 ${tarballs.length} 个包通过打包安装烟雾测试`);
