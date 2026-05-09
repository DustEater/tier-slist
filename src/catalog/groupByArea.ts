import type { Product } from "../domain/product";

/** 区域排序：预设在前，其余按首次出现顺序 */
const AREA_ORDER_LIST = [
  "客厅",
  "卧室",
  "厨房",
  "卫浴",
  "阳台",
  "全屋",
  "未分类",
] as const;

function areaSortRank(name: string): number {
  const i = (AREA_ORDER_LIST as readonly string[]).indexOf(name);
  return i === -1 ? 100 : i;
}

export function groupProductsByArea(
  products: Product[],
): { area: string; items: Product[] }[] {
  const map = new Map<string, Product[]>();
  const firstSeq = new Map<string, number>();
  let n = 0;
  for (const p of products) {
    const a = p.area.trim() || "未分类";
    if (!map.has(a)) {
      map.set(a, []);
      firstSeq.set(a, n++);
    }
    map.get(a)!.push(p);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ra = areaSortRank(a);
    const rb = areaSortRank(b);
    if (ra !== rb) return ra - rb;
    return (firstSeq.get(a) ?? 0) - (firstSeq.get(b) ?? 0);
  });
  return keys.map((area) => ({ area, items: map.get(area)! }));
}
