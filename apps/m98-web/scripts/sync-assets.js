/**
 * file: sync-assets.js
 * description: 资产同步脚本 · 将根 public/ 品牌与媒体资产同步到 web_app/public
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [script],[asset],[build]
 *
 * brief: CRA 仅服务 web_app/public，故在 start/build 前同步项目级资产
 *
 * details:
 * - 仅同步白名单条目，避免误拷 .DS_Store 与无关目录
 * - 默认增量覆盖；源文件缺失时告警但不中断
 * - 通过 npm prestart / prebuild 自动执行
 *
 * dependencies: Node.js fs.cpSync（>=16.7）
 * exports: 无
 * notes: 根 public/ 仍为唯一事实源，web_app/public 下为生成副本
 */

const fs = require('fs');
const path = require('path');

// workspace 改造（卷 13 / M3）：品牌资产单源迁至 monorepo 根 assets/m98/public-brand
const projectRoot = path.resolve(__dirname, '..', '..');
const sourceRoot = path.join(projectRoot, 'assets', 'm98', 'public-brand');
const targetRoot = path.resolve(__dirname, '..', 'public');

const ENTRIES = [
  'D-Music',
  'D-Music-icons',
  'D-cover',
  'D-poster',
  'D-MusAI.png',
  'D-music.png',
  'music.png',
];

let copied = 0;
let skipped = 0;

for (const entry of ENTRIES) {
  const source = path.join(sourceRoot, entry);
  const target = path.join(targetRoot, entry);

  if (!fs.existsSync(source)) {
    console.warn(`[assets] 跳过（源不存在）: ${entry}`);
    skipped += 1;
    continue;
  }

  fs.cpSync(source, target, { recursive: true, force: true });
  console.log(`[assets] 已同步: ${entry}`);
  copied += 1;
}

console.log(`[assets] 完成：同步 ${copied} 项，跳过 ${skipped} 项`);
