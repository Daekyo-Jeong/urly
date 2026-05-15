import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { T } from './tokens';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import GridView from './components/GridView';
import ListView from './components/ListView';
import EmptyState from './components/EmptyState';
import RegisterModal from './components/RegisterModal';
import DeleteDialog from './components/DeleteDialog';
import Toast from './components/Toast';
import SettingsModal from './components/SettingsModal';
import { applyAccent, DEFAULT_ACCENT } from './accent';
import { applyTheme, DEFAULT_THEME } from './theme';

if (!window.urly) {
  const MOCK_APPS = [
    { appId: 'slack', name: 'Slack', url: 'app.slack.com', color: '#4A154B', mark: 'S', created: '2026-01-15T00:00:00Z', updated: '2026-05-11T00:00:00Z', dataSize: 148897792, tags: ['Work'], favorite: true },
    { appId: 'gmail', name: 'Gmail', url: 'mail.google.com', color: '#D93025', mark: 'M', created: '2026-01-20T00:00:00Z', updated: '2026-05-06T00:00:00Z', dataSize: 39845888, tags: ['Work'], favorite: false },
    { appId: 'notion', name: 'Notion', url: 'www.notion.so', color: '#1F1F1F', mark: 'N', created: '2026-02-08T00:00:00Z', updated: '2026-05-13T00:00:00Z', dataSize: 67108864, tags: ['Work'], favorite: true },
    { appId: 'figma', name: 'Figma', url: 'www.figma.com', color: '#0D0D0D', mark: 'F', created: '2026-02-14T00:00:00Z', updated: '2026-05-10T00:00:00Z', dataSize: 220200960, tags: ['Work', 'Design'], favorite: true },
    { appId: 'linear', name: 'Linear', url: 'linear.app', color: '#5E6AD2', mark: 'L', created: '2026-03-01T00:00:00Z', updated: '2026-05-12T00:00:00Z', dataSize: 25165824, tags: ['Work'], favorite: false },
    { appId: 'github', name: 'GitHub', url: 'github.com', color: '#24292E', mark: 'G', created: '2026-01-10T00:00:00Z', updated: '2026-05-08T00:00:00Z', dataSize: 12582912, tags: ['Work'], favorite: false },
    { appId: 'discord', name: 'Discord', url: 'discord.com/channels', color: '#5865F2', mark: 'D', created: '2026-02-01T00:00:00Z', updated: '2026-04-29T00:00:00Z', dataSize: 92274688, tags: ['Personal'], favorite: false },
    { appId: 'chatgpt', name: 'ChatGPT', url: 'chat.openai.com', color: '#10A37F', mark: 'C', created: '2026-03-05T00:00:00Z', updated: '2026-05-13T00:00:00Z', dataSize: 8388608, tags: ['AI'], favorite: true },
    { appId: 'spotify', name: 'Spotify', url: 'open.spotify.com', color: '#1DB954', mark: 'S', created: '2026-01-25T00:00:00Z', updated: '2026-05-13T00:00:00Z', dataSize: 130023424, tags: ['Personal'], favorite: false },
    { appId: 'claude', name: 'Claude', url: 'claude.ai', color: '#C96442', mark: 'C', created: '2026-03-10T00:00:00Z', updated: '2026-05-13T00:00:00Z', dataSize: 11534336, tags: ['AI'], favorite: false },
  ];
  let MOCK_SETTINGS = {
    accentColor: DEFAULT_ACCENT,
    theme: DEFAULT_THEME,
    sidebar: { recentlyAdded: true, favorites: true, tags: true, removed: false },
  };
  window.urly = {
    listApps: async () => MOCK_APPS.map(a => ({ ...a })),
    createApp: async (d) => { MOCK_APPS.push({ appId: d.name.toLowerCase(), ...d, tags: d.tags || [], favorite: d.favorite || false, created: new Date().toISOString(), updated: new Date().toISOString(), dataSize: 0, mark: d.name[0] }); return d; },
    updateApp: async (id, patch) => { const a = MOCK_APPS.find(x => x.appId === id); if (a) Object.assign(a, patch); },
    deleteApp: async (id) => { const i = MOCK_APPS.findIndex(a => a.appId === id); if (i >= 0) MOCK_APPS.splice(i, 1); },
    clearCache: async (id, opts) => { const a = MOCK_APPS.find(a => a.appId === id); if (a) { const freed = a.dataSize; a.dataSize = 0; return { ok: true, freed, mode: opts?.mode || 'cache' }; } return { ok: true, freed: 0 }; },
    launchApp: async () => {},
    revealApp: async () => {},
    extractMeta: async (url) => ({ title: url.replace(/https?:\/\//, '').split('/')[0], iconUrl: null, iconSize: null, source: 'favicon' }),
    openExternal: async () => {},
    pickIcon: async () => null,
    deleteTag: async (name) => { let n = 0; for (const a of MOCK_APPS) { if (Array.isArray(a.tags) && a.tags.includes(name)) { a.tags = a.tags.filter(t => t !== name); n++; } } return { ok: true, affected: n }; },
    renameTag: async (oldName, newName) => { let n = 0; for (const a of MOCK_APPS) { if (Array.isArray(a.tags) && a.tags.includes(oldName)) { a.tags = [...new Set(a.tags.map(t => t === oldName ? newName : t))]; n++; } } return { ok: true, affected: n }; },
    getSettings: async () => ({ ...MOCK_SETTINGS, sidebar: { ...MOCK_SETTINGS.sidebar } }),
    saveSettings: async (patch) => { MOCK_SETTINGS = { ...MOCK_SETTINGS, ...patch, sidebar: { ...MOCK_SETTINGS.sidebar, ...(patch.sidebar || {}) } }; return MOCK_SETTINGS; },
    onOpenSettings: (cb) => () => {},
  };
}

function isRecent(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr).getTime();
  return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
}

export default function App() {
  const [apps, setApps] = useState([]);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [section, setSection] = useState('all');
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [deleteApp, setDeleteApp] = useState(null);
  const [toast, setToast] = useState(null);

  const loadApps = useCallback(async () => {
    try {
      const list = await window.urly.listApps();
      setApps(list);
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const s = await window.urly.getSettings();
      setSettings(s);
      applyAccent(s.accentColor || DEFAULT_ACCENT);
      applyTheme(s.theme || DEFAULT_THEME);
    } catch {
      setSettings({ accentColor: DEFAULT_ACCENT, theme: DEFAULT_THEME, sidebar: { recentlyAdded: true, favorites: true, tags: true, removed: false } });
    }
  }, []);

  useEffect(() => { loadApps(); loadSettings(); }, [loadApps, loadSettings]);

  // Listen for Cmd+, from menu
  useEffect(() => {
    if (!window.urly?.onOpenSettings) return;
    const off = window.urly.onOpenSettings(() => setShowSettings(true));
    return off;
  }, []);

  // Compute tag counts and section counts
  const { tagCounts, counts, allTags } = useMemo(() => {
    const tagCounts = {};
    let recent = 0, fav = 0;
    const allTags = new Set();
    for (const app of apps) {
      if (isRecent(app.created)) recent++;
      if (app.favorite) fav++;
      for (const tag of (app.tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        allTags.add(tag);
      }
    }
    return {
      tagCounts,
      counts: { all: apps.length, recent, fav },
      allTags: [...allTags].sort(),
    };
  }, [apps]);

  const filteredApps = useMemo(() => {
    let list = apps;
    if (section === 'recent') {
      list = list.filter(a => isRecent(a.created));
    } else if (section === 'fav') {
      list = list.filter(a => a.favorite);
    } else if (section.startsWith('tag:')) {
      const tag = section.slice(4);
      list = list.filter(a => (a.tags || []).includes(tag));
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.name.toLowerCase().includes(q) || a.url?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [apps, section, search]);

  const handleAction = useCallback(async (action, app) => {
    switch (action) {
      case 'launch':
        await window.urly.launchApp(app.appId);
        break;
      case 'edit':
        setEditApp(app);
        break;
      case 'delete':
        setDeleteApp(app);
        break;
      case 'reveal':
        await window.urly.revealApp(app.appId);
        break;
      case 'openInBrowser':
        await window.urly.openExternal(app.url.startsWith('http') ? app.url : `https://${app.url}`);
        break;
      case 'toggleFavorite': {
        await window.urly.updateApp(app.appId, { favorite: !app.favorite });
        loadApps();
        break;
      }
      case 'refetchIcon': {
        const result = await window.urly.refetchIcon(app.appId);
        loadApps();
        if (result?.ok) {
          setToast({ ...app, name: `${app.name} icon refreshed` });
        } else {
          setToast({ ...app, name: `${app.name} icon refresh failed` });
        }
        break;
      }
      case 'clearCache': {
        const result = await window.urly.clearCache(app.appId, { mode: 'cache' });
        loadApps();
        const mb = Math.round((result?.freed || 0) / (1024 * 1024));
        setToast({ ...app, name: `${app.name} cache cleared — ${mb} MB freed` });
        break;
      }
      case 'signOut': {
        const ok = window.confirm(
          `Sign out of "${app.name}"?\n\nAll cookies, sessions, and stored data will be deleted. ` +
          `If the app is currently running, it will be closed automatically.`
        );
        if (!ok) break;
        const result = await window.urly.clearCache(app.appId, { mode: 'signout' });
        loadApps();
        const mb = Math.round((result?.freed || 0) / (1024 * 1024));
        setToast({ ...app, name: `${app.name} signed out — ${mb} MB freed` });
        break;
      }
      case 'closeMenu':
        break;
    }
  }, [loadApps]);

  const handleCreated = useCallback(() => {
    loadApps();
    setShowRegister(false);
    setEditApp(null);
  }, [loadApps]);

  const handleDeleted = useCallback(() => {
    loadApps();
    setDeleteApp(null);
  }, [loadApps]);

  const handleSettingsChange = useCallback(async (next) => {
    setSettings(next);
    if (next.accentColor) applyAccent(next.accentColor);
    if (next.theme) applyTheme(next.theme);
    await window.urly.saveSettings(next);
  }, []);

  if (loading || !settings) return null;

  const sectionTitle =
    section === 'recent' ? 'Recently Added' :
    section === 'fav' ? 'Favorites' :
    section.startsWith('tag:') ? section.slice(4) :
    'All Apps';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', fontFamily: T.font }}>
      <Sidebar
        active={section}
        counts={counts}
        tagCounts={tagCounts}
        settings={settings}
        onNavigate={(nav) => setSection(nav.section)}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.contentBg }}>
        <Toolbar
          title={sectionTitle}
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={setSearch}
          onNewApp={() => setShowRegister(true)}
          appCount={filteredApps.length}
        />
        {apps.length === 0 ? (
          <EmptyState onNewApp={() => setShowRegister(true)} />
        ) : view === 'grid' ? (
          <GridView title={sectionTitle} apps={filteredApps} onAction={handleAction} />
        ) : (
          <ListView apps={filteredApps} onAction={handleAction} />
        )}
      </div>

      {(showRegister || editApp) && (
        <RegisterModal
          editApp={editApp}
          allTags={allTags}
          onClose={() => { setShowRegister(false); setEditApp(null); }}
          onCreated={handleCreated}
        />
      )}

      {deleteApp && (
        <DeleteDialog
          app={deleteApp}
          onClose={() => setDeleteApp(null)}
          onDeleted={handleDeleted}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          tagsWithCounts={tagCounts}
          onTagsChanged={() => {
            loadApps();
            // If currently filtering by a tag that no longer exists, fall back to All Apps
            if (section.startsWith('tag:')) setSection('all');
          }}
          onClose={() => setShowSettings(false)}
          onChange={handleSettingsChange}
        />
      )}

      {toast && (
        <Toast
          app={toast}
          onClose={() => setToast(null)}
          onReveal={() => { window.urly.revealApp(toast.appId); setToast(null); }}
        />
      )}
    </div>
  );
}
