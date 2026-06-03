import { FormEvent, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TierFieldsSection } from "../components/forms/TierFieldsSection";
import { useProducts } from "../context/ProductsContext";
import { OTHER_AREA } from "../domain/productForm";
import { useProductForm } from "../hooks/useProductForm";

export function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, updateProduct } = useProducts();

  const product = id ? products.find((x) => x.id === id) : undefined;
  const form = useProductForm(product ?? null);
  const hydratedForId = useRef<string | null>(null);

  useEffect(() => {
    if (!id || !product) return;
    if (hydratedForId.current === id) return;
    hydratedForId.current = id;
    form.fillFromProduct(product);
  }, [id, product, form]);

  useEffect(() => {
    hydratedForId.current = null;
  }, [id]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;

    const data = form.validate();
    if (!data) return;
    if (!product) return;

    updateProduct(id, {
      ...data,
      scene: product.scene,
    });
    navigate("/", { replace: true });
  }

  if (!id) return null;

  return (
    <div className="page">
      <header className="header">
        <h1>编辑产品</h1>
        <Link className="btn btn-ghost" to="/">
          返回列表
        </Link>
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

        <p className="form-block-title">各档位与选用</p>
        <p className="form-section-hint">
          至少保留一个已填档位；未使用的档位可清空商品名与价格整档留空。
        </p>

        <TierFieldsSection value={form.tiers} onChange={form.setTierField} />

        <label className="field">
          <span>选用档位</span>
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
            保存修改
          </button>
          <Link to="/" className="btn btn-ghost">
            取消
          </Link>
        </div>
      </form>
    </div>
  );
}