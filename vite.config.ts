import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths'; // YENİ EKLENEN IMPORT

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths() // YENİ EKLENEN EKLENTİ
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    sourcemap: true, // veya 'inline-sourcemap'
  },
});