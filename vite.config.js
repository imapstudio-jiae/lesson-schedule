import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // 번들을 기능별 벤더 청크로 나눠 한 덩어리가 500kB를 넘지 않게 유지
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('lucide-react') || id.includes('@dnd-kit')) return 'vendor-icons';
          return 'vendor-react';
        },
      },
    },
  },
})
