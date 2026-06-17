import { defineConfig } from "vite";
import { defineConfig as defineVitestConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig(
  defineVitestConfig({
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          recorder: resolve(__dirname, "index.html"),
          settings: resolve(__dirname, "settings.html"),
        },
        output: { entryFileNames: "assets/[name].js", format: "es" },
      },
      copyPublicDir: true,
    },
    publicDir: "public",
    test: { environment: "node" },
  }),
);
