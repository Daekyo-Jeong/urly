import React from 'react';
import { T } from '../tokens';
import Icon from './Icon';

export function SearchField({ value = '', onChange, placeholder = 'Search', width = 180, focused = false, onFocus, onBlur }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      height: 24, width, padding: '0 6px',
      background: T.inputBg,
      borderRadius: 6,
      boxShadow: focused
        ? `inset 0 0 0 0.5px ${T.sepStrong}, 0 0 0 3px ${T.accentMuted}, 0 0 0 1.5px ${T.accent}`
        : `inset 0 0 0 0.5px ${T.sepStrong}, 0 1px 0 rgba(0,0,0,0.02)`,
      fontSize: 13,
    }}>
      <Icon name="search" size={12} color={T.textTertiary} strokeWidth={1.6} />
      <input
        type="text"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          flex: 1, fontSize: 13, fontFamily: T.font,
          color: T.text, width: '100%',
        }}
      />
      {value && (
        <div onClick={() => onChange?.('')} style={{ cursor: 'default', display: 'flex' }}>
          <Icon name="x" size={11} color={T.textTertiary} />
        </div>
      )}
    </div>
  );
}

export function SegmentedControl({ items, value, onChange }) {
  return (
    <div style={{
      display: 'inline-flex', height: 24, padding: 2, gap: 2,
      background: T.controlTrack,
      borderRadius: 6,
    }}>
      {items.map(it => {
        const sel = it.value === value;
        return (
          <div key={it.value} onClick={() => onChange?.(it.value)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 8px', height: 20, minWidth: 24,
            background: sel ? T.controlActive : 'transparent',
            borderRadius: 4,
            boxShadow: sel ? T.controlActiveShadow : 'none',
            color: sel ? T.text : T.textSecondary,
            cursor: 'default',
          }}>
            {it.icon ? <Icon name={it.icon} size={12} strokeWidth={1.7} /> : null}
            {it.label && <span style={{ fontSize: 12, fontWeight: sel ? 600 : 500 }}>{it.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function Btn({ children, kind = 'secondary', size = 'md', icon, onClick, style = {}, disabled = false }) {
  const sizes = {
    sm: { h: 22, px: 8, fs: 12 },
    md: { h: 28, px: 12, fs: 13 },
    lg: { h: 32, px: 14, fs: 13 },
  };
  const s = sizes[size];
  const kinds = {
    primary: { bg: T.accent, color: '#fff', border: 'transparent', shadow: '0 0.5px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18)' },
    secondary: { bg: '#fff', color: T.text, border: T.sepStrong, shadow: '0 0.5px 0 rgba(0,0,0,0.04)' },
    plain: { bg: 'transparent', color: T.text, border: 'transparent', shadow: 'none' },
    danger: { bg: T.red, color: '#fff', border: 'transparent', shadow: '0 0.5px 0 rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.18)' },
  };
  const k = kinds[kind];
  return (
    <div onClick={disabled ? undefined : onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: s.h, padding: `0 ${s.px}px`,
      background: k.bg, color: k.color,
      border: `0.5px solid ${k.border === 'transparent' ? 'transparent' : k.border}`,
      borderRadius: 6,
      fontSize: s.fs, fontWeight: 500,
      boxShadow: k.shadow,
      cursor: disabled ? 'default' : 'default',
      whiteSpace: 'nowrap',
      opacity: disabled ? 0.5 : 1,
      ...style,
    }}>
      {icon && <Icon name={icon} size={s.fs - 1} strokeWidth={1.7} />}
      {children}
    </div>
  );
}
