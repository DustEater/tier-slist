import { Link } from "react-router-dom";
import type { PriceTier, Product } from "../../domain/product";
import { TIER_LABELS, pickSelectedTier } from "../../domain/product";
import { formatMoney } from "../../lib/formatMoney";

type Props = {
  groups: { area: string; items: Product[] }[];
  onTierChange: (id: string, tier: PriceTier) => void;
  onRemove: (id: string) => void;
};

export function ProductTable({ groups, onRemove }: Props) {
  if (groups.length === 0) return null;

  return (
    <div className="catalog-table-wrap">
      {groups.map(({ area, items }) => (
        <section key={area} className="catalog-table-area">
          <h3 className="catalog-table-area-title">
            <span className="catalog-area-badge">{area}</span>
            <span className="catalog-area-count">{items.length} 项</span>
          </h3>
          <table className="catalog-table">
            <thead>
              <tr>
                <th className="th-category">品类</th>
                <th className="th-tier">{TIER_LABELS.economy}</th>
                <th className="th-tier">{TIER_LABELS.mid}</th>
                <th className="th-tier">{TIER_LABELS.high}</th>
                <th className="th-actions">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const selected = pickSelectedTier(p, p.selectedTier);
                return (
                  <tr key={p.id} className={selected ? "row-selected" : ""}>
                    <td className="td-category">
                      <span className="table-cat-name">{p.categoryName}</span>
                    </td>
                    {(["economy", "mid", "high"] as const).map((tier) => {
                      const s = p[tier];
                      const isEmpty = !s.name.trim();
                      return (
                        <td key={tier} className="td-tier">
                          {isEmpty ? (
                            <span className="muted">—</span>
                          ) : (
                            <div className="table-tier-cell">
                              <span className="table-tier-name">{s.name}</span>
                              <span className="table-tier-price">{formatMoney(s.price)}</span>
                              {s.spec ? (
                                <span className="table-tier-spec">{s.spec}</span>
                              ) : null}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="td-actions">
                      <div className="table-actions-row">
                        <Link
                          className="btn btn-ghost btn-xs"
                          to={`/edit/${p.id}`}
                        >
                          编辑
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-danger"
                          onClick={() => onRemove(p.id)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}