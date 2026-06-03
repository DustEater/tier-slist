import { useCallback, useState } from "react";
import type { PriceTier } from "../domain/product";
import { scrapeProductInfo } from "../persistence/productsStorage";

export type ScrapeField = "name" | "price" | "url" | "spec";

export type ScrapeStatus = "idle" | "loading" | "success" | "error";

export function useUrlScraper(
  onChange: (tier: PriceTier, field: ScrapeField, value: string) => void,
) {
  const [statusMap, setStatusMap] = useState<Record<string, ScrapeStatus>>({});

  const scrape = useCallback(
    async (tier: PriceTier, url: string) => {
      const key = tier;
      if (!url) {
        setStatusMap((prev) => ({ ...prev, [key]: "idle" }));
        return;
      }
      try {
        new URL(url);
      } catch {
        setStatusMap((prev) => ({ ...prev, [key]: "idle" }));
        return;
      }
      setStatusMap((prev) => ({ ...prev, [key]: "loading" }));
      try {
        const result = await scrapeProductInfo(url);
        if (result.name) {
          onChange(tier, "name", result.name);
        }
        if (result.price !== null && result.price > 0) {
          onChange(tier, "price", String(result.price));
        }
        setStatusMap((prev) => ({
          ...prev,
          [key]:
            result.name || result.price !== null ? "success" : "error",
        }));
      } catch {
        setStatusMap((prev) => ({ ...prev, [key]: "error" }));
      }
    },
    [onChange],
  );

  function getStatus(tier: PriceTier): ScrapeStatus {
    return statusMap[tier] ?? "idle";
  }

  return { scrape, getStatus } as const;
}