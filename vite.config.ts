import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": "/src/core",
      "@extension": "/src/extension",
      "@marketplaces": "/src/marketplaces",
      "@ui": "/src/ui",
      "@test": "/src/test"
    }
  },
  build: {
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        sidepanel: "sidepanel.html",
        background: "src/extension/background.ts",
        content: "src/extension/content.ts"
      },
      output: {
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
