import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Product } from "../src/domain/product";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.join(__dirname, "../data/products.json");
const PORT = 3001;
const SAVE_DEBOUNCE_MS = 500;

const app = express();
app.use(cors());
app.use(express.json());

let products: Product[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSave = false;

function loadFromFile(): void {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      products = JSON.parse(raw);
      console.log(`Loaded ${products.length} products from cache`);
    } else {
      products = [];
      scheduleSave();
    }
  } catch (error) {
    console.error("Failed to load cache file:", error);
    products = [];
  }
}

function scheduleSave(): void {
  pendingSave = true;
  if (saveTimer !== null) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!pendingSave) return;
    pendingSave = false;
    try {
      const dir = path.dirname(CACHE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CACHE_FILE, JSON.stringify(products, null, 2));
      console.log("Saved products to cache file");
    } catch (error) {
      console.error("Failed to save cache file:", error);
    }
  }, SAVE_DEBOUNCE_MS);
}

function flushSaveSync(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingSave) return;
  pendingSave = false;
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(products, null, 2));
    console.log("Saved products to cache file (flush)");
  } catch (error) {
    console.error("Failed to save cache file:", error);
  }
}

function broadcastUpdate(): void {
  const message = JSON.stringify({ type: "update", payload: products });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function findProductIndex(id: string): number {
  return products.findIndex((p) => p.id === id);
}

function addProductCore(input: Omit<Product, "id">): Product {
  const product: Product = { ...input, id: crypto.randomUUID() };
  products.push(product);
  scheduleSave();
  broadcastUpdate();
  return product;
}

function updateProductCore(id: string, patch: Partial<Omit<Product, "id">>): Product | null {
  const index = findProductIndex(id);
  if (index === -1) return null;
  products[index] = { ...products[index], ...patch };
  scheduleSave();
  broadcastUpdate();
  return products[index];
}

function deleteProductCore(id: string): boolean {
  const prevLength = products.length;
  products = products.filter((p) => p.id !== id);
  if (products.length === prevLength) return false;
  scheduleSave();
  broadcastUpdate();
  return true;
}

function mergeProductsCore(incoming: Product[]): Product[] {
  for (const product of incoming) {
    const index = findProductIndex(product.id);
    if (index !== -1) {
      products[index] = product;
    } else {
      products.push(product);
    }
  }
  scheduleSave();
  broadcastUpdate();
  return products;
}

function validateProductInput(body: unknown): body is Omit<Product, "id"> {
  if (body === null || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  return (
    typeof o.area === "string" &&
    typeof o.categoryName === "string" &&
    typeof o.selectedTier === "string" &&
    isTierSlotLike(o.economy) &&
    isTierSlotLike(o.mid) &&
    isTierSlotLike(o.high)
  );
}

function isTierSlotLike(x: unknown): boolean {
  if (x === null || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return typeof s.name === "string" && typeof s.price === "number" && typeof s.purchaseUrl === "string";
}

loadFromFile();

process.on("SIGINT", () => {
  console.log("\nSaving cache before exit...");
  flushSaveSync();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nSaving cache before exit...");
  flushSaveSync();
  process.exit(0);
});

app.get("/api/products", (_req, res) => {
  res.json(products);
});

app.post("/api/products", (req, res) => {
  if (!validateProductInput(req.body)) {
    return res.status(400).json({ error: "Invalid product data" });
  }
  const product = addProductCore(req.body);
  res.status(201).json(product);
});

app.put("/api/products/:id", (req, res) => {
  const updated = updateProductCore(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.json(updated);
});

app.delete("/api/products/:id", (req, res) => {
  if (!deleteProductCore(req.params.id)) {
    return res.status(404).json({ error: "Product not found" });
  }
  res.sendStatus(204);
});

app.post("/api/products/merge", (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: "Body must be an array of products" });
  }
  const merged = mergeProductsCore(req.body);
  res.json(merged);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("New client connected");
  ws.send(JSON.stringify({ type: "init", payload: products }));

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      switch (data.type) {
        case "add":
          if (validateProductInput(data.payload)) {
            addProductCore(data.payload);
          }
          break;
        case "update":
          updateProductCore(data.payload.id, data.payload);
          break;
        case "delete":
          deleteProductCore(data.payload);
          break;
        case "merge":
          if (Array.isArray(data.payload)) {
            mergeProductsCore(data.payload);
          }
          break;
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});