import React, { useState, useCallback } from 'react';
import { T } from '../tokens';
import Icon from './Icon';
import Squircle, { AppMark } from './Squircle';
import { Btn } from './Controls';
import TagInput from './TagInput';

function ModalOverlay({ children, onClose }) {
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
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle }) {
  return (
    <div style={{
      padding: '14px 20px 12px',
      borderBottom: `0.5px solid ${T.sep}`,
      background: T.modalHeaderBg,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</div>
      {subtitle && <div style={{ fontSize: 11, color: T.textTertiary, marginTop: 1 }}>{subtitle}</div>}
    </div>
  );
}

function ModalFooter({ children }) {
  return (
    <div style={{
      padding: '12px 16px',
      borderTop: `0.5px solid ${T.sep}`,
      background: T.modalHeaderBg,
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
    }}>
      {children}
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: T.textSecondary }}>{label}</label>
        {hint && <span style={{ fontSize: 11, color: T.textTertiary }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, onBlur, placeholder, mono, autoFocus }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange?.(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      style={{
        width: '100%', height: 28, padding: '0 8px',
        background: T.inputBg, border: 'none', outline: 'none',
        borderRadius: 6,
        boxShadow: `inset 0 0 0 0.5px ${T.sepStrong}, inset 0 1px 0 rgba(0,0,0,0.03)`,
        fontSize: mono ? 12.5 : 13,
        fontFamily: mono ? T.fontMono : T.font,
        color: T.text,
        boxSizing: 'border-box',
      }}
    />
  );
}

export default function RegisterModal({ onClose, onCreated, editApp = null, allTags = [] }) {
  const isEdit = !!editApp;
  const [url, setUrl] = useState(editApp?.url || '');
  const [name, setName] = useState(editApp?.name || '');
  const [tags, setTags] = useState(editApp?.tags || []);
  const [favorite, setFavorite] = useState(editApp?.favorite || false);
  const [customIconPath, setCustomIconPath] = useState(null);
  const [extractState, setExtractState] = useState('idle'); // idle | extracting | done | error
  const [extractInfo, setExtractInfo] = useState(null);
  const [creating, setCreating] = useState(false);

  const handleUrlBlur = useCallback(async () => {
    if (!url || extractState === 'extracting') return;
    setExtractState('extracting');
    try {
      const meta = await window.catalog.extractMeta(url);
      setExtractInfo(meta);
      if (meta.title && !name) setName(meta.title);
      setExtractState('done');
    } catch {
      setExtractState('error');
    }
  }, [url, name, extractState]);

  const handlePickIcon = async () => {
    const filePath = await window.catalog.pickIcon();
    if (filePath) setCustomIconPath(filePath);
  };

  const handleSubmit = async () => {
    if (!url || !name || creating) return;
    setCreating(true);
    try {
      // Normalize URL: prepend https:// if no protocol
      let normalizedUrl = url.trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }
      if (isEdit) {
        await window.catalog.updateApp(editApp.appId, {
          name, url: normalizedUrl, tags, favorite,
          iconPath: customIconPath || undefined,
        });
      } else {
        await window.catalog.createApp({
          name, url: normalizedUrl, tags, favorite,
          iconPath: customIconPath || undefined,
          iconUrl: extractInfo?.iconUrl || undefined,
          iconUrls: extractInfo?.iconUrls || undefined,
        });
      }
      onCreated?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  const canCreate = url && name && !creating;

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader
        title={isEdit ? 'Edit App' : 'New App'}
        subtitle={isEdit ? undefined : 'Turn any website into a macOS app'}
      />
      <div style={{ padding: '22px 22px 18px' }}>
        {/* Icon preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <div style={{ position: 'relative', cursor: 'default' }} onClick={handlePickIcon}>
            {extractState === 'extracting' ? (
              <Squircle size={72} bg="#e9e7e2" shadow={false}>
                <div style={{
                  width: 32, height: 32,
                  border: '2.6px solid rgba(0,0,0,0.12)',
                  borderTopColor: T.accent,
                  borderRadius: '50%',
                  animation: 'spin 0.9s linear infinite',
                }} />
              </Squircle>
            ) : (extractState === 'done' && extractInfo?.iconUrl) || (isEdit && editApp.iconUrl) ? (
              <>
                <AppMark
                  app={{
                    name,
                    iconUrl: customIconPath
                      ? `file://${customIconPath}`
                      : (extractInfo?.iconUrl || editApp?.iconUrl),
                    mark: name.charAt(0).toUpperCase(),
                  }}
                  size={72}
                />
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 24, height: 24, borderRadius: 12,
                  background: T.inputBg,
                  boxShadow: '0 0.5px 0 rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: T.text,
                }}>
                  <Icon name="pencil" size={11} strokeWidth={1.7} />
                </div>
              </>
            ) : (
              <Squircle size={72} bg="#e9e7e2" shadow={false}>
                <Icon name="globe" size={38} color={T.textTertiary} strokeWidth={1.4} />
              </Squircle>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
              {name || 'Untitled App'}
            </div>
            {extractState === 'extracting' ? (
              <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="refresh" size={11} color={T.accent} strokeWidth={1.7} />
                <span>Fetching title and icon…</span>
              </div>
            ) : extractState === 'done' && extractInfo ? (
              <div style={{ fontSize: 11.5, color: T.textSecondary, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="check" size={11} color={T.green} strokeWidth={1.9} />
                <span>Found {extractInfo.source}{extractInfo.iconSize ? ` · ${extractInfo.iconSize}` : ''}</span>
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: T.textTertiary, marginTop: 3 }}>
                Icon will be extracted automatically.<br />Click to choose your own.
              </div>
            )}
          </div>
        </div>

        <FormField label="URL" hint={extractState === 'done' ? 'Resolved' : 'Required'}>
          <TextInput value={url} onChange={setUrl} onBlur={handleUrlBlur} placeholder="https://" mono autoFocus={!isEdit} />
        </FormField>

        <FormField label="Name" hint="Auto-filled from page title">
          <TextInput value={name} onChange={setName} placeholder="—" />
        </FormField>

        <FormField label="Tags" hint="Press Enter or comma to add">
          <TagInput value={tags} onChange={setTags} suggestions={allTags} />
        </FormField>

        <div
          onClick={() => setFavorite(!favorite)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 6,
            background: T.controlTrack,
            fontSize: 12, color: T.textSecondary,
            cursor: 'default', marginBottom: 14,
          }}
        >
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            background: favorite ? T.accent : 'transparent',
            boxShadow: favorite ? 'none' : `inset 0 0 0 1px ${T.sepStrong}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
          }}>
            {favorite && <Icon name="check" size={10} strokeWidth={2.4} />}
          </div>
          <Icon name="star" size={13} color={favorite ? T.accent : T.textTertiary} strokeWidth={1.6} />
          <span style={{ flex: 1 }}>Add to Favorites</span>
        </div>

        <FormField label="Install location">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 24, padding: '0 8px',
            color: T.textSecondary, fontSize: 12,
          }}>
            <Icon name="folder" size={13} strokeWidth={1.6} />
            <span>/Applications/Catalog Apps/</span>
          </div>
        </FormField>
      </div>

      <ModalFooter>
        <Btn kind="plain" onClick={onClose}>Cancel</Btn>
        <Btn kind="primary" icon={isEdit ? 'check' : 'sparkles'} disabled={!canCreate} onClick={handleSubmit}>
          {creating ? 'Creating…' : isEdit ? 'Save Changes' : 'Create App'}
        </Btn>
      </ModalFooter>
    </ModalOverlay>
  );
}
