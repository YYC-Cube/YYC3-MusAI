import { defineConfig } from 'vite'

// YYC³ 库模式构建：ESM 产出，外部化全部裸导入（React 由宿主提供）
export default defineConfig({
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rollupOptions: { external: (id) => !id.startsWith('.') && !id.startsWith('/') },
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
})
