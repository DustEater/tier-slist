import type { PriceTier, Product, TierSlot } from "../domain/product";
import { ensureValidSelectedTier } from "../domain/product";

const STORAGE_KEY = "web_pick_products";

const TIER_LIST: PriceTier[] = ["economy", "mid", "high"];

export function loadProducts(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    const out: Product[] = [];
    for (const item of data) {
      const p = normalizeProduct(item);
      if (p) out.push(p);
    }
    return out;
  } catch {
    return [];
  }
}

export function saveProducts(products: Product[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

/** 与 localStorage 一致的 JSON 文本，便于下载备份（含缩进，便于人工查看）。 */
export function serializeProductsJson(products: Product[]): string {
  return JSON.stringify(products, null, 2);
}

export type ParseImportResult =
  | { ok: true; products: Product[] }
  | { ok: false; message: string };

/**
 * 解析用户选择的备份文件。根节点须为数组；任一条无法规范化则整体失败，不覆盖现有数据。
 */
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

  if (isNestedTierShape(o)) {
    return ensureValidSelectedTier({
      id: o.id,
      area:
        typeof o.area === "string" && o.area.trim() ? o.area.trim() : "未分类",
      categoryName:
        typeof o.categoryName === "string" ? o.categoryName.trim() : "",
      economy: normalizeSlot(o.economy as TierSlot),
      mid: normalizeSlot(o.mid as TierSlot),
      high: normalizeSlot(o.high as TierSlot),
      selectedTier: parseSelectedTier(o.selectedTier),
    });
  }

  if (typeof o.name !== "string") return null;

  if (isOldFlatPricesShape(o)) {
    const url =
      typeof o.purchaseUrl === "string" ? o.purchaseUrl.trim() : "";
    const name = o.name.trim() || "未命名";
    const slot = (price: number): TierSlot => ({
      name,
      price: Math.max(0, price),
      purchaseUrl: url,
    });
    return ensureValidSelectedTier({
      id: o.id,
      area:
        typeof o.area === "string" && o.area.trim() ? o.area.trim() : "未分类",
      categoryName: name,
      economy: slot(o.priceEconomy as number),
      mid: slot(o.priceMid as number),
      high: slot(o.priceHigh as number),
      selectedTier: parseSelectedTier(o.selectedTier),
    });
  }

  if (typeof o.unitPrice === "number" && Number.isFinite(o.unitPrice)) {
    const u = Math.max(0, o.unitPrice);
    const name = o.name.trim() || "未命名";
    const url =
      typeof o.purchaseUrl === "string" ? o.purchaseUrl.trim() : "";
    const slot = (): TierSlot => ({ name, price: u, purchaseUrl: url });
    return ensureValidSelectedTier({
      id: o.id,
      area: "未分类",
      categoryName: name,
      economy: slot(),
      mid: slot(),
      high: slot(),
      selectedTier: "mid",
    });
  }

  return null;
}

function isNestedTierShape(
  o: Record<string, unknown>,
): o is Record<string, unknown> & {
  economy: unknown;
  mid: unknown;
  high: unknown;
  selectedTier: unknown;
} {
  return (
    isTierSlotObj(o.economy) &&
    isTierSlotObj(o.mid) &&
    isTierSlotObj(o.high)
  );
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
  const purchaseUrl =
    typeof s.purchaseUrl === "string" ? s.purchaseUrl.trim() : "";
  if (!name) {
    return { name: "", price: 0, purchaseUrl: "" };
  }
  const price =
    typeof s.price === "number" && Number.isFinite(s.price) && s.price >= 0
      ? s.price
      : 0;
  return { name, price, purchaseUrl };
}

function isOldFlatPricesShape(
  o: Record<string, unknown>,
): o is Record<string, unknown> & {
  name: string;
  priceEconomy: number;
  priceMid: number;
  priceHigh: number;
  selectedTier: unknown;
  purchaseUrl?: unknown;
} {
  return (
    typeof o.priceEconomy === "number" &&
    Number.isFinite(o.priceEconomy) &&
    o.priceEconomy >= 0 &&
    typeof o.priceMid === "number" &&
    Number.isFinite(o.priceMid) &&
    o.priceMid >= 0 &&
    typeof o.priceHigh === "number" &&
    Number.isFinite(o.priceHigh) &&
    o.priceHigh >= 0
  );
}

function parseSelectedTier(x: unknown): PriceTier {
  if (typeof x === "string" && TIER_LIST.includes(x as PriceTier)) {
    return x as PriceTier;
  }
  return "mid";
}
