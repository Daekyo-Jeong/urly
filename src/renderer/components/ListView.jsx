import React, { useState } from 'react';
import { T } from '../tokens';
import Icon from './Icon';
import { AppMark } from './Squircle';
import { Btn } from './Controls';

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const COLS = [
  { key: 'name', label: 'Name', flex: '0 0 220px' },
  { key: 'url', label: 'URL', flex: '1 1 0' },
  { key: 'tags', label: 'Tags', flex: '0 0 140px' },
  { key: 'updated', label: 'Last Modified', flex: '0 0 130px' },
  { key: 'size', label: 'Data', flex: '0 0 80px' },
];

export default function ListView({ apps, onAction }) {
  const [selectedId, setSelectedId] = useState(null);
  const selectedApp = apps.find(a => a.appId === selectedId);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Column headers */}
      <div style={{
        display: 'flex', height: 24, flexShrink: 0,
        background: '#f0eee9',
        borderBottom: `0.5px solid ${T.sep}`,
        padding: '0 16px',
        fontSize: 11, fontWeight: 600, color: T.textSecondary,
      }}>
        {COLS.map((c, i) => (
          <div key={c.key} style={{
            flex: c.flex, display: 'flex', alignItems: 'center',
            padding: '0 8px', gap: 4,
            borderRight: i < COLS.length - 1 ? `0.5px solid ${T.sep}` : 'none',
          }}>
            <span>{c.label}</span>
            {c.key === 'name' && <Icon name="chevronDown" size={9} color={T.textSecondary} strokeWidth={1.8} />}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {apps.map((app, i) => {
          const sel = app.appId === selectedId;
          const alt = i % 2 === 1;
          return (
            <div key={app.appId}
              onClick={() => setSelectedId(app.appId)}
              onDoubleClick={() => onAction?.('launch', app)}
              style={{
                display: 'flex', alignItems: 'center', height: 32,
                padding: '0 16px',
                background: sel ? T.accent : (alt ? '#fafaf9' : '#fff'),
                color: sel ? '#fff' : T.text,
                fontSize: 12.5,
                borderBottom: `0.5px solid ${T.sep}`,
                cursor: 'default',
              }}
            >
              <div style={{ flex: COLS[0].flex, display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', minWidth: 0 }}>
                <AppMark app={app} size={20} shadow={false} />
                {app.favorite && <Icon name="star" size={10} color={sel ? '#fff' : T.accent} strokeWidth={1.8} />}
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.name}</span>
              </div>
              <div style={{
                flex: COLS[1].flex, padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                color: sel ? 'rgba(255,255,255,0.86)' : T.textSecondary, fontFamily: T.fontMono, fontSize: 11.5,
              }}>
                {(app.url || '').replace(/^https?:\/\//, '')}
              </div>
              <div style={{ flex: COLS[2].flex, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                {(app.tags || []).slice(0, 2).map(tag => (
                  <span key={tag} style={{
                    display: 'inline-block', padding: '1px 6px', borderRadius: 4,
                    fontSize: 10.5, fontWeight: 500,
                    background: sel ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.05)',
                    color: sel ? '#fff' : T.textSecondary,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    maxWidth: 60,
                  }}>{tag}</span>
                ))}
                {(app.tags || []).length > 2 && (
                  <span style={{ fontSize: 10, color: sel ? 'rgba(255,255,255,0.6)' : T.textTertiary }}>
                    +{app.tags.length - 2}
                  </span>
                )}
              </div>
              <div style={{ flex: COLS[3].flex, padding: '0 8px', color: sel ? 'rgba(255,255,255,0.78)' : T.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                {formatDate(app.updated)}
              </div>
              <div style={{ flex: COLS[4].flex, padding: '0 8px', color: sel ? 'rgba(255,255,255,0.78)' : T.textTertiary, fontVariantNumeric: 'tabular-nums' }}>
                {formatSize(app.dataSize)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspector */}
      {selectedApp && (
        <div style={{
          height: 84, flexShrink: 0,
          borderTop: `0.5px solid ${T.sep}`,
          background: '#fafaf9',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <AppMark app={selectedApp} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{selectedApp.name}</div>
            <div style={{ fontSize: 12, color: T.textSecondary, fontFamily: T.fontMono, marginTop: 1 }}>{selectedApp.url}</div>
            <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 4, display: 'flex', gap: 10 }}>
              <span>Created {formatDate(selectedApp.created)}</span>
              <span>·</span>
              <span>Bundle ID app.catalog.{selectedApp.appId}</span>
              <span>·</span>
              <span>{formatSize(selectedApp.dataSize)} user data</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn icon="play" size="md" onClick={() => onAction?.('launch', selectedApp)}>Launch</Btn>
            <Btn icon="pencil" size="md" onClick={() => onAction?.('edit', selectedApp)}>Edit</Btn>
            <Btn icon="trash" size="md" kind="plain" onClick={() => onAction?.('delete', selectedApp)} style={{ color: T.red }}>Delete</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
