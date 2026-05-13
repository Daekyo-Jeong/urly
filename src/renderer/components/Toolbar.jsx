import React from 'react';
import { T } from '../tokens';
import { SearchField, SegmentedControl, Btn } from './Controls';

export default function Toolbar({ title = 'All Apps', view, onViewChange, search, onSearchChange, onNewApp, appCount }) {
  return (
    <div style={{
      height: 52, flexShrink: 0,
      background: T.toolbarBg,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: `0.5px solid ${T.sep}`,
      display: 'flex', alignItems: 'center',
      padding: '0 16px',
      gap: 10,
      WebkitAppRegion: 'drag',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.text, fontSize: 13, fontWeight: 600, WebkitAppRegion: 'no-drag' }}>
        <span>{title}</span>
        <span style={{ color: T.textTertiary, fontWeight: 500 }}>· {appCount} items</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', alignItems: 'center', gap: 10 }}>
        <SegmentedControl
          value={view}
          onChange={onViewChange}
          items={[{ value: 'grid', icon: 'grid' }, { value: 'list', icon: 'list' }]}
        />
        <div style={{ width: 1, height: 18, background: T.sep }} />
        <SearchField value={search} onChange={onSearchChange} placeholder="Search apps" />
        <div style={{ width: 1, height: 18, background: T.sep }} />
        <Btn kind="primary" icon="plus" size="md" onClick={onNewApp}>New App</Btn>
      </div>
    </div>
  );
}
