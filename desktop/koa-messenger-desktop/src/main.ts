import { app, BrowserWindow, session, shell, Notification, ipcMain } from "electron";
import path from "node:path";

const DEV_URL = process.env.KOA_DEV_URL ?? "http://localhost:18802/";
const PROD_URL = process.env.KOA_PROD_URL ?? "https://koamessenger.replit.app/";
const IS_DEV = !app.isPackaged;

const ALLOWED_OPEN_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/* ──────────────────────────────────────────────────────────────────────
 * Header stripping for webviews ───────────────────────────────
 * ────────────────────────────────────────────────────────────────────── */
function attachHeaderStripping(ses: Electron.Session) {
  ses.webRequest.onHeadersReceived((details, callback) => {
    const headers: Record<string, string[] | string> = { ...details.responseHeaders };
    for (const key of Object.keys(headers)) {
      const k = key.toLowerCase();
      if (k === "x-frame-options") {
        delete headers[key];
        continue;
      }
      if (k === "content-security-policy") {
        const raw = headers[key];
        const values = Array.isArray(raw) ? raw : [String(raw)];
        headers[key] = values.map((v) =>
          v
            .split(";")
            .filter((d) => !d.trim().toLowerCase().startsWith("frame-ancestors"))
            .join(";"),
        );
      }
    }
    callback({ responseHeaders: headers });
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Permissions ──────────────────────────────────────────────
 * ────────────────────────────────────────────────────────────────────── */
const ALLOWED_PERMISSIONS = new Set([
  "notifications", "media", "mediaKeySystem", "geolocation",
  "pointerLock", "fullscreen", "openExternal", "clipboard-read",
  "clipboard-sanitized-write",
]);

const hardenedSessions = new WeakSet<Electron.Session>();
function ensurePartitionHardened(partition: string | undefined) {
  if (!partition || !partition.startsWith("persist:plat-")) return;
  const ses = session.fromPartition(partition);
  if (hardenedSessions.has(ses)) return;
  hardenedSessions.add(ses);
  attachHeaderStripping(ses);

  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  ses.setPermissionCheckHandler((_webContents, permission) => {
    return ALLOWED_PERMISSIONS.has(permission);
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Main window ──────────────────────────────────────────────
 * ────────────────────────────────────────────────────────────────────── */
function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    title: "KoaMessenger",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webviewTag: true,
      partition: "persist:koa-shell",
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (ALLOWED_OPEN_PROTOCOLS.has(u.protocol)) shell.openExternal(url);
    } catch {
      // ignore malformed URLs
    }
    return { action: "deny" };
  });

  win.loadURL(IS_DEV ? DEV_URL : PROD_URL);
  if (IS_DEV) win.webContents.openDevTools({ mode: "detach" });

  return win;
}

/* ──────────────────────────────────────────────────────────────────────
 * Native notifications & badge IPC ───────────────────────────────
 * ────────────────────────────────────────────────────────────────────── */

/** Store the latest notification per upId so we can route click events. */
const notificationUpIdMap = new Map<string, number>();

function installNotificationIPC(mainWindow: BrowserWindow) {
  // Renderer asks us to show a native notification
  ipcMain.on("koa-notification", (_event, payload: {
    title: string;
    body: string;
    label?: string;
    upId?: number;
  }) => {
    if (!Notification.isSupported()) return;

    const n = new Notification({
      title: payload.title,
      body: payload.body,
      silent: false,
      hasReply: false,
      // macOS: show in Notification Center even when app is focused
      // (the badge/text inside the app already shows the count)
    });

    const idKey = payload.label ?? payload.title;
    if (payload.upId !== undefined) {
      notificationUpIdMap.set(idKey, payload.upId);
    }

    n.on("click", () => {
      // Bring the app to front and tell the renderer to navigate
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const upId = notificationUpIdMap.get(idKey);
      if (upId !== undefined) {
        mainWindow.webContents.send("koa-notification-clicked", { upId });
      }
    });

    n.show();
  });

  // Renderer updates the Dock / taskbar badge
  ipcMain.on("koa-badge", (_event, count: number) => {
    if (process.platform === "darwin") {
      app.dock?.setBadge(count > 0 ? String(count) : "");
    }
    // Windows taskbar badge (via electron API) — setOverlayIcon or overlayBadge
    if (process.platform === "win32" && mainWindow) {
      mainWindow.setOverlayIcon(null, "");
    }
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Webview hardening ──────────────────────────────────────────────
 * ────────────────────────────────────────────────────────────────────── */
function installWebviewHardening() {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (_e, webPreferences, params) => {
      delete (webPreferences as Record<string, unknown>).preload;
      (webPreferences as Record<string, unknown>).nodeIntegration = false;
      (webPreferences as Record<string, unknown>).nodeIntegrationInSubFrames = false;
      (webPreferences as Record<string, unknown>).contextIsolation = true;
      (webPreferences as Record<string, unknown>).sandbox = true;
      (webPreferences as Record<string, unknown>).webSecurity = true;
      (webPreferences as Record<string, unknown>).allowRunningInsecureContent = false;

      const partition = (params as { partition?: string }).partition;
      if (!partition || !partition.startsWith("persist:plat-")) {
        (params as { src?: string }).src = "about:blank";
        return;
      }

      try {
        const src = (params as { src?: string }).src;
        if (src) {
          const u = new URL(src);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            (params as { src?: string }).src = "about:blank";
            return;
          }
        }
      } catch {
        (params as { src?: string }).src = "about:blank";
        return;
      }

      ensurePartitionHardened(partition);
    });

    contents.on("did-attach-webview", (_e, guest) => {
      guest.on("will-navigate", (ev, url) => {
        try {
          const u = new URL(url);
          if (u.protocol !== "http:" && u.protocol !== "https:") ev.preventDefault();
        } catch {
          ev.preventDefault();
        }
      });
      guest.setWindowOpenHandler(({ url }) => {
        try {
          const u = new URL(url);
          if (ALLOWED_OPEN_PROTOCOLS.has(u.protocol)) shell.openExternal(url);
        } catch {
          /* ignore */
        }
        return { action: "deny" };
      });
    });
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Lifecycle ──────────────────────────────────────────────
 * ────────────────────────────────────────────────────────────────────── */

app.whenReady().then(() => {
  installWebviewHardening();
  const mainWindow = createMainWindow();
  installNotificationIPC(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createMainWindow();
      installNotificationIPC(win);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
