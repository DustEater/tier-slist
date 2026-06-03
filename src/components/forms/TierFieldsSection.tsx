import type { PriceTier } from "../../domain/product";
import { TIER_LABELS, TIER_ORDER } from "../../domain/product";
import type { TierFormState } from "../../domain/productForm";
import { useUrlScraper } from "../../hooks/useUrlScraper";

type FieldKey = "name" | "price" | "url" | "spec";

type Props = {
  value: TierFormState;
  onChange: (tier: PriceTier, field: FieldKey, next: string) => void;
};

export function TierFieldsSection({ value, onChange }: Props) {
  const { scrape, getStatus } = useUrlScraper(onChange);

  return (
    <>
      {TIER_ORDER.map((tier) => {
        const status = getStatus(tier);
        return (
          <fieldset key={tier} className="tier-fieldset">
            <legend>{TIER_LABELS[tier]}</legend>
            <div className="field-row field-row-tier">
              <label className="field">
                <span>商品名</span>
                <input
                  type="text"
                  value={value[tier].name}
                  onChange={(e) => onChange(tier, "name", e.target.value)}
                  placeholder="例如：罗技 MX Master"
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>价格（元）</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={value[tier].price}
                  onChange={(e) => onChange(tier, "price", e.target.value)}
                  placeholder="0"
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>链接（可选）</span>
                <div className="field-url-wrap">
                  <input
                    type="url"
                    value={value[tier].url}
                    onChange={(e) => onChange(tier, "url", e.target.value)}
                    onBlur={() => scrape(tier, value[tier].url)}
                    placeholder="https://… 或留空"
                    autoComplete="off"
                  />
                  {status === "loading" && (
                    <span className="scrape-indicator scrape-loading" />
                  )}
                  {status === "success" && (
                    <span className="scrape-indicator scrape-success">
                      ✓
                    </span>
                  )}
                  {status === "error" && (
                    <span className="scrape-indicator scrape-error">
                      ✗
                    </span>
                  )}
                </div>
              </label>
            </div>
            <div className="field-row">
              <label className="field field-spec">
                <span>规格（可选）</span>
                <input
                  type="text"
                  value={value[tier].spec}
                  onChange={(e) => onChange(tier, "spec", e.target.value)}
                  placeholder="例如：6核12线程 / 4.7GHz"
                  autoComplete="off"
                />
              </label>
            </div>
          </fieldset>
        );
      })}
    </>
  );
}
