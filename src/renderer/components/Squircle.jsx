import React, { useId, useState } from 'react';
import { T } from '../tokens';

// True iOS-style squircle (8 Béziers, G2-continuous corners — not a rounded
// square). See scripts/build-icon.js for the derivation.
const SQUIRCLE_PATH =
  'M 50 0 ' +
  'C 80.74 0 91.86 0 95.59 4.41 ' +
  'C 99.32 8.83 100 19.94 100 50 ' +
  'C 100 80.06 99.32 91.17 95.59 95.59 ' +
  'C 91.86 100 80.74 100 50 100 ' +
  'C 19.26 100 8.14 100 4.41 95.59 ' +
  'C 0.68 91.17 0 80.06 0 50 ' +
  'C 0 19.94 0.68 8.83 4.41 4.41 ' +
  'C 8.14 0 19.26 0 50 0 Z';

// Apple's macOS app icon grid (Big Sur+):
//   1024 px canvas, 820 px squircle centered, 102 px padding on each side
//   (102/1024 ≈ 9.96%, so we use 10% in unit space).
// We render the squircle at 80% of `size` so the shadow has room to render
// inside the tile bounds and the icon looks the same scale as every other
// app in the Dock. Without this padding our tiles read as oversized next
// to native macOS icons.
const PAD = 12.5;          // each side, in viewBox units
const SQ_BOX = 100;        // squircle is drawn at 100×100 viewBox coords
const VB = SQ_BOX + PAD * 2; // 125

// Renders a continuous-corner (Apple HIG squircle) tile.
// - `image` (URL) — rendered as an SVG <image> clipped to the squircle so the
//   corners are perfectly trimmed (no background bleeding behind a square favicon).
// - `onImageError` — called when the image fails to load, so callers can fall
//   back to a letter mark.
// - `bg` — fallback background fill behind the (transparent or partial) image,
//   or the main fill when no image is provided.
// - `children` — text/icon overlay (e.g. single-letter mark).
export default function Squircle({ size = 64, bg = '#000', image, onImageError, children, style = {}, shadow = true }) {
  const id = useId();
  // Visible squircle occupies 80% of `size`; everything sized off the
  // squircle (not the tile bounding box) so visual ratios stay constant.
  const innerSize = size * (SQ_BOX / VB);
  return (
    <div style={{
      width: size, height: size, position: 'relative', flexShrink: 0,
      filter: shadow ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.10)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))' : 'none',
      ...style,
    }}>
      <svg viewBox={`${-PAD} ${-PAD} ${VB} ${VB}`} width={size} height={size} style={{ display: 'block', position: 'absolute', inset: 0 }}>
        <defs>
          <clipPath id={`sq-${id}`}><path d={SQUIRCLE_PATH} /></clipPath>
          <linearGradient id={`hl-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#sq-${id})`}>
          <rect width="100" height="100" fill={bg} />
          {image && (
            <image
              href={image}
              x="0" y="0" width="100" height="100"
              preserveAspectRatio="xMidYMid slice"
              onError={onImageError}
            />
          )}
          {!image && <rect width="100" height="50" fill={`url(#hl-${id})`} opacity="0.18" />}
        </g>
        <path d={SQUIRCLE_PATH} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth="0.8" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: T.font, fontWeight: 600,
        // Font scaled to the visible squircle (innerSize), not the tile.
        fontSize: innerSize * 0.5, letterSpacing: -0.6,
        lineHeight: 1,
        paddingTop: Math.round(innerSize * 0.02),
        boxSizing: 'border-box',
      }}>
        {children}
      </div>
    </div>
  );
}

export function AppMark({ app, size = 64, shadow = true }) {
  const [failed, setFailed] = useState(false);
  const mark = app.mark || app.name.charAt(0).toUpperCase();
  const color = app.color || T.accent;
  const imageUrl = !failed && app.iconUrl ? app.iconUrl : null;

  // For an opaque/colored brand mark, white bg works so the favicon shows
  // cleanly to the squircle edges. For the fallback letter-mark we use the
  // brand color so it remains visually distinct.
  // Mark sized off the visible squircle (80% of `size`), not the tile bounds,
  // so the letter occupies the same fraction of the icon body as a real Apple
  // app icon's primary glyph.
  const innerSize = size * (SQ_BOX / VB);
  return (
    <Squircle
      size={size}
      bg={imageUrl ? '#ffffff' : color}
      image={imageUrl}
      shadow={shadow}
      onImageError={() => setFailed(true)}
    >
      {!imageUrl && (
        <span style={{ fontWeight: 600, fontSize: innerSize * 0.52, lineHeight: 1 }}>{mark}</span>
      )}
    </Squircle>
  );
}

export function CatalogIcon({ size = 64 }) {
  const id = useId();
  // The 4-tile grid is laid out relative to the visible squircle (80% of size)
  // so the tiles sit at the same proportional positions as in the canonical
  // assets/icon-source.svg (tiles at 226-798 of a 1024 canvas → ~28%-78% of
  // the squircle body).
  const innerSize = size * (SQ_BOX / VB);
  return (
    <Squircle size={size} bg={`url(#cat-grad-${id})`}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={`cat-grad-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF8C5A" />
            <stop offset="100%" stopColor="#E84B1F" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: innerSize, height: innerSize,
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: innerSize * 0.06, padding: innerSize * 0.22,
          boxSizing: 'border-box',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              borderRadius: innerSize * 0.05,
              background: 'rgba(255,255,255,0.95)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
            }} />
          ))}
        </div>
      </div>
    </Squircle>
  );
}
