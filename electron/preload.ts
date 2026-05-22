import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.sendSync("get-app-version"),
  getServerPort: () => ipcRenderer.sendSync("get-server-port"),
  saveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke("save-dialog", options),
  openDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke("open-dialog", options),
});
