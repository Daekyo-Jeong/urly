import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyAccent, DEFAULT_ACCENT } from './accent';
import { applyTheme, DEFAULT_THEME } from './theme';

// Apply defaults early so first paint uses correct colors. The settings load
// inside App.jsx then overrides with the user's saved preferences.
applyTheme(DEFAULT_THEME);
applyAccent(DEFAULT_ACCENT);

const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--cat-text-quaternary); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--cat-text-tertiary); }
  input::placeholder, textarea::placeholder { color: var(--cat-placeholder); }
  * { user-select: none; -webkit-user-select: none; }
  input, textarea { user-select: text; -webkit-user-select: text; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
