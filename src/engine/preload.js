const { contextBridge, ipcRenderer } = require('electron');

// Map of notification id → click handler. Populated when the injected
// UrlyNotification registers a handler for itself; consumed when the main
// process tells us a specific notification was clicked. Without this routing,
// `new Notification(...).onclick = () => navigateToChat(id)` would never fire
// — Chromium's native notification path isn't used (we shell out to
// terminal-notifier from main), so we have to deliver click events ourselves.
const clickListeners = new Map();

ipcRenderer.on('notification-click', (_e, id) => {
  const cb = clickListeners.get(id);
  if (typeof cb === 'function') {
    try { cb(); } catch (err) { console.error('notification click handler threw:', err); }
  }
});

contextBridge.exposeInMainWorld('__urlyBridge', {
  showNotification: (id, title, body) => {
    ipcRenderer.send('show-notification', { id, title, body });
  },
  // Register a click callback for a specific notification id. Returns an
  // unregister function so the injected UrlyNotification can clean up
  // when GC'd or .close()'d.
  onNotificationClick: (id, cb) => {
    clickListeners.set(id, cb);
    return () => clickListeners.delete(id);
  },
  canGoBack: () => ipcRenderer.sendSync('can-go-back'),
  canGoForward: () => ipcRenderer.sendSync('can-go-forward'),
  goBack: () => ipcRenderer.send('go-back'),
  goForward: () => ipcRenderer.send('go-forward'),
});
