import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // During `vite dev`, forward /api/* to the local Vercel functions
    // runtime (`vercel dev`, which serves on :3000). This lets you run the
    // frontend and backend together locally. See README for the two-terminal
    // workflow, or just use `vercel dev` alone which serves both.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
