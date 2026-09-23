/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In production Frank serves this build at / and the console calls /mcp on
// the same origin (ADR-006), so there is no Frank URL to configure and no
// CORS. `npm run dev` keeps that true by proxying to a local Frank.
const frank = process.env.FRANK_DEV_URL ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/mcp": frank,
      "/healthz": frank,
    },
  },
  test: {
    environment: "jsdom",
  },
});
