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

// Origin of our own shell app. Sensitive IPC is only honored from this origin,
// so that if the top frame is ever navigated to a third-party page (e.g. during
// an OAuth redirect, or a compromise) that page cannot drive privileged IPC.
const SHELL_ORIGIN = (() => {
  try {
    return new URL(IS_DEV ? DEV_URL : PROD_URL).origin;
  } catch {
    return "";
  }
})();

/** True only when an IPC message originates from our own shell origin. */
function isTrustedSender(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
  try {
    const url = event.senderFrame?.url ?? event.sender.getURL();
    return !!url && new URL(url).origin === SHELL_ORIGIN;
  } catch {
    return false;
  }
}

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
// Permissions auto-granted to embedded third-party platform sessions.
// `media` (calls), `geolocation` (location sharing) and `mediaKeySystem`
// (DRM playback) are legitimate, user-visible messaging features and are
// kept. `clipboard-read` is intentionally NOT granted: it lets a page silently
// read whatever the user last copied (passwords, 2FA codes) with no gesture.
// Normal Ctrl/Cmd-V paste and paste-image still work — those go through the
// paste event, not this permission.
//
// `notifications` is intentionally NOT granted: if each embedded messenger
// (WhatsApp/Messenger/etc.) could raise its own OS notification, the user would
// get a native banner from the platform's Web Notifications API on every single
// incoming message — on top of, and uncoordinated with, our own deduped
// title-based notifier (see maybeSendNativeNotification). That double source is
// why a single unread message kept re-notifying. We are the sole notifier: the
// app derives unread counts from each webview's document.title (which the
// platforms update regardless of this permission) and fires one deduped,
// click-to-open banner + dock badge.
const ALLOWED_PERMISSIONS = new Set([
  "media",
  "mediaKeySystem",
  "geolocation",
  "pointerLock",
  "fullscreen",
  "openExternal",
  "clipboard-sanitized-write",
]);

// The shell (our own first-party app) needs only a small benign set. A
// deny-by-default handler means that even if the shell origin is compromised
// it cannot silently reach camera/mic/geolocation/clipboard-read. Without this
// the shell session falls back to Electron's permissive default.
const SHELL_ALLOWED_PERMISSIONS = new Set([
  "notifications",
  "fullscreen",
  "pointerLock",
  "clipboard-sanitized-write",
]);

function hardenShellSession() {
  const ses = session.fromPartition("persist:koa-shell");
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(SHELL_ALLOWED_PERMISSIONS.has(permission));
  });
  ses.setPermissionCheckHandler((_webContents, permission) => {
    return SHELL_ALLOWED_PERMISSIONS.has(permission);
  });
}

const hardenedSessions = new WeakSet<Electron.Session>();
// Names of every per-account partition we've touched this run. Needed because
// Electron offers no way to enumerate live sessions, and we must flush each
// account's cookie store to disk before quit (see flushAllSessions).
const knownPartitions = new Set<string>();
function ensurePartitionHardened(partition: string | undefined) {
  if (!partition || !partition.startsWith("persist:koa-up")) return;
  knownPartitions.add(partition);
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
    // Disable macOS native tab bar (tabbingMode prevents the Tab Bar from appearing
    // in the Window menu and in the Linked Accounts / Settings views)
    ...(process.platform === "darwin" ? { tabbingMode: "disallowed" as const } : {}),
    vibrancy: process.platform === "darwin" ? ("under-window" as const) : undefined,
    visualEffectState: process.platform === "darwin" ? ("active" as const) : undefined,
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

  // Recover from main renderer crashes (the OTHER source of a full black window
  // on macOS — when the shell React app's render process dies, the user is left
  // staring at the #0a0a0a background with no UI). Auto-reload once; if it
  // crashes again, show the error page so the user can manually retry.
  let mainCrashRecoveryAttempts = 0;
  win.webContents.on("render-process-gone", (_e, details) => {
    if (details.reason === "clean-exit") return;
    if (win.isDestroyed()) return;
    mainCrashRecoveryAttempts += 1;
    if (mainCrashRecoveryAttempts <= 1) {
      win.reload();
    } else {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>KoaMessenger</title>
<style>body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
background:#0a0a0a;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center}
.card{max-width:480px;text-align:center;padding:32px}
h1{color:#dc2350;margin:0 0 12px;font-size:22px}
p{color:#9ca3af;line-height:1.5;margin:8px 0}
button{background:#dc2350;color:#fff;border:none;padding:10px 20px;border-radius:8px;
font-size:14px;font-weight:600;cursor:pointer;margin-top:16px}
button:hover{background:#e34f73}</style></head><body><div class="card">
<h1>KoaMessenger stopped responding</h1>
<p>The app crashed (${details.reason}). Click below to reload — your accounts are still saved.</p>
<button onclick="location.href='${IS_DEV ? DEV_URL : PROD_URL}'">Reload</button>
</div></body></html>`;
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    }
  });

  win.webContents.on("did-finish-load", () => {
    // Reset the counter on every successful load so a future, unrelated crash
    // also gets one auto-recovery attempt.
    mainCrashRecoveryAttempts = 0;
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
        // Explicitly trap Cmd+N / "New Window" and disable it — without this
        // macOS injects its own "New Window" item into the File menu.
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          enabled: false,
          visible: false,
        },
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
 * Partition data clearing IPC
 * Lets the renderer wipe cookies/localStorage/cache for a single platform
 * tab (i.e. "log out of this account"), without touching others.
 * ────────────────────────────────────────────────────────────────────── */
function installSessionIPC() {
  ipcMain.handle("koa-clear-partition", async (event, partition: string) => {
    // Only our own shell origin may invoke this. If the top frame has navigated
    // away (OAuth redirect, or a compromised/embedded third-party page), reject
    // so it cannot wipe another account's session data.
    if (!isTrustedSender(event)) {
      return { ok: false, error: "untrusted-sender" };
    }
    // Hard guard: only allow clearing per-platform partitions, never the shell.
    if (typeof partition !== "string" || !partition.startsWith("persist:koa-up")) {
      return { ok: false, error: "invalid-partition" };
    }
    try {
      const ses = session.fromPartition(partition);
      await ses.clearStorageData({
        // NOTE: "indexdb" (sic) is Electron's actual API key — it's a typo
        // baked into Electron's clearStorageData type. Using it clears IndexedDB.
        storages: [
          "cookies",
          "localstorage",
          "indexdb",
          "shadercache",
          "serviceworkers",
          "cachestorage",
          "filesystem",
        ],
      });
      await ses.clearCache();
      await ses.clearAuthCache();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });
}

/* ──────────────────────────────────────────────────────────────────────
 * Webview hardening
 * ────────────────────────────────────────────────────────────────────── */
function installWebviewHardening() {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (event, webPreferences, params) => {
      // Enforce the security-critical webview flags from the main process
      // instead of trusting the renderer-supplied <webview> attributes. A
      // compromised shell renderer must not be able to spawn a webview with
      // Node access or its own preload script.
      //
      // IMPORTANT: We deliberately do NOT set `sandbox` here. Forcing
      // `sandbox: true` from this handler was the root cause of a regression
      // where webviews rendered as a solid black area on macOS (the
      // BrowserView never finished attaching). nodeIntegration=false +
      // contextIsolation=true already match the safe webview defaults the
      // React <webview> tag expects, so setting them explicitly is a no-op
      // for legitimate panes while closing the injection vector.
      webPreferences.nodeIntegration = false;
      webPreferences.nodeIntegrationInSubFrames = false;
      webPreferences.contextIsolation = true;
      // Strip any renderer-supplied preload — our platform webviews never use
      // one, so this only removes an attacker-injected preload path.
      delete (webPreferences as { preload?: string }).preload;

      const partition = (params as { partition?: string }).partition;
      // Only our own per-platform partitions may attach. This blocks an
      // attacker-controlled renderer from attaching a webview onto the
      // privileged shell session (persist:koa-shell) or any other partition.
      if (!partition || !partition.startsWith("persist:koa-up")) {
        event.preventDefault();
        return;
      }
      // Attach header stripping + permission handlers for our platform partition.
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
 * Cookie/session persistence
 *
 * Chromium writes cookies to disk lazily (batched, every ~30s + on graceful
 * session teardown). When a user logs into SEVERAL accounts and then quits
 * quickly (Cmd+Q), the most-recently-set auth cookies across those per-account
 * partitions can be lost — the user comes back signed out of the accounts they
 * added last. flushAllSessions() forces every known partition's cookie store to
 * disk. We run it periodically (so a force-quit/crash still keeps recent state)
 * and, critically, awaited on `before-quit`.
 * ────────────────────────────────────────────────────────────────────── */
async function flushAllSessions() {
  const partitions = ["persist:koa-shell", ...knownPartitions];
  await Promise.allSettled(
    partitions.map((p) => {
      try {
        return session.fromPartition(p).cookies.flushStore();
      } catch {
        return Promise.resolve();
      }
    }),
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Lifecycle
 * ────────────────────────────────────────────────────────────────────── */

// Flush cookie stores before the app actually quits. We defer the quit once,
// run the flush, then quit for real — otherwise the process can exit before
// Chromium has written the latest cookies to disk.
let isQuittingAfterFlush = false;
app.on("before-quit", (event) => {
  if (isQuittingAfterFlush) return;
  event.preventDefault();
  flushAllSessions().finally(() => {
    isQuittingAfterFlush = true;
    app.quit();
  });
});

app.on("second-instance", () => {
  // Someone tried to run a second instance — focus our window instead
  const win = mainWindow;
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }
});

app.whenReady().then(async () => {
  buildAppMenu();
  hardenShellSession();
  installWebviewHardening();
  installNotificationIPC();
  installSessionIPC();

  // Clear the SHELL session's HTTP cache on every launch so the user always gets
  // the latest deployed web app JS. Cookies/localStorage are NOT cleared — only
  // the HTTP cache (which is what gets stuck on stale JS bundles after a deploy).
  try {
    await session.fromPartition("persist:koa-shell").clearCache();
  } catch {
    // non-fatal
  }

  mainWindow = createMainWindow();

  // Periodic safety flush so a crash / force-quit (which skips before-quit)
  // still leaves recently-added account logins on disk. unref() so this timer
  // never keeps the app alive on its own.
  setInterval(() => {
    void flushAllSessions();
  }, 30_000).unref();

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
