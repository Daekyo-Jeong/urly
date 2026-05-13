import React, { useState } from 'react';
import { T } from '../tokens';
import Icon from './Icon';
import { AppMark } from './Squircle';
import { Btn } from './Controls';

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 MB';
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export default function DeleteDialog({ app, onClose, onDeleted }) {
  const [keepUserData, setKeepUserData] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await window.catalog.deleteApp(app.appId, { keepUserData });
      onDeleted?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.18)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={{
        width: 460,
        background: T.modalBg,
        borderRadius: 10,
        boxShadow: '0 0 0 0.5px rgba(0,0,0,0.18), 0 30px 80px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 14px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <AppMark app={app} size={56} />
              <div style={{
                position: 'absolute', bottom: -4, right: -4,
                width: 22, height: 22, borderRadius: 11,
                background: T.red,
                border: '2px solid #f6f6f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}>
                <Icon name="trash" size={11} strokeWidth={1.9} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 6 }}>
            Delete "{app.name}"?
          </div>
          <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.45, marginBottom: 16 }}>
            The .app bundle in <span style={{ fontFamily: T.fontMono, fontSize: 11.5 }}>/Applications/Catalog&nbsp;Apps</span> will be removed.
            This action cannot be undone.
          </div>

          <div style={{
            textAlign: 'left',
            background: T.inputBg,
            borderRadius: 8,
            boxShadow: `inset 0 0 0 0.5px ${T.sepStrong}`,
            marginBottom: 4,
            overflow: 'hidden',
          }}>
            <div onClick={() => setKeepUserData(false)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 12px',
              borderBottom: `0.5px solid ${T.sep}`,
              cursor: 'default',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: !keepUserData ? T.red : 'transparent',
                boxShadow: !keepUserData ? 'none' : `inset 0 0 0 1px ${T.sepStrong}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', marginTop: 1, flexShrink: 0,
              }}>
                {!keepUserData && <Icon name="check" size={11} strokeWidth={2.4} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>Also delete user data</div>
                <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 2 }}>
                  Cookies, sessions, and local storage. <span style={{ color: T.textSecondary }}>{formatSize(app.dataSize)}</span> will be freed.
                </div>
              </div>
            </div>
            <div onClick={() => setKeepUserData(true)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '11px 12px',
              cursor: 'default',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                background: keepUserData ? T.red : 'transparent',
                boxShadow: keepUserData ? 'none' : `inset 0 0 0 1px ${T.sepStrong}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', marginTop: 1, flexShrink: 0,
              }}>
                {keepUserData && <Icon name="check" size={11} strokeWidth={2.4} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>Keep userdata folder</div>
                <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 2 }}>
                  Restore data if you re-create {app.name} later.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '8px 16px 16px', display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Btn kind="secondary" size="lg" onClick={onClose} style={{ minWidth: 110, justifyContent: 'center' }}>Cancel</Btn>
          <Btn kind="danger" size="lg" onClick={handleDelete} disabled={deleting} style={{ minWidth: 110, justifyContent: 'center' }}>
            {deleting ? 'Deleting…' : 'Delete App'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
