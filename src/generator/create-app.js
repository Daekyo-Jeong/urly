// Generates a stub .app that runs the shared Urly engine while showing
// its own name in Dock/Cmd+Tab/Spotlight.
//
// Strategy:
//   - Copy the tiny (~33KB) Electron binary into the stub at Contents/MacOS/{name}
//   - Symlink Electron's Frameworks (incl. Electron Framework, helpers) from
//     the shared engine to each stub's Contents/Frameworks/
//   - Symlink the engine's app code into Contents/Resources/app (dev) or
//     Contents/Resources/app.asar (production)
//   - Store the appId in Info.plist as a custom UrlyAppID key
//
// macOS reads the running binary's containing .app for Dock identity, so the
// stub's own Info.plist (CFBundleName) drives the display name.

const fs = require('fs');
const path = require('path');
const os = require('os');
const plist = require('plist');

const HOME = os.homedir();
const URLY_DIR = path.join(HOME, '.urly');
const APPS_DIR = path.join(URLY_DIR, 'apps');
const URLY_INDEX = path.join(URLY_DIR, 'apps.json');
const INSTALL_DIR = '/Applications/Urly Apps';

// Locate the shared Urly engine. Production: ~/.urly/engine/. Dev:
// node_modules/electron/dist/ + the project root acting as the app dir.
function resolveEngine() {
  const prodEngine = path.join(URLY_DIR, 'engine');
  if (fs.existsSync(path.join(prodEngine, 'Electron.app'))) {
    return {
      mode: 'prod',
      electronApp: path.join(prodEngine, 'Electron.app'),
      appCode: path.join(prodEngine, 'app.asar'), // may also be 'app'
      appCodeIsAsar: fs.existsSync(path.join(prodEngine, 'app.asar')),
    };
  }
  // Dev fallback: use node_modules and project root.
  const electronPkg = require.resolve('electron/package.json');
  const electronApp = path.join(path.dirname(electronPkg), 'dist', 'Electron.app');
  return {
    mode: 'dev',
    electronApp,
    appCode: path.resolve(__dirname, '..', '..'), // project root
    appCodeIsAsar: false,
  };
}

function ensureDirs() {
  for (const dir of [URLY_DIR, APPS_DIR, INSTALL_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadUrly() {
  if (fs.existsSync(URLY_INDEX)) {
    return JSON.parse(fs.readFileSync(URLY_INDEX, 'utf-8'));
  }
  return { apps: [] };
}

function saveUrly(urly) {
  fs.writeFileSync(URLY_INDEX, JSON.stringify(urly, null, 2));
}

// Derive a filesystem-safe identifier from the app name. The fallback chain
// matters: an app called "일주일 개인 근무시간 관리" would otherwise produce
// an empty slug, which then becomes a wildcard for every downstream path
// (config.json, icon.png, Info.plist's UrlyAppID, the .app bundle
// directory) and breaks launch.
function slugify(name, url) {
  // Step 1: keep ASCII alphanumerics from the name itself.
  const fromName = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (fromName) return fromName;

  // Step 2: derive from the URL's host + path. Strips protocol and trailing
  // slashes, then squashes everything else the same way.
  if (url) {
    try {
      const u = new URL(url.startsWith('http') ? url : `https://${url}`);
      const fromUrl = (u.hostname + u.pathname)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      if (fromUrl) return fromUrl;
    } catch {}
  }

  // Step 3: last resort — random 8-char id. Ensures we never write to the
  // apps/ root and never produce a bundle whose UrlyAppID is empty.
  return 'app-' + require('crypto').randomBytes(4).toString('hex');
}

function createPlaceholderIcon(destPath) {
  const sys = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns';
  if (fs.existsSync(sys)) fs.copyFileSync(sys, destPath);
}

// Rename a helper bundle's internal binary + Info.plist to match the stub.
// `oldBase` = original helper's base name (e.g. "Urly" or "Electron")
// `newBase` = stub's CFBundleName (e.g. "Notion")
// `suffix` = "" / " (GPU)" / " (Plugin)" / " (Renderer)"
function renameHelperInternals(originalApp, newApp, oldBase, newBase, suffix) {
  const oldExec = `${oldBase} Helper${suffix}`;
  const newExec = `${newBase} Helper${suffix}`;
  const macosDir = path.join(newApp, 'Contents', 'MacOS');
  const oldBin = path.join(macosDir, oldExec);
  const newBin = path.join(macosDir, newExec);
  if (fs.existsSync(oldBin)) fs.renameSync(oldBin, newBin);

  const plistPath = path.join(newApp, 'Contents', 'Info.plist');
  if (fs.existsSync(plistPath)) {
    const info = plist.parse(fs.readFileSync(plistPath, 'utf-8'));
    info.CFBundleExecutable = newExec;
    info.CFBundleName = newExec;
    info.CFBundleDisplayName = newExec;
    // CFBundleIdentifier may also embed the helper name — leave as-is to avoid
    // breaking signatures, but if needed: info.CFBundleIdentifier = `${info.CFBundleIdentifier}.helper`
    fs.writeFileSync(plistPath, plist.build(info));
  }
}

// Build (or rebuild) a stub .app for the given app config.
// Exposed for IPC handlers in main.js as well as the CLI entrypoint.
function buildStubApp({ appId, name, url, iconPath }) {
  const engine = resolveEngine();
  if (!fs.existsSync(engine.electronApp)) {
    throw new Error(`Urly engine not found at ${engine.electronApp}`);
  }

  // Per-app data directory
  const appDir = path.join(APPS_DIR, appId);
  const userdataDir = path.join(appDir, 'userdata');
  fs.mkdirSync(userdataDir, { recursive: true });

  // Per-app icon (icns) — caller may supply one; fall back to system default
  const icnsPath = path.join(appDir, 'icon.icns');
  if (iconPath && fs.existsSync(iconPath)) {
    fs.copyFileSync(iconPath, icnsPath);
  } else if (!fs.existsSync(icnsPath)) {
    createPlaceholderIcon(icnsPath);
  }

  // .app bundle — destroy + recreate
  fs.mkdirSync(INSTALL_DIR, { recursive: true });
  const appBundle = path.join(INSTALL_DIR, `${name}.app`);
  if (fs.existsSync(appBundle)) fs.rmSync(appBundle, { recursive: true });

  const contentsDir = path.join(appBundle, 'Contents');
  const macosDir = path.join(contentsDir, 'MacOS');
  const frameworksDir = path.join(contentsDir, 'Frameworks');
  const resourcesDir = path.join(contentsDir, 'Resources');
  fs.mkdirSync(macosDir, { recursive: true });
  fs.mkdirSync(frameworksDir, { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });

  // 1. Copy the Electron binary into MacOS/, renamed to the app name.
  //    The binary is tiny (~33KB); the heavy framework stays in the shared engine.
  const electronBinSrc = path.join(engine.electronApp, 'Contents', 'MacOS', 'Electron');
  const electronBinDest = path.join(macosDir, name);
  fs.copyFileSync(electronBinSrc, electronBinDest);
  fs.chmodSync(electronBinDest, 0o755);

  // 2. Clone each framework / helper .app from the shared engine into the
  //    stub's Frameworks/.
  //
  //    Symlinks would feel right (one disk copy, every stub points at it) but
  //    macOS rejects them: when Electron spawns a Helper child process the
  //    kernel validates bundle integrity via the audit token, and a symlinked
  //    helper resolving outside the stub's bundle gets the wrong identity →
  //    EXC_BREAKPOINT in the framework before app.whenReady() resolves.
  //
  //    `cp -c` uses APFS clonefile (copy-on-write): the destination shares
  //    storage blocks with the source until either file is modified. Since
  //    these binaries never change after install, every stub effectively pays
  //    zero additional disk space for the framework while macOS sees a
  //    self-contained .app bundle.
  //
  //    Helpers are additionally renamed to match the stub's CFBundleName,
  //    because at launch Electron looks for "<CFBundleName> Helper.app" — if
  //    the engine ships "Urly Helper.app" or "Electron Helper.app", a stub
  //    called "Notion" won't find its helper without rebranding.
  const engineFrameworks = path.join(engine.electronApp, 'Contents', 'Frameworks');
  const { execFileSync } = require('child_process');
  for (const entry of fs.readdirSync(engineFrameworks)) {
    const src = path.join(engineFrameworks, entry);
    const helperMatch = entry.match(/^(.+) Helper(?: \((GPU|Plugin|Renderer)\))?\.app$/);
    if (helperMatch) {
      const suffix = helperMatch[2] ? ` (${helperMatch[2]})` : '';
      const newHelperName = `${name} Helper${suffix}`;
      const destApp = path.join(frameworksDir, `${newHelperName}.app`);
      execFileSync('cp', ['-cR', src, destApp]);
      renameHelperInternals(src, destApp, helperMatch[1], name, suffix);
    } else {
      const dest = path.join(frameworksDir, entry);
      execFileSync('cp', ['-cR', src, dest]);
    }
  }

  // 3. Symlink the app code (main.js bundle).
  //    Electron looks for Resources/app.asar first, then Resources/app/.
  if (engine.appCodeIsAsar) {
    fs.symlinkSync(engine.appCode, path.join(resourcesDir, 'app.asar'));
  } else {
    fs.symlinkSync(engine.appCode, path.join(resourcesDir, 'app'));
  }

  // 4. Per-app icon
  fs.copyFileSync(icnsPath, path.join(resourcesDir, 'app.icns'));

  // 5. Info.plist — CFBundleName drives Dock display; UrlyAppID lets the
  //    engine resolve which app to load when launched without arguments.
  const info = plist.build({
    CFBundleName: name,
    CFBundleDisplayName: name,
    CFBundleIdentifier: `com.urly.app.${appId}`,
    CFBundleVersion: '1.0.0',
    CFBundleShortVersionString: '1.0.0',
    CFBundlePackageType: 'APPL',
    CFBundleSignature: '????',
    CFBundleExecutable: name,
    CFBundleIconFile: 'app.icns',
    LSMinimumSystemVersion: '12.0',
    NSHighResolutionCapable: true,
    LSUIElement: false,
    UrlyAppID: appId,
  });
  fs.writeFileSync(path.join(contentsDir, 'Info.plist'), info);

  // 6. Persist app config — the engine reads this on launch via UrlyAppID
  const config = {
    appId, name, url,
    tags: [],
    favorite: false,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  };
  const configPath = path.join(appDir, 'config.json');
  if (fs.existsSync(configPath)) {
    // Preserve user-set fields like tags/favorite/windowBounds
    const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    Object.assign(config, existing, { name, url, updated: new Date().toISOString() });
  }
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // 7. Refresh Finder/Spotlight metadata so the new app surfaces immediately
  try {
    require('child_process').execSync(`touch "${appBundle}"`);
  } catch {}

  return appBundle;
}

function main() {
  const [,, name, url] = process.argv;
  if (!name || !url) {
    console.error('Usage: node create-app.js <name> <url>');
    process.exit(1);
  }
  ensureDirs();
  const appId = slugify(name);
  const appBundle = buildStubApp({ appId, name, url });

  const urly = loadUrly();
  const existing = urly.apps.findIndex(a => a.appId === appId);
  if (existing >= 0) {
    urly.apps[existing] = { appId, name, url, updated: new Date().toISOString() };
  } else {
    urly.apps.push({ appId, name, url, created: new Date().toISOString() });
  }
  saveUrly(urly);

  console.log(`Created: ${appBundle}`);
  console.log(`Engine:  ${resolveEngine().mode} mode`);
}

module.exports = { buildStubApp, resolveEngine, slugify, INSTALL_DIR, APPS_DIR, URLY_INDEX };

if (require.main === module) {
  main();
}
