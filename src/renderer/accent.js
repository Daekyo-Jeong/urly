// Accent color palette + runtime application via CSS variables.

export const ACCENT_PRESETS = [
  { id: 'orange', name: 'Orange', hex: '#FF6B35' },
  { id: 'blue', name: 'Blue', hex: '#0A84FF' },
  { id: 'green', name: 'Green', hex: '#34C759' },
  { id: 'purple', name: 'Purple', hex: '#BF5AF2' },
  { id: 'pink', name: 'Pink', hex: '#FF375F' },
  { id: 'red', name: 'Red', hex: '#FF3B30' },
  { id: 'yellow', name: 'Yellow', hex: '#FFD60A' },
  { id: 'graphite', name: 'Graphite', hex: '#8E8E93' },
];

export const DEFAULT_ACCENT = '#FF6B35';

function hexToRgb(hex) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length !== 3) return null;
  const [r, g, b] = m.map(x => parseInt(x, 16));
  return { r, g, b };
}

function rgba(hex, alpha) {
  const c = hexToRgb(hex) || { r: 255, g: 107, b: 53 };
  return `rgba(${c.r},${c.g},${c.b},${alpha})`;
}

function lighten(hex, amount) {
  const c = hexToRgb(hex);
  if (!c) return hex;
  const mix = (v) => Math.round(v + (255 - v) * amount);
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(mix(c.r))}${toHex(mix(c.g))}${toHex(mix(c.b))}`;
}

export function applyAccent(hex) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_ACCENT;
  const root = document.documentElement.style;
  root.setProperty('--cat-accent', safe);
  root.setProperty('--cat-accent-hover', lighten(safe, 0.12));
  root.setProperty('--cat-accent-muted', rgba(safe, 0.12));
}
