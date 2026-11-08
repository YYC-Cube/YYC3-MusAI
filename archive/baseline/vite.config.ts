import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3198,
    host: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
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
          if (
            pkgName === 'recharts' ||
            pkgName === 'victory-vendor' ||
            pkgName === 'react-smooth' ||
            pkgName.startsWith('d3-')
          ) {
            return 'vendor-charts'
          }
          if (pkgName === 'motion' || pkgName === 'framer-motion') return 'vendor-motion'
          if (pkgName === '@supabase/supabase-js') return 'vendor-supabase'
          if (pkgName === 'lucide-react') return 'vendor-icons'
          if (pkgName === 'react-router' || pkgName.startsWith('react-router-')) {
            return 'vendor-router'
          }
          return 'vendor'
        },
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
