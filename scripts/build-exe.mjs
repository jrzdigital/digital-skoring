/**
 * Otomatisasi Pembuatan Installer Windows (.exe) - JRZ SCORE IPSI 2026
 * Menghasilkan:
 * 1. release/JRZ SCORE IPSI 2026-nsis-1.0.0.exe (Setup Installer Windows)
 * 2. release/JRZ SCORE IPSI 2026-Portable-1.0.0.exe (Aplikasi Portable Langsung Pakai)
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function runStep(title, cmd) {
  console.log(`\n=============================================================`);
  console.log(`[JRZ EXE BUILDER] ${title}`);
  console.log(`=============================================================\n`);
  execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
}

const electronBin = path.resolve(process.cwd(), "node_modules", "electron");
const builderBin = path.resolve(process.cwd(), "node_modules", "electron-builder");

if (!fs.existsSync(electronBin) || !fs.existsSync(builderBin)) {
  runStep(
    "Mengunduh komponen pembuat .EXE Windows (electron & electron-builder)...",
    "npm install --no-save electron@^33.2.0 electron-builder@^25.1.8"
  );
}

runStep(
  "Langkah 1/3: Mengompilasi Antarmuka Frontend Offline (index.offline.html)...",
  "npm run build:offline"
);

runStep(
  "Langkah 2/3: Mengompilasi Server Lokal Express (dist-server/server.cjs)...",
  "node scripts/build-server.mjs"
);

runStep(
  "Langkah 3/3: Membungkus Aplikasi Menjadi File Setup Installer .EXE Windows...",
  "npx electron-builder --config electron-builder.json --win"
);

console.log(`\n=============================================================`);
console.log(`✅ SELESAI! File Setup Installer (.exe) berhasil dibuat!`);
console.log(`📂 Lokasi file installer: ${path.resolve(process.cwd(), "release")}`);
console.log(`=============================================================\n`);
