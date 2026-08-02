import { defineConfig } from 'vite';

// 相对路径 base + 内联资源 → 构建产物近乎单文件，可直接部署到任意静态托管 / GitHub Pages
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 100000000, // 100MB 内联，杜绝外部资源请求
    chunkSizeWarningLimit: 2000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true, // 合并为单入口，规避动态 import 的异步请求
      },
    },
  },
  server: {
    open: true,
    host: true,
  },
});
