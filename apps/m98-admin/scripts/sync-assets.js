/**
 * file: sync-assets.js
 * description: 管理后台资产同步 · 将根 public 品牌资产复制到 admin_panel/public
 * author: YYC³ Team
 * version: v1.0.0
 * created: 2026-11-07
 * updated: 2026-11-07
 * status: active
 * tags: [script],[asset],[admin]
 *
 * dependencies: Node.js fs.cpSync（>=16.7）
 * notes: 根 public 为唯一事实源，admin_panel/public 下为生成副本
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// workspace 改造（卷 13 / M4）：品牌资产单源迁至 monorepo 根 assets/m98/public-brand（与 m98-web 共享）
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..');
const sourceRoot = path.join(projectRoot, 'assets', 'm98', 'public-brand');
const targetRoot = path.resolve(currentDir, '..', 'public');

const ENTRIES = ['D-Music-icons', 'D-MusAI.png'];

let copied = 0;

for (const entry of ENTRIES) {
  const source = path.join(sourceRoot, entry);
  const target = path.join(targetRoot, entry);

  if (!fs.existsSync(source)) {
    console.warn(`[admin-assets] 跳过（源不存在）: ${entry}`);
    continue;
  }

  fs.cpSync(source, target, { recursive: true, force: true });
  console.log(`[admin-assets] 已同步: ${entry}`);
  copied += 1;
}

console.log(`[admin-assets] 完成：同步 ${copied} 项`);
