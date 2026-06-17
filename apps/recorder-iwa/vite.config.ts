import { defineConfig } from "vite";
import { defineConfig as defineVitestConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig(
  defineVitestConfig({
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "src/main.ts"),
        output: { entryFileNames: "app.js", format: "es" },
      },
      copyPublicDir: true,
    },
    publicDir: "public",
    test: { environment: "node" },
  }),
);
