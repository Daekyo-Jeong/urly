#!/usr/bin/env bash
# Catalog — one-line installer
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Daekyo-Jeong/catalog/main/install.sh | bash
#
# What it does:
#   1. Verifies you're on macOS arm64 (Apple Silicon)
#   2. Downloads the latest DMG from GitHub Releases
#   3. Mounts it, copies Catalog.app to /Applications
#   4. Strips com.apple.quarantine so Gatekeeper doesn't block first launch
#   5. Unmounts, cleans up, and launches Catalog

set -euo pipefail

REPO="Daekyo-Jeong/catalog"
APP_NAME="Catalog.app"
INSTALL_DIR="/Applications"

# ── tiny logger ───────────────────────────────────────────────────────
c_dim="\033[2m"; c_bold="\033[1m"; c_green="\033[32m"; c_red="\033[31m"; c_reset="\033[0m"
say() { printf "${c_bold}%s${c_reset}\n" "$1"; }
note() { printf "${c_dim}%s${c_reset}\n" "$1"; }
err() { printf "${c_red}✗ %s${c_reset}\n" "$1" >&2; }
ok() { printf "${c_green}✓ %s${c_reset}\n" "$1"; }

# ── pre-flight ────────────────────────────────────────────────────────
[[ "$(uname -s)" == "Darwin" ]] || { err "macOS only."; exit 1; }
ARCH=$(uname -m)
if [[ "$ARCH" != "arm64" ]]; then
  err "Apple Silicon (M1+) required. Your machine reports: $ARCH"
  err "Intel Macs aren't supported in this release."
  exit 1
fi

# ── find latest release asset ─────────────────────────────────────────
say "Looking up latest Catalog release…"
API="https://api.github.com/repos/${REPO}/releases/latest"
ASSET_URL=$(curl -fsSL "$API" \
  | grep -E '"browser_download_url".*\.dmg"' \
  | head -1 \
  | sed -E 's/.*"(https:[^"]+\.dmg)".*/\1/')

if [[ -z "${ASSET_URL:-}" ]]; then
  err "Couldn't find a .dmg asset on the latest release."
  err "Check https://github.com/${REPO}/releases"
  exit 1
fi

DMG_NAME=$(basename "$ASSET_URL")
note "Found: $DMG_NAME"

# ── download ──────────────────────────────────────────────────────────
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

say "Downloading…"
curl -fL --progress-bar "$ASSET_URL" -o "$TMP/$DMG_NAME"

# ── mount ─────────────────────────────────────────────────────────────
say "Mounting DMG…"
MOUNT_POINT="$TMP/mnt"
mkdir -p "$MOUNT_POINT"
hdiutil attach "$TMP/$DMG_NAME" -nobrowse -mountpoint "$MOUNT_POINT" -quiet

# ── copy to /Applications ─────────────────────────────────────────────
SRC="$MOUNT_POINT/$APP_NAME"
DEST="$INSTALL_DIR/$APP_NAME"

if [[ ! -d "$SRC" ]]; then
  err "$APP_NAME not found inside the DMG."
  hdiutil detach "$MOUNT_POINT" -quiet || true
  exit 1
fi

if [[ -d "$DEST" ]]; then
  note "Replacing existing installation at $DEST"
  # Don't trash the user's userdata at ~/.catalog — that lives outside the .app
  rm -rf "$DEST"
fi

say "Installing to $INSTALL_DIR…"
# `ditto` preserves macOS metadata (icons, code signature, xattrs) better than `cp -R`
ditto "$SRC" "$DEST"

# ── unmount ───────────────────────────────────────────────────────────
hdiutil detach "$MOUNT_POINT" -quiet

# ── strip Gatekeeper quarantine ───────────────────────────────────────
# This is the key step that lets unsigned apps launch without the
# "Catalog is damaged" warning. Safe — we're only clearing flags on the
# .app we just installed.
say "Clearing quarantine attribute…"
xattr -cr "$DEST"

ok "Catalog installed at $DEST"
echo ""

# ── launch ────────────────────────────────────────────────────────────
say "Launching Catalog…"
open "$DEST"

echo ""
ok "All done. Catalog should be opening now."
note "If you ever need to reinstall, re-run this command."
