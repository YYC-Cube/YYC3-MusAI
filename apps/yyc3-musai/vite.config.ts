import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3198,
    host: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const marker = 'node_modules/'
          const lastIndex = id.lastIndexOf(marker)
          if (lastIndex === -1) return undefined

          // pnpm 的 store 路径带有 peer 后缀，必须取最后一段 node_modules 后的真实包名
          const rest = id.slice(lastIndex + marker.length)
          const pkgName = rest.startsWith('@')
            ? rest.split('/').slice(0, 2).join('/')
            : rest.split('/')[0]

          if (pkgName === 'react' || pkgName === 'react-dom' || pkgName === 'scheduler') {
            return 'vendor-react'
          }
          if (pkgName.startsWith('@radix-ui/')) return 'vendor-radix'
          // cmdk / vaul 依赖 @radix-ui/react-dialog，并入同组避免环形 chunk
          if (pkgName === 'cmdk' || pkgName === 'vaul') return 'vendor-radix'
          // 终审 R7：流媒体内核单独分组（video 模式动态加载，勿并入首屏 vendor）
          if (pkgName === 'hls.js' || pkgName === 'video.js' || pkgName === '@videojs') return 'vendor-video'
          // 终审 R7：日历/日期组单独拆出，削减兜底 vendor 体积
          if (pkgName === 'react-day-picker' || pkgName === 'date-fns') return 'vendor-date'
          if (
            pkgName === 'recharts' ||
            pkgName === 'victory-vendor' ||
            pkgName === 'react-smooth' ||
            pkgName.startsWith('d3-')
          ) {
            return 'vendor-charts'
          }
          if (
            pkgName === 'motion' ||
            pkgName === 'framer-motion' ||
            pkgName.startsWith('motion-')
          ) {
            return 'vendor-motion'
          }
          if (pkgName === 'lucide-react') return 'vendor-icons'
          if (pkgName === 'react-router' || pkgName.startsWith('react-router-')) {
            return 'vendor-router'
          }
          return 'vendor'
        },
      },
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
