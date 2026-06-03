import type { Product } from "../domain/product";
import { getAreaOrderList, type Scene } from "../domain/scene";

function areaSortRank(name: string, orderList: readonly string[]): number {
  const i = (orderList as readonly string[]).indexOf(name);
  return i === -1 ? 100 : i;
}

export function groupProductsByArea(
  products: Product[],
  scene: Scene = "home",
): { area: string; items: Product[] }[] {
  const areaOrder = getAreaOrderList(scene);
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
    const ra = areaSortRank(a, areaOrder);
    const rb = areaSortRank(b, areaOrder);
    if (ra !== rb) return ra - rb;
    return (firstSeq.get(a) ?? 0) - (firstSeq.get(b) ?? 0);
  });
  return keys.map((area) => ({
    area,
    items: map.get(area)!.sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}