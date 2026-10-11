const fs = require('fs');
const path = require('path');

let pngToIco = null;
try {
  const pngToIcoModule = require('png-to-ico');
  pngToIco = pngToIcoModule.default || pngToIcoModule;
} catch (e) {
  // png-to-ico is optional; fallback to existing pre-generated ICO files
}

async function main() {
  console.log('🔄 Menyiapkan ikon Windows (.ico) standar biner NSIS & Windows...');
  
  const publicDir = path.join(__dirname, '..', 'public');
  const buildDir = path.join(__dirname, '..', 'build');
  const distDir = path.join(__dirname, '..', 'dist');

  const rootPng = path.join(__dirname, '..', 'jrzscoreutama.png');
  const rootIco = path.join(__dirname, '..', 'jrzscoreutama.ico');
  const rootDewanPng = path.join(__dirname, '..', 'jrzscoredewan.png');
  const rootWatermarkPng = path.join(__dirname, '..', 'jrzscorewatermak.png');

  const publicPng = path.join(publicDir, 'jrzscoreutama.png');
  const publicIco = path.join(publicDir, 'jrzscoreutama.ico');
  const publicDewanPng = path.join(publicDir, 'jrzscoredewan.png');
  const publicWatermarkPng = path.join(publicDir, 'jrzscorewatermak.png');
  const legacyIco = path.join(publicDir, 'aplikasiwindows.ico');
  const publicSvg = path.join(publicDir, 'logo_panel_dewan.svg');

  // Sync from root if any were created in root
  if (fs.existsSync(rootPng) && (!fs.existsSync(publicPng) || fs.statSync(rootPng).size !== fs.statSync(publicPng).size)) {
    fs.copyFileSync(rootPng, publicPng);
  }
  if (fs.existsSync(rootIco) && (!fs.existsSync(publicIco) || fs.statSync(rootIco).size !== fs.statSync(publicIco).size)) {
    fs.copyFileSync(rootIco, publicIco);
  }
  if (fs.existsSync(rootDewanPng) && (!fs.existsSync(publicDewanPng) || fs.statSync(rootDewanPng).size !== fs.statSync(publicDewanPng).size)) {
    fs.copyFileSync(rootDewanPng, publicDewanPng);
  }
  if (fs.existsSync(rootWatermarkPng) && (!fs.existsSync(publicWatermarkPng) || fs.statSync(rootWatermarkPng).size !== fs.statSync(publicWatermarkPng).size)) {
    fs.copyFileSync(rootWatermarkPng, publicWatermarkPng);
  }

  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }

  const buildIco = path.join(buildDir, 'icon.ico');
  const buildPng = path.join(buildDir, 'icon.png');
  const sourceIco = fs.existsSync(publicIco) ? publicIco : (fs.existsSync(rootIco) ? rootIco : null);
  const sourcePng = fs.existsSync(publicPng) ? publicPng : (fs.existsSync(rootPng) ? rootPng : null);

  // Generate SVG from JRZ Score PNG for clean vector fallbacks
  if (fs.existsSync(sourcePng)) {
    const pngBuf = fs.readFileSync(sourcePng);
    const base64 = pngBuf.toString('base64');
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">\n  <image href="data:image/png;base64,${base64}" width="512" height="512" />\n</svg>\n`;
    fs.writeFileSync(publicSvg, svgContent);
    fs.copyFileSync(sourcePng, buildPng);
  }

  // Helper to validate ICO binary integrity (ensures resedit / electron-builder never encounters Offset outside bounds)
  function isValidIco(buf) {
    if (!buf || buf.length < 22) return false;
    try {
      const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
      const reserved = dv.getUint16(0, true);
      const type = dv.getUint16(2, true);
      const count = dv.getUint16(4, true);
      if (reserved !== 0 || type !== 1 || count === 0) return false;
      for (let i = 0; i < count; i++) {
        const offset = 6 + i * 16;
        const bytesInRes = dv.getUint32(offset + 8, true);
        const imgOffset = dv.getUint32(offset + 12, true);
        if (imgOffset + bytesInRes > buf.length) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  let finalIcoBuffer = null;

  // Generate multi-resolution ICO from original PNG if png-to-ico is available
  if (pngToIco && sourcePng && fs.existsSync(sourcePng)) {
    try {
      const generatedBuf = await pngToIco(sourcePng);
      if (isValidIco(generatedBuf)) {
        finalIcoBuffer = generatedBuf;
      }
    } catch (e) {
      console.warn("Konversi png-to-ico dilewati:", e.message);
    }
  }

  // If conversion was not run or failed, check existing ICO file validity
  if (!finalIcoBuffer && sourceIco && fs.existsSync(sourceIco)) {
    const existingBuf = fs.readFileSync(sourceIco);
    if (isValidIco(existingBuf)) {
      finalIcoBuffer = existingBuf;
    }
  }

  if (finalIcoBuffer) {
    fs.writeFileSync(publicIco, finalIcoBuffer);
    fs.writeFileSync(buildIco, finalIcoBuffer);
    fs.writeFileSync(legacyIco, finalIcoBuffer);

    // Copy into dist folder if it exists
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, 'jrzscoreutama.ico'), finalIcoBuffer);
      fs.writeFileSync(path.join(distDir, 'icon.ico'), finalIcoBuffer);
      fs.writeFileSync(path.join(distDir, 'aplikasiwindows.ico'), finalIcoBuffer);
      if (fs.existsSync(sourcePng)) {
        fs.copyFileSync(sourcePng, path.join(distDir, 'jrzscoreutama.png'));
        fs.copyFileSync(sourcePng, path.join(distDir, 'icon.png'));
      }
      if (fs.existsSync(publicDewanPng)) {
        fs.copyFileSync(publicDewanPng, path.join(distDir, 'jrzscoredewan.png'));
      }
      if (fs.existsSync(publicWatermarkPng)) {
        fs.copyFileSync(publicWatermarkPng, path.join(distDir, 'jrzscorewatermak.png'));
      }
      if (fs.existsSync(publicSvg)) {
        fs.copyFileSync(publicSvg, path.join(distDir, 'logo_panel_dewan.svg'));
      }
    }

    console.log(`✅ Berhasil membuat & memvalidasi ikon biner Windows/NSIS (${finalIcoBuffer.length} bytes):`);
    console.log(` • ${publicIco}`);
    console.log(` • ${buildIco}`);
    console.log(` • ${legacyIco}`);
    console.log(` • ${buildPng}`);
  } else {
    console.warn('⚠️ Tidak ada berkas .ico yang perlu diperbarui, melanjutkan proses build...');
  }
}

main();
