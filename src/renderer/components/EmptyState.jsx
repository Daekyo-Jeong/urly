import React from 'react';
import { T } from '../tokens';
import Icon from './Icon';
import Squircle from './Squircle';
import { Btn } from './Controls';

export default function EmptyState({ onNewApp }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 40, textAlign: 'center',
    }}>
      <div style={{ position: 'relative', width: 200, height: 100, marginBottom: 22 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute',
            left: 70 + (i - 1) * 36,
            top: 10 + (i === 1 ? -6 : 0),
            transform: `rotate(${(i - 1) * 6}deg)`,
            opacity: i === 1 ? 1 : 0.55,
          }}>
            <Squircle size={64} bg={i === 1 ? T.accent : '#e9e7e2'} shadow>
              {i === 1 && <Icon name="plus" size={28} color="#fff" strokeWidth={2.2} />}
            </Squircle>
          </div>
        ))}
      </div>

      <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, letterSpacing: -0.3, color: T.text }}>
        No apps yet
      </h1>
      <p style={{
        margin: '6px 0 18px', fontSize: 13, color: T.textSecondary, lineHeight: 1.5, maxWidth: 340,
      }}>
        Urly turns websites into standalone macOS apps you can launch from Spotlight, the Dock, or Cmd&#8209;Tab.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="primary" icon="plus" size="lg" onClick={onNewApp}>Add Your First App</Btn>
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 10, fontSize: 11.5 }}>
        {[
          { icon: 'link', t: 'Paste any URL' },
          { icon: 'sparkles', t: 'Auto-extract icon & title' },
          { icon: 'apps', t: 'Launches like a native app' },
        ].map(h => (
          <div key={h.t} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 10px', background: T.inputBg, borderRadius: 6,
            boxShadow: `inset 0 0 0 0.5px ${T.sep}`,
            color: T.textSecondary,
          }}>
            <Icon name={h.icon} size={12} color={T.accent} strokeWidth={1.7} />
            <span>{h.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
