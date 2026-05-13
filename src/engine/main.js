const { app, BrowserWindow, shell, nativeImage, Menu, MenuItem, ipcMain, protocol, net, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

const CATALOG_DIR = path.join(app.getPath('home'), '.catalog');
const APPS_DIR = path.join(CATALOG_DIR, 'apps');

// Register a custom URL scheme for serving per-app icon files. Required because
// in the dev catalog manager the renderer is loaded over http://localhost:5173
// and Chromium refuses to load file:// resources from an http:// origin. Even
// in the packaged renderer (loaded from file://) some browser policies still
// reject cross-directory file:// fetches; a privileged scheme sidesteps all of
// that. Must be called before app.whenReady().
protocol.registerSchemesAsPrivileged([
  { scheme: 'catalog-icon', privileges: { standard: true, secure: true, supportFetchAPI: true, bypassCSP: true } },
]);

// Chromium third-party storage partitioning (default-on since M115) breaks
// Firebase Auth's signInWithPopup / signInWithRedirect flows. Concrete trace
// for the worktime-server site (Firebase project worktimemanager-fb56f):
//
//   1. show.hnine.com calls auth.signInWithPopup(googleProvider)
//   2. Firebase SDK opens popup → worktimemanager-fb56f.firebaseapp.com/__/auth/handler
//   3. SDK ALSO embeds a hidden iframe at the SAME origin inside show.hnine.com
//      to relay messages between popup and opener
//   4. Both popup and iframe write/read the OAuth state in
//      `worktimemanager-fb56f.firebaseapp.com` storage. Without partitioning,
//      they share that storage. With partitioning ON:
//        - iframe's storage is keyed by (show.hnine.com, firebaseapp.com) pair
//        - popup's storage is keyed by (firebaseapp.com, firebaseapp.com) pair
//      Different partitions of the same origin → they can't see each other.
//   5. The handler returns "Unable to process request due to missing initial
//      state" and the user's catch shows "로그인에 실패했습니다".
//
// WebCatalog works because it ships an older Chromium (pre-M115) that didn't
// have this feature. Modern desktop Chrome users hit the same issue on web
// — Google's fix is to migrate the authDomain to match the app's domain
// (Firebase Hosting custom domain), which is a site-level change we can't
// make. From the SSB side we opt the whole browser out of partitioning since
// we only host trusted first-party apps where the cross-site tracking
// rationale doesn't apply.
//
// Several related features sometimes have to be disabled together — listing
// the full set so the next Chromium uplift doesn't silently re-break this.
app.commandLine.appendSwitch(
  'disable-features',
  [
    'ThirdPartyStoragePartitioning',   // the M115 culprit
    'PartitionedCookies',              // separate cookie partition
    'TrackingProtection3pcd',          // Chrome's 3rd-party-cookie deprecation
    'PrivacySandboxSettings4',         // sandbox UI / consent flows
    'StoragePartitioningByDefault',    // safety belt — alias name used in some milestones
  ].join(',')
);

function getAppIdFromArgs() {
  for (const arg of process.argv.slice(1)) {
    const match = arg.match(/^--app-id=(.+)$/);
    if (match) return match[1];
  }
  return null;
}

// When the stub .app launches us directly (no --app-id arg), read the
// CatalogAppID key from the parent .app's Info.plist. process.execPath points
// at the stub's MacOS binary; the Info.plist is two levels up.
function getAppIdFromBundle() {
  try {
    const execDir = path.dirname(process.execPath);
    const plistPath = path.join(execDir, '..', 'Info.plist');
    if (!fs.existsSync(plistPath)) return null;
    const plistLib = require('plist');
    const info = plistLib.parse(fs.readFileSync(plistPath, 'utf-8'));
    return info.CatalogAppID || null;
  } catch {
    return null;
  }
}

function resolveAppId() {
  return getAppIdFromArgs() || getAppIdFromBundle();
}

function loadAppConfig(appId) {
  const configPath = path.join(APPS_DIR, appId, 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveWindowState(appId, bounds) {
  const configPath = path.join(APPS_DIR, appId, 'config.json');
  const config = loadAppConfig(appId);
  config.windowBounds = bounds;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function getDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// Auth-flow domains that should always navigate in-window even when they're
// off-origin. Most are Firebase/Google OAuth handshake hosts that the policy
// would otherwise kick out to the system browser, breaking the handshake mid-
// flight (the popup posts back to `firebaseapp.com/__/auth/handler`, which
// must stay in the SSB to read tokens via window.opener).
const AUTH_DOMAINS = [
  // Google
  'accounts.google.com',
  'oauth2.googleapis.com',
  'apis.google.com',
  'googleusercontent.com',
  'content.googleapis.com',
  // Firebase Auth
  'firebaseapp.com',
  'firebase.google.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'web.app',
  // Microsoft
  'login.microsoftonline.com',
  'login.live.com',
  'login.microsoft.com',
  // Apple
  'appleid.apple.com',
  // GitHub
  'github.com',
  // Common third-party identity providers
  'auth0.com',
  'okta.com',
  'onelogin.com',
  // Social login
  'facebook.com',
  'x.com',
  'twitter.com',
  'linkedin.com',
];

function isInternalNavigation(targetUrl, baseUrl) {
  const targetDomain = getDomain(targetUrl);
  const baseDomain = getDomain(baseUrl);
  if (!targetDomain || !baseDomain) return true;

  const baseParts = baseDomain.split('.').slice(-2).join('.');
  const targetParts = targetDomain.split('.').slice(-2).join('.');

  if (targetParts === baseParts) return true;

  if (AUTH_DOMAINS.some(d => targetDomain === d || targetDomain.endsWith(`.${d}`))) {
    return true;
  }

  return false;
}

function setupMenu(win) {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => { win.webContents.reload(); },
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'close', accelerator: 'CmdOrCtrl+W' },
        { role: 'minimize', accelerator: 'CmdOrCtrl+M' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupContextMenu(win) {
  win.webContents.on('context-menu', (e, params) => {
    const menu = new Menu();

    if (params.linkURL) {
      menu.append(new MenuItem({
        label: 'Open Link in Browser',
        click: () => shell.openExternal(params.linkURL),
      }));
      menu.append(new MenuItem({
        label: 'Copy Link',
        click: () => { require('electron').clipboard.writeText(params.linkURL); },
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.selectionText) {
      menu.append(new MenuItem({ role: 'copy' }));
    }

    if (params.isEditable) {
      menu.append(new MenuItem({ role: 'undo' }));
      menu.append(new MenuItem({ role: 'redo' }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({ role: 'cut' }));
      menu.append(new MenuItem({ role: 'copy' }));
      menu.append(new MenuItem({ role: 'paste' }));
      menu.append(new MenuItem({ role: 'selectAll' }));
    }

    if (params.mediaType === 'image') {
      menu.append(new MenuItem({
        label: 'Copy Image',
        click: () => { win.webContents.copyImageAt(params.x, params.y); },
      }));
      menu.append(new MenuItem({
        label: 'Save Image As…',
        click: () => { win.webContents.downloadURL(params.srcURL); },
      }));
    }

    if (menu.items.length === 0) {
      menu.append(new MenuItem({
        label: 'Back',
        enabled: win.webContents.canGoBack(),
        click: () => win.webContents.goBack(),
      }));
      menu.append(new MenuItem({
        label: 'Forward',
        enabled: win.webContents.canGoForward(),
        click: () => win.webContents.goForward(),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
      menu.append(new MenuItem({
        label: 'Reload',
        click: () => win.webContents.reload(),
      }));
    }

    menu.popup();
  });
}

function setupNotifications(win) {
  win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = [
      'notifications',
      'media',
      'mediaKeySystem',
      'geolocation',
      'clipboard-read',
      'clipboard-sanitized-write',
      'fullscreen',
    ];
    callback(allowed.includes(permission));
  });

  ipcMain.on('can-go-back', (e) => { e.returnValue = win.webContents.canGoBack(); });
  ipcMain.on('can-go-forward', (e) => { e.returnValue = win.webContents.canGoForward(); });
  ipcMain.on('go-back', () => { if (win.webContents.canGoBack()) win.webContents.goBack(); });
  ipcMain.on('go-forward', () => { if (win.webContents.canGoForward()) win.webContents.goForward(); });

  ipcMain.on('show-notification', (e, data) => {
    const title = (data.title || app.name).replace(/"/g, '\\"');
    const body = (data.body || '').replace(/"/g, '\\"');
    const script = `display notification "${body}" with title "${title}"`;
    execFile('osascript', ['-e', script]);
  });
}

function setupNavigation(win) {
  // 3-finger swipe (macOS system gesture)
  win.on('swipe', (e, direction) => {
    if (direction === 'left' && win.webContents.canGoBack()) {
      win.webContents.goBack();
    } else if (direction === 'right' && win.webContents.canGoForward()) {
      win.webContents.goForward();
    }
  });

  // Mouse back/forward buttons (app-command on Windows/Linux)
  win.on('app-command', (e, cmd) => {
    if (cmd === 'browser-backward' && win.webContents.canGoBack()) {
      win.webContents.goBack();
    } else if (cmd === 'browser-forward' && win.webContents.canGoForward()) {
      win.webContents.goForward();
    }
  });

  // Swipe navigation with visual indicator (trackpad / Magic Mouse)
  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      (function() {
        if (window.__catalogSwipeSetup) return;
        window.__catalogSwipeSetup = true;

        var el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:50%;width:32px;height:32px;z-index:2147483647;pointer-events:none;border-radius:50%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;transform:translateY(-50%) scale(0);transition:transform 0.15s,opacity 0.15s,background 0.1s;opacity:0;';
        var svgBack = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8L10 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        var svgFwd = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8L6 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        document.body.appendChild(el);

        var accX = 0;
        var resetTimer = null;
        var navigated = false;
        var THRESHOLD = 160;

        function show(dir, progress) {
          var p = Math.min(progress / THRESHOLD, 1);
          el.innerHTML = dir === 'back' ? svgBack : svgFwd;
          el.style.left = dir === 'back' ? '8px' : 'auto';
          el.style.right = dir === 'back' ? 'auto' : '8px';
          el.style.opacity = String(Math.min(p * 2, 1));
          el.style.transform = 'translateY(-50%) scale(' + (0.4 + p * 0.6) + ')';
          el.style.background = p >= 1 ? 'rgba(0,122,255,0.9)' : 'rgba(0,0,0,0.6)';
        }

        function hide() {
          el.style.opacity = '0';
          el.style.transform = 'translateY(-50%) scale(0)';
        }

        var bridge = window.__catalogBridge;
        var swiping = false;
        var peakX = 0;

        window.addEventListener('wheel', function(e) {
          var dominated = Math.abs(e.deltaX) > Math.abs(e.deltaY);
          var significant = Math.abs(e.deltaX) >= 2;

          if (!swiping && dominated && significant) {
            swiping = true;
          }

          if (!swiping) return;

          // Swipe ended: deltaX drops to near zero
          if (Math.abs(e.deltaX) < 1 && swiping) {
            if (Math.abs(peakX) >= THRESHOLD) {
              if (peakX < 0 && bridge.canGoBack()) {
                bridge.goBack();
              } else if (peakX > 0 && bridge.canGoForward()) {
                bridge.goForward();
              }
            }
            hide();
            accX = 0;
            peakX = 0;
            swiping = false;
            return;
          }

          accX += e.deltaX;
          peakX = accX;
          var absX = Math.abs(accX);

          if (accX < 0 && bridge.canGoBack()) {
            show('back', absX);
          } else if (accX > 0 && bridge.canGoForward()) {
            show('forward', absX);
          }

          // Fallback timeout in case deltaX never hits 0
          clearTimeout(resetTimer);
          resetTimer = setTimeout(function() {
            if (swiping && Math.abs(peakX) >= THRESHOLD) {
              if (peakX < 0 && bridge.canGoBack()) {
                bridge.goBack();
              } else if (peakX > 0 && bridge.canGoForward()) {
                bridge.goForward();
              }
            }
            hide();
            accX = 0;
            peakX = 0;
            swiping = false;
          }, 200);
        }, { passive: true });
      })();
    `);
  });
}

function createWindow(config, appId) {
  const bounds = config.windowBounds || { width: 1280, height: 800 };

  const win = new BrowserWindow({
    ...bounds,
    title: config.name,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Google (and other IdPs) reject OAuth flows from "embedded browsers" via a
  // `disallowed_useragent` error when the User-Agent contains tokens like
  // "Electron/42.0.1" or our app name. Build a clean UA from the actual
  // Chrome version Electron ships, with no Electron/Catalog markers — same
  // shape a standard Chrome on macOS sends.
  const chromeVersion = (process.versions.chrome || '126.0.0.0').split('.').slice(0, 4).join('.');
  const cleanUa = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  win.webContents.setUserAgent(cleanUa);

  // Default the SSB to Korean: this single call sets BOTH the Accept-Language
  // HTTP header (used server-side for content negotiation, e.g., GitHub,
  // Slack, X serve Korean translations) and what JS sees in `navigator.language`
  // / `navigator.languages` (used by Notion, ChatGPT, etc. that switch locale
  // client-side). Apply at the session level so popups and subresource
  // requests inherit it without per-window setup.
  const acceptLanguages = 'ko-KR,ko;q=0.9,en-US;q=0.7,en;q=0.5';
  win.webContents.session.setUserAgent(cleanUa, acceptLanguages);

  win.loadURL(config.url);

  win.webContents.on('page-title-updated', (e, title) => {
    win.setTitle(title);
  });

  win.webContents.setWindowOpenHandler(({ url, features, disposition, frameName }) => {
    if (!isInternalNavigation(url, config.url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }

    // Parse the JS-supplied "width=500,height=600,..." feature string. Firebase
    // and most identity providers call window.open with specific dimensions
    // for their OAuth popup — without this we'd open the auth window at the
    // SSB's default 1280×800, which fails the heuristic some IdPs use to
    // detect a popup and breaks the postMessage-back-to-opener handshake.
    const feat = {};
    (features || '').split(/[,;]/).forEach(part => {
      const [k, v] = part.split('=');
      if (k && v) feat[k.trim().toLowerCase()] = v.trim();
    });
    const num = (key, fallback) => {
      const n = parseInt(feat[key], 10);
      return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    const isPopupLike = disposition === 'new-window'
      || frameName === '_blank'
      || (features && features.length > 0);

    return {
      action: 'allow',
      overrideBrowserWindowOptions: isPopupLike ? {
        // Popup-shaped window so the IdP recognizes it as an auth popup and
        // sizes/positions like a system browser would.
        width: num('width', 500),
        height: num('height', 600),
        title: config.name,
        // Inherit the parent's session implicitly; explicitly carry over
        // contextIsolation so the popup can still talk to its opener via
        // postMessage (the standard Firebase auth handshake).
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
      } : undefined,
    };
  });

  // Once a popup is born (typically an OAuth/Firebase auth window), let it
  // navigate wherever it needs for the handshake. The handshake hops through
  // several off-origin hosts (accounts.google.com → firebaseapp.com/__/auth/
  // handler → securetoken.googleapis.com etc.) and the popup posts the result
  // back to its opener — interrupting any leg of that with shell.openExternal
  // breaks the login. The main window still enforces its own navigation
  // policy below; this only relaxes things for genuine child popups.
  win.webContents.on('did-create-window', (childWin) => {
    // Carry the cleaned User-Agent into popups so Google OAuth doesn't see
    // "Electron/X.Y.Z" and reject with `disallowed_useragent`.
    childWin.webContents.setUserAgent(cleanUa);

    childWin.webContents.setWindowOpenHandler(({ url: childUrl }) => {
      // Allow nested popups too (some IdPs open additional confirmation
      // windows); we don't try to police them.
      return { action: 'allow' };
    });
  });

  win.webContents.on('will-navigate', (e, url) => {
    if (!isInternalNavigation(url, config.url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.session.on('will-download', (e, item) => {
    const downloadsPath = app.getPath('downloads');
    item.setSavePath(path.join(downloadsPath, item.getFilename()));
  });

  win.on('close', () => {
    saveWindowState(appId, win.getBounds());
  });

  setupMenu(win);
  setupContextMenu(win);
  setupNotifications(win);
  setupNavigation(win);

  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`
      (function() {
        class CatalogNotification {
          constructor(title, options) {
            if (window.__catalogBridge) {
              window.__catalogBridge.showNotification(title, (options && options.body) || '');
            }
          }
          static get permission() { return 'granted'; }
          static requestPermission(cb) {
            var p = Promise.resolve('granted');
            if (cb) cb('granted');
            return p;
          }
        }
        window.Notification = CatalogNotification;
      })();
    `);
  });

  return win;
}

// ─────────────────────────────────────────────────────────────
// Catalog Manager — IPC handlers + window
// ─────────────────────────────────────────────────────────────
const CATALOG_INDEX = path.join(CATALOG_DIR, 'catalog.json');
const SETTINGS_PATH = path.join(CATALOG_DIR, 'settings.json');
const INSTALL_DIR = '/Applications/Catalog Apps';

const DEFAULT_SETTINGS = {
  accentColor: '#FF6B35',
  theme: 'auto', // 'auto' | 'light' | 'dark'
  sidebar: {
    recentlyAdded: true,
    favorites: true,
    tags: true,
    removed: false,
  },
};

function loadCatalog() {
  if (fs.existsSync(CATALOG_INDEX)) {
    return JSON.parse(fs.readFileSync(CATALOG_INDEX, 'utf-8'));
  }
  return { apps: [] };
}

function saveCatalog(catalog) {
  fs.writeFileSync(CATALOG_INDEX, JSON.stringify(catalog, null, 2));
}

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const stored = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
      return {
        ...DEFAULT_SETTINGS,
        ...stored,
        sidebar: { ...DEFAULT_SETTINGS.sidebar, ...(stored.sidebar || {}) },
      };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings) {
  fs.mkdirSync(CATALOG_DIR, { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function setupCatalogIPC() {
  ipcMain.handle('apps:list', async () => {
    const catalog = loadCatalog();
    return catalog.apps.map(entry => {
      const configPath = path.join(APPS_DIR, entry.appId, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const pngPath = path.join(APPS_DIR, entry.appId, 'icon.png');
        const hasCustomIcon = fs.existsSync(pngPath);
        // Stable URL the renderer can hand straight to <image href>. Cache-bust
        // via ?t={updated} so refreshed icons re-download immediately.
        const iconUrl = hasCustomIcon
          ? `catalog-icon://app/${entry.appId}?t=${encodeURIComponent(config.updated || '')}`
          : null;
        const userdataDir = path.join(APPS_DIR, entry.appId, 'userdata');
        let dataSize = 0;
        if (fs.existsSync(userdataDir)) {
          try {
            const { execSync } = require('child_process');
            const out = execSync(`du -sk "${userdataDir}" 2>/dev/null`).toString();
            dataSize = parseInt(out.split('\t')[0], 10) * 1024;
          } catch {}
        }
        return {
          ...entry,
          ...config,
          hasCustomIcon,
          iconUrl,
          dataSize,
        };
      }
      return entry;
    });
  });

  ipcMain.handle('apps:create', async (e, { name, url, iconPath: customIconPath, iconUrl, iconUrls, tags = [], favorite = false }) => {
    const { buildStubApp, slugify } = require('../generator/create-app');
    const appId = slugify(name, url);
    if (!appId) throw new Error('Failed to derive appId from name/url');

    const appDir = path.join(APPS_DIR, appId);
    fs.mkdirSync(appDir, { recursive: true });

    // Resolve icon: custom file > best-of candidate URLs > system default
    const icnsPath = path.join(appDir, 'icon.icns');
    const pngPath = path.join(appDir, 'icon.png');
    let gotIcon = false;
    if (customIconPath && fs.existsSync(customIconPath)) {
      try { await convertToIcns(customIconPath, icnsPath); gotIcon = true; } catch {}
    }
    if (!gotIcon) {
      const urls = iconUrls && iconUrls.length ? iconUrls : (iconUrl ? [iconUrl] : []);
      // Augment with universal fallbacks so callers that pass only a single
      // URL still benefit from the favicon services as a safety net.
      try {
        const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        if (host) {
          urls.push(`https://icons.duckduckgo.com/ip3/${host}.ico`);
          urls.push(`https://www.google.com/s2/favicons?domain=${host}&sz=256`);
        }
      } catch {}
      const result = await downloadFirstValid(urls, pngPath);
      if (result.ok) {
        try { await convertToIcns(pngPath, icnsPath); gotIcon = true; } catch {}
      }
    }
    if (!gotIcon) {
      const systemIcon = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns';
      if (fs.existsSync(systemIcon)) fs.copyFileSync(systemIcon, icnsPath);
    }

    // Build the stub .app (Electron binary copy + framework symlinks + Info.plist)
    const appBundle = buildStubApp({ appId, name, url, iconPath: icnsPath });

    // Persist user-set tags/favorite on top of the config buildStubApp created
    const configPath = path.join(appDir, 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    config.tags = tags;
    config.favorite = favorite;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Update catalog index
    const catalog = loadCatalog();
    const existing = catalog.apps.findIndex(a => a.appId === appId);
    if (existing >= 0) {
      catalog.apps[existing] = { appId, name, url, updated: new Date().toISOString() };
    } else {
      catalog.apps.push({ appId, name, url, created: new Date().toISOString() });
    }
    saveCatalog(catalog);

    return { appId, name, url, appBundle };
  });

  ipcMain.handle('apps:update', async (e, appId, patch) => {
    const configPath = path.join(APPS_DIR, appId, 'config.json');
    if (!fs.existsSync(configPath)) throw new Error(`App not found: ${appId}`);

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const oldName = config.name;

    if (patch.name) config.name = patch.name;
    if (patch.url) config.url = patch.url;
    if (Array.isArray(patch.tags)) config.tags = patch.tags;
    if (typeof patch.favorite === 'boolean') config.favorite = patch.favorite;
    config.updated = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Handle icon update (refresh PNG copy + icns)
    if (patch.iconPath) {
      const icnsPath = path.join(APPS_DIR, appId, 'icon.icns');
      await convertToIcns(patch.iconPath, icnsPath);
    }

    // Anything that changes the .app structure (name, icon, url) requires
    // rebuilding the stub: a name change renames the binary inside MacOS/,
    // a new icon must end up at Resources/app.icns, etc. buildStubApp is
    // idempotent — it tears down and recreates the bundle from current config.
    if (patch.name || patch.url || patch.iconPath) {
      const { buildStubApp } = require('../generator/create-app');
      // Drop the old bundle if the app was renamed
      if (patch.name && patch.name !== oldName) {
        const oldBundle = path.join(INSTALL_DIR, `${oldName}.app`);
        if (fs.existsSync(oldBundle)) fs.rmSync(oldBundle, { recursive: true });
      }
      buildStubApp({
        appId,
        name: config.name,
        url: config.url,
        iconPath: path.join(APPS_DIR, appId, 'icon.icns'),
      });
    }

    // Update catalog index
    const catalog = loadCatalog();
    const entry = catalog.apps.find(a => a.appId === appId);
    if (entry) {
      if (patch.name) entry.name = patch.name;
      if (patch.url) entry.url = patch.url;
      entry.updated = new Date().toISOString();
      saveCatalog(catalog);
    }

    return config;
  });

  ipcMain.handle('apps:refetchIcon', async (e, appId) => {
    const configPath = path.join(APPS_DIR, appId, 'config.json');
    if (!fs.existsSync(configPath)) throw new Error(`App not found: ${appId}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const meta = await extractMeta(config.url);
    const candidates = (meta?.iconUrls && meta.iconUrls.length) ? meta.iconUrls : (meta?.iconUrl ? [meta.iconUrl] : []);
    if (!candidates.length) return { ok: false, reason: 'no icon candidates' };

    const pngPath = path.join(APPS_DIR, appId, 'icon.png');
    const icnsPath = path.join(APPS_DIR, appId, 'icon.icns');
    const result = await downloadFirstValid(candidates, pngPath);
    if (!result.ok) return { ok: false, reason: 'all candidates failed' };

    try {
      await convertToIcns(pngPath, icnsPath);
    } catch (err) {
      return { ok: false, reason: err.message };
    }

    // Rebuild the stub so its Resources/app.icns is refreshed and Dock picks
    // up the new icon on next launch.
    const { buildStubApp } = require('../generator/create-app');
    buildStubApp({ appId, name: config.name, url: config.url, iconPath: icnsPath });

    config.updated = new Date().toISOString();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    return { ok: true, iconUrl: result.url };
  });

  ipcMain.handle('apps:clearCache', async (e, appId, { mode = 'cache' } = {}) => {
    const userdataDir = path.join(APPS_DIR, appId, 'userdata');
    if (!fs.existsSync(userdataDir)) return { ok: true, cleared: 0 };

    const { execSync } = require('child_process');

    // Kill any running SSB instances for this app so Chromium releases file locks
    // and doesn't re-write the deleted files on close.
    let killedRunning = false;
    try {
      execSync(`pkill -f "user-data-dir=${userdataDir}" 2>/dev/null`);
      killedRunning = true;
      await new Promise(r => setTimeout(r, 400));
    } catch {
      // pkill exits non-zero when no process matches — that's fine
    }

    const getSize = () => {
      try {
        const out = execSync(`du -sk "${userdataDir}" 2>/dev/null`).toString();
        return parseInt(out.split('\t')[0], 10) * 1024;
      } catch { return 0; }
    };

    const sizeBefore = getSize();

    // Electron with --user-data-dir uses the dir AS the profile (no Default/ subdir).
    // Storage paths live directly at userdata root.
    const cacheOnly = [
      'Cache',
      'Code Cache',
      'GPUCache',
      'ShaderCache',
      'DawnCache',
      'DawnGraphiteCache',
      'DawnWebGPUCache',
      'GrShaderCache',
      'Service Worker/CacheStorage',
      'Service Worker/ScriptCache',
      'Shared Dictionary',
    ];
    const signOutAdditional = [
      'Cookies', 'Cookies-journal',
      'Local Storage', 'Session Storage',
      'IndexedDB',
      'WebStorage',
      'Web Data', 'Web Data-journal',
      'Login Data', 'Login Data-journal',
      'Network',
      'Sessions',
      'Service Worker',
      'blob_storage',
      'shared_proto_db',
    ];

    const targets = mode === 'signout'
      ? [...cacheOnly, ...signOutAdditional]
      : cacheOnly;

    let cleared = 0;
    for (const sub of targets) {
      const target = path.join(userdataDir, sub);
      if (fs.existsSync(target)) {
        try {
          fs.rmSync(target, { recursive: true, force: true });
          cleared++;
        } catch {}
      }
    }

    return { ok: true, cleared, freed: Math.max(0, sizeBefore - getSize()), mode, killedRunning };
  });

  ipcMain.handle('apps:delete', async (e, appId, { keepUserData = false } = {}) => {
    const configPath = path.join(APPS_DIR, appId, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const appBundle = path.join(INSTALL_DIR, `${config.name}.app`);
      if (fs.existsSync(appBundle)) fs.rmSync(appBundle, { recursive: true });
    }

    if (keepUserData) {
      // Only remove config and icon, keep userdata
      const appDir = path.join(APPS_DIR, appId);
      for (const f of ['config.json', 'icon.icns', 'icon.png']) {
        const fp = path.join(appDir, f);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      }
    } else {
      const appDir = path.join(APPS_DIR, appId);
      if (fs.existsSync(appDir)) fs.rmSync(appDir, { recursive: true });
    }

    const catalog = loadCatalog();
    catalog.apps = catalog.apps.filter(a => a.appId !== appId);
    saveCatalog(catalog);

    return { ok: true };
  });

  ipcMain.handle('apps:launch', async (e, appId) => {
    const configPath = path.join(APPS_DIR, appId, 'config.json');
    if (!fs.existsSync(configPath)) throw new Error(`App not found: ${appId}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const appBundle = path.join(INSTALL_DIR, `${config.name}.app`);
    if (fs.existsSync(appBundle)) {
      const { exec } = require('child_process');
      exec(`open "${appBundle}"`);
    }
    return { ok: true };
  });

  ipcMain.handle('apps:revealInFinder', async (e, appId) => {
    const configPath = path.join(APPS_DIR, appId, 'config.json');
    if (!fs.existsSync(configPath)) throw new Error(`App not found: ${appId}`);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const appBundle = path.join(INSTALL_DIR, `${config.name}.app`);
    shell.showItemInFolder(appBundle);
    return { ok: true };
  });

  ipcMain.handle('meta:extract', async (e, url) => extractMeta(url));

  ipcMain.handle('shell:openExternal', async (e, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('dialog:pickIcon', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'icns'] }],
    });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('tags:delete', async (e, tagName) => {
    const catalog = loadCatalog();
    let affected = 0;
    for (const entry of catalog.apps) {
      const configPath = path.join(APPS_DIR, entry.appId, 'config.json');
      if (!fs.existsSync(configPath)) continue;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (!Array.isArray(config.tags)) continue;
      const before = config.tags.length;
      config.tags = config.tags.filter(t => t !== tagName);
      if (config.tags.length !== before) {
        config.updated = new Date().toISOString();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        affected++;
      }
    }
    return { ok: true, affected };
  });

  ipcMain.handle('tags:rename', async (e, oldName, newName) => {
    const newTrim = String(newName || '').trim();
    if (!newTrim || newTrim === oldName) return { ok: false, affected: 0 };
    const catalog = loadCatalog();
    let affected = 0;
    for (const entry of catalog.apps) {
      const configPath = path.join(APPS_DIR, entry.appId, 'config.json');
      if (!fs.existsSync(configPath)) continue;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (!Array.isArray(config.tags)) continue;
      const idx = config.tags.indexOf(oldName);
      if (idx >= 0) {
        // Replace; dedupe if newName already present
        config.tags = [...new Set(config.tags.map(t => (t === oldName ? newTrim : t)))];
        config.updated = new Date().toISOString();
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        affected++;
      }
    }
    return { ok: true, affected };
  });

  ipcMain.handle('settings:get', async () => loadSettings());
  ipcMain.handle('settings:set', async (e, patch) => {
    const current = loadSettings();
    const next = {
      ...current,
      ...patch,
      sidebar: { ...current.sidebar, ...(patch?.sidebar || {}) },
    };
    saveSettings(next);
    if (patch && patch.theme) {
      nativeTheme.themeSource = patch.theme === 'auto' ? 'system' : patch.theme;
    }
    return next;
  });
}

async function convertToIcns(srcPath, destPath) {
  // If already icns, just copy
  if (srcPath.endsWith('.icns')) {
    fs.copyFileSync(srcPath, destPath);
    return;
  }

  // Save PNG copy for renderer use
  const pngDest = destPath.replace('.icns', '.png');
  fs.copyFileSync(srcPath, pngDest);

  // Use sips + iconutil to convert PNG → icns
  const { execSync } = require('child_process');
  const tmpDir = path.join(require('os').tmpdir(), `catalog-icon-${Date.now()}.iconset`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const sizes = [16, 32, 64, 128, 256, 512];
  for (const s of sizes) {
    try {
      execSync(`sips -z ${s} ${s} "${srcPath}" --out "${path.join(tmpDir, `icon_${s}x${s}.png`)}" 2>/dev/null`);
      if (s <= 256) {
        const s2 = s * 2;
        execSync(`sips -z ${s2} ${s2} "${srcPath}" --out "${path.join(tmpDir, `icon_${s}x${s}@2x.png`)}" 2>/dev/null`);
      }
    } catch {}
  }

  try {
    execSync(`iconutil -c icns "${tmpDir}" -o "${destPath}" 2>/dev/null`);
  } catch {
    // Fallback: copy system icon
    const systemIcon = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns';
    if (fs.existsSync(systemIcon)) fs.copyFileSync(systemIcon, destPath);
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function isValidImageBuffer(buf) {
  if (!buf || buf.length < 12) return false;
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return true;
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return true;
  // GIF: 47 49 46
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
  // WEBP: RIFF....WEBP
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  // ICO: 00 00 01 00
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return true;
  // SVG: starts with <?xml or <svg
  const head = buf.slice(0, 100).toString('utf-8').trim().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return true;
  return false;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605 (KHTML, like Gecko) Version/17 Safari/605';

async function fetchText(url) {
  const { net } = require('electron');
  return new Promise((resolve, reject) => {
    const req = net.request({ url });
    req.setHeader('User-Agent', UA);
    req.setHeader('Accept', 'text/html,application/xhtml+xml');
    let body = '';
    req.on('response', (res) => {
      res.on('data', (chunk) => { body += chunk.toString(); });
      res.on('end', () => resolve({ body, statusCode: res.statusCode, finalUrl: req.getURL ? req.getURL() : url }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Fetch a page and discover candidate icon URLs in priority order.
// Returns { title, iconUrls: [...] } — callers should try each URL in turn
// since SPAs (Google Chat, X, etc.) often lie about their icons in static HTML
// or 404 the obvious /favicon.ico path.
// Try `downloadIcon` against each candidate in order until one succeeds.
// Returns { ok, url } describing which candidate produced the saved icon, or
// { ok: false } if all failed.
async function downloadFirstValid(urls, destPath) {
  for (const url of urls) {
    if (!url) continue;
    try {
      await downloadIcon(url, destPath);
      // Sanity check: the saved file should be a non-trivial image. A 1×1
      // pixel placeholder favicon (some CDNs return these) isn't useful.
      const stat = fs.statSync(destPath);
      if (stat.size < 200) continue;
      return { ok: true, url };
    } catch {
      // try next
    }
  }
  return { ok: false };
}

async function extractMeta(url) {
  try {
    let fullUrl = url;
    if (!fullUrl.startsWith('http')) fullUrl = `https://${fullUrl}`;
    const { URL } = require('url');
    const base = new URL(fullUrl);
    const host = base.hostname;

    let html = '';
    let title = '';
    try {
      const res = await fetchText(fullUrl);
      html = res.body || '';
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1].trim() : '';
    } catch {
      // Page fetch failed — we can still try the universal fallbacks below.
    }

    // Collect every plausible icon URL from the HTML, then dedupe.
    const candidates = [];
    const push = (raw) => {
      if (!raw) return;
      try {
        const abs = new URL(raw, base).href;
        if (!candidates.includes(abs)) candidates.push(abs);
      } catch {}
    };

    // PWA manifest is the gold standard for modern web apps — install-to-
    // desktop and install-to-home-screen flows read this file. Google
    // Workspace, Slack, Notion, X, etc. all expose proper high-res icons
    // here even when their static HTML has only a tiny favicon link.
    const manifestHref = (html.match(/<link[^>]*rel=["']manifest["'][^>]*href=["']([^"']+)["']/i) || [])[1];
    const manifestUrl = manifestHref
      ? new URL(manifestHref, base).href
      : new URL('/manifest.json', base).href;
    try {
      const mres = await fetchText(manifestUrl);
      if (mres.statusCode >= 200 && mres.statusCode < 300 && mres.body) {
        const manifest = JSON.parse(mres.body);
        if (Array.isArray(manifest.icons)) {
          const sorted = manifest.icons
            .map(i => ({
              src: i.src,
              area: parseInt((i.sizes || '0x0').split(/\s+/)[0].split('x')[0], 10) || 0,
            }))
            .sort((a, b) => b.area - a.area);
          for (const ic of sorted) {
            // Manifest URLs may be protocol-relative ("//cdn..."), root-
            // relative, or absolute — resolve against the manifest's URL.
            push(new URL(ic.src, manifestUrl).href);
          }
        }
      }
    } catch {
      // Manifest fetch / parse failed — fall through to HTML-derived candidates.
    }

    // Higher-resolution HTML-declared icons next.
    const linkRe = /<link\b[^>]*>/gi;
    const links = html.match(linkRe) || [];
    const prios = [
      /rel=["']apple-touch-icon-precomposed["']/i,
      /rel=["']apple-touch-icon["']/i,
      /rel=["']icon["'][^>]*sizes=["']192/i, // PWA-style large icon
      /rel=["']icon["'][^>]*sizes=["']\d{3,}x\d{3,}/i, // any large size
      /rel=["']icon["']/i,
      /rel=["']shortcut icon["']/i,
      /rel=["']mask-icon["']/i,
    ];
    for (const re of prios) {
      for (const link of links) {
        if (re.test(link)) {
          const href = link.match(/href=["']([^"']+)["']/i);
          if (href) push(href[1]);
        }
      }
    }

    // og:image — Twitter, Slack, etc. often expose their brand mark this way.
    const og = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (og) push(og[1]);

    // Standard last-resort path.
    push(new URL('/favicon.ico', base).href);

    // Universal fallback services. These return a high-quality icon for
    // virtually any public domain, which is essential for SPAs whose static
    // HTML doesn't declare an icon (Google Workspace, X, etc.). DuckDuckGo
    // first for privacy, then Google as backup.
    push(`https://icons.duckduckgo.com/ip3/${host}.ico`);
    push(`https://www.google.com/s2/favicons?domain=${host}&sz=256`);

    const primary = candidates[0] || null;
    return { title, iconUrl: primary, iconUrls: candidates, source: primary ? 'extracted' : null };
  } catch (err) {
    return { title: '', iconUrl: null, iconUrls: [], error: err.message };
  }
}

function detectFormat(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return 'ico';
  const head = buf.slice(0, 100).toString('utf-8').trim().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'svg';
  return null;
}

// Fetch the icon, follow up to 3 redirects, and ALWAYS write a real PNG to
// `destPath`. If the source is ICO/SVG/JPEG/etc., we normalize it via `sips`
// so that:
//   - the renderer's <image href="…icon.png"> can actually display it
//   - the subsequent icns conversion has a clean PNG to work from
async function downloadIcon(iconUrl, destPath, redirectsLeft = 3) {
  const { net } = require('electron');

  // Pretend to be a real browser — some sites (Cloudflare, Twitter) 404 plain
  // fetches that don't have a User-Agent.
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605 (KHTML, like Gecko) Version/17 Safari/605',
    'Accept': 'image/*,*/*;q=0.8',
  };

  const buf = await new Promise((resolve, reject) => {
    const req = net.request({ url: iconUrl });
    Object.entries(headers).forEach(([k, v]) => req.setHeader(k, v));
    const chunks = [];
    req.on('response', (res) => {
      // Manual redirect handling — Electron's net follows by default but
      // surface them here so we never silently land on an error page.
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        const next = Array.isArray(res.headers.location) ? res.headers.location[0] : res.headers.location;
        const absolute = new URL(next, iconUrl).href;
        downloadIcon(absolute, destPath, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      if (res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode} for ${iconUrl}`));
        return;
      }
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.end();
  });

  if (!buf || typeof buf === 'string') return buf; // already resolved by recursive call

  const format = detectFormat(buf);
  if (!format) throw new Error(`Unrecognized icon format from ${iconUrl}`);

  // Already a renderer-friendly PNG → write as-is.
  if (format === 'png') {
    fs.writeFileSync(destPath, buf);
    return destPath;
  }

  // Anything else gets converted to PNG via sips. We write the raw bytes to a
  // temp file with the correct extension first so sips picks the right decoder.
  const { execFileSync } = require('child_process');
  const tmpPath = `${destPath}.in.${format}`;
  fs.writeFileSync(tmpPath, buf);
  try {
    execFileSync('sips', ['-s', 'format', 'png', tmpPath, '--out', destPath], { stdio: 'pipe' });
  } catch (err) {
    fs.unlinkSync(tmpPath);
    throw new Error(`sips conversion ${format}→png failed: ${err.message}`);
  }
  fs.unlinkSync(tmpPath);
  return destPath;
}

function createCatalogWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    title: 'Catalog',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 18 },
    vibrancy: 'sidebar',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
    },
  });

  if (process.env.VITE_DEV_SERVER) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'));
  }

  // macOS-standard "Catalog" menu with Preferences (Cmd+,)
  const template = [
    {
      label: 'Catalog',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings…',
          accelerator: 'CmdOrCtrl+,',
          click: () => { win.webContents.send('open-settings'); },
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    {
      label: 'Window',
      submenu: [
        { role: 'close', accelerator: 'CmdOrCtrl+W' },
        { role: 'minimize', accelerator: 'CmdOrCtrl+M' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  return win;
}

// ─────────────────────────────────────────────────────────────
// Entry point: branch on --app-id
// ─────────────────────────────────────────────────────────────
const appId = resolveAppId();

// In SSB mode, route Chromium's profile to the per-app userdata dir so each
// generated app keeps its own cookies/sessions independent of every other one.
if (appId) {
  const ssbUserData = path.join(APPS_DIR, appId, 'userdata');
  try { fs.mkdirSync(ssbUserData, { recursive: true }); } catch {}
  app.setPath('userData', ssbUserData);
}

if (!appId) {
  // Catalog Manager mode
  app.whenReady().then(() => {
    app.setName('Catalog');

    // Apply the user's saved theme to the window chrome (traffic light area,
    // sidebar vibrancy) immediately. The React renderer applies the same
    // preference to its own surfaces via theme.js — both stay in sync.
    try {
      const s = loadSettings();
      nativeTheme.themeSource = (s.theme || 'auto') === 'auto' ? 'system' : s.theme;
    } catch {}

    // Serve `catalog-icon://app/{appId}` from the per-app icon file.
    protocol.handle('catalog-icon', (req) => {
      try {
        const u = new URL(req.url);
        const appId = u.pathname.replace(/^\/+/, '').split('/')[0] || u.hostname;
        if (!/^[a-z0-9-]+$/.test(appId)) {
          return new Response('bad app id', { status: 400 });
        }
        const png = path.join(APPS_DIR, appId, 'icon.png');
        if (fs.existsSync(png)) {
          return net.fetch(`file://${png}`);
        }
        const icns = path.join(APPS_DIR, appId, 'icon.icns');
        if (fs.existsSync(icns)) {
          // icns isn't browser-renderable, but fall through to letter mark
          // via the renderer's onError handler.
        }
        return new Response('not found', { status: 404 });
      } catch (err) {
        return new Response(`error: ${err.message}`, { status: 500 });
      }
    });

    // First-run / post-update: extract our bundled Electron runtime to
    // ~/.catalog/engine/ so stubs can keep running even if Catalog.app moves
    // or is deleted. No-op in dev mode.
    try {
      const { ensureEngine } = require('./bootstrap');
      const result = ensureEngine(app);
      if (result.extracted) {
        console.log(`Catalog engine extracted → ${result.version}`);
      }
    } catch (err) {
      console.error('Engine bootstrap failed:', err.message);
    }
    setupCatalogIPC();
    createCatalogWindow();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createCatalogWindow();
    }
  });
} else {
  // SSB Engine mode
  app.whenReady().then(() => {
    try {
      const config = loadAppConfig(appId);

      // Follow the user's Catalog-wide theme preference. 'auto' lets macOS
      // decide and updates live when the OS toggles between light/dark.
      // Stubs share the same settings.json as the manager.
      try {
        const settings = loadSettings();
        const mode = settings.theme || 'auto';
        nativeTheme.themeSource = mode === 'auto' ? 'system' : mode;
      } catch {}

      app.setName(config.name);

      const iconPath = path.join(APPS_DIR, appId, 'icon.icns');
      if (process.platform === 'darwin' && fs.existsSync(iconPath)) {
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          app.dock.setIcon(icon);
        }
      }

      createWindow(config, appId);
    } catch (err) {
      console.error(`Failed to start app: ${err.message}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
