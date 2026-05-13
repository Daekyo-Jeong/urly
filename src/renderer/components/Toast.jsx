import React, { useEffect } from 'react';
import { T } from '../tokens';
import Icon from './Icon';
import { AppMark } from './Squircle';

export default function Toast({ app, onClose, onReveal }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 200,
      width: 320,
      background: 'rgba(28, 28, 30, 0.92)',
      backdropFilter: 'blur(30px) saturate(180%)',
      WebkitBackdropFilter: 'blur(30px) saturate(180%)',
      color: '#fff',
      borderRadius: 12,
      boxShadow: '0 0.5px 0 rgba(255,255,255,0.08) inset, 0 12px 32px rgba(0,0,0,0.35)',
      padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: T.font,
    }}>
      <AppMark app={app} size={36} shadow={false} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{app.name}.app created</div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', marginTop: 1 }}>
          /Applications/Catalog Apps/
        </div>
      </div>
      <div onClick={onReveal} style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 9px',
        background: 'rgba(255,255,255,0.14)',
        borderRadius: 5,
        fontSize: 11.5, fontWeight: 500,
        cursor: 'default',
      }}>
        Reveal
      </div>
      <div onClick={onClose} style={{ color: 'rgba(255,255,255,0.36)', cursor: 'default' }}>
        <Icon name="x" size={12} strokeWidth={2} />
      </div>
    </div>
  );
}
