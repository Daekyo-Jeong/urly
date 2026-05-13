// Generate assets/icon.icns + assets/icon.png from the hand-tuned SVG at
// assets/icon-source.svg. That SVG was exported from Figma (file lGJBlqOFTyL...,
// node 13:44) where the squircle outline and inner-tile geometry were tuned
// by hand to satisfy Apple's macOS app-icon outline guidelines.
//
// We deliberately *don't* regenerate the squircle path procedurally anymore
// because every approximation introduced subtle drift from the Figma source.
// Treating the SVG as the canonical artifact keeps "what designers see in
// Figma" === "what ships in the .icns".
//
// Run: `npm run build:icon` (idempotent).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function svgToPng(svgPath, pngPath, size) {
  const tmpDir = path.dirname(pngPath);
  execFileSync('qlmanage', ['-t', '-s', String(size), '-o', tmpDir, svgPath], { stdio: 'pipe' });
  const generated = path.join(tmpDir, path.basename(svgPath) + '.png');
  if (fs.existsSync(generated)) fs.renameSync(generated, pngPath);
}

function buildIcns(srcPng, destIcns) {
  const tmpIconset = path.join(path.dirname(destIcns), `tmp-${Date.now()}.iconset`);
  ensureDir(tmpIconset);
  const sizes = [16, 32, 64, 128, 256, 512];
  for (const s of sizes) {
    execFileSync('sips', ['-z', String(s), String(s), srcPng, '--out', path.join(tmpIconset, `icon_${s}x${s}.png`)], { stdio: 'pipe' });
    if (s <= 256) {
      const d = s * 2;
      execFileSync('sips', ['-z', String(d), String(d), srcPng, '--out', path.join(tmpIconset, `icon_${s}x${s}@2x.png`)], { stdio: 'pipe' });
    }
  }
  execFileSync('iconutil', ['-c', 'icns', tmpIconset, '-o', destIcns]);
  fs.rmSync(tmpIconset, { recursive: true, force: true });
}

function main() {
  const assetsDir = path.resolve(__dirname, '..', 'assets');
  const srcSvg = path.join(assetsDir, 'icon-source.svg');
  const outPng = path.join(assetsDir, 'icon.png');
  const outIcns = path.join(assetsDir, 'icon.icns');

  if (!fs.existsSync(srcSvg)) {
    console.error(`Source SVG missing: ${srcSvg}`);
    process.exit(1);
  }

  ensureDir(assetsDir);
  svgToPng(srcSvg, outPng, 1024);
  buildIcns(outPng, outIcns);

  console.log(`Generated:
  ${outPng} (1024×1024 from ${path.basename(srcSvg)})
  ${outIcns} (multi-resolution)`);
}

main();
