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

const SCRAPE_TIMEOUT_MS = 15_000;
const SCRAPE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface ScrapeResult {
  name: string | null;
  price: number | null;
  currency: string | null;
}

const EXTRACT_SCRIPT = `
(function() {
  function cleanName(s) {
    if (!s) return null;
    return s.replace(/\\s+/g, ' ').replace(/[\\x00-\\x1f]/g, '').trim();
  }
  function parsePrice(s) {
    if (!s) return null;
    var cleaned = String(s).replace(/[^\\d.]/g, '');
    if (!cleaned) return null;
    var v = parseFloat(cleaned);
    return (isFinite(v) && v >= 0) ? v : null;
  }

  var result = { name: null, price: null, currency: null };

  // 1. JSON-LD
  try {
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < scripts.length; i++) {
      try {
        var data = JSON.parse(scripts[i].textContent);
        var items = Array.isArray(data) ? data : [data];
        for (var j = 0; j < items.length; j++) {
          var item = items[j];
          if (item && item['@type'] === 'Product') {
            if (!result.name && item.name) result.name = cleanName(item.name);
            if (item.offers) {
              var p = item.offers.lowPrice || item.offers.price;
              if (!result.price && p) result.price = parsePrice(p);
              if (!result.currency && item.offers.priceCurrency) result.currency = item.offers.priceCurrency;
            }
          }
        }
      } catch(e) {}
    }
  } catch(e) {}

  // 2. Microdata
  try {
    if (!result.name) {
      var nameEl = document.querySelector('[itemprop="name"]');
      if (nameEl) {
        var n = nameEl.getAttribute('content') || nameEl.textContent;
        if (n) result.name = cleanName(n);
      }
    }
    if (!result.price) {
      var priceEl = document.querySelector('[itemprop="price"]');
      if (priceEl) {
        var p = priceEl.getAttribute('content') || priceEl.textContent;
        if (p) result.price = parsePrice(p);
      }
      var currencyEl = document.querySelector('[itemprop="priceCurrency"]');
      if (currencyEl) result.currency = currencyEl.getAttribute('content') || null;
    }
  } catch(e) {}

  // 3. Open Graph
  try {
    if (!result.name) {
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) result.name = cleanName(ogTitle.getAttribute('content'));
    }
    if (!result.price) {
      var ogPrice = document.querySelector('meta[property="product:price:amount"]') || document.querySelector('meta[property="og:price:amount"]');
      if (ogPrice) result.price = parsePrice(ogPrice.getAttribute('content'));
    }
    if (!result.currency) {
      var ogCurrency = document.querySelector('meta[property="product:price:currency"]') || document.querySelector('meta[property="og:price:currency"]');
      if (ogCurrency) result.currency = ogCurrency.getAttribute('content');
    }
  } catch(e) {}

  // 4. Platform-specific (京东)
  try {
    if (!result.name) {
      var skuName = document.querySelector('.sku-name');
      if (skuName) result.name = cleanName(skuName.textContent);
    }
    if (!result.price) {
      var priceEl = document.querySelector('.p-price .price');
      if (priceEl) {
        var txt = priceEl.textContent || priceEl.getAttribute('data-price') || '';
        if (txt) result.price = parsePrice(txt);
      }
    }
  } catch(e) {}

  // 5. Platform-specific (淘宝/天猫)
  try {
    if (!result.name) {
      var tbTitle = document.querySelector('.tb-detail-hd .tb-main-title') || document.querySelector('[data-spu-title]');
      if (tbTitle) result.name = cleanName(tbTitle.getAttribute('data-title') || tbTitle.textContent);
    }
    if (!result.price) {
      var tmPrice = document.querySelector('.tm-promo-price .tm-count') || document.querySelector('#J_StrPrNM449793');
      if (tmPrice) {
        var tp = tmPrice.textContent;
        if (tp) result.price = parsePrice(tp);
      }
    }
  } catch(e) {}

  // 6. Platform-specific (拼多多 mobile PDD)
  try {
    if (!result.name) {
      var pddTitle = document.querySelector('.goods-title') || document.querySelector('[class*="goods-name"]') || document.querySelector('[class*="title"]');
      if (pddTitle) result.name = cleanName(pddTitle.textContent);
    }
    if (!result.price) {
      var pddPrice = document.querySelector('.goods-price') || document.querySelector('[class*="price"]') || document.querySelector('[class*="discount-price"]');
      if (pddPrice) {
        var pp = pddPrice.textContent;
        if (pp) result.price = parsePrice(pp);
      }
    }
  } catch(e) {}

  // 7. Fallback: document.title
  try {
    if (!result.name) {
      var title = document.title;
      if (title) {
        var cleaned = title.replace(/[-–—|_•·,，。！!？?]+[\\s\\S]*$/, '').trim();
        if (cleaned && cleaned.length < 120) result.name = cleaned;
      }
    }
  } catch(e) {}

  return result;
})();
`;

ipcMain.handle("scrape-product-info", async (_event, url: string): Promise<ScrapeResult> => {
  const hiddenWin = new BrowserWindow({
    show: false,
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    await hiddenWin.loadURL(url, {
      userAgent: SCRAPE_USER_AGENT,
    });

    await new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error("页面加载超时")), SCRAPE_TIMEOUT_MS);

      hiddenWin.webContents.once("did-finish-load", () => {
        clearTimeout(timeout!);
        timeout = null;
        // Give JavaScript a moment to render dynamic content
        setTimeout(resolve, 2000);
      });

      hiddenWin.webContents.once("did-fail-load", (_event, _code, desc) => {
        clearTimeout(timeout!);
        timeout = null;
        reject(new Error(desc || "页面加载失败"));
      });
    });

    const result = await hiddenWin.webContents.executeJavaScript(EXTRACT_SCRIPT);
    return result as ScrapeResult;
  } catch (error) {
    return { name: null, price: null, currency: null };
  } finally {
    if (timeout) clearTimeout(timeout);
    if (!hiddenWin.isDestroyed()) {
      hiddenWin.close();
    }
  }
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
