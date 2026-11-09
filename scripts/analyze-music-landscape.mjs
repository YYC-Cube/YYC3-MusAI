#!/usr/bin/env node
/**
 * 音乐场景单源化：只读差异矩阵
 *
 * 扫描本仓库与兄弟音乐项目，输出：
 *   1. 技术栈对照
 *   2. 能力对照（组件 / hooks / 服务）
 *   3. 抽取候选（≥2 个兄弟项目共有、当前源缺失）
 *   4. 同名异实现（当前源与兄弟项目重名）
 *   5. 单项目独有（默认不迁移）
 *
 * 只读取兄弟项目，不写入、不修改。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CURRENT = path.resolve(HERE, '..');
const SIBLINGS_ROOT = path.resolve(CURRENT, '..');

const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'coverage', '.turbo',
  '__pycache__', '.git', 'storybook-static', '.vercel', 'out',
]);
const IGNORE_FILE = /\.(test|spec|stories|d)\.(tsx?|jsx?)$|\.min\.(js|ts)$/;

const PROJECTS = [
  { key: 'current', group: 'current', label: 'YYC3-Music（当前源）', dir: CURRENT },
  { key: 'dmusai-web', group: 'dmusai', label: 'YYC3-D-MusAI / frontend', dir: path.join(SIBLINGS_ROOT, 'YYC3-D-MusAI', 'frontend') },
  { key: 'dmusai-mobile', group: 'dmusai', label: 'YYC3-D-MusAI / mobile-app', dir: path.join(SIBLINGS_ROOT, 'YYC3-D-MusAI', 'mobile-app') },
  { key: 'music-ai', group: 'music-ai', label: 'YYC3-Music-AI', dir: path.join(SIBLINGS_ROOT, 'YYC3-Music-AI') },
  { key: 'music-player', group: 'music-player', label: 'YYC3-Music-Player', dir: path.join(SIBLINGS_ROOT, 'YYC3-Music-Player') },
];

/** 通用原语名：重名不代表重复实现，不进入抽取候选 */
const GENERIC = new Set([
  'Button', 'Card', 'Input', 'Label', 'Badge', 'Dialog', 'Sheet', 'Tabs', 'Tooltip',
  'Select', 'Switch', 'Slider', 'Progress', 'Skeleton', 'Spinner', 'Avatar', 'Table',
  'Textarea', 'Checkbox', 'Radio', 'Popover', 'DropdownMenu', 'Accordion', 'Alert',
  'Separator', 'ScrollArea', 'Toast', 'Toaster', 'Form', 'Menu', 'Header', 'Footer',
  'Sidebar', 'Container', 'Section', 'Loading', 'EmptyState', 'ErrorBoundary',
]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !IGNORE_FILE.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

function readExports(code) {
  const names = new Set();
  const patterns = [
    /export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code))) names.add(m[1]);
  }
  let block;
  const reExport = /export\s*\{([^}]+)\}/g;
  while ((block = reExport.exec(code))) {
    for (const raw of block[1].split(',')) {
      const alias = raw.trim().split(/\s+as\s+/).pop();
      if (/^[A-Za-z_$][\w$]*$/.test(alias)) names.add(alias);
    }
  }
  return [...names];
}

function sourceRoots(project) {
  const candidates = project.key === 'current'
    ? ['packages', 'apps/d-music/src']
    : ['src', 'frontend/src', 'mobile-app/src', 'mobile-app', '.'];
  const roots = [];
  for (const rel of candidates) {
    const abs = path.join(project.dir, rel);
    if (!fs.existsSync(abs)) continue;
    if (rel === 'packages') {
      for (const pkg of fs.readdirSync(abs)) {
        const src = path.join(abs, pkg, 'src');
        if (fs.existsSync(src)) roots.push(src);
      }
    } else if (rel === '.') {
      for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) roots.push(path.join(abs, entry.name));
      }
    } else {
      roots.push(abs);
    }
  }
  return [...new Set(roots)];
}

function classify(file, names) {
  const isTsx = file.endsWith('.tsx') || file.endsWith('.jsx');
  const dir = file.toLowerCase();
  const out = { components: [], hooks: [], services: [] };
  for (const name of names) {
    if (/^use[A-Z]/.test(name)) out.hooks.push(name);
    else if (isTsx && /^[A-Z]/.test(name)) out.components.push(name);
    else if (/service|api|store|data|lib|util|engine|client|adapter/.test(dir)) out.services.push(name);
  }
  return out;
}

function inventory(project) {
  const files = sourceRoots(project).flatMap((root) => walk(root));
  const sizes = new Map();
  const sets = { components: new Map(), hooks: new Map(), services: new Map() };
  let loc = 0;

  for (const file of files) {
    let code;
    try {
      code = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    loc += code.split('\n').length;
    const { components, hooks, services } = classify(file, readExports(code));
    const layer = /[\\/](components[\\/])?ui[\\/]/.test(file) ? 'ui' : 'business';
    for (const [kind, names] of Object.entries({ components, hooks, services })) {
      for (const name of names) {
        if (!sets[kind].has(name)) {
          sets[kind].set(name, { file: path.relative(project.dir, file), loc: 0, layer: kind === 'components' ? layer : 'business' });
        }
        const rec = sets[kind].get(name);
        rec.loc += code.split('\n').length;
      }
    }
    sizes.set(file, code.split('\n').length);
  }

  return {
    files: files.length,
    loc,
    components: sets.components,
    hooks: sets.hooks,
    services: sets.services,
  };
}

function pkgInfo(dir) {
  const p = path.join(dir, 'package.json');
  if (!fs.existsSync(p)) return { name: '(none)', deps: {} };
  try {
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return { name: j.name, private: j.private === true, deps: { ...j.dependencies, ...j.devDependencies } };
  } catch {
    return { name: '(invalid)', deps: {} };
  }
}

const current = inventory(PROJECTS[0]);
const siblings = PROJECTS.slice(1).map((p) => ({ ...p, inv: inventory(p), pkg: pkgInfo(p.dir) }));
const currentPkg = pkgInfo(CURRENT);

const toRows = (inv) => ({
  files: inv.files,
  loc: inv.loc,
  components: inv.components.size,
  hooks: inv.hooks.size,
  services: inv.services.size,
});

const stack = PROJECTS.map((p) => {
  const info = pkgInfo(p.dir);
  const d = info.deps;
  return {
    key: p.key,
    label: p.label,
    name: info.name,
    react: d.react || '-',
    vite: d.vite || '-',
    tailwind: d.tailwindcss || '-',
    typescript: d.typescript || '-',
    test: [d.vitest && 'vitest', d.jest && 'jest', d['@playwright/test'] && 'playwright']
      .filter(Boolean).join('/') || '-',
  };
});

const currentNames = {
  components: new Set(current.components.keys()),
  hooks: new Set(current.hooks.keys()),
  services: new Set(current.services.keys()),
};

const uiCount = (inv) => [...inv.components.values()].filter((c) => c.layer === 'ui').length;

const matrix = siblings.map((s) => {
  const shared = {};
  for (const kind of ['components', 'hooks', 'services']) {
    const names = new Set(s.inv[kind].keys());
    const overlap = [...names].filter((n) => currentNames[kind].has(n));
    shared[kind] = {
      overlap: overlap.length,
      unique: names.size - overlap.length,
      ratio: names.size ? +(overlap.length / names.size * 100).toFixed(1) : 0,
    };
  }
  const business = [...s.inv.components.entries()].filter(([, c]) => c.layer === 'business');
  const businessOverlap = business.filter(([n]) => currentNames.components.has(n)).length;
  return {
    ...s,
    rows: toRows(s.inv),
    shared,
    ui: { total: uiCount(s.inv), business: business.length, businessOverlap },
  };
});

// 跨兄弟项目共有、当前源缺失的能力
const candidates = new Map();
for (const kind of ['components', 'hooks', 'services']) {
  for (const s of siblings) {
    for (const name of s.inv[kind].keys()) {
      if (currentNames[kind].has(name)) continue;
      if (GENERIC.has(name)) continue;
      if (kind === 'components' && s.inv.components.get(name)?.layer === 'ui') continue;
      const id = `${kind}:${name}`;
      const rec = candidates.get(id) || { kind, name, projects: new Set(), groups: new Set(), loc: 0 };
      rec.projects.add(s.key);
      rec.groups.add(s.group);
      rec.loc += s.inv[kind].get(name).loc;
      candidates.set(id, rec);
    }
  }
}
const candidateList = [...candidates.values()]
  .filter((c) => c.groups.size >= 2)
  .map((c) => ({
    ...c,
    projects: [...c.projects],
    groups: [...c.groups],
    score: c.groups.size * 10 + (c.kind === 'components' ? 3 : 0),
  }))
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

// 同名异实现：当前源与兄弟项目都有，且实现体量差异显著
const conflicts = [];
for (const kind of ['components', 'hooks']) {
  for (const s of siblings) {
    for (const [name, meta] of s.inv[kind]) {
      const mine = current[kind].get(name);
      if (!mine) continue;
      if (GENERIC.has(name)) continue;
      const ratio = meta.loc / Math.max(mine.loc, 1);
      if (ratio >= 1.8 || ratio <= 0.55) {
        conflicts.push({
          kind, name,
          project: s.label,
          currentLoc: mine.loc,
          siblingLoc: meta.loc,
          currentFile: mine.file,
          siblingFile: meta.file,
        });
      }
    }
  }
}

// 单项目独有（默认不迁移）
const soloList = [];
for (const s of siblings) {
  for (const kind of ['components', 'hooks', 'services']) {
    for (const name of s.inv[kind].keys()) {
      if (currentNames[kind].has(name)) continue;
      if (GENERIC.has(name)) continue;
      if (candidates.has(`${kind}:${name}`) && candidates.get(`${kind}:${name}`).projects.size >= 2) continue;
      soloList.push({ kind, name, project: s.key, loc: s.inv[kind].get(name).loc });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  current: { ...toRows(current), name: currentPkg.name },
  stack,
  matrix: matrix.map((m) => ({
    key: m.key,
    label: m.label,
    ...m.rows,
    overlap: m.shared,
  })),
  candidates: candidateList,
  conflicts,
  solo: soloList,
  uiDuplication: {
    current: uiCount(current),
    siblings: matrix.map((m) => ({ key: m.key, total: m.ui.total, business: m.ui.business, businessOverlap: m.ui.businessOverlap })),
  },
};
const OUT_DIR = path.join(CURRENT, 'docs');
const jsonPath = path.join(OUT_DIR, 'YYC3-MusAI-音乐场景差异矩阵-2026-11-10.json');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

const table = (rows) => rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
const stackRows = stack.map((s) => [s.label, s.name, s.react, s.vite, s.tailwind, s.test]);
const matrixRows = matrix.map((m) => [
  m.label, m.rows.files, m.rows.loc, m.rows.components, m.rows.hooks, m.rows.services,
  `${m.ui.business}(${m.ui.businessOverlap})`,
  `${m.shared.hooks.overlap}/${m.shared.hooks.ratio}%`,
]);
const candRows = candidateList.slice(0, 25).map((c) => [
  c.name, c.kind, c.groups.join(', '), c.projects.join(', '), c.loc,
]);
const conflictRows = conflicts.slice(0, 20).map((c) => [
  c.name, c.kind, c.project, c.currentLoc, c.siblingLoc,
]);

const md = `---
file: YYC3-MusAI-音乐场景差异矩阵-2026-11-10.md
title: 音乐场景单源化差异矩阵
description: 四个音乐项目的技术栈、组件/hooks/服务能力对照，抽取候选与同名异实现清单
author: YYC³ Team <admin@0379.email>
version: v1.0.0
created: 2026-11-10
updated: 2026-11-10
status: active
tags: [single-source, capability-matrix, refactor, music]
category: report
language: zh-CN
audience: developers,architects
complexity: intermediate
---

# 音乐场景单源化差异矩阵

> 由 \`scripts/analyze-music-landscape.mjs\` 生成（只读扫描，未修改任何兄弟项目）。
> 生成时间：${report.generatedAt}

## 一、扫描范围

| 项目 | 名称 | React | Vite | Tailwind | 测试栈 |
| --- | --- | --- | --- | --- | --- |
${table(stackRows)}

## 二、能力总览

当前源：${current.files} 个源文件 / ${current.loc} 行，组件 ${current.components.size}、hooks ${current.hooks.size}、服务 ${current.services.size}。

| 项目 | 文件 | 行数 | 组件 | Hooks | 服务 | 业务组件(与源重合) | Hooks 重合 |
| --- | --- | --- | --- | --- | --- | --- | --- |
${table(matrixRows)}

## 三、原语层重复

当前源 \`music-ui/src/ui\` 收录 ${uiCount(current)} 个原语；以下项目各自内置了 UI 原语副本，未依赖 \`@yyc3/music-ui\`。

| 项目 | 原语组件 | 业务组件 | 业务组件与源重合 |
| --- | --- | --- | --- |
${table(matrix.map((m) => [m.label, m.ui.total, m.ui.business, m.ui.businessOverlap]))}

## 四、抽取候选（≥2 个不同仓库共有、当前源缺失）

| 名称 | 类型 | 项目组 | 来源 | 体量(行) |
| --- | --- | --- | --- | --- |
${candRows.length ? table(candRows) : '| （无） | - | - | - | - |'}

## 五、同名异实现（当前源与兄弟项目重名且体量差异 ≥1.8×）

| 名称 | 类型 | 兄弟项目 | 当前源(行) | 兄弟(行) |
| --- | --- | --- | --- | --- |
${conflictRows.length ? table(conflictRows) : '| （无） | - | - | - | - |'}

## 六、单项目独有（默认不迁移）

共 ${soloList.length} 项，明细见同名 JSON。仅当出现第二个消费方时再评估。

## 七、结论

- 原语层重复：${matrix.filter((m) => m.ui.total > 0).map((m) => `${m.label} ${m.ui.total}`).join('、') || '无'}（当前源 ${uiCount(current)} 个原语）。
- 抽取候选 ${candidateList.length} 项，同名异实现 ${conflicts.length} 项，单项目独有 ${soloList.length} 项。
- 处置顺序：先补当前源缺失的业务组件（候选），再对齐同名异实现的契约，原语层按项目触达时替换，独有项不迁。
`;

const mdPath = path.join(OUT_DIR, 'YYC3-MusAI-音乐场景差异矩阵-2026-11-10.md');
fs.writeFileSync(mdPath, md);

console.log(`组件/hooks/服务：当前源 ${current.components.size}/${current.hooks.size}/${current.services.size}`);
for (const m of matrix) {
  console.log(`${m.label}: 文件 ${m.rows.files}，组件 ${m.rows.components}（与当前源重合 ${m.shared.components.overlap}），hooks ${m.rows.hooks}（重合 ${m.shared.hooks.overlap}）`);
}
console.log(`抽取候选 ${candidateList.length} 项，同名异实现 ${conflicts.length} 项，单项目独有 ${soloList.length} 项`);
console.log(`报告：${path.relative(CURRENT, mdPath)}`);
console.log(`数据：${path.relative(CURRENT, jsonPath)}`);
