import { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SceneSwitcher } from "../components/SceneSwitcher";
import { TierFieldsSection } from "../components/forms/TierFieldsSection";
import { useProducts } from "../context/ProductsContext";
import type { Product, PriceTier } from "../domain/product";
import { isTierFilled, tierSlot } from "../domain/product";
import { OTHER_AREA, type TierFormRow } from "../domain/productForm";
import { getSceneAddTitle } from "../domain/scene";
import { useProductForm } from "../hooks/useProductForm";

export function AddProduct() {
  const navigate = useNavigate();
  const { addProduct, products } = useProducts();
  const form = useProductForm();

  function copyFromPrevious() {
    const prev = findPreviousProductForCopy(products, form.areaPreset);
    if (!prev) return;

    const p = prev;
    function toRow(tier: PriceTier): TierFormRow {
      const s = tierSlot(p, tier);
      return {
        name: s.name,
        price: s.price > 0 ? String(s.price) : "",
        url: s.purchaseUrl,
        spec: s.spec,
      };
    }

    form.setTiers({
      economy: toRow("economy"),
      mid: toRow("mid"),
      high: toRow("high"),
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const data = form.validate();
    if (!data) return;

    addProduct({
      ...data,
      scene: form.scene,
      sortOrder: Date.now(),
    });
    navigate("/", { replace: true });
  }

  return (
    <div className="page">
      <header className="header">
        <h1>{getSceneAddTitle(form.scene)}</h1>
        <Link className="btn btn-ghost" to="/">
          返回列表
        </Link>
        <SceneSwitcher />
      </header>

      <form className="form-card form-card-wide" onSubmit={handleSubmit}>
        {form.error && <p className="form-error">{form.error}</p>}

        <p className="form-block-title">区域与品类</p>
        <label className="field">
          <span>区域</span>
          <select
            value={form.areaPreset}
            onChange={(e) => form.setAreaPreset(e.target.value)}
          >
            {form.areaPresets.length > 0 ? (
              form.areaPresets.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))
            ) : (
              <option value="">请选择或自定义</option>
            )}
            <option value={OTHER_AREA}>其他（自定义）</option>
          </select>
        </label>

        {form.areaPreset === OTHER_AREA ? (
          <label className="field">
            <span>自定义区域名称</span>
            <input
              type="text"
              value={form.areaOther}
              onChange={(e) => form.setAreaOther(e.target.value)}
              placeholder="例如：书房"
              autoComplete="off"
            />
          </label>
        ) : null}

        <label className="field">
          <span>品类名</span>
          <input
            type="text"
            value={form.categoryName}
            onChange={(e) => form.setCategoryName(e.target.value)}
            placeholder={form.categoryPlaceholder}
            autoComplete="off"
          />
        </label>

        <label className="field">
          <span>数量</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={form.quantity}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              form.setQuantity(Number.isFinite(v) && v > 0 ? v : 1);
            }}
            autoComplete="off"
          />
        </label>

        <p className="form-block-title">各档位与默认选用</p>
        <p className="form-section-hint">
          至少完整填写一个档位（商品名与价格）；其余档位可整档留空。若默认选用档位指向未填写的档，保存后会自动选用第一个已填档位。
        </p>

        <TierFieldsSection value={form.tiers} onChange={form.setTierField} />

        <CopyFromPreviousBar
          areaPreset={form.areaPreset}
          products={products}
          onCopy={copyFromPrevious}
        />

        <label className="field">
          <span>默认选用档位（加入列表后仍可改）</span>
          <select
            value={form.selectedTier}
            onChange={(e) => form.setSelectedTier(e.target.value as any)}
          >
            <option value="economy">经济档</option>
            <option value="mid">中档</option>
            <option value="high">高档</option>
          </select>
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            加入列表
          </button>
          <Link to="/" className="btn btn-ghost">
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}

function CopyFromPreviousBar({
  areaPreset,
  products,
  onCopy,
}: {
  areaPreset: string;
  products: Product[];
  onCopy: () => void;
}) {
  const prev = findPreviousProductForCopy(products, areaPreset);
  if (!prev) return null;
  const filledCount = (["economy", "mid", "high"] as const).filter((t) =>
    isTierFilled(tierSlot(prev, t)),
  ).length;

  return (
    <p className="form-section-hint" style={{ marginTop: "-0.25rem" }}>
      同一区域已有「{prev.categoryName}」({filledCount} 档已填)。
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginLeft: "0.5rem", verticalAlign: "middle" }}
        onClick={onCopy}
      >
        复制档位
      </button>
    </p>
  );
}

function findPreviousProductForCopy(
  products: Product[],
  areaPreset: string,
) {
  const sameArea = products.filter(
    (p) => p.area === areaPreset,
  );
  if (sameArea.length === 0) return null;
  return sameArea[sameArea.length - 1];
}