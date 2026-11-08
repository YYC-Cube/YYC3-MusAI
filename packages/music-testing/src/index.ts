// YYC³ music-testing — 测试套件（自研 TestSuite 运行器 + 单元/集成/E2E 三档）
// 注：e2e-specs.ts 依赖 @playwright/test，发布配置就绪后经子路径导出（阶段五）
export * from './test-runner';
export * from './core-tests';
export * from './full-test-suite';
