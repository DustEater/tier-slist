import { memo, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { PriceTier, Product } from "../../domain/product";
import {
  isTierFilled,
  pickSelectedTier,
  tierSlot,
  TIER_LABELS,
  TIER_ORDER,
} from "../../domain/product";
import { formatMoney } from "../../lib/formatMoney";

type Props = {
  product: Product;
  onTierChange: (id: string, tier: PriceTier) => void;
  onRemove: (id: string) => void;
};

function ProductCardInner({ product: p, onTierChange, onRemove }: Props) {
  const effectiveTier = pickSelectedTier(p, p.selectedTier);
  const chosenName = tierSlot(p, effectiveTier).name;
  const categoryDisplay = p.categoryName.trim() || "未填写品类";
  const filledTiers = TIER_ORDER.filter((t) => isTierFilled(tierSlot(p, t)));

  return (
    <article className="product-card">
      <div className="product-card-category-block">
        <p className="product-card-category-label">品类</p>
        <h3 className="product-card-category-title">{categoryDisplay}</h3>
      </div>

      <div className="product-card-head">
        <div className="product-card-tools">
          <label className="product-tier-field">
            <span className="product-tier-field-label">选用档位</span>
            <select
              className="tier-select tier-select-card"
              value={effectiveTier}
              aria-label={`${categoryDisplay} · ${chosenName} 选用档位`}
              onChange={(e) =>
                onTierChange(p.id, e.target.value as PriceTier)
              }
            >
              {filledTiers.map((tier) => (
                <option key={tier} value={tier}>
                  {TIER_LABELS[tier]}
                </option>
              ))}
            </select>
          </label>
          <div className="product-card-actions">
            <Link
              to={`/edit/${p.id}`}
              className="btn btn-sm btn-ghost"
            >
              编辑
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => onRemove(p.id)}
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <div className="product-card-tiers">
        {TIER_ORDER.map((tier) => {
          const s = tierSlot(p, tier);
          const active = effectiveTier === tier;
          const empty = !isTierFilled(s);
          const clickable = !empty;

          function handlePanelClick() {
            if (!clickable) return;
            onTierChange(p.id, tier);
          }

          function handlePanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
            if (!clickable) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTierChange(p.id, tier);
            }
          }

          return (
            <div
              key={tier}
              className={`tier-panel ${active && !empty ? "tier-panel-active" : ""} ${empty ? "tier-panel-empty" : ""} ${clickable ? "tier-panel-clickable" : ""}`}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={
                clickable
                  ? `选用${TIER_LABELS[tier]}（点击与上方下拉框同步）`
                  : undefined
              }
              aria-pressed={clickable ? active : undefined}
              onClick={clickable ? handlePanelClick : undefined}
              onKeyDown={clickable ? handlePanelKeyDown : undefined}
            >
              <div className="tier-panel-head">{TIER_LABELS[tier]}</div>
              <div className="tier-panel-sublabel">商品名</div>
              <div className="tier-panel-name">
                {empty ? (
                  <span className="muted">未配置</span>
                ) : (
                  s.name
                )}
              </div>
              {s.spec ? (
                <>
                  <div className="tier-panel-sublabel">规格</div>
                  <div className="tier-panel-spec">{s.spec}</div>
                </>
              ) : null}
              <div className="tier-panel-price">
                {empty ? (
                  <span className="muted">—</span>
                ) : (
                  <>
                    <span className="tier-panel-price-num">{formatMoney(s.price)}</span>
                    <span className="tier-panel-price-unit">元</span>
                  </>
                )}
              </div>
              <div className="tier-panel-link">
                {s.purchaseUrl.trim() ? (
                  <a
                    href={s.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    打开链接
                  </a>
                ) : (
                  <span className="muted">无链接</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

/** 列表项较多时配合稳定回调，可避免无关卡片随父组件重绘。 */
export const ProductCard = memo(ProductCardInner);
