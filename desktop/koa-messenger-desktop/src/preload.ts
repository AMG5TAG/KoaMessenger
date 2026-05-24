import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("koaDesktop", {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,

  /**
   * Send a native notification request to the main process.
   * The main process will create a macOS / Windows / Linux notification.
   */
  sendNotification: (title: string, body: string, label?: string, upId?: number) => {
    ipcRenderer.send("koa-notification", { title, body, label, upId });
  },

  /**
   * Update the Dock / taskbar badge count.
   */
  setBadgeCount: (count: number) => {
    ipcRenderer.send("koa-badge", count);
  },

  /**
   * Listen for notification clicks (e.g. user clicked macOS notification banner).
   * Callback receives the upId so the renderer can navigate to that platform.
   */
  onNotificationClick: (callback: (upId: number) => void) => {
    const handler = (_event: unknown, data: { upId: number }) => callback(data.upId);
    ipcRenderer.on("koa-notification-clicked", handler);
    return () => ipcRenderer.removeListener("koa-notification-clicked", handler);
  },

  /**
   * Clear all stored data (cookies, localStorage, cache, service workers) for a
   * single platform partition — i.e. "log out of this account / close this
   * connection". Returns { ok: true } on success.
   */
  clearPartition: (partition: string): Promise<{ ok: boolean; error?: string }> => {
    return ipcRenderer.invoke("koa-clear-partition", partition);
  },
});
