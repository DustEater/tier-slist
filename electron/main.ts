import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let serverInstance: http.Server | null = null;
let serverPort = 3001;

function getAppRoot(): string {
  if (isDev) {
    return path.resolve(__dirname, "..");
  }
  return path.resolve(process.resourcesPath, "app.asar");
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "产品挑选列表",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    const distPath = path.join(getAppRoot(), "dist", "index.html");
    console.log(`Loading HTML from: ${distPath} with port=${serverPort}`);
    mainWindow.loadFile(distPath, { query: { port: String(serverPort) } });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.on("get-app-version", (event) => {
  event.returnValue = app.getVersion();
});

ipcMain.on("get-server-port", (event) => {
  console.log(`get-server-port called, returning: ${serverPort}`);
  event.returnValue = serverPort;
});

ipcMain.handle("save-dialog", async (_event, options: Electron.SaveDialogOptions) => {
  const result = await dialog.showSaveDialog(mainWindow!, options);
  return result;
});

ipcMain.handle("open-dialog", async (_event, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, options);
  return result;
});

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      console.log("=== Starting server ===");
      const { createServer } = await import("../server/index.js");
      const userDataPath = app.getPath("userData");
      const cacheFile = path.join(userDataPath, "data/products.json");
      console.log(`Server cache file: ${cacheFile}`);
      const result = await createServer({ port: 0, cacheFile });
      serverInstance = result.server;
      serverPort = result.port;
      console.log(`=== Express server started on port ${serverPort} ===`);
    } catch (error) {
      console.error("=== FAILED TO START SERVER ===");
      console.error("Error:", error);
      dialog.showErrorBox("启动失败", `无法启动服务器:\n\n${(error as Error).message}`);
      app.quit();
      return;
    }
  }

  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("before-quit", () => {
  if (serverInstance) {
    serverInstance.close();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
