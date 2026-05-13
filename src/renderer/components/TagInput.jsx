import React, { useState, useRef, useEffect } from 'react';
import { T } from '../tokens';
import Icon from './Icon';

export default function TagInput({ value = [], onChange, suggestions = [] }) {
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const normalized = (s) => s.trim();

  const addTag = (raw) => {
    const t = normalized(raw);
    if (!t) return;
    if (value.includes(t)) return;
    onChange?.([...value, t]);
    setDraft('');
  };

  const removeTag = (t) => {
    onChange?.(value.filter(x => x !== t));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const filteredSuggestions = suggestions
    .filter(s => !value.includes(s) && (draft ? s.toLowerCase().includes(draft.toLowerCase()) : true))
    .slice(0, 6);

  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4,
          minHeight: 28, padding: '3px 6px',
          background: T.inputBg,
          borderRadius: 6,
          boxShadow: focused
            ? `inset 0 0 0 0.5px ${T.sepStrong}, 0 0 0 3px ${T.accentMuted}, 0 0 0 1.5px ${T.accent}`
            : `inset 0 0 0 0.5px ${T.sepStrong}`,
          fontSize: 13, cursor: 'text',
        }}
      >
        {value.map(tag => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 4px 2px 7px', borderRadius: 4,
            background: T.accentMuted, color: T.accent,
            fontSize: 11.5, fontWeight: 500,
          }}>
            <Icon name="folder" size={10} strokeWidth={1.8} />
            {tag}
            <span onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              style={{ display: 'flex', cursor: 'default', padding: '0 2px', opacity: 0.7 }}>
              <Icon name="x" size={9} strokeWidth={2} />
            </span>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { setTimeout(() => setFocused(false), 150); if (draft) addTag(draft); }}
          placeholder={value.length === 0 ? 'Add tags…' : ''}
          style={{
            flex: 1, minWidth: 80,
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, color: T.text, fontFamily: T.font,
            padding: '2px 4px',
          }}
        />
      </div>
      {focused && filteredSuggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 4, padding: 4,
          background: T.popoverBg,
          backdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 6,
          boxShadow: '0 0 0 0.5px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 200,
        }}>
          {filteredSuggestions.map(s => (
            <div key={s}
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 8px', borderRadius: 4,
                fontSize: 12.5, color: T.text, cursor: 'default',
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.accentMuted}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Icon name="folder" size={11} strokeWidth={1.7} color={T.textSecondary} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
