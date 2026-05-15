// One-shot Catalog → Urly migration.
//
// Catalog was renamed to Urly in v0.2.0. Anyone who had the previous version
// installed still has ~/.catalog/ (their apps, settings, sessions) and a
// /Applications/Catalog Apps/ folder full of stubs that symlink into the
// old engine dir. After this rename none of that is reachable from the new
// code paths. So on the first launch of Urly we:
//
//   1. Move ~/.catalog/ → ~/.urly/ (preserves all per-app user data).
//   2. Rename catalog.json → apps.json (the master index changed name too,
//      since "catalog" stopped being the product name).
//   3. Wipe the old engine dir inside the moved tree — bootstrap.js will
//      re-extract a fresh Electron runtime into ~/.urly/engine/ on its own.
//   4. For each app in the index, regenerate its stub at
//      /Applications/Urly Apps/<name>.app so the user can keep launching
//      it from Spotlight / Dock / Cmd+Tab the same way they did before.
//   5. Best-effort delete /Applications/Catalog Apps/* — those bundles now
//      point at a vanished engine and would just confuse the user.
//
// Old /Applications/Catalog.app is left in place — the user installed it
// manually so they can uninstall it manually. We just print a one-line
// reminder.
//
// The whole thing is idempotent on a fingerprint file at ~/.urly/.migrated
// so it never runs twice.

const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const OLD_DIR = path.join(HOME, '.catalog');
const NEW_DIR = path.join(HOME, '.urly');
const OLD_INDEX = path.join(NEW_DIR, 'catalog.json');
const NEW_INDEX = path.join(NEW_DIR, 'apps.json');
const OLD_STUBS_DIR = '/Applications/Catalog Apps';
const MARKER = path.join(NEW_DIR, '.migrated-from-catalog');

function run() {
  // Marker present → already migrated, nothing to do.
  if (fs.existsSync(MARKER)) return { skipped: 'already-migrated' };
  // No old data → fresh install, nothing to migrate.
  if (!fs.existsSync(OLD_DIR)) return { skipped: 'no-old-data' };
  // Both exist → user manually copied one; don't risk merging.
  if (fs.existsSync(NEW_DIR)) {
    return { skipped: 'both-exist', warning: '~/.catalog and ~/.urly both exist — leave alone' };
  }

  console.log('[migration] Catalog → Urly: moving ~/.catalog/ → ~/.urly/');
  fs.renameSync(OLD_DIR, NEW_DIR);

  if (fs.existsSync(OLD_INDEX) && !fs.existsSync(NEW_INDEX)) {
    console.log('[migration] renaming catalog.json → apps.json');
    fs.renameSync(OLD_INDEX, NEW_INDEX);
  }

  // Old engine dir references the previous bundle layout and asar path. The
  // bootstrap will rebuild a fresh one into ~/.urly/engine/ on next call.
  const oldEngine = path.join(NEW_DIR, 'engine');
  if (fs.existsSync(oldEngine)) {
    console.log('[migration] removing stale engine dir; bootstrap will re-extract');
    fs.rmSync(oldEngine, { recursive: true, force: true });
  }

  // Regenerate stubs at new location. Delegate to the generator so we don't
  // duplicate Info.plist / icon-cloning / helper-renaming logic.
  let regenerated = 0;
  let regenerateFailed = 0;
  try {
    const { buildStubApp } = require('../generator/create-app');
    const apps = fs.existsSync(NEW_INDEX)
      ? (JSON.parse(fs.readFileSync(NEW_INDEX, 'utf-8')).apps || [])
      : [];
    for (const entry of apps) {
      try {
        const appDir = path.join(NEW_DIR, 'apps', entry.appId);
        const config = JSON.parse(fs.readFileSync(path.join(appDir, 'config.json'), 'utf-8'));
        const icnsPath = path.join(appDir, 'icon.icns');
        buildStubApp({
          appId: entry.appId,
          name: config.name,
          url: config.url,
          iconPath: fs.existsSync(icnsPath) ? icnsPath : undefined,
        });
        regenerated++;
      } catch (err) {
        console.warn(`[migration] failed to regenerate stub for ${entry.appId}:`, err.message);
        regenerateFailed++;
      }
    }
  } catch (err) {
    console.warn('[migration] stub regeneration step failed entirely:', err.message);
  }

  // Best-effort cleanup of stale Catalog Apps stubs — they're symlinked into
  // a dir that no longer exists. Don't fail the migration if perms block.
  let oldStubsRemoved = 0;
  if (fs.existsSync(OLD_STUBS_DIR)) {
    try {
      const entries = fs.readdirSync(OLD_STUBS_DIR);
      for (const e of entries) {
        try {
          fs.rmSync(path.join(OLD_STUBS_DIR, e), { recursive: true, force: true });
          oldStubsRemoved++;
        } catch {}
      }
      try { fs.rmdirSync(OLD_STUBS_DIR); } catch {}
    } catch {}
  }

  fs.writeFileSync(MARKER, new Date().toISOString());
  console.log(`[migration] done: ${regenerated} stubs regenerated, ${oldStubsRemoved} old stubs cleaned`);
  console.log('[migration] /Applications/Catalog.app is left in place — delete it manually if you no longer want it');
  return { migrated: true, regenerated, regenerateFailed, oldStubsRemoved };
}

module.exports = { run };
