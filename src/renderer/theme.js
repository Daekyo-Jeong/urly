// Theme tokens + runtime application via CSS variables.
//
// Three modes:
//   - 'light' — force light
//   - 'dark'  — force dark
//   - 'auto'  — follow OS `prefers-color-scheme`, re-apply on system change
//
// Tokens.js consumes these as `var(--cat-...)` so everything that's already
// using the design tokens picks up the new colors with zero per-component work.

export const THEME_MODES = ['auto', 'light', 'dark'];
export const DEFAULT_THEME = 'auto';

const LIGHT = {
  '--cat-desktop': 'linear-gradient(140deg, #d6cfc4 0%, #b8a99a 100%)',
  '--cat-window-bg': '#ffffff',
  '--cat-content-bg': '#f5f5f5',
  '--cat-sidebar-bg': 'rgba(241, 240, 238, 0.86)',
  '--cat-toolbar-bg': 'rgba(246, 246, 246, 0.92)',
  '--cat-card-bg': '#ffffff',
  '--cat-card-bg-hover': '#f7f7f7',

  '--cat-text': 'rgba(0,0,0,0.85)',
  '--cat-text-secondary': 'rgba(0,0,0,0.56)',
  '--cat-text-tertiary': 'rgba(0,0,0,0.36)',
  '--cat-text-quaternary': 'rgba(0,0,0,0.22)',

  '--cat-sep': 'rgba(0,0,0,0.08)',
  '--cat-sep-strong': 'rgba(0,0,0,0.14)',

  '--cat-red': '#FF3B30',
  '--cat-red-bg': 'rgba(255, 59, 48, 0.10)',
  '--cat-green': '#34C759',
  '--cat-blue': '#0A84FF',

  '--cat-tl-border': 'rgba(0,0,0,0.12)',

  // Surfaces that components currently hard-code as `#fff` or similar — we
  // expose them as tokens so dark mode can flip them too.
  '--cat-input-bg': '#ffffff',
  '--cat-popover-bg': 'rgba(252,252,252,0.96)',
  '--cat-modal-bg': '#f6f6f6',
  '--cat-modal-header-bg': '#fafaf9',
  '--cat-overlay': 'rgba(0,0,0,0.18)',
  '--cat-shadow-soft': '0 0.5px 0 rgba(0,0,0,0.04)',

  // Controls that need a different active surface than the page bg —
  // macOS segmented control etc.
  '--cat-control-track': 'rgba(0,0,0,0.06)',
  '--cat-control-active': '#ffffff',
  '--cat-control-active-shadow': '0 0.5px 1.5px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.06)',
  '--cat-placeholder': 'rgba(0,0,0,0.36)',
};

const DARK = {
  '--cat-desktop': 'linear-gradient(140deg, #2a2a2c 0%, #1a1a1c 100%)',
  '--cat-window-bg': '#1c1c1e',
  '--cat-content-bg': '#1a1a1c',
  '--cat-sidebar-bg': 'rgba(38, 38, 40, 0.86)',
  '--cat-toolbar-bg': 'rgba(36, 36, 38, 0.92)',
  '--cat-card-bg': '#252527',
  '--cat-card-bg-hover': '#2d2d2f',

  '--cat-text': 'rgba(255,255,255,0.92)',
  '--cat-text-secondary': 'rgba(255,255,255,0.60)',
  '--cat-text-tertiary': 'rgba(255,255,255,0.36)',
  '--cat-text-quaternary': 'rgba(255,255,255,0.22)',

  '--cat-sep': 'rgba(255,255,255,0.08)',
  '--cat-sep-strong': 'rgba(255,255,255,0.16)',

  '--cat-red': '#FF453A',
  '--cat-red-bg': 'rgba(255, 69, 58, 0.15)',
  '--cat-green': '#32D74B',
  '--cat-blue': '#0A84FF',

  '--cat-tl-border': 'rgba(0,0,0,0.40)',

  '--cat-input-bg': '#2c2c2e',
  '--cat-popover-bg': 'rgba(42,42,44,0.96)',
  '--cat-modal-bg': '#232325',
  '--cat-modal-header-bg': '#1f1f21',
  '--cat-overlay': 'rgba(0,0,0,0.50)',
  '--cat-shadow-soft': '0 0.5px 0 rgba(0,0,0,0.20)',

  '--cat-control-track': 'rgba(255,255,255,0.08)',
  '--cat-control-active': 'rgba(255,255,255,0.16)',
  '--cat-control-active-shadow': '0 0.5px 1.5px rgba(0,0,0,0.40), inset 0 0 0 0.5px rgba(255,255,255,0.08)',
  '--cat-placeholder': 'rgba(255,255,255,0.36)',
};

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(mode) {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return systemPrefersDark() ? 'dark' : 'light';
}

let mediaQuery = null;
let mediaListener = null;

// Apply theme. Returns the effective mode ('light' | 'dark') that actually ran.
export function applyTheme(mode = DEFAULT_THEME) {
  const effective = resolve(mode);
  const vars = effective === 'dark' ? DARK : LIGHT;
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.theme = effective;

  // For native-controlled chrome (form controls, scrollbars) — tells the
  // engine which scheme this page is meant for.
  root.style.colorScheme = effective;

  // Auto mode keeps tracking the OS; explicit modes don't.
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener('change', mediaListener);
    mediaListener = null;
  }
  if (mode === 'auto' && typeof window !== 'undefined' && window.matchMedia) {
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaListener = () => applyTheme('auto');
    mediaQuery.addEventListener('change', mediaListener);
  }

  return effective;
}
