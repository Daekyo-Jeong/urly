// Design tokens. Every color resolves through a CSS variable so theme.js can
// swap the light/dark palette at runtime (and respond to system changes for
// the 'auto' theme mode) with no per-component changes.

export const T = {
  font: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", sans-serif',
  fontMono: '"SF Mono", ui-monospace, Menlo, Consolas, monospace',

  // Surfaces
  desktop: 'var(--cat-desktop)',
  windowBg: 'var(--cat-window-bg)',
  contentBg: 'var(--cat-content-bg)',
  sidebarBg: 'var(--cat-sidebar-bg)',
  toolbarBg: 'var(--cat-toolbar-bg)',
  cardBg: 'var(--cat-card-bg)',
  cardBgHover: 'var(--cat-card-bg-hover)',

  inputBg: 'var(--cat-input-bg)',
  popoverBg: 'var(--cat-popover-bg)',
  modalBg: 'var(--cat-modal-bg)',
  modalHeaderBg: 'var(--cat-modal-header-bg)',
  overlay: 'var(--cat-overlay)',

  // Text
  text: 'var(--cat-text)',
  textSecondary: 'var(--cat-text-secondary)',
  textTertiary: 'var(--cat-text-tertiary)',
  textQuaternary: 'var(--cat-text-quaternary)',

  // Separators
  sep: 'var(--cat-sep)',
  sepStrong: 'var(--cat-sep-strong)',

  // Accent (driven separately by accent.js)
  accent: 'var(--cat-accent)',
  accentHover: 'var(--cat-accent-hover)',
  accentMuted: 'var(--cat-accent-muted)',

  // Semantic colors
  red: 'var(--cat-red)',
  redBg: 'var(--cat-red-bg)',
  green: 'var(--cat-green)',
  blue: 'var(--cat-blue)',

  // Controls
  controlTrack: 'var(--cat-control-track)',
  controlActive: 'var(--cat-control-active)',
  controlActiveShadow: 'var(--cat-control-active-shadow)',
  placeholder: 'var(--cat-placeholder)',

  // Traffic lights — same hue in both modes; only the border ring changes.
  tlRed: '#FF5F57',
  tlYellow: '#FEBC2E',
  tlGreen: '#28C840',
  tlBorder: 'var(--cat-tl-border)',
};
