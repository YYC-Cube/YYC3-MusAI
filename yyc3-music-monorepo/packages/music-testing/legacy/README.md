# legacy/ — 血脉 A 测试参考资产

本目录存放血脉 A（D-Music-98 / D-Music-98M）的测试参考资产，供**阶段六 music-server 包建设**时参考：

- `98-backend-tests/` — D-Music-98 后端测试 3 件（Jest + Supertest）：
  - `auth.test.js`（认证）
  - `cache.test.js`（缓存）
  - `music.test.js`（音乐资源）
- `98M/` — D-Music-98M 星力算法测试 1 件：
  - `StarPowerCalculator.test.ts`（星力威尔逊（Wilson）评分算法）

**不参与构建/发布**：本目录仅为历史参考。`packages/music-testing` 的 `package.json` 已配置 `files: ["dist"]`，`legacy/` 不会进入发布产物；monorepo 测试/构建流程也不覆盖本目录。

原始项目（D-Music-98、D-Music-98M）已归档至 `../../archive/lineage-a/`（见 `archive/MANIFEST.md`）。
