import { Link } from "react-router-dom";
import { ProductCard } from "../components/catalog/ProductCard";
import { groupProductsByArea } from "../catalog/groupByArea";
import { useProducts } from "../context/ProductsContext";
import { pickSelectedTier, priceForTier } from "../domain/product";
import { formatMoney } from "../lib/formatMoney";

export function ProductList() {
  const { products, removeProduct, updateProduct } = useProducts();
  const groups = groupProductsByArea(products);
  const total = products.reduce(
    (sum, p) =>
      sum + priceForTier(p, pickSelectedTier(p, p.selectedTier)),
    0,
  );

  return (
    <div className="page page-catalog">
      <header className="catalog-header">
        <div className="catalog-header-inner">
          <div className="catalog-title-block">
            <h1>产品列表</h1>
            <p className="catalog-subtitle">
              每条记录有品类名（如鼠标），各档位再填具体商品名（如雷蛇、罗技）；选用档位参与合计。
            </p>
          </div>
          <Link className="btn btn-primary btn-lg" to="/add">
            添加产品
          </Link>
        </div>
      </header>

      {products.length === 0 ? (
        <p className="empty empty-catalog">
          暂无产品，点击「添加产品」填写品类名与各档位商品名、价格、链接。
        </p>
      ) : (
        <main className="catalog-main">
          {groups.map(({ area, items }) => (
            <section key={area} className="catalog-area">
              <h2 className="catalog-area-title">
                <span className="catalog-area-badge">{area}</span>
                <span className="catalog-area-count">{items.length} 项</span>
              </h2>
              <div className="catalog-grid">
                {items.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onTierChange={(tier) =>
                      updateProduct(p.id, { selectedTier: tier })
                    }
                    onRemove={() => removeProduct(p.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </main>
      )}

      {products.length > 0 && (
        <footer className="footer-total footer-total-catalog">
          <span>合计（按选用档位）</span>
          <strong>{formatMoney(total)}</strong>
          <span className="unit">元</span>
        </footer>
      )}
    </div>
  );
}
