import { useMemo, useState } from "react";
import type { PriceTier, Product, TierSlot } from "../domain/product";
import { pickSelectedTier } from "../domain/product";
import {
  areaToFormState,
  emptyTierFormState,
  OTHER_AREA,
  parseTierFormState,
  tierFormStateFromProduct,
  type AreaPresetValue,
  type TierFormState,
} from "../domain/productForm";
import { getAreaPresets, getSceneCategoryPlaceholder } from "../domain/scene";
import { useScene } from "../context/SceneContext";

export type TierField = "name" | "price" | "url" | "spec";

export type ValidatedProductData = {
  area: string;
  categoryName: string;
  economy: TierSlot;
  mid: TierSlot;
  high: TierSlot;
  selectedTier: PriceTier;
};

export function useProductForm(initialProduct?: Product | null) {
  const { scene } = useScene();
  const areaPresets = getAreaPresets(scene);
  const defaultPreset = areaPresets.length > 0 ? areaPresets[0] : OTHER_AREA;

  const initialArea = initialProduct ? areaToFormState(initialProduct.area) : null;

  const [areaPreset, setAreaPreset] = useState<AreaPresetValue>(
    initialArea?.areaPreset ?? defaultPreset,
  );
  const [areaOther, setAreaOther] = useState(initialArea?.areaOther ?? "");
  const [categoryName, setCategoryName] = useState(initialProduct?.categoryName ?? "");
  const [tiers, setTiersState] = useState<TierFormState>(
    () => initialProduct ? tierFormStateFromProduct(initialProduct) : emptyTierFormState(),
  );
  const [selectedTier, setSelectedTier] = useState<PriceTier>(
    initialProduct?.selectedTier ?? "mid",
  );
  const [error, setError] = useState<string | null>(null);

  const categoryPlaceholder = useMemo(
    () => getSceneCategoryPlaceholder(scene),
    [scene],
  );

  function setTierField(tier: PriceTier, field: TierField, value: string) {
    setTiersState((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  }

  function setTiers(tiers: TierFormState) {
    setTiersState(tiers);
  }

  function validate(): ValidatedProductData | null {
    setError(null);

    let area: string;
    if (areaPreset === OTHER_AREA) {
      area = areaOther.trim();
      if (!area) {
        setError("选择「其他」时请填写自定义区域名称。");
        return null;
      }
    } else {
      area = areaPreset;
    }

    const cat = categoryName.trim();
    if (!cat) {
      setError("请填写品类名。");
      return null;
    }

    const parsed = parseTierFormState(tiers);
    if (!parsed.ok) {
      setError(parsed.message);
      return null;
    }

    const selectedResolved = pickSelectedTier(
      {
        economy: parsed.economy,
        mid: parsed.mid,
        high: parsed.high,
      },
      selectedTier,
    );

    return {
      area,
      categoryName: cat,
      economy: parsed.economy,
      mid: parsed.mid,
      high: parsed.high,
      selectedTier: selectedResolved,
    };
  }

  function fillFromProduct(p: Product) {
    const { areaPreset: ap, areaOther: ao } = areaToFormState(p.area);
    setAreaPreset(ap);
    setAreaOther(ao);
    setCategoryName(p.categoryName);
    setTiers(tierFormStateFromProduct(p));
    setSelectedTier(p.selectedTier);
    setError(null);
  }

  return {
    scene,
    areaPresets,
    categoryPlaceholder,
    areaPreset,
    setAreaPreset,
    areaOther,
    setAreaOther,
    categoryName,
    setCategoryName,
    tiers,
    selectedTier,
    setSelectedTier,
    setTierField,
    setTiers,
    error,
    setError,
    validate,
    fillFromProduct,
  } as const;
}