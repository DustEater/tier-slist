import type { Product } from "./product";

/**
 * 按 `id` 合并：文件中每条覆盖本地同 id；文件中的新 id 追加到列表末尾；
 * 本地有而文件中未出现的记录保留。同 id 在文件中多次出现时以后者为准。
 */
export function mergeProductsById(
  current: Product[],
  incoming: Product[],
): Product[] {
  const map = new Map(current.map((p) => [p.id, p]));
  for (const p of incoming) {
    map.set(p.id, p);
  }
  return [...map.values()];
}

/** 导入确认框用：与 {@link mergeProductsById} 一致（含文件内重复 id 取最后一次）。 */
export type MergePreviewStats = {
  updateCount: number;
  addCount: number;
  keptCount: number;
  totalAfter: number;
};

export function previewMergeById(
  current: Product[],
  incoming: Product[],
): MergePreviewStats {
  const currentIds = new Set(current.map((p) => p.id));
  const incomingById = new Map<string, Product>();
  for (const p of incoming) {
    incomingById.set(p.id, p);
  }

  let updateCount = 0;
  let addCount = 0;
  for (const id of incomingById.keys()) {
    if (currentIds.has(id)) updateCount += 1;
    else addCount += 1;
  }

  let keptCount = 0;
  for (const p of current) {
    if (!incomingById.has(p.id)) keptCount += 1;
  }

  const totalAfter = keptCount + incomingById.size;

  return { updateCount, addCount, keptCount, totalAfter };
}
