# Urly

A site-specific browser generator for macOS. Register a URL — get a standalone `.app` you can launch from Spotlight, the Dock, or Cmd+Tab.

A personal-use WebUrly alternative. Hybrid architecture: one shared Electron runtime + lightweight per-app `.app` bundles.

## Features

- **Manage app**: grid + list views, search, tags, favorites, accent color presets, per-app cache / sign-out controls
- **Per-app .app bundles**: each shows its own name in Dock / Cmd+Tab / Spotlight with isolated cookies & sessions
- **Auto icon extraction**: PWA `manifest.json` first (high-res), then `apple-touch-icon` / `og:image` / `/favicon.ico`, with DuckDuckGo + Google S2 favicon services as universal fallback
- **APFS clonefile-based stubs**: each generated `.app` clones the shared engine via copy-on-write — no disk overhead per app

## Architecture

```
~/.urly/
  engine/                 ← shared Electron runtime (extracted on first run)
    Electron.app/
    app.asar
  apps/{appId}/
    config.json           ← name, url, tags, favorite, windowBounds
    icon.png              ← favicon source
    icon.icns             ← multi-resolution macOS icon
    userdata/             ← Chromium profile (cookies, localStorage, etc.)
  apps.json            ← master index
  settings.json           ← accent color + sidebar visibility

/Applications/Urly Apps/{Name}.app/
  Contents/
    MacOS/{Name}          ← Electron binary copy (~33KB)
    Frameworks/           ← Electron Framework, Helpers (APFS clonefile)
    Resources/
      app.asar -> ~/.urly/engine/app.asar
      app.icns            ← per-app icon
    Info.plist            ← CFBundleName=<Name>, UrlyAppID=<appId>
```

The engine reads `UrlyAppID` from its parent bundle's `Info.plist` to know which app to launch.

## Installation

**One line — recommended**

Paste this into Terminal. It downloads the latest release, installs Urly
into `/Applications`, strips the Gatekeeper quarantine flag (the app isn't
code-signed, so macOS would otherwise refuse to launch it), and opens the app.

```bash
curl -fsSL https://raw.githubusercontent.com/Daekyo-Jeong/urly/main/install.sh | bash
```

Apple Silicon (M1/M2/M3) only. Intel Macs aren't supported.

---

**If you'd rather install manually**

Download the DMG from the latest release, drag `Urly.app` to your
Applications folder, then **one** of the following so macOS Gatekeeper lets
the (unsigned) app launch:

| Option | Command / steps |
|--------|------|
| Terminal | `xattr -cr /Applications/Urly.app` |
| Finder | Right-click `Urly.app` → **Open** → confirm in the warning sheet |
| System Settings (Sequoia+) | **Privacy & Security** → scroll to *"Urly was blocked…"* → **Open Anyway** |

The message *"Urly is damaged and can't be opened"* is misleading — the
app isn't damaged, it's just unsigned. We don't publish through the Apple
Developer Program ($99/year) since this is a personal-use tool.

## Development

```bash
npm install
npm run dev               # vite + electron in dev mode
```

## Build

```bash
npm run build:icon        # regenerate assets/icon.{svg,png,icns}
npm run build:app         # produces dist/build/Urly-*.dmg + Urly.app
```

## Stack

- **Electron 42** + **Vite 8** + **React 19**
- **electron-builder** for `.app` / `.dmg` packaging (unsigned, personal use)

## Status

- MVP 1 — engine core ✅
- MVP 2 — browser behavior (notifications, downloads, swipe nav) ✅
- MVP 3 — management UI (design system, tags, favorites, settings) ✅
- MVP 4 — packaging + Dock name fix ✅
