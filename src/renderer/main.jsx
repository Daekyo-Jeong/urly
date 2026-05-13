import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyAccent, DEFAULT_ACCENT } from './accent';

// Apply default accent early so first paint uses correct color.
applyAccent(DEFAULT_ACCENT);

const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
  input::placeholder { color: rgba(0,0,0,0.36); }
  * { user-select: none; -webkit-user-select: none; }
  input, textarea { user-select: text; -webkit-user-select: text; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
