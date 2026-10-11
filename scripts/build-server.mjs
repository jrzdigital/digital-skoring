/**
 * Mengompilasi server.ts + userManager.ts menjadi 1 file mandiri (dist-server/server.cjs)
 * menggunakan esbuild agar dapat langsung dibundel ke dalam installer Windows (.exe)
 */
import { build } from "esbuild";
import fs from "fs";
import path from "path";

const outDir = path.resolve(process.cwd(), "dist-server");
fs.mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: ["server.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(outDir, "server.cjs"),
  external: ["vite"],
  logOverride: { "empty-import-meta": "silent" },
  logLevel: "info"
});

console.log("[BUILD-SERVER] Berhasil mengompilasi server offline ke dist-server/server.cjs");
