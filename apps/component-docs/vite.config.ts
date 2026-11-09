import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('lottie')) return 'lottie';
          if (id.includes('framer-motion') || id.includes('/motion/')) return 'motion';
          if (id.includes('react')) return 'react';
          return 'vendor';
        }
      }
    }
  }
});
