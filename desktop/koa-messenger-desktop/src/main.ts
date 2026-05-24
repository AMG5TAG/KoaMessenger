import {
  app,
  BrowserWindow,
  Menu,
  session,
  shell,
  Notification,
  ipcMain,
  nativeImage,
} from "electron";
import type { NativeImage, MenuItemConstructorOptions } from "electron";
import path from "node:path";

const DEV_URL = process.env.KOA_DEV_URL ?? "http://localhost:18802/";
const PROD_URL = process.env.KOA_PROD_URL ?? "https://koamessenger.replit.app/";
const IS_DEV = !app.isPackaged;

// Set app name early so Linux notification daemon shows the correct app name
app.setName("KoaMessenger");

const ALLOWED_OPEN_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/* ──────────────────────────────────────────────────────────────────────
 * Single-instance lock — prevent multiple app processes
 * ────────────────────────────────────────────────────────────────────── */
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

/* ──────────────────────────────────────────────────────────────────────
 * Header stripping for webviews
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
 * Permissions
 * ────────────────────────────────────────────────────────────────────── */
const ALLOWED_PERMISSIONS = new Set([
  "notifications",
  "media",
  "mediaKeySystem",
  "geolocation",
  "pointerLock",
  "fullscreen",
  "openExternal",
  "clipboard-read",
  "clipboard-sanitized-write",
]);

const hardenedSessions = new WeakSet<Electron.Session>();
function ensurePartitionHardened(partition: string | undefined) {
  if (!partition || !partition.startsWith("persist:koa-up")) return;
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
 * Main window
 * ────────────────────────────────────────────────────────────────────── */
let mainWindow: BrowserWindow | null = null;

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: process.platform !== "darwin",
    title: "KoaMessenger",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: process.platform === "darwin" ? { x: 16, y: 16 } : undefined,
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

  // Surface load failures so the user sees something instead of a blank window
  win.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return; // -3 = aborted (normal on redirect)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>KoaMessenger</title>
<style>
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#0a0a0a; color:#fff; height:100vh; display:flex;
         align-items:center; justify-content:center; }
  .card { max-width:480px; text-align:center; padding:32px; }
  h1 { color:#dc2350; margin:0 0 12px; font-size:22px; }
  p { color:#9ca3af; line-height:1.5; margin:8px 0; }
  code { background:#1a1a1a; padding:2px 6px; border-radius:4px; font-size:12px; }
  button { background:#dc2350; color:#fff; border:none; padding:10px 20px;
           border-radius:8px; font-size:14px; font-weight:600; cursor:pointer;
           margin-top:16px; }
  button:hover { background:#e34f73; }
</style></head><body><div class="card">
<h1>Couldn't reach KoaMessenger</h1>
<p>${errorDescription || "Network error"}</p>
<p><code>${validatedURL}</code></p>
<button onclick="location.reload()">Try again</button>
</div></body></html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });

  win.loadURL(IS_DEV ? DEV_URL : PROD_URL);
  if (IS_DEV) win.webContents.openDevTools({ mode: "detach" });

  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });

  return win;
}

/* ──────────────────────────────────────────────────────────────────────
 * Application menu — required on macOS for Cmd+Q/W/C/V/R to work
 * ────────────────────────────────────────────────────────────────────── */
function buildAppMenu() {
  const isMac = process.platform === "darwin";

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        isMac ? { role: "close" as const } : { role: "quit" as const },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" as const },
        { role: "redo" as const },
        { type: "separator" as const },
        { role: "cut" as const },
        { role: "copy" as const },
        { role: "paste" as const },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" as const },
              { role: "delete" as const },
              { role: "selectAll" as const },
            ]
          : [
              { role: "delete" as const },
              { type: "separator" as const },
              { role: "selectAll" as const },
            ]),
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" as const },
        { role: "forceReload" as const },
        { role: "toggleDevTools" as const },
        { type: "separator" as const },
        { role: "resetZoom" as const },
        { role: "zoomIn" as const },
        { role: "zoomOut" as const },
        { type: "separator" as const },
        { role: "togglefullscreen" as const },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        { role: "zoom" as const },
        ...(isMac
          ? [
              { type: "separator" as const },
              { role: "front" as const },
              { type: "separator" as const },
              { role: "window" as const },
            ]
          : [{ role: "close" as const }]),
      ],
    },
    {
      role: "help" as const,
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            await shell.openExternal("https://koamessenger.replit.app/");
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ──────────────────────────────────────────────────────────────────────
 * Windows taskbar overlay badge
 * ────────────────────────────────────────────────────────────────────── */
function createWindowsBadgeIcon(count: number): NativeImage | null {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  const size = 16;
  const fontSize = label.length > 2 ? 5 : label.length > 1 ? 7 : 9;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#dc2350"/>
  <text x="${size / 2}" y="${size / 2}" dy="0.35em"
        text-anchor="middle" fill="white"
        font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold">${label}</text>
</svg>`;
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  try {
    return nativeImage.createFromDataURL(dataUrl);
  } catch {
    return null;
  }
}

/* ──────────────────────────────────────────────────────────────────────
 * Native notifications & badge IPC
 * Registered ONCE on app start — not per window — to avoid duplicate handlers.
 * ────────────────────────────────────────────────────────────────────── */
const notificationUpIdMap = new Map<string, number>();

function installNotificationIPC() {
  ipcMain.on(
    "koa-notification",
    (_event, payload: {
      title: string;
      body: string;
      label?: string;
      upId?: number;
    }) => {
      if (!Notification.isSupported()) return;

      const notifOptions: Electron.NotificationConstructorOptions = {
        title: payload.title,
        body: payload.body,
        silent: false,
        hasReply: false,
      };

      if (process.platform === "linux") {
        (notifOptions as Record<string, unknown>).urgency = "normal";
      }

      const n = new Notification(notifOptions);

      const idKey = payload.label ?? payload.title;
      if (payload.upId !== undefined) {
        notificationUpIdMap.set(idKey, payload.upId);
      }

      n.on("click", () => {
        const win = mainWindow;
        if (!win || win.isDestroyed()) return;
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        const upId = notificationUpIdMap.get(idKey);
        if (upId !== undefined) {
          win.webContents.send("koa-notification-clicked", { upId });
        }
      });

      n.show();
    },
  );

  ipcMain.on("koa-badge", (_event, count: number) => {
    const safeCount = typeof count === "number" && count >= 0 ? Math.floor(count) : 0;

    if (process.platform === "darwin") {
      app.dock?.setBadge(safeCount > 0 ? String(safeCount) : "");
    }

    if (process.platform === "win32") {
      const win = mainWindow;
      if (!win || win.isDestroyed()) return;
      if (safeCount > 0) {
        const icon = createWindowsBadgeIcon(safeCount);
        const description = `${safeCount} unread message${safeCount !== 1 ? "s" : ""}`;
        if (icon) win.setOverlayIcon(icon, description);
      } else {
        win.setOverlayIcon(null, "");
      }
    }

    if (process.platform === "linux") {
      try {
        app.setBadgeCount(safeCount);
      } catch {
        // not all Linux DEs support badge counts
      }
    }
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Webview hardening
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
      if (!partition || !partition.startsWith("persist:koa-up")) {
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
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            ev.preventDefault();
            // Open external schemes (mailto:, tel:) in the OS default app
            if (ALLOWED_OPEN_PROTOCOLS.has(u.protocol)) {
              shell.openExternal(url).catch(() => {
                /* ignore */
              });
            }
          }
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
 * Lifecycle
 * ────────────────────────────────────────────────────────────────────── */

app.on("second-instance", () => {
  // Someone tried to run a second instance — focus our window instead
  const win = mainWindow;
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

app.whenReady().then(() => {
  buildAppMenu();
  installWebviewHardening();
  installNotificationIPC();
  mainWindow = createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
