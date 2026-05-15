const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('urly', {
  listApps: () => ipcRenderer.invoke('apps:list'),
  createApp: (data) => ipcRenderer.invoke('apps:create', data),
  updateApp: (id, patch) => ipcRenderer.invoke('apps:update', id, patch),
  deleteApp: (id, opts) => ipcRenderer.invoke('apps:delete', id, opts),
  clearCache: (id, opts) => ipcRenderer.invoke('apps:clearCache', id, opts),
  refetchIcon: (id) => ipcRenderer.invoke('apps:refetchIcon', id),
  launchApp: (id) => ipcRenderer.invoke('apps:launch', id),
  revealApp: (id) => ipcRenderer.invoke('apps:revealInFinder', id),
  extractMeta: (url) => ipcRenderer.invoke('meta:extract', url),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  pickIcon: () => ipcRenderer.invoke('dialog:pickIcon'),
  deleteTag: (name) => ipcRenderer.invoke('tags:delete', name),
  renameTag: (oldName, newName) => ipcRenderer.invoke('tags:rename', oldName, newName),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  onOpenSettings: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('open-settings', handler);
    return () => ipcRenderer.removeListener('open-settings', handler);
  },
});
