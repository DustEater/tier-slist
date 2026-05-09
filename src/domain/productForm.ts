import type { PriceTier, Product, TierSlot } from "./product";
import { AREA_PRESETS, isTierFilled, TIER_LABELS } from "./product";

export const OTHER_AREA = "其他" as const;

export type AreaPresetValue = (typeof AREA_PRESETS)[number] | typeof OTHER_AREA;

export type TierFormRow = {
  name: string;
  price: string;
  url: string;
};

export type TierFormState = Record<PriceTier, TierFormRow>;

export function emptyTierFormState(): TierFormState {
  const row = (): TierFormRow => ({ name: "", price: "", url: "" });
  return { economy: row(), mid: row(), high: row() };
}

export function tierFormStateFromProduct(p: Product): TierFormState {
  const row = (slot: TierSlot): TierFormRow => ({
    name: slot.name,
    price: slot.name.trim() ? String(slot.price) : "",
    url: slot.purchaseUrl,
  });
  return {
    economy: row(p.economy),
    mid: row(p.mid),
    high: row(p.high),
  };
}

export function parseNonNegativePrice(raw: string): number | null {
  const v = Number.parseFloat(raw.trim());
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

export function areaToFormState(area: string): {
  areaPreset: AreaPresetValue;
  areaOther: string;
} {
  const a = area.trim();
  if ((AREA_PRESETS as readonly string[]).includes(a)) {
    return { areaPreset: a as (typeof AREA_PRESETS)[number], areaOther: "" };
  }
  return { areaPreset: OTHER_AREA, areaOther: a };
}

export function parseTierFormState(
  tiers: TierFormState,
):
  | { ok: true; economy: TierSlot; mid: TierSlot; high: TierSlot }
  | { ok: false; message: string } {
  const economy = parseTierRowOptional("economy", tiers.economy);
  if (!economy.ok) return economy;
  const mid = parseTierRowOptional("mid", tiers.mid);
  if (!mid.ok) return mid;
  const high = parseTierRowOptional("high", tiers.high);
  if (!high.ok) return high;

  const anyFilled =
    isTierFilled(economy.slot) ||
    isTierFilled(mid.slot) ||
    isTierFilled(high.slot);
  if (!anyFilled) {
    return {
      ok: false,
      message: "请至少完整填写一个档位（商品名与有效价格）。其余档位可全部留空。",
    };
  }

  return {
    ok: true,
    economy: economy.slot,
    mid: mid.slot,
    high: high.slot,
  };
}

/** 商品名为空则视为未启用该档；若填了价/链但未填名则报错 */
function parseTierRowOptional(
  tier: PriceTier,
  row: TierFormRow,
): { ok: true; slot: TierSlot } | { ok: false; message: string } {
  const name = row.name.trim();
  const priceRaw = row.price.trim();
  const url = row.url.trim();

  if (!name) {
    if (priceRaw !== "" && priceRaw !== "0") {
      const pv = parseNonNegativePrice(priceRaw);
      if (pv !== null && pv > 0) {
        return {
          ok: false,
          message: `「${TIER_LABELS[tier]}」填写了价格但未填商品名，请补充商品名或清空该档价格。`,
        };
      }
    }
    if (url) {
      return {
        ok: false,
        message: `「${TIER_LABELS[tier]}」填写了链接但未填商品名，请补充或清空链接。`,
      };
    }
    return { ok: true, slot: { name: "", price: 0, purchaseUrl: "" } };
  }

  const price = parseNonNegativePrice(row.price);
  if (price === null) {
    return {
      ok: false,
      message: `请填写「${TIER_LABELS[tier]}」的有效价格（非负数字）。`,
    };
  }
  if (url) {
    try {
      new URL(url);
    } catch {
      return {
        ok: false,
        message: `「${TIER_LABELS[tier]}」的链接格式不正确，请使用完整 https:// 链接或留空。`,
      };
    }
  }
  return { ok: true, slot: { name, price, purchaseUrl: url } };
}
