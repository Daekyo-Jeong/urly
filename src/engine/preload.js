const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__catalogBridge', {
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  canGoBack: () => ipcRenderer.sendSync('can-go-back'),
  canGoForward: () => ipcRenderer.sendSync('can-go-forward'),
  goBack: () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
});
