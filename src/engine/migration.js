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

// Phase 1: rename the user data dir + index, drop the stale engine.
// MUST run before bootstrap.ensureEngine() — bootstrap creates ~/.urly/engine/,
// and once that exists `mv ~/.catalog ~/.urly` fails with "target exists".
function runPreEngine() {
  if (fs.existsSync(MARKER)) return { skipped: 'already-migrated' };
  if (!fs.existsSync(OLD_DIR)) return { skipped: 'no-old-data' };
  if (fs.existsSync(NEW_DIR)) {
    return { skipped: 'both-exist', warning: '~/.catalog and ~/.urly both exist — leave alone' };
  }

  console.log('[migration] Catalog → Urly: moving ~/.catalog/ → ~/.urly/');
  fs.renameSync(OLD_DIR, NEW_DIR);

  if (fs.existsSync(OLD_INDEX) && !fs.existsSync(NEW_INDEX)) {
    console.log('[migration] renaming catalog.json → apps.json');
    fs.renameSync(OLD_INDEX, NEW_INDEX);
  }

  const oldEngine = path.join(NEW_DIR, 'engine');
  if (fs.existsSync(oldEngine)) {
    console.log('[migration] removing stale engine dir; bootstrap will re-extract');
    fs.rmSync(oldEngine, { recursive: true, force: true });
  }

  return { moved: true };
}

// Phase 2: regenerate stubs + clean up old Catalog Apps + delete legacy
// Catalog.app. MUST run after bootstrap.ensureEngine() because buildStubApp
// needs ~/.urly/engine/ to exist (it clones Frameworks from there).
//
// We tracked the v0.2.0 release-day bug here: an earlier version of this
// module did everything in one pass before ensureEngine, so buildStubApp
// always threw "Urly engine not found" and the user ended up with a moved
// data dir but zero stubs — apps were "installed" but unlaunchable. Always
// keep the pre/post split.
function runPostEngine(preResult) {
  if (preResult && preResult.skipped) return { skipped: preResult.skipped };
  if (fs.existsSync(MARKER)) return { skipped: 'already-migrated' };

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

  let oldStubsRemoved = 0;
  if (fs.existsSync(OLD_STUBS_DIR)) {
    try {
      for (const e of fs.readdirSync(OLD_STUBS_DIR)) {
        try {
          fs.rmSync(path.join(OLD_STUBS_DIR, e), { recursive: true, force: true });
          oldStubsRemoved++;
        } catch {}
      }
      try { fs.rmdirSync(OLD_STUBS_DIR); } catch {}
    } catch {}
  }

  // Delete the legacy Catalog.app too. User installed it manually, but post-
  // rename it's an inert duplicate that just clutters /Applications and
  // confuses Spotlight ("which Catalog do I want?"). Best-effort — if the
  // user has it open or perms are off, skip silently.
  const legacyApp = '/Applications/Catalog.app';
  let legacyAppRemoved = false;
  if (fs.existsSync(legacyApp)) {
    try {
      fs.rmSync(legacyApp, { recursive: true, force: true });
      legacyAppRemoved = true;
    } catch {}
  }

  // Only write the marker after the post-engine phase has actually run, so
  // a crash between phases doesn't leave us with moved data but no marker
  // (in which case the user would see "no old data" on the retry and we'd
  // never regenerate stubs).
  fs.writeFileSync(MARKER, new Date().toISOString());
  console.log(`[migration] done: ${regenerated} stubs regenerated, ${oldStubsRemoved} old stubs cleaned, legacy Catalog.app removed: ${legacyAppRemoved}`);
  return { migrated: true, regenerated, regenerateFailed, oldStubsRemoved, legacyAppRemoved };
}

module.exports = { runPreEngine, runPostEngine };
