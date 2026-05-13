// Generate assets/icon.icns + assets/icon.png from the SVG design tokens.
// We don't depend on canvas/sharp; macOS ships everything we need:
//   - `qlmanage` renders our SVG to PNG at the size we want.
//   - `sips`/`iconutil` builds the multi-resolution icns.
//
// Run: `node scripts/build-icon.js`. Idempotent.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Apple HIG macOS icon grid:
//   Canvas:  1024 × 1024
//   Squircle: 824 × 824, centered (≈ 80% of canvas)
//   Padding: 100 px on each side — reserved for the subtle drop shadow macOS
//            paints under app icons. Without this padding, when macOS renders
//            the icon over a light surface (Dock background, Finder column,
//            launchpad highlight) the squircle's outer edge sits right on the
//            canvas border and the surrounding rectangular bounding box bleeds
//            through as a faint halo.
//
// We work in a 1024×1024 viewBox directly so coordinates match real pixels.
const CANVAS = 1024;
const ICON_SIZE = 1024;
const ICON_OFFSET = (CANVAS - ICON_SIZE) / 2;

// True iOS-style squircle (Apple's continuous-corner shape).
//
// A simple 4-segment rounded rect (one cubic per corner) has G1 continuity:
// the curve and the straight edge meet at a tangent, but the *curvature*
// jumps discontinuously, so the shape reads as a rounded SQUARE.
//
// Apple's app icon shape splits each corner into TWO Bézier segments. The
// corner enters and exits the round portion gradually, so the curvature is
// continuous (G2). The control-point coordinates below come from Figma's
// "smooth corners" math at 60% smoothing — that's the standard iOS app icon
// squircle, traced over a 100×100 unit box.
const SQUIRCLE_100 =
  'M 50 0 ' +
  'C 80.74 0 91.86 0 95.59 4.41 ' +
  'C 99.32 8.83 100 19.94 100 50 ' +
  'C 100 80.06 99.32 91.17 95.59 95.59 ' +
  'C 91.86 100 80.74 100 50 100 ' +
  'C 19.26 100 8.14 100 4.41 95.59 ' +
  'C 0.68 91.17 0 80.06 0 50 ' +
  'C 0 19.94 0.68 8.83 4.41 4.41 ' +
  'C 8.14 0 19.26 0 50 0 Z';

function makeSVG() {
  // Squares grid sized relative to ICON_SIZE, matching CatalogIcon.jsx ratios.
  const tile = (i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cell = ICON_SIZE * 0.21;
    const gap = ICON_SIZE * 0.06;
    const innerSize = cell * 2 + gap;
    const start = (ICON_SIZE - innerSize) / 2 + ICON_OFFSET;
    const x = start + col * (cell + gap);
    const y = start + row * (cell + gap);
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" rx="${(cell * 0.22).toFixed(1)}" fill="white" />`;
  };

  // Subtle inner highlight — gradient over the top half for a touch of depth.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}">
  <defs>
    <clipPath id="sq">
      <path transform="translate(${ICON_OFFSET} ${ICON_OFFSET}) scale(${ICON_SIZE / 100})" d="${SQUIRCLE_100}"/>
    </clipPath>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF8C5A"/>
      <stop offset="100%" stop-color="#E84B1F"/>
    </linearGradient>
    <linearGradient id="hl" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#sq)">
    <rect x="${ICON_OFFSET}" y="${ICON_OFFSET}" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="url(#grad)"/>
    <rect x="${ICON_OFFSET}" y="${ICON_OFFSET}" width="${ICON_SIZE}" height="${ICON_SIZE}" fill="url(#hl)"/>
    ${[0,1,2,3].map(tile).join('\n    ')}
  </g>
</svg>`;
}

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function svgToPng(svgPath, pngPath, size) {
  // qlmanage renders the SVG via QuickLook. -s sets the long edge in pixels.
  const tmpDir = path.dirname(pngPath);
  execFileSync('qlmanage', ['-t', '-s', String(size), '-o', tmpDir, svgPath], { stdio: 'pipe' });
  // qlmanage outputs `<basename>.png` in the target dir
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
  ensureDir(assetsDir);

  const svgPath = path.join(assetsDir, 'icon.svg');
  const pngPath = path.join(assetsDir, 'icon.png');
  const icnsPath = path.join(assetsDir, 'icon.icns');

  fs.writeFileSync(svgPath, makeSVG());
  svgToPng(svgPath, pngPath, 1024);
  buildIcns(pngPath, icnsPath);

  console.log(`Generated:
  ${svgPath}
  ${pngPath} (1024×1024)
  ${icnsPath} (multi-resolution)`);
}

main();
