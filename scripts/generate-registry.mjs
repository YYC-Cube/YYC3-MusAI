#!/usr/bin/env node
/**
 * @file generate-registry.mjs
 * @description 扫描工作区包源码生成组件注册表（registry.json），供文档站、RAG 与 CLI 消费
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 *
 * 用法：node scripts/generate-registry.mjs
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { curatedComponents, categoryByPackage } from './component-registry.manifest.mjs';

const root = path.resolve(import.meta.dirname, '..');
const packagesDir = path.join(root, 'packages');

const EXCLUDE_DIRS = new Set(['dist', 'test', 'tests', '__tests__', 'types', 'node_modules']);
const EXCLUDE_FILE = /\.(test|spec)\.(tsx|jsx)$|\.d\.ts$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.has(name)) walk(full, out);
      continue;
    }
    if (/\.(tsx|jsx)$/.test(name) && !EXCLUDE_FILE.test(name)) out.push(full);
  }
  return out;
}

function readPackage(pkgDir) {
  const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  if (pkg.private) return null;
  const readmePath = path.join(pkgDir, 'README.md');
  let tagline = pkg.description ?? '';
  if (existsSync(readmePath)) {
    const quote = readFileSync(readmePath, 'utf8').split('\n').find((l) => l.startsWith('> '));
    if (quote) tagline = quote.replace(/^>\s*/, '').trim() || tagline;
  }
  return { pkg, tagline };
}

function extractExports(source) {
  const names = new Set();
  const patterns = [
    /export const ([A-Z][A-Za-z0-9_]*)/g,
    /export function ([A-Z][A-Za-z0-9_]*)/g,
    /export default function ([A-Z][A-Za-z0-9_]*)/g,
    /export default ([A-Z][A-Za-z0-9_]*)\s*;?/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      if (/^[A-Z0-9_]+$/.test(name)) continue;
      if (/(Props|Context|Config|State|Return|Options)$/.test(name)) continue;
      names.add(name);
    }
  }

  // 聚合导出：export { Card, CardHeader as CardHead }
  for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of match[1].split(',')) {
      const cleaned = part.replace(/^\s*type\s+/, '').trim();
      const alias = cleaned.split(/\s+as\s+/).pop()?.trim();
      if (alias && /^[A-Z][A-Za-z0-9_]*$/.test(alias) && !/(Props|Context|Config|State|Return|Options)$/.test(alias)) {
        names.add(alias);
      }
    }
  }

  return [...names];
}

function extractProps(source, name) {
  const interfaceMatch = source.match(new RegExp(`(?:interface|type)\\s+${name}Props\\b[^{]*\\{([\\s\\S]*?)\\n\\}`, 'm'));
  if (!interfaceMatch) return [];
  const props = new Set();
  for (const line of interfaceMatch[1].split('\n')) {
    const field = line.match(/^\s{2}([a-zA-Z_$][\w$]*)\??\s*:/);
    if (field) props.add(field[1]);
  }
  return [...props];
}

const curatedByName = new Map(curatedComponents.map((c) => [`${c.package}::${c.name}`, c]));
const components = [];
const packages = [];

for (const dirName of readdirSync(packagesDir).sort()) {
  const pkgDir = path.join(packagesDir, dirName);
  if (!existsSync(path.join(pkgDir, 'package.json'))) continue;

  const info = readPackage(pkgDir);
  if (!info) continue;
  const { pkg, tagline } = info;

  const srcDir = path.join(pkgDir, 'src');
  if (!existsSync(srcDir)) continue;

  const seen = new Set();
  let count = 0;

  for (const file of walk(srcDir)) {
    const source = readFileSync(file, 'utf8');
    if (!/<[A-Za-z]/.test(source)) continue;

    for (const name of extractExports(source)) {
      if (seen.has(name)) continue;
      seen.add(name);

      const curated = curatedByName.get(`${pkg.name}::${name}`);
      const props = curated?.props?.length ? curated.props : extractProps(source, name);

      components.push({
        name,
        package: pkg.name,
        version: pkg.version,
        category: categoryByPackage[pkg.name] ?? '未分类',
        description: curated?.description ?? tagline,
        props,
        source: path.relative(root, file).split(path.sep).join('/'),
        demo: curated?.demo ?? null,
        example: curated?.example ?? null
      });
      count += 1;
    }
  }

  packages.push({
    name: pkg.name,
    version: pkg.version,
    description: tagline,
    componentCount: count
  });
}

components.sort((a, b) => a.package.localeCompare(b.package) || a.name.localeCompare(b.name));
packages.sort((a, b) => a.name.localeCompare(b.name));

const registry = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  totals: {
    packages: packages.length,
    components: components.length,
    curated: components.filter((c) => c.example).length
  },
  packages,
  components
};

const json = JSON.stringify(registry, null, 2) + '\n';
writeFileSync(path.join(root, 'registry.json'), json);

const docsDir = path.join(root, 'apps', 'component-docs', 'src');
mkdirSync(docsDir, { recursive: true });
writeFileSync(path.join(docsDir, 'registry.generated.json'), json);

console.log(`registry.json 已生成：${packages.length} 个包 / ${components.length} 个组件（含 ${registry.totals.curated} 个示例）`);
