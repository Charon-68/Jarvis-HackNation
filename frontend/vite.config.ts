import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * Static hosts (Render static sites included) serve /app from /app/index.html.
 * Emitting a copy of the SPA shell there makes deep links and refreshes on
 * /app work without a host-side rewrite rule. Assets use absolute /assets/ paths.
 */
function spaRouteCopies(routes: string[]): Plugin {
  let outDir = "dist";
  return {
    name: "spa-route-copies",
    apply: "build",
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      for (const r of routes) {
        mkdirSync(`${outDir}/${r}`, { recursive: true });
        copyFileSync(`${outDir}/index.html`, `${outDir}/${r}/index.html`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), spaRouteCopies(["app"])],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    host: "127.0.0.1",
    // Dev only: API_PROXY=https://<backend> proxies /api so the local UI can hit a
    // deployed backend without CORS changes. Unset = relative /api (mock fallback).
    proxy: process.env.API_PROXY
      ? { "/api": { target: process.env.API_PROXY, changeOrigin: true, secure: true } }
      : undefined,
  },
});
