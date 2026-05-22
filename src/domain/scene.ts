export type Scene = string;

export const BUILTIN_SCENES = ["home", "pc-build"] as const;

export type BuiltinScene = (typeof BUILTIN_SCENES)[number];

export const SCENE_OPTIONS: { value: Scene; label: string }[] = [
  { value: "home", label: "家居" },
  { value: "pc-build", label: "装机" },
];

export function isBuiltinScene(s: Scene): s is BuiltinScene {
  return BUILTIN_SCENES.includes(s as BuiltinScene);
}

export const HOME_AREA_PRESETS = [
  "客厅",
  "卧室",
  "厨房",
  "卫浴",
  "阳台",
  "全屋",
] as const;

export const PC_BUILD_AREA_PRESETS = [
  "游戏主机",
  "办公主机",
  "设计工作站",
  "家庭服务器",
  "NAS",
] as const;

export const OTHER_AREA = "其他" as const;

export function getAreaPresets(scene: Scene): readonly string[] {
  if (scene === "home") return HOME_AREA_PRESETS;
  if (scene === "pc-build") return PC_BUILD_AREA_PRESETS;
  return [];
}

export const AREA_ORDER_HOME = [
  "客厅",
  "卧室",
  "厨房",
  "卫浴",
  "阳台",
  "全屋",
  "未分类",
] as const;

export const AREA_ORDER_PC_BUILD = [
  "游戏主机",
  "办公主机",
  "设计工作站",
  "家庭服务器",
  "NAS",
  "未分类",
] as const;

export function getAreaOrderList(scene: Scene): readonly string[] {
  if (scene === "home") return AREA_ORDER_HOME;
  if (scene === "pc-build") return AREA_ORDER_PC_BUILD;
  return ["未分类"];
}

export function getSceneTitle(scene: Scene): string {
  if (scene === "home") return "商品统计单";
  if (scene === "pc-build") return "装机配置单";
  return `${scene} · 选购清单`;
}

export function getSceneSubtitle(scene: Scene): string {
  if (scene === "home") {
    return "每条记录有品类名（如鼠标），各档位再填具体商品名（如雷蛇、罗技）；选用档位参与合计。";
  }
  if (scene === "pc-build") {
    return "每条记录为一个配件类型（如 CPU、显卡），各档位填具体型号与价格；选用档位参与整机合计。";
  }
  return "每条记录有品类名，各档位填具体商品名、价格；选用档位参与合计。";
}

export function getSceneAddTitle(scene: Scene): string {
  if (scene === "pc-build") return "添加配件";
  return "添加产品";
}

export function getSceneItemName(scene: Scene): string {
  if (scene === "pc-build") return "配件";
  return "产品";
}

export function getSceneCategoryPlaceholder(scene: Scene): string {
  if (scene === "home") {
    return "例如：鼠标、智能马桶（区别于下面各档的商品名）";
  }
  if (scene === "pc-build") {
    return "例如：CPU、显卡、主板（区别于下面各档的具体型号）";
  }
  return "例如：品类名称";
}

export function getSceneSpecPlaceholder(scene: Scene): string {
  if (scene === "home") return "例如：1.5m / 白色";
  if (scene === "pc-build") return "例如：6核12线程 / 4.7GHz";
  return "例如：规格参数";
}