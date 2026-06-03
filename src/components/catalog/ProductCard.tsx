import { memo } from "react";
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

  return (
    <article className="product-card">
      <div className="product-card-head">
        <div className="product-card-name">{p.categoryName}</div>
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

      <div className="product-card-tiers">
        {TIER_ORDER.map((tier) => {
          const s = tierSlot(p, tier);
          const active = effectiveTier === tier;
          const empty = !isTierFilled(s);

          const classes = ["tier-panel"];
          if (active) classes.push("tier-panel-active");
          if (empty) classes.push("tier-panel-empty");
          if (!empty) classes.push("tier-panel-clickable");

          return (
            <div
              key={tier}
              className={classes.join(" ")}
              onClick={empty ? undefined : () => onTierChange(p.id, tier)}
              role={empty ? undefined : "button"}
              tabIndex={empty ? undefined : 0}
              onKeyDown={
                empty
                  ? undefined
                  : (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTierChange(p.id, tier);
                      }
                    }
              }
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

export const ProductCard = memo(ProductCardInner);