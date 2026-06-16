import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Flat config (eslint 9) แทน CRA preset "react-app" ที่หายไปพร้อม react-scripts.
// ครอบ rules พื้นฐาน (recommended) + react-hooks + react-refresh (Vite HMR)
export default [
  { ignores: ['build/**', 'dist/**', 'node_modules/**'] },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // jsx-uses-vars: บอก no-unused-vars ว่า identifier ที่ใช้ใน JSX (<Comp/>) ถูกใช้
      // (react-app preset เดิมให้ผ่าน eslint-plugin-react) · jsx-uses-react ไม่จำเป็น
      // กับ new JSX transform แต่ index.js ใช้ <React.StrictMode> ตรงๆ
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',
      // ตัวแปร/อาร์กิวเมนต์ที่ขึ้นต้น _ หรือ caught error ที่ไม่ใช้ = ไม่ flag
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // ไฟล์เทส (vitest globals: true) + setup — ประกาศ vitest globals ตรงๆ
  {
    files: ['src/**/*.test.{js,jsx}', 'src/setupTests.js'],
    languageOptions: {
      globals: {
        ...globals.browser, ...globals.node,
        vi: 'readonly', describe: 'readonly', it: 'readonly', test: 'readonly',
        expect: 'readonly', beforeEach: 'readonly', afterEach: 'readonly',
        beforeAll: 'readonly', afterAll: 'readonly',
      },
    },
  },
];
