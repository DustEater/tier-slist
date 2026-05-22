import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SceneSwitcher } from "../components/SceneSwitcher";
import { TierFieldsSection } from "../components/forms/TierFieldsSection";
import { useProducts } from "../context/ProductsContext";
import { useScene } from "../context/SceneContext";
import { pickSelectedTier, type PriceTier } from "../domain/product";
import {
  emptyTierFormState,
  OTHER_AREA,
  parseTierFormState,
  type AreaPresetValue,
  type TierFormState,
} from "../domain/productForm";
import {
  getAreaPresets,
  getSceneAddTitle,
  getSceneCategoryPlaceholder,
} from "../domain/scene";

type TierField = "name" | "price" | "url" | "spec";

export function AddProduct() {
  const navigate = useNavigate();
  const { addProduct } = useProducts();
  const { scene } = useScene();
  const areaPresets = getAreaPresets(scene);
  const defaultPreset = areaPresets.length > 0 ? areaPresets[0] : OTHER_AREA;
  const [areaPreset, setAreaPreset] = useState<AreaPresetValue>(defaultPreset);
  const [areaOther, setAreaOther] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [tiers, setTiers] = useState<TierFormState>(() => emptyTierFormState());
  const [selectedTier, setSelectedTier] = useState<PriceTier>("mid");
  const [error, setError] = useState<string | null>(null);

  function setTierField(tier: PriceTier, field: TierField, value: string) {
    setTiers((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [field]: value },
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    let area: string;
    if (areaPreset === OTHER_AREA) {
      area = areaOther.trim();
      if (!area) {
        setError("选择「其他」时请填写自定义区域名称。");
        return;
      }
    } else {
      area = areaPreset;
    }

    const cat = categoryName.trim();
    if (!cat) {
      setError("请填写品类名。");
      return;
    }

    const parsed = parseTierFormState(tiers);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    const selectedResolved = pickSelectedTier(
      {
        economy: parsed.economy,
        mid: parsed.mid,
        high: parsed.high,
      },
      selectedTier,
    );

    addProduct({
      area,
      categoryName: cat,
      economy: parsed.economy,
      mid: parsed.mid,
      high: parsed.high,
      selectedTier: selectedResolved,
      scene,
    });
    navigate("/", { replace: true });
  }

  return (
    <div className="page">
      <header className="header">
        <h1>{getSceneAddTitle(scene)}</h1>
        <Link className="btn btn-ghost" to="/">
          返回列表
        </Link>
      </header>

      <SceneSwitcher />

      <form className="form-card form-card-wide" onSubmit={handleSubmit}>
        {error && <p className="form-error">{error}</p>}

        <p className="form-block-title">区域与品类</p>
        <label className="field">
          <span>区域</span>
          <select
            value={areaPreset}
            onChange={(e) =>
              setAreaPreset(e.target.value as AreaPresetValue)
            }
          >
            {areaPresets.length > 0 ? (
              areaPresets.map((a) => (
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

        {areaPreset === OTHER_AREA ? (
          <label className="field">
            <span>自定义区域名称</span>
            <input
              type="text"
              value={areaOther}
              onChange={(e) => setAreaOther(e.target.value)}
              placeholder="例如：书房"
              autoComplete="off"
            />
          </label>
        ) : null}

        <label className="field">
          <span>品类名</span>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder={getSceneCategoryPlaceholder(scene)}
            autoComplete="off"
          />
        </label>

        <p className="form-block-title">各档位与默认选用</p>
        <p className="form-section-hint">
          至少完整填写一个档位（商品名与价格）；其余档位可整档留空。若默认选用档位指向未填写的档，保存后会自动选用第一个已填档位。
        </p>

        <TierFieldsSection value={tiers} onChange={setTierField} />

        <label className="field">
          <span>默认选用档位（加入列表后仍可改）</span>
          <select
            value={selectedTier}
            onChange={(e) =>
              setSelectedTier(e.target.value as PriceTier)
            }
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