import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { T } from '../tokens';
import Icon from './Icon';
import { AppMark } from './Squircle';

function GridCardMenu({ app, onAction, anchorRect }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, visibility: 'hidden' });

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onAction?.('closeMenu');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onAction]);

  useLayoutEffect(() => {
    if (!menuRef.current || !anchorRect) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 6;
    const PAD = 8;

    // Default: anchor below the trigger, right-aligned to trigger's right edge
    let top = anchorRect.bottom + GAP;
    let left = anchorRect.right - menuRect.width;

    // Horizontal overflow: clamp into viewport
    if (left < PAD) left = PAD;
    if (left + menuRect.width > vw - PAD) left = vw - PAD - menuRect.width;

    // Vertical overflow: flip above the trigger
    if (top + menuRect.height > vh - PAD) {
      top = anchorRect.top - menuRect.height - GAP;
    }
    if (top < PAD) top = PAD;

    setPos({ top, left, visibility: 'visible' });
  }, [anchorRect]);

  const items = [
    { icon: 'play', label: 'Launch', shortcut: '⏎', action: 'launch' },
    { icon: 'pencil', label: 'Edit…', shortcut: '⌘E', action: 'edit' },
    { icon: 'arrowUpRight', label: 'Open in Browser', shortcut: '⇧⌘O', action: 'openInBrowser' },
    { icon: 'folder', label: 'Reveal in Finder', shortcut: '⌘R', action: 'reveal' },
    { type: 'sep' },
    { icon: 'star', label: app.favorite ? 'Remove from Favorites' : 'Add to Favorites', action: 'toggleFavorite' },
    { icon: 'refresh', label: 'Re-fetch Icon', action: 'refetchIcon' },
    { icon: 'trash', label: 'Clear Cache', action: 'clearCache' },
    { icon: 'lock', label: 'Sign Out & Reset', action: 'signOut' },
    { type: 'sep' },
    { icon: 'trash', label: 'Delete…', shortcut: '⌫', danger: true, action: 'delete' },
  ];

  const menuEl = (
    <div ref={menuRef} style={{
      position: 'fixed', top: pos.top, left: pos.left, visibility: pos.visibility,
      background: T.popoverBg,
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      borderRadius: 8,
      boxShadow: '0 0 0 0.5px rgba(0,0,0,0.16), 0 12px 32px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.10)',
      padding: 4, zIndex: 1000, textAlign: 'left', width: 218,
    }}>
      {items.map((it, i) => {
        if (it.type === 'sep') return <div key={i} style={{ height: 0.5, background: 'rgba(0,0,0,0.10)', margin: '4px 6px' }} />;
        const isFirst = i === 0;
        return (
          <div key={i} onClick={() => onAction?.(it.action, app)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 24, padding: '0 8px', borderRadius: 5,
              background: isFirst ? T.accent : 'transparent',
              color: isFirst ? '#fff' : it.danger ? T.red : T.text,
              fontSize: 12.5, cursor: 'default',
            }}>
            <span style={{ display: 'flex', color: 'currentColor', opacity: isFirst ? 1 : 0.7 }}>
              <Icon name={it.icon} size={12} strokeWidth={1.7} />
            </span>
            <span style={{ flex: 1, fontWeight: 500 }}>{it.label}</span>
            {it.shortcut && <span style={{ fontSize: 11, color: isFirst ? 'rgba(255,255,255,0.7)' : T.textTertiary }}>{it.shortcut}</span>}
          </div>
        );
      })}
    </div>
  );

  return createPortal(menuEl, document.body);
}

function GridCard({ app, size = 72, selected, hovered, menuOpen, onSelect, onDoubleClick, onMenuToggle, onAction }) {
  const menuBtnRef = useRef(null);
  const [anchorRect, setAnchorRect] = useState(null);

  useLayoutEffect(() => {
    if (menuOpen && menuBtnRef.current) {
      setAnchorRect(menuBtnRef.current.getBoundingClientRect());
    } else {
      setAnchorRect(null);
    }
  }, [menuOpen]);

  return (
    <div
      onClick={() => onSelect?.(app.appId)}
      onDoubleClick={() => onDoubleClick?.(app.appId)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, padding: '14px 10px', borderRadius: 10,
        background: hovered && !selected ? T.cardBgHover : 'transparent',
        position: 'relative', width: '100%', boxSizing: 'border-box',
        zIndex: menuOpen ? 5 : 'auto', cursor: 'default',
      }}
    >
      {selected && (
        <div
          ref={menuBtnRef}
          onClick={e => { e.stopPropagation(); onMenuToggle?.(app.appId); }}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 22, height: 22, borderRadius: 11,
            // Closed: pill surface that contrasts with the card in both themes.
            // Open: invert — T.text bg, T.windowBg icon — stays legible everywhere.
            background: menuOpen ? T.text : T.controlActive,
            color: menuOpen ? T.windowBg : T.text,
            boxShadow: menuOpen
              ? '0 0.5px 0 rgba(0,0,0,0.20), 0 2px 6px rgba(0,0,0,0.25)'
              : `0 0.5px 0 ${T.sep}, 0 1px 3px ${T.sep}, inset 0 0 0 0.5px ${T.sepStrong}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="more" size={12} strokeWidth={1.8} />
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <AppMark app={app} size={size} />
        {app.favorite && (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 18, height: 18, borderRadius: 9,
            background: T.accent, border: '1.5px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.18)',
          }}>
            <Icon name="star" size={9} color="#fff" strokeWidth={2} />
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
        <span style={{
          display: 'inline-block', maxWidth: '100%',
          padding: selected ? '1.5px 8px' : '1.5px 4px',
          margin: selected ? '0 -4px' : 0,
          borderRadius: 5,
          background: selected ? T.accent : 'transparent',
          color: selected ? '#fff' : T.text,
          fontSize: 13, fontWeight: selected ? 600 : 500,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.25,
        }}>{app.name}</span>
        <div style={{
          fontSize: 11, color: T.textTertiary, marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}>{(app.url || '').replace(/^https?:\/\//, '')}</div>
      </div>

      {menuOpen && anchorRect && <GridCardMenu app={app} onAction={onAction} anchorRect={anchorRect} />}
    </div>
  );
}

export default function GridView({ apps, onAction, title = 'All Apps' }) {
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);

  function handleAction(action, app) {
    setMenuOpenId(null);
    onAction?.(action, app);
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) { setSelectedId(null); setMenuOpenId(null); } }}
      style={{ flex: 1, overflow: 'auto', padding: '20px 24px 32px' }}
    >
      <div
        onClick={e => { if (e.target === e.currentTarget) { setSelectedId(null); setMenuOpenId(null); } }}
        style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: -0.4, color: T.text }}>{title}</h1>
        <span style={{ fontSize: 12, color: T.textTertiary }}>Sorted by Name</span>
      </div>
      <div
        onClick={e => { if (e.target === e.currentTarget) { setSelectedId(null); setMenuOpenId(null); } }}
        style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 4,
        justifyContent: 'start',
      }}>
        {apps.map(app => (
          <div key={app.appId}
            onMouseEnter={() => setHoveredId(app.appId)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ maxWidth: 160, minWidth: 0 }}
          >
            <GridCard
              app={app}
              size={72}
              selected={selectedId === app.appId}
              hovered={hoveredId === app.appId}
              menuOpen={menuOpenId === app.appId}
              onSelect={setSelectedId}
              onDoubleClick={id => handleAction('launch', app)}
              onMenuToggle={id => setMenuOpenId(menuOpenId === id ? null : id)}
              onAction={handleAction}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
