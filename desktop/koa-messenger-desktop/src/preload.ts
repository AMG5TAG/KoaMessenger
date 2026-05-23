import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("koaDesktop", {
  isElectron: true,
  platform: process.platform,
  version: process.versions.electron,
});
