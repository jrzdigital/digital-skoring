import { spawn, execSync } from "child_process";

// Ensure icons are freshly generated with pristine binary structures before packaging
try {
  execSync("node scripts/generate-icons.cjs", { stdio: "inherit" });
} catch (e) {
  console.warn("Peringatan saat membuat icon:", e.message);
}

// Set environment variables for high-speed CDN mirrors to prevent the 10-minute (600000ms) download timeout
process.env.ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/";
process.env.ELECTRON_BUILDER_BINARIES_MIRROR = "https://npmmirror.com/mirrors/electron-builder-binaries/";

console.log("------------------------------------------------------------------");
console.log("⚡ MENYIAPKAN INSTALASI DEPLOYMENT DESKTOP (JRZ SCORE) ⚡");
console.log("------------------------------------------------------------------");
console.log("Menggunakan CDN Mirror Berkecepatan Tinggi untuk mencegah Timeout:");
console.log(` • ELECTRON_MIRROR                  : ${process.env.ELECTRON_MIRROR}`);
console.log(` • ELECTRON_BUILDER_BINARIES_MIRROR : ${process.env.ELECTRON_BUILDER_BINARIES_MIRROR}`);
console.log("------------------------------------------------------------------");

const args = ["--win"];

console.log(`→ Menjalankan npx electron-builder ${args.join(" ")}...`);

const child = spawn("npx", ["electron-builder", ...args], {
  stdio: "inherit",
  shell: true,
  env: process.env
});

child.on("close", (code) => {
  if (code === 0) {
    console.log("✨ Pengemasan Aplikasi Desktop Selesai dengan Sukses!");
  } else {
    console.error(`❌ Pengemasan Gagal dengan kode keluar ${code}`);
  }
  process.exit(code || 0);
});
