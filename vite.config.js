import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/vr-match/" : "/",
  plugins: [react()],
  css: { transformer: "postcss" },
  build: { cssMinify: false }
});
