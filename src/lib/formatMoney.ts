/** 金额展示（中文区域、最多两位小数） */
export function formatMoney(n: number): string {
  return n.toLocaleString("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
