import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const HEAVY_PAGES = [
  '/src/pages/Attendance.jsx',
  '/src/pages/Employees.jsx',
  '/src/pages/Profile.jsx',
  '/src/pages/Departments.jsx',
  '/src/pages/Performance.jsx',
  '/src/pages/Leaves.jsx',
  '/src/pages/Shifts.jsx',
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            if (
              id.includes('react-router') ||
              id.includes('react-dom') ||
              id.includes('/react/') ||
              id.includes('\\react\\')
            ) {
              return 'vendor';
            }
          }
          const normalized = id.replace(/\\/g, '/');
          if (HEAVY_PAGES.some((page) => normalized.endsWith(page))) {
            return 'pages-heavy';
          }
          if (normalized.includes('/src/pages/')) {
            return 'pages-light';
          }
        },
      },
    },
  },
})
