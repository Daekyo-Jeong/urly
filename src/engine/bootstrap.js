// First-run bootstrap: when Urly.app launches for the first time (or after
// being updated to a newer Electron version), extract its bundled Electron
// runtime and asar to ~/.urly/engine/ so that the lightweight stubs
// generated under /Applications/Urly Apps/ can keep running even if the
// user deletes or moves the parent Urly.app.
//
// In dev mode (running via `electron .` with no .app bundle), this is a no-op
// — the generator falls back to node_modules/electron.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const HOME = os.homedir();
const ENGINE_DIR = path.join(HOME, '.urly', 'engine');
const VERSION_FILE = path.join(ENGINE_DIR, 'version.txt');

// True when running inside a packaged .app (process.resourcesPath ends in
// /Contents/Resources). In dev, app.isPackaged is false and we skip bootstrap.
function isPackaged(app) {
  return app.isPackaged === true;
}

// Locate Urly.app's bundle from process.execPath:
//   /Applications/Urly.app/Contents/MacOS/Urly
// → /Applications/Urly.app
function getUrlyBundle() {
  // process.execPath = .../Urly.app/Contents/MacOS/Urly
  return path.dirname(path.dirname(path.dirname(process.execPath)));
}

function getInstalledVersion() {
  try {
    return fs.readFileSync(VERSION_FILE, 'utf-8').trim();
  } catch {
    return null;
  }
}

function getRuntimeVersion(app) {
  // Include the source app.asar's mtime in the version key. Without this any
  // rebuild that keeps the same package.json version + Electron version would
  // be considered "already installed" and `ensureEngine()` would skip
  // re-extraction, leaving stubs pointing at stale engine code. With the
  // mtime, every fresh build forces a fresh extraction.
  const urlyBundle = getUrlyBundle();
  const asarSrc = path.join(urlyBundle, 'Contents', 'Resources', 'app.asar');
  let mtime = 0;
  try { mtime = Math.floor(fs.statSync(asarSrc).mtimeMs); } catch {}
  return `${app.getVersion()}-electron-${process.versions.electron}-${mtime}`;
}

// Extract Urly.app's runtime to ~/.urly/engine/. Idempotent.
function extractEngine(app) {
  const urlyBundle = getUrlyBundle();
  const contentsDir = path.join(urlyBundle, 'Contents');
  const frameworksSrc = path.join(contentsDir, 'Frameworks');
  const binarySrc = path.join(contentsDir, 'MacOS', path.basename(process.execPath));
  const asarSrc = path.join(contentsDir, 'Resources', 'app.asar');
  const asarUnpackedSrc = path.join(contentsDir, 'Resources', 'app.asar.unpacked');

  // Engine structure mirrors a standard Electron.app so the generator can
  // treat it like one. We use cp -c (clonefile) on APFS for zero disk overhead.
  fs.mkdirSync(ENGINE_DIR, { recursive: true });
  const engineApp = path.join(ENGINE_DIR, 'Electron.app');
  const engineContents = path.join(engineApp, 'Contents');
  const engineMacOS = path.join(engineContents, 'MacOS');
  const engineFrameworks = path.join(engineContents, 'Frameworks');

  // Tear down any previous installation
  if (fs.existsSync(engineApp)) {
    fs.rmSync(engineApp, { recursive: true, force: true });
  }
  fs.mkdirSync(engineMacOS, { recursive: true });
  fs.mkdirSync(engineFrameworks, { recursive: true });

  // 1. Electron binary (the executable inside Urly.app's MacOS/). We give
  //    it the canonical name `Electron` so the generator can find it by path.
  execFileSync('cp', ['-c', binarySrc, path.join(engineMacOS, 'Electron')]);

  // 2. Frameworks — clone each entry. This is the big one (~150–300MB on
  //    paper); APFS shares the underlying blocks with Urly.app so actual
  //    disk delta is near zero.
  for (const entry of fs.readdirSync(frameworksSrc)) {
    execFileSync('cp', ['-cR', path.join(frameworksSrc, entry), path.join(engineFrameworks, entry)]);
  }

  // 3. App code: stubs reference this for their `Resources/app.asar` symlink.
  if (fs.existsSync(asarSrc)) {
    execFileSync('cp', ['-c', asarSrc, path.join(ENGINE_DIR, 'app.asar')]);
  }
  if (fs.existsSync(asarUnpackedSrc)) {
    execFileSync('cp', ['-cR', asarUnpackedSrc, path.join(ENGINE_DIR, 'app.asar.unpacked')]);
  }

  // 4. terminal-notifier — bundled helper that owns its own UNUserNotification
  //    permission (ad-hoc signed, stable bundle id fr.julienxx.oss.terminal-notifier).
  //    Ad-hoc signed stubs can't be granted notification permission by macOS,
  //    so we shell out to this helper with `-sender com.urly.app.<appId>`
  //    which makes the banner appear with the stub's icon and click-activate
  //    the stub. The .app is bundled inside Urly.app's Resources via
  //    electron-builder extraResources.
  const tnSrc = path.join(contentsDir, 'Resources', 'terminal-notifier.app');
  if (fs.existsSync(tnSrc)) {
    execFileSync('cp', ['-cR', tnSrc, path.join(ENGINE_DIR, 'terminal-notifier.app')]);
  }

  fs.writeFileSync(VERSION_FILE, getRuntimeVersion(app));
}

// Public: ensure ~/.urly/engine/ matches the running Urly.app's runtime.
// Call this once on app.whenReady() in the urly manager mode.
function ensureEngine(app) {
  if (!isPackaged(app)) return { skipped: 'dev' };
  const want = getRuntimeVersion(app);
  const have = getInstalledVersion();
  if (have === want && fs.existsSync(path.join(ENGINE_DIR, 'Electron.app'))) {
    return { skipped: 'up-to-date', version: have };
  }
  extractEngine(app);
  return { extracted: true, version: want, previous: have };
}

module.exports = { ensureEngine, ENGINE_DIR };
