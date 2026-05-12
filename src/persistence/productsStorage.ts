import type { PriceTier, Product, TierSlot } from "../domain/product";
import { ensureValidSelectedTier } from "../domain/product";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001/api";
const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";

const TIER_LIST: PriceTier[] = ["economy", "mid", "high"];

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Request failed with status ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function loadProducts(): Promise<Product[]> {
  try {
    const data = await apiFetch<unknown[]>("/products");
    if (!Array.isArray(data)) return [];
    const out: Product[] = [];
    for (const item of data) {
      const p = normalizeProduct(item);
      if (p) out.push(p);
    }
    return out;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Failed to load products: ${error.message} (status ${error.status})`);
    } else {
      console.error("Failed to load products: server unreachable");
    }
    return [];
  }
}

export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<Product, "id">>,
): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function removeProduct(id: string): Promise<void> {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}

export async function mergeProducts(incoming: Product[]): Promise<Product[]> {
  return apiFetch<Product[]>("/products/merge", {
    method: "POST",
    body: JSON.stringify(incoming),
  });
}

export function serializeProductsJson(products: Product[]): string {
  return JSON.stringify(products, null, 2);
}

export type ParseImportResult =
  | { ok: true; products: Product[] }
  | { ok: false; message: string };

export function parseImportedProductsJson(text: string): ParseImportResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: "文件不是有效的 JSON，或编码不正确。" };
  }
  if (!Array.isArray(data)) {
    return {
      ok: false,
      message: "JSON 根节点必须是数组（与导出文件格式一致）。",
    };
  }
  const out: Product[] = [];
  for (let i = 0; i < data.length; i++) {
    const p = normalizeProduct(data[i]);
    if (!p) {
      return {
        ok: false,
        message: `第 ${i + 1} 条记录无法识别为当前版本支持的产品数据，未修改本地列表。`,
      };
    }
    out.push(p);
  }
  return { ok: true, products: out };
}

function normalizeProduct(x: unknown): Product | null {
  if (x === null || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string") return null;

  if (!isNestedTierShape(o)) return null;

  return ensureValidSelectedTier({
    id: o.id,
    area: typeof o.area === "string" && o.area.trim() ? o.area.trim() : "未分类",
    categoryName: typeof o.categoryName === "string" ? o.categoryName.trim() : "",
    economy: normalizeSlot(o.economy as TierSlot),
    mid: normalizeSlot(o.mid as TierSlot),
    high: normalizeSlot(o.high as TierSlot),
    selectedTier: parseSelectedTier(o.selectedTier),
  });
}

function isNestedTierShape(
  o: Record<string, unknown>,
): o is Record<string, unknown> & {
  economy: unknown;
  mid: unknown;
  high: unknown;
  selectedTier: unknown;
} {
  return isTierSlotObj(o.economy) && isTierSlotObj(o.mid) && isTierSlotObj(o.high);
}

function isTierSlotObj(x: unknown): x is TierSlot {
  if (x === null || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  return (
    typeof s.name === "string" &&
    typeof s.price === "number" &&
    Number.isFinite(s.price) &&
    s.price >= 0 &&
    typeof s.purchaseUrl === "string"
  );
}

function normalizeSlot(s: TierSlot): TierSlot {
  const name = typeof s.name === "string" ? s.name.trim() : "";
  const purchaseUrl = typeof s.purchaseUrl === "string" ? s.purchaseUrl.trim() : "";
  if (!name) {
    return { name: "", price: 0, purchaseUrl: "" };
  }
  const price = typeof s.price === "number" && Number.isFinite(s.price) && s.price >= 0 ? s.price : 0;
  return { name, price, purchaseUrl };
}

function parseSelectedTier(x: unknown): PriceTier {
  if (typeof x === "string" && TIER_LIST.includes(x as PriceTier)) {
    return x as PriceTier;
  }
  return "mid";
}

type WebSocketMessage =
  | { type: "init"; payload: Product[] }
  | { type: "update"; payload: Product[] };

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

export function createWebSocket(onUpdate: (products: Product[]) => void): () => void {
  let ws: WebSocket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  function connect(): void {
    if (destroyed) return;

    try {
      ws = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempt = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === "init" || message.type === "update") {
          onUpdate(message.payload);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = () => {
      console.error("WebSocket error");
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      ws = null;
      scheduleReconnect();
    };
  }

  function scheduleReconnect(): void {
    if (destroyed) return;
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt), RECONNECT_MAX_MS);
    reconnectAttempt++;
    console.log(`WebSocket reconnecting in ${delay}ms (attempt ${reconnectAttempt})`);
    reconnectTimer = setTimeout(connect, delay);
  }

  connect();

  return () => {
    destroyed = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.close();
      ws = null;
    }
  };
}