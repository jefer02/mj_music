import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  root: ".",
  resolve: {
    alias: {
      jsmediatags: fileURLToPath(new URL("./node_modules/jsmediatags/dist/jsmediatags.min.js", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    target: "es2020",
  },
  server: {
    port: 3000,
    open: true,
  },
});
