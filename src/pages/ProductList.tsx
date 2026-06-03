import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataBackupBar } from "../components/catalog/DataBackupBar";
import { ProductCard } from "../components/catalog/ProductCard";
import { ProductTable } from "../components/catalog/ProductTable";
import { SceneSwitcher } from "../components/SceneSwitcher";
import { groupProductsByArea } from "../catalog/groupByArea";
import { useProducts } from "../context/ProductsContext";
import { useScene } from "../context/SceneContext";
import {
  pickSelectedTier,
  priceForTier,
  type PriceTier,
} from "../domain/product";
import {
  getSceneTitle,
  getSceneSubtitle,
  getSceneItemName,
} from "../domain/scene";
import { formatMoney } from "../lib/formatMoney";

type ViewMode = "card" | "table";

export function ProductList() {
  const { products, removeProduct, updateProduct } = useProducts();
  const { scene } = useScene();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const sceneProducts = useMemo(
    () => products.filter((p) => (p.scene || "home") === scene),
    [products, scene],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sceneProducts;
    return sceneProducts.filter((p) =>
      p.categoryName.toLowerCase().includes(q),
    );
  }, [sceneProducts, search]);

  const handleTierChange = useCallback(
    (id: string, tier: PriceTier) => {
      updateProduct(id, { selectedTier: tier });
    },
    [updateProduct],
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeProduct(id);
    },
    [removeProduct],
  );

  const handleQuantityChange = useCallback(
    (id: string, quantity: number) => {
      updateProduct(id, { quantity });
    },
    [updateProduct],
  );

  const groups = useMemo(
    () => groupProductsByArea(filtered, scene),
    [filtered, scene],
  );

  const total = useMemo(
    () =>
      sceneProducts.reduce(
        (sum, p) =>
          sum + priceForTier(p, pickSelectedTier(p, p.selectedTier)) * (p.quantity || 1),
        0,
      ),
    [sceneProducts],
  );

  const itemName = getSceneItemName(scene);
  const addLabel = `添加${itemName}`;

  return (
    <div className="page page-catalog">
      <header className="catalog-header">
        <div className="catalog-header-inner">
          <div className="catalog-title-block">
            <h1>{getSceneTitle(scene)}</h1>
            <p className="catalog-subtitle">
              {getSceneSubtitle(scene)}
            </p>
          </div>
          <div className="catalog-header-actions">
            <Link className="btn btn-primary btn-lg" to="/add">
              {addLabel}
            </Link>
          </div>
        </div>
        <SceneSwitcher />
        <DataBackupBar products={products} />
      </header>

      {sceneProducts.length > 0 ? (
        <div className="catalog-toolbar">
          <div className="catalog-search">
            <input
              type="text"
              className="catalog-search-input"
              placeholder={`搜索${itemName}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "card" ? "view-toggle-btn-active" : ""}`}
              onClick={() => setViewMode("card")}
            >
              🪪 卡片
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === "table" ? "view-toggle-btn-active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              📋 表格
            </button>
          </div>
        </div>
      ) : null}

      {sceneProducts.length === 0 ? (
        <div className="empty-catalog empty-catalog-cta" role="status">
          <p className="empty-catalog-title">暂无{itemName}</p>
          <p className="empty-catalog-text">
            点击「{addLabel}」填写品类名与各档位商品名、价格、链接；也可先「导出 JSON」得到空列表文件，在别处编辑后再导入。
          </p>
          <Link className="btn btn-primary btn-lg" to="/add">
            {addLabel}
          </Link>
        </div>
      ) : viewMode === "table" ? (
        <main className="catalog-main">
          <ProductTable
            groups={groups}
            onTierChange={handleTierChange}
            onRemove={handleRemove}
            onQuantityChange={handleQuantityChange}
          />
        </main>
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
                    onTierChange={handleTierChange}
                    onRemove={handleRemove}
                    onQuantityChange={handleQuantityChange}
                  />
                ))}
              </div>
            </section>
          ))}
        </main>
      )}

      {sceneProducts.length > 0 && (
        <footer className="footer-total footer-total-catalog">
          <span>合计（按选用档位）</span>
          <strong>{formatMoney(total)}</strong>
          <span className="unit">元</span>
        </footer>
      )}
    </div>
  );
}