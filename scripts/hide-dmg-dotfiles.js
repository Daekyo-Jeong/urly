// electron-builder afterAllArtifactBuild hook.
//
// dmgbuild ships the DMG with two dot-prefixed decoration files:
//   .background.tiff  — window background image
//   .VolumeIcon.icns  — disk icon shown in Finder sidebar
//
// They're hidden by the leading "." but only that — when the user has
// "Show hidden files" turned on in Finder (Cmd+Shift+.), they appear inside
// the mounted DMG window alongside the app and the Applications symlink.
//
// Well-crafted DMGs (Figma, Sketch, etc.) additionally apply the HFS+
// invisible flag via `chflags hidden` so the files stay hidden even with
// the toggle on. We do that here:
//   1. Convert each .dmg from compressed (UDZO) to read-write (UDRW)
//   2. Mount it
//   3. chflags hidden the decoration files
//   4. Detach
//   5. Re-convert back to UDZO and replace the original
//
// Idempotent: if no decoration files are present, this is a no-op.

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = async function afterAllArtifactBuild(context) {
  const dmgs = (context.artifactPaths || []).filter(p => p.endsWith('.dmg'));
  for (const dmg of dmgs) {
    try {
      hideDecorationFiles(dmg);
      console.log(`hide-dmg-dotfiles: hardened ${path.basename(dmg)}`);
    } catch (err) {
      console.warn(`hide-dmg-dotfiles: skipped ${path.basename(dmg)} (${err.message})`);
    }
  }
  return [];
};

function hideDecorationFiles(dmgPath) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-dmg-'));
  const rwDmg = path.join(tmpDir, 'rw.dmg');
  const mountPoint = path.join(tmpDir, 'mnt');
  fs.mkdirSync(mountPoint, { recursive: true });

  try {
    // 1. Convert compressed → read-write so we can modify file attributes
    execFileSync('hdiutil', ['convert', dmgPath, '-format', 'UDRW', '-o', rwDmg, '-quiet']);

    // 2. Attach without bringing up a Finder window
    execFileSync('hdiutil', ['attach', rwDmg, '-nobrowse', '-mountpoint', mountPoint, '-quiet']);

    try {
      // 3. Apply HFS+ invisible bit to every dot-prefixed file at the root
      for (const entry of fs.readdirSync(mountPoint)) {
        if (entry.startsWith('.') && entry !== '.' && entry !== '..') {
          const target = path.join(mountPoint, entry);
          try {
            execFileSync('chflags', ['hidden', target]);
          } catch {
            // chflags can fail on certain pseudo-files; ignore and continue
          }
        }
      }
    } finally {
      // 4. Detach even on error so we don't leak mount points
      execFileSync('hdiutil', ['detach', mountPoint, '-quiet']);
    }

    // 5. Re-compress and replace the original
    const outDmg = path.join(tmpDir, 'out.dmg');
    execFileSync('hdiutil', ['convert', rwDmg, '-format', 'UDZO', '-imagekey', 'zlib-level=9', '-o', outDmg, '-quiet']);
    fs.copyFileSync(outDmg, dmgPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
