import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// CRA → Vite migration notes:
// * โปรเจกต์เขียน JSX ในไฟล์ .js (ไม่ใช่ .jsx) → ต้องบอก esbuild ให้โหลด .js เป็น jsx
//   ทั้งตอน serve (esbuild.loader) และตอน pre-bundle deps (optimizeDeps)
// * build.outDir = 'build' คงเดิม (เท่ากับ CRA) → netlify/vercel publish dir ไม่ต้องแก้
// * modulePreload.polyfill = false → Vite จะไม่ฉีด inline script ซึ่งชนกับ CSP
//   `script-src 'self'` (บังคับใน netlify.toml / vercel.json)
export default defineConfig({
  plugins: [react()],
  server: { port: Number(process.env.PORT) || 3000 },
  build: {
    outDir: 'build',
    modulePreload: { polyfill: false },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: { loader: { '.js': 'jsx' } },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: false,
  },
});
