import { app, BrowserWindow, session, shell } from "electron";
import path from "node:path";

const DEV_URL = process.env.KOA_DEV_URL ?? "http://localhost:18802/";
const PROD_URL = process.env.KOA_PROD_URL ?? DEV_URL;
const IS_DEV = !app.isPackaged;

const ALLOWED_OPEN_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Strip iframe/CSP framing headers ONLY for the platform-webview partitions
 * (`persist:plat-*`). We deliberately do NOT touch the default session or the
 * shell partition — those keep their full security headers.
 */
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

const hardenedSessions = new WeakSet<Electron.Session>();
function ensurePartitionHardened(partition: string | undefined) {
  if (!partition || !partition.startsWith("persist:plat-")) return;
  const ses = session.fromPartition(partition);
  if (hardenedSessions.has(ses)) return;
  hardenedSessions.add(ses);
  attachHeaderStripping(ses);
}

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

  // Default-deny popups. Only http(s)/mailto/tel open in the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (ALLOWED_OPEN_PROTOCOLS.has(u.protocol)) {
        shell.openExternal(url);
      }
    } catch {
      // ignore malformed URLs
    }
    return { action: "deny" };
  });

  win.loadURL(IS_DEV ? DEV_URL : PROD_URL);
  if (IS_DEV) win.webContents.openDevTools({ mode: "detach" });
}

/**
 * Lock down every <webview> the renderer attaches:
 * - force secure guest preferences (no node integration, no preload override,
 *   contextIsolation/sandbox on, no disable-web-security)
 * - reject non-platform partitions
 * - block navigation to non-http(s) URLs
 * - install header stripping lazily, only on platform partitions
 */
function installWebviewHardening() {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-attach-webview", (_e, webPreferences, params) => {
      // Force safe guest webPreferences
      delete (webPreferences as Record<string, unknown>).preload;
      (webPreferences as Record<string, unknown>).nodeIntegration = false;
      (webPreferences as Record<string, unknown>).nodeIntegrationInSubFrames = false;
      (webPreferences as Record<string, unknown>).contextIsolation = true;
      (webPreferences as Record<string, unknown>).sandbox = true;
      (webPreferences as Record<string, unknown>).webSecurity = true;
      (webPreferences as Record<string, unknown>).allowRunningInsecureContent = false;

      // Only allow our platform partitions
      const partition = (params as { partition?: string }).partition;
      if (!partition || !partition.startsWith("persist:plat-")) {
        (params as { src?: string }).src = "about:blank";
        return;
      }

      // Block initial src on non-http(s) protocols
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

    // Intercept guest webview navigation attempts as a defense-in-depth.
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

app.whenReady().then(() => {
  installWebviewHardening();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
