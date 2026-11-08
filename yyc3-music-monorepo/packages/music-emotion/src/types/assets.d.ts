/**
 * 小语 Lottie 动画 JSON 位于应用层 public 目录（`@/` 别名），包内不含实际资源文件。
 * 此处仅作通配符模块声明，使 `import('@/public/assets/animations/*.json')` 可通过 typecheck；
 * 运行时解析由消费方应用（Vite `@/` 别名）提供。
 */
declare module '@/public/assets/animations/*.json' {
  const value: any;
  export default value;
}
