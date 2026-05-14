#!/usr/bin/env bash
# Catalog one-line installer.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Daekyo-Jeong/catalog/main/install.sh | bash
#
# What it does:
#   1. Verifies macOS + Apple Silicon
#   2. Downloads the latest DMG from GitHub Releases
#   3. Mounts it, copies Catalog.app to /Applications via ditto
#   4. Strips com.apple.quarantine so Gatekeeper doesn't block first launch
#   5. Detaches the DMG cleanly, then opens Catalog
#
# Plain ASCII only (no curly quotes, no ellipsis) so the script survives any
# transcoding step between curl and bash.

set -eo pipefail

REPO="Daekyo-Jeong/catalog"
APP_NAME="Catalog.app"
INSTALL_DIR="/Applications"
TMP=""
MOUNT_POINT=""

c_bold=$'\033[1m'; c_dim=$'\033[2m'; c_green=$'\033[32m'; c_red=$'\033[31m'; c_reset=$'\033[0m'
say()  { printf "%s%s%s\n" "$c_bold"  "$1" "$c_reset"; }
note() { printf "%s%s%s\n" "$c_dim"   "$1" "$c_reset"; }
ok()   { printf "%s[ok] %s%s\n" "$c_green" "$1" "$c_reset"; }
err()  { printf "%s[error] %s%s\n" "$c_red" "$1" "$c_reset" >&2; }

# Cleanup runs on ANY exit. Detach the mounted DMG first so the next rm -rf
# only ever touches our /tmp dir (writable), never the read-only mountpoint.
cleanup() {
  if [ -n "$MOUNT_POINT" ] && [ -d "$MOUNT_POINT" ]; then
    /usr/bin/hdiutil detach "$MOUNT_POINT" -quiet -force >/dev/null 2>&1 || true
  fi
  if [ -n "$TMP" ] && [ -d "$TMP" ]; then
    rm -rf "$TMP" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Pre-flight
if [ "$(uname -s)" != "Darwin" ]; then
  err "macOS only."
  exit 1
fi
ARCH="$(uname -m)"
if [ "$ARCH" != "arm64" ]; then
  err "Apple Silicon (M1/M2/M3) required. This machine reports: $ARCH"
  err "Intel Macs are not supported in this release."
  exit 1
fi

# Resolve the latest release's DMG URL
say "Looking up latest Catalog release..."
API="https://api.github.com/repos/${REPO}/releases/latest"
ASSET_URL="$(curl -fsSL "$API" \
  | grep -E '"browser_download_url".*\.dmg"' \
  | head -n 1 \
  | sed -E 's/.*"(https:[^"]+\.dmg)".*/\1/')"

if [ -z "$ASSET_URL" ]; then
  err "Could not find a .dmg asset on the latest release."
  err "Check https://github.com/${REPO}/releases"
  exit 1
fi

DMG_NAME="$(basename "$ASSET_URL")"
note "Found: $DMG_NAME"

# Download
TMP="$(mktemp -d -t catalog-install)"
say "Downloading..."
curl -fL --progress-bar "$ASSET_URL" -o "$TMP/$DMG_NAME"

# Mount
MOUNT_POINT="$TMP/mnt"
mkdir -p "$MOUNT_POINT"
say "Mounting DMG..."
/usr/bin/hdiutil attach "$TMP/$DMG_NAME" -nobrowse -readonly -mountpoint "$MOUNT_POINT" -quiet

SRC="$MOUNT_POINT/$APP_NAME"
DEST="$INSTALL_DIR/$APP_NAME"

if [ ! -d "$SRC" ]; then
  err "$APP_NAME not found inside the DMG."
  exit 1
fi

# Replace any existing install (userdata at ~/.catalog is preserved separately)
if [ -d "$DEST" ]; then
  note "Replacing existing $DEST"
  rm -rf "$DEST"
fi

say "Installing to $INSTALL_DIR ..."
# ditto preserves macOS metadata (xattrs, ad-hoc signature, symlinks) better
# than cp -R.
/usr/bin/ditto "$SRC" "$DEST"

# Detach IMMEDIATELY after copy -- before any of the post-install steps run,
# so a failure there doesn't leave the volume mounted.
/usr/bin/hdiutil detach "$MOUNT_POINT" -quiet
MOUNT_POINT=""

# Strip Gatekeeper quarantine so the unsigned bundle launches without the
# "Catalog is damaged" warning.
say "Clearing quarantine attribute..."
/usr/bin/xattr -cr "$DEST"

ok "Catalog installed at $DEST"
echo ""
say "Launching Catalog..."
/usr/bin/open "$DEST"
ok "Done."
