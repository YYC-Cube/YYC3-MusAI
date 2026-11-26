import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 终审遗留闭环：CRA(react-scripts, EOL) → Vite——清除其 webpack 工具链
// 传递漏洞（serialize-javascript/svgo/postcss/webpack-dev-* 等 ~20 high），
// 使全仓 audit 可切回全量口径（0 high 目标）
export default defineConfig({
  plugins: [react()],
  server: { port: 3199, host: true },
  build: { outDir: 'dist', emptyOutDir: true },
})
