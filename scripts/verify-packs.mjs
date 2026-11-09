#!/usr/bin/env node
/**
 * @file verify-packs.mjs
 * @description 校验可发布包的打包产物：README、dist 入口与类型声明必须随包发布
 * @author YYC³ Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-11-09
 * @status stable
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const packagesDir = path.join(root, 'packages')

const publicPackages = readdirSync(packagesDir)
  .map((dir) => path.join(packagesDir, dir))
  .filter((dir) => existsSync(path.join(dir, 'package.json')))
  .map((dir) => ({ dir, pkg: JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')) }))
  .filter(({ pkg }) => !pkg.private)

let failed = 0

for (const { dir, pkg } of publicPackages) {
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const parsed = JSON.parse(raw)
  const [result] = Array.isArray(parsed) ? parsed : Object.values(parsed)
  const files = result.files.map((f) => f.path)
  const problems = []

  if (!files.includes('README.md')) problems.push('缺少 README.md')
  if (!files.some((f) => f.startsWith('dist/'))) problems.push('缺少 dist/ 产物')

  const { publishConfig } = pkg
  for (const field of ['main', 'types']) {
    const target = publishConfig?.[field]
    if (!target) {
      problems.push(`publishConfig.${field} 未配置`)
      continue
    }
    if (!existsSync(path.join(dir, target))) problems.push(`入口不存在: ${target}`)
  }

  const label = `${pkg.name}@${pkg.version}`
  if (problems.length > 0) {
    failed += 1
    console.error(`✗ ${label}`)
    for (const p of problems) console.error(`    - ${p}`)
  } else {
    console.log(`✓ ${label} — ${files.length} 个文件, ${(result.size / 1024).toFixed(1)} kB`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} 个包未通过打包校验`)
  process.exit(1)
}

console.log(`\n全部 ${publicPackages.length} 个公开包通过打包校验`)
