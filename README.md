# Catalog

A site-specific browser generator for macOS. Register a URL — get a standalone `.app` you can launch from Spotlight, the Dock, or Cmd+Tab.

A personal-use WebCatalog alternative. Hybrid architecture: one shared Electron runtime + lightweight per-app `.app` bundles.

## Features

- **Manage app**: grid + list views, search, tags, favorites, accent color presets, per-app cache / sign-out controls
- **Per-app .app bundles**: each shows its own name in Dock / Cmd+Tab / Spotlight with isolated cookies & sessions
- **Auto icon extraction**: PWA `manifest.json` first (high-res), then `apple-touch-icon` / `og:image` / `/favicon.ico`, with DuckDuckGo + Google S2 favicon services as universal fallback
- **APFS clonefile-based stubs**: each generated `.app` clones the shared engine via copy-on-write — no disk overhead per app

## Architecture

```
~/.catalog/
  engine/                 ← shared Electron runtime (extracted on first run)
    Electron.app/
    app.asar
  apps/{appId}/
    config.json           ← name, url, tags, favorite, windowBounds
    icon.png              ← favicon source
    icon.icns             ← multi-resolution macOS icon
    userdata/             ← Chromium profile (cookies, localStorage, etc.)
  catalog.json            ← master index
  settings.json           ← accent color + sidebar visibility

/Applications/Catalog Apps/{Name}.app/
  Contents/
    MacOS/{Name}          ← Electron binary copy (~33KB)
    Frameworks/           ← Electron Framework, Helpers (APFS clonefile)
    Resources/
      app.asar -> ~/.catalog/engine/app.asar
      app.icns            ← per-app icon
    Info.plist            ← CFBundleName=<Name>, CatalogAppID=<appId>
```

The engine reads `CatalogAppID` from its parent bundle's `Info.plist` to know which app to launch.

## Development

```bash
npm install
npm run dev               # vite + electron in dev mode
```

## Build

```bash
npm run build:icon        # regenerate assets/icon.{svg,png,icns}
npm run build:app         # produces dist/build/Catalog-*.dmg + Catalog.app
```

## Stack

- **Electron 42** + **Vite 8** + **React 19**
- **electron-builder** for `.app` / `.dmg` packaging (unsigned, personal use)

## Status

- MVP 1 — engine core ✅
- MVP 2 — browser behavior (notifications, downloads, swipe nav) ✅
- MVP 3 — management UI (design system, tags, favorites, settings) ✅
- MVP 4 — packaging + Dock name fix ✅
