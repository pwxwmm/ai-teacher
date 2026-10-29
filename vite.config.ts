import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// 构建指纹：设置页"关于"里展示，用于判断当前运行的应用是哪次构建
function gitStamp(): string {
  try {
    const opts = { stdio: ["ignore", "pipe", "ignore"] as const };
    const hash = execSync("git rev-parse --short HEAD", opts as object).toString().trim();
    const dirty = execSync("git status --porcelain", opts as object).toString().trim() !== "";
    return dirty ? `${hash}-dirty` : hash;
  } catch {
    return "nogit";
  }
}

// 真机调试时 Tauri 注入 TAURI_DEV_HOST（局域网 IP），dev server 需监听该地址供 iPhone 访问
const host = process.env.TAURI_DEV_HOST;

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as {
  version: string;
};
const now = new Date();
const pad = (n: number): string => String(n).padStart(2, "0");
const buildInfo = {
  version: pkg.version,
  hash: gitStamp(),
  time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
};

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  define: {
    __BUILD_INFO__: JSON.stringify(buildInfo),
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: {
      ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
});
