import React, { useId, useState } from 'react';
import { T } from '../tokens';

// Squircle path lifted *verbatim* from the Figma source (file lGJBlqOFTyL...,
// node 13:131 — App Icon Template). Coordinates are in the file's native
// 0–1024 unit space and use ~28 cubic Bézier segments to approximate Apple's
// continuous-corner superellipse much more faithfully than the 8-segment
// iOS-style path we used before. Stays byte-for-byte identical to
// assets/icon-source.svg so the manager preview and the shipped .icns are
// the exact same shape.
const SQUIRCLE_PATH = 'M0.000976562 373.001V651.001C0.000976562 665.251 -0.00894336 679.491 0.0810547 693.73C0.151055 705.72 0.280352 717.721 0.610352 729.711C1.32035 755.851 2.85099 782.211 7.50098 808.051C12.2109 834.271 19.9104 858.67 32.0303 882.49C43.9502 905.9 59.5307 927.32 78.1006 945.9C96.6706 964.48 118.101 980.051 141.511 991.971C165.331 1004.1 189.73 1011.79 215.95 1016.5C241.8 1021.14 268.161 1022.68 294.291 1023.39C306.281 1023.71 318.271 1023.85 330.271 1023.92C342.739 1023.99 355.201 1024 367.661 1024H654.054C667.285 1024 680.508 1024 693.73 1023.92C705.72 1023.85 717.721 1023.72 729.711 1023.39C755.851 1022.68 782.211 1021.15 808.051 1016.5C834.271 1011.79 858.67 1004.09 882.49 991.971C905.9 980.051 927.32 964.47 945.9 945.9C964.48 927.33 980.051 905.9 991.971 882.49C1004.1 858.67 1011.79 834.271 1016.5 808.051C1021.14 782.201 1022.68 755.841 1023.39 729.711C1023.71 717.721 1023.85 705.73 1023.92 693.73C1023.99 681.262 1024 668.801 1024 656.341V369.948C1024 356.717 1024 343.494 1023.92 330.271C1023.85 318.281 1023.72 306.281 1023.39 294.291C1022.68 268.151 1021.15 241.79 1016.5 215.95C1011.79 189.73 1004.09 165.331 991.971 141.511C980.051 118.101 964.47 96.6806 945.9 78.1006C927.33 59.5207 905.9 43.9502 882.49 32.0303C858.67 19.9004 834.271 12.2109 808.051 7.50098C782.201 2.86099 755.841 1.32035 729.711 0.610352C717.721 0.290352 705.73 0.151055 693.73 0.0810547C679.481 0.00105635 665.241 0.000976563 651.001 0.000976562H373.001C358.761 0.000976562 344.521 0.00105469 330.271 0.0810547C318.281 0.151054 306.281 0.28036 294.291 0.610352C268.151 1.32035 241.79 2.85098 215.95 7.50098C189.73 12.211 165.331 19.9104 141.511 32.0303C118.101 43.9503 96.6806 59.5306 78.1006 78.1006C59.5206 96.6706 43.9503 118.101 32.0303 141.511C19.9004 165.331 12.211 189.73 7.50098 215.95C2.86098 241.8 1.32035 268.161 0.610352 294.291C0.29036 306.281 0.151054 318.271 0.0810547 330.271C0.00105469 344.521 0.000976562 358.761 0.000976562 373.001Z';

// All squircle drawing happens in this coordinate system — match Figma exactly.
const VB_SIZE = 1024;

// The squircle path above natively occupies 0–1024 in both axes; the SVG
// scales to whatever `size` the caller passes. No outer padding — the
// squircle is the tile, matching Figma node 13:131 exactly.

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
  return (
    <div style={{
      width: size, height: size, position: 'relative', flexShrink: 0,
      filter: shadow ? 'drop-shadow(0 1px 1px rgba(0,0,0,0.10)) drop-shadow(0 2px 4px rgba(0,0,0,0.08))' : 'none',
      ...style,
    }}>
      <svg viewBox={`0 0 ${VB_SIZE} ${VB_SIZE}`} width={size} height={size} style={{ display: 'block', position: 'absolute', inset: 0 }}>
        <defs>
          <clipPath id={`sq-${id}`}><path d={SQUIRCLE_PATH} /></clipPath>
          <linearGradient id={`hl-${id}`} x1="0" y1="0" x2="0" y2={VB_SIZE} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#sq-${id})`}>
          <rect width={VB_SIZE} height={VB_SIZE} fill={bg} />
          {image && (
            <image
              href={image}
              x="0" y="0" width={VB_SIZE} height={VB_SIZE}
              preserveAspectRatio="xMidYMid slice"
              onError={onImageError}
            />
          )}
          {!image && <rect width={VB_SIZE} height={VB_SIZE / 2} fill={`url(#hl-${id})`} opacity="0.18" />}
        </g>
        <path d={SQUIRCLE_PATH} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={VB_SIZE * 0.0008} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: T.font, fontWeight: 600,
        fontSize: size * 0.5, letterSpacing: -0.6,
        lineHeight: 1,
        paddingTop: Math.round(size * 0.02),
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

  // White bg behind transparent favicons so brand marks read cleanly to the
  // squircle edge; brand color fallback for the letter mark.
  return (
    <Squircle
      size={size}
      bg={imageUrl ? '#ffffff' : color}
      image={imageUrl}
      shadow={shadow}
      onImageError={() => setFailed(true)}
    >
      {!imageUrl && (
        <span style={{ fontWeight: 600, fontSize: size * 0.52, lineHeight: 1 }}>{mark}</span>
      )}
    </Squircle>
  );
}

export function CatalogIcon({ size = 64 }) {
  const id = useId();
  // 4-tile grid sized off the full tile — matches the Figma source (tiles at
  // 226–798 of the 1024 canvas → ~28%-78% of the icon body).
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
          width: size, height: size,
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: size * 0.06, padding: size * 0.22,
          boxSizing: 'border-box',
        }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              borderRadius: size * 0.05,
              background: 'rgba(255,255,255,0.95)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)',
            }} />
          ))}
        </div>
      </div>
    </Squircle>
  );
}
