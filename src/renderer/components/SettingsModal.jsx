import React, { useState, useEffect } from 'react';
import { T } from '../tokens';
import Icon from './Icon';
import { Btn } from './Controls';
import { ACCENT_PRESETS, applyAccent } from '../accent';

export default function SettingsModal({ settings, onClose, onChange, tagsWithCounts = {}, onTagsChanged }) {
  const [local, setLocal] = useState(settings);
  const [customHex, setCustomHex] = useState('');
  const [renamingTag, setRenamingTag] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');

  useEffect(() => { setLocal(settings); }, [settings]);

  const update = (patch) => {
    const next = { ...local, ...patch, sidebar: { ...local.sidebar, ...(patch.sidebar || {}) } };
    setLocal(next);
    if (patch.accentColor) applyAccent(patch.accentColor);
    onChange?.(next);
  };

  const isPreset = ACCENT_PRESETS.some(p => p.hex.toLowerCase() === (local.accentColor || '').toLowerCase());

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{
        width: 480,
        background: '#f6f6f6',
        borderRadius: 10,
        boxShadow: '0 0 0 0.5px rgba(0,0,0,0.18), 0 30px 80px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '14px 20px 12px',
          borderBottom: `0.5px solid ${T.sep}`,
          background: '#fafaf9',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Settings</div>
        </div>

        <div style={{ padding: '20px 22px 18px' }}>
          {/* Accent color */}
          <Section title="Accent Color">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {ACCENT_PRESETS.map(p => {
                const selected = local.accentColor?.toLowerCase() === p.hex.toLowerCase();
                return (
                  <div key={p.id}
                    onClick={() => update({ accentColor: p.hex })}
                    title={p.name}
                    style={{
                      width: 28, height: 28, borderRadius: 14, cursor: 'default',
                      background: p.hex,
                      boxShadow: selected
                        ? `0 0 0 2px #fff, 0 0 0 4px ${p.hex}`
                        : '0 0 0 0.5px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.18)',
                      transition: 'box-shadow 0.12s',
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11.5, color: T.textTertiary }}>Custom</span>
              <input
                type="text"
                value={customHex}
                placeholder="#RRGGBB"
                onChange={e => setCustomHex(e.target.value)}
                onBlur={() => {
                  if (/^#[0-9a-f]{6}$/i.test(customHex)) {
                    update({ accentColor: customHex });
                  }
                }}
                style={{
                  height: 24, padding: '0 8px', width: 100,
                  background: '#fff', border: 'none', outline: 'none',
                  borderRadius: 5, fontFamily: T.fontMono, fontSize: 11.5,
                  boxShadow: `inset 0 0 0 0.5px ${T.sepStrong}`,
                  color: T.text,
                }}
              />
              {!isPreset && local.accentColor && (
                <span style={{ fontSize: 11, color: T.textTertiary, fontFamily: T.fontMono }}>
                  Active: {local.accentColor}
                </span>
              )}
            </div>
          </Section>

          {/* Library sections */}
          <Section title="Sidebar Sections">
            <ToggleRow
              label="Recently Added"
              hint="Apps created in the last 7 days"
              value={local.sidebar.recentlyAdded}
              onChange={v => update({ sidebar: { recentlyAdded: v } })}
            />
            <ToggleRow
              label="Favorites"
              hint="Starred apps"
              value={local.sidebar.favorites}
              onChange={v => update({ sidebar: { favorites: v } })}
            />
            <ToggleRow
              label="Tags"
              hint="Group apps by tag"
              value={local.sidebar.tags}
              onChange={v => update({ sidebar: { tags: v } })}
            />
          </Section>

          {/* Tag management */}
          <Section title="Manage Tags">
            {Object.keys(tagsWithCounts).length === 0 ? (
              <div style={{ fontSize: 12, color: T.textTertiary, padding: '4px 0' }}>
                No tags yet. Add tags when creating or editing apps.
              </div>
            ) : (
              Object.keys(tagsWithCounts).sort().map(tag => {
                const count = tagsWithCounts[tag];
                const isRenaming = renamingTag === tag;
                return (
                  <div key={tag} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 0',
                    borderBottom: `0.5px solid ${T.sep}`,
                  }}>
                    <Icon name="folder" size={13} color={T.textSecondary} strokeWidth={1.7} />
                    {isRenaming ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameDraft}
                        onChange={e => setRenameDraft(e.target.value)}
                        onKeyDown={async e => {
                          if (e.key === 'Enter') {
                            const next = renameDraft.trim();
                            if (next && next !== tag) {
                              await window.catalog.renameTag(tag, next);
                              onTagsChanged?.();
                            }
                            setRenamingTag(null);
                          } else if (e.key === 'Escape') {
                            setRenamingTag(null);
                          }
                        }}
                        onBlur={() => setRenamingTag(null)}
                        style={{
                          flex: 1, height: 22, padding: '0 6px',
                          background: '#fff', border: 'none', outline: 'none',
                          borderRadius: 4, fontSize: 12.5, color: T.text,
                          fontFamily: T.font,
                          boxShadow: `inset 0 0 0 0.5px ${T.accent}, 0 0 0 2px ${T.accentMuted}`,
                        }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: 12.5, color: T.text }}>{tag}</span>
                    )}
                    <span style={{ fontSize: 11, color: T.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                      {count} {count === 1 ? 'app' : 'apps'}
                    </span>
                    {!isRenaming && (
                      <>
                        <div
                          onClick={() => { setRenamingTag(tag); setRenameDraft(tag); }}
                          title="Rename"
                          style={{
                            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 4, color: T.textSecondary, cursor: 'default',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Icon name="pencil" size={11} strokeWidth={1.7} />
                        </div>
                        <div
                          onClick={async () => {
                            const ok = window.confirm(
                              `Delete tag "${tag}"?\n\nThis will remove the tag from ${count} ${count === 1 ? 'app' : 'apps'}. The apps themselves will not be deleted.`
                            );
                            if (!ok) return;
                            await window.catalog.deleteTag(tag);
                            onTagsChanged?.();
                          }}
                          title="Delete tag"
                          style={{
                            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 4, color: T.red, cursor: 'default',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.10)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Icon name="trash" size={11} strokeWidth={1.7} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </Section>
        </div>

        <div style={{
          padding: '12px 16px',
          borderTop: `0.5px solid ${T.sep}`,
          background: '#fafaf9',
          display: 'flex', justifyContent: 'flex-end',
        }}>
          <Btn kind="primary" onClick={onClose}>Done</Btn>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: T.textTertiary,
        textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8,
      }}>{title}</div>
      <div style={{
        background: '#fff', borderRadius: 8,
        boxShadow: `inset 0 0 0 0.5px ${T.sepStrong}`,
        padding: '12px 14px',
      }}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 0',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{hint}</div>}
      </div>
      <div
        onClick={() => onChange?.(!value)}
        style={{
          width: 34, height: 20, borderRadius: 10,
          background: value ? T.accent : 'rgba(0,0,0,0.18)',
          padding: 2, transition: 'background 0.15s',
          cursor: 'default', position: 'relative',
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: 8, background: '#fff',
          boxShadow: '0 0.5px 0 rgba(0,0,0,0.18), 0 1px 2px rgba(0,0,0,0.12)',
          transform: value ? 'translateX(14px)' : 'translateX(0)',
          transition: 'transform 0.15s',
        }} />
      </div>
    </div>
  );
}
