/** 产品三档价格对应的档位 */
export type PriceTier = "economy" | "mid" | "high";

export const TIER_LABELS: Record<PriceTier, string> = {
  economy: "经济档",
  mid: "中档",
  high: "高档",
};

/** 表头 / 表单迭代顺序 */
export const TIER_ORDER: readonly PriceTier[] = ["economy", "mid", "high"];

/** 单个档位：商品名（具体型号/品牌）、价格、可选链接 */
export type TierSlot = {
  /** 该档位具体商品名，如「罗技」「雷蛇」 */
  name: string;
  price: number;
  /** 可选，空字符串表示无链接 */
  purchaseUrl: string;
};

/** 区域下拉常用项（与「其他」配合） */
export const AREA_PRESETS = [
  "客厅",
  "卧室",
  "厨房",
  "卫浴",
  "阳台",
  "全屋",
] as const;

export type Product = {
  id: string;
  /** 区域分类（同一区域多行合并展示） */
  area: string;
  /** 品类名，如「鼠标」「智能马桶」——下辖三档各自填写商品名 */
  categoryName: string;
  economy: TierSlot;
  mid: TierSlot;
  high: TierSlot;
  /** 计入合计时使用的档位 */
  selectedTier: PriceTier;
};

export function tierSlot(p: Product, tier: PriceTier): TierSlot {
  switch (tier) {
    case "economy":
      return p.economy;
    case "mid":
      return p.mid;
    case "high":
      return p.high;
  }
}

export function priceForTier(p: Product, tier: PriceTier): number {
  return tierSlot(p, tier).price;
}

/** 该档位是否已配置（有商品名即视为启用） */
export function isTierFilled(s: TierSlot): boolean {
  return s.name.trim().length > 0;
}

export function firstFilledTier(
  slots: Pick<Product, "economy" | "mid" | "high">,
): PriceTier | null {
  if (isTierFilled(slots.economy)) return "economy";
  if (isTierFilled(slots.mid)) return "mid";
  if (isTierFilled(slots.high)) return "high";
  return null;
}

/** 若当前选用档位未配置，则回落到第一个已填档位 */
export function pickSelectedTier(
  slots: Pick<Product, "economy" | "mid" | "high">,
  preferred: PriceTier,
): PriceTier {
  const chosen =
    preferred === "economy"
      ? slots.economy
      : preferred === "mid"
        ? slots.mid
        : slots.high;
  if (isTierFilled(chosen)) return preferred;
  return firstFilledTier(slots) ?? preferred;
}

export function ensureValidSelectedTier(p: Product): Product {
  const next = pickSelectedTier(p, p.selectedTier);
  if (next === p.selectedTier) return p;
  return { ...p, selectedTier: next };
}
