# tier-slist — 产品挑选列表

基于 **Express 后端 + Vite + React + TypeScript + React Router + WebSocket 实时同步** 的应用，在 **Windows、macOS、Linux** 上均可运行；本仓库日常在 **Linux** 开发与调试，**Windows** 侧文档按「给最终用户使用」编写。

## 功能说明

- **区域分类**：首页按「区域」分块展示；添加时可选择客厅/卧室等或自定义区域。
- **品类与商品**：每条记录有一个 **品类名**（如鼠标）；经济 / 中 / 高三档各自可填 **商品名**、价格、链接（可选）；**至少完整填写一档即可**，其余整档留空。
- **首页**：全宽排版，按区域分块，卡片网格对比三档。
- **选用档位**：列表中用下拉框选择当前方案采用的档位；**合计金额按该档位的「价格」**累加；有商品时列表底部展示合计，**文案与金额靠左对齐**。
- **链接**：按档位填写；某档无链接时列表该格显示灰色「无链接」。
- **编辑 / 删除**：列表卡片上「编辑」进入 `/edit/:id`；「删除」移除该条，通过 API 同步到后端。
- **多人协作**：通过 WebSocket 实时同步，多人编辑时数据会及时更新。
- **备份与迁移**：列表页「数据备份」区可 **导出 JSON**；**导入 JSON** 按 **`id` 合并**（同 id 以文件为准覆盖、文件中的新 id 追加、仅本地有的 id 保留）。选择文件并校验通过后需 **确认**，确认框中会提示预计覆盖/新增/保留条数，便于多人分文件维护后再合并。

## 架构说明

- **后端**（`server/index.ts`）：Express + WebSocket，提供 REST API，数据自动保存到 `data/products.json`
- **前端**：React 应用，通过 API 与 WebSocket 与后端交互
- **实时同步**：数据变更通过 WebSocket 广播给所有连接的客户端

## 源代码结构

| 路径 | 说明 |
|------|------|
| `server/index.ts` | 后端服务器：API、WebSocket、缓存管理 |
| `src/app/App.tsx` | 路由与根布局 |
| `src/pages/` | 页面：列表、添加、编辑 |
| `src/components/catalog/` | 首页产品卡片、`DataBackupBar`（导出/导入 JSON） |
| `src/components/forms/` | 表单区块（三档输入） |
| `src/context/ProductsContext.tsx` | 全局状态与 WebSocket 同步 |
| `src/domain/` | 领域模型（`product.ts`）、按 id 合并（`mergeProductsById.ts`）、表单解析（`productForm.ts`） |
| `src/persistence/productsStorage.ts` | 读写 API、WebSocket 连接 |
| `src/catalog/groupByArea.ts` | 按区域分组排序 |
| `src/lib/formatMoney.ts` | 金额格式化 |
| `src/lib/backupFilename.ts` | 导出备份默认文件名 |
| `src/styles/index.css` | 全局样式 |
| `data/products.json` | 数据缓存文件（自动创建） |

## 环境要求

- **Node.js**：建议 **20.x LTS** 或 **18.x LTS**（[官网下载](https://nodejs.org/)）
- 包管理器：随 Node 安装的 **npm** 即可（也可用 pnpm / yarn，需自行替换命令）

## 运行项目（开发 / 使用）

### 1. 安装依赖

首次或 `package.json` 变更后执行：

```bash
npm install
```

### 2. 启动后端

在终端执行：

```bash
npm run server
```

后端默认监听 `http://0.0.0.0:3001`。

### 3. 启动前端

新开一个终端窗口执行：

```bash
npm run dev
```

前端默认监听 `http://0.0.0.0:5173`，局域网内其他设备也可以通过你的 IP 访问。

### 生产构建（可选）

```bash
npm run build
npm run preview
```

## 在 Windows 上运行（交付给最终用户）

面向只需打开网页、不改代码的使用者，步骤尽量短。

1. 将项目文件夹放到任意位置（例如 `D:\work\tier-slist`）。
2. 若本机尚未安装 Node.js，请从 [nodejs.org](https://nodejs.org/) 安装 **LTS**，安装时勾选将 Node 加入 **PATH**，装好后**新开**一个终端窗口。
3. 在 **PowerShell** / **cmd** / **Windows Terminal** 中进入项目目录后执行 `npm install`，安装依赖。
4. 启动后端：执行 `npm run server`
5. 新开终端，启动前端：执行 `npm run dev`
6. 终端里出现地址后（一般为 `http://0.0.0.0:5173`），用 **Edge** 或 **Chrome** 打开即可。

## 其他命令

| 命令            | 说明                 |
|-----------------|----------------------|
| `npm run dev`   | 前端开发模式，热更新 |
| `npm run server` | 启动后端服务        |
| `npm run build` | 生产构建，输出到 `dist` |
| `npm run preview` | 本地预览构建结果   |

## 常见问题

- **端口被占用**：
  - 前端：改用其他端口，例如 `npm run dev -- --port 5174`
  - 后端：修改 `server/index.ts` 中的 `PORT` 常量
- **`npm install` 很慢或失败**：可配置 npm 镜像或代理（与本仓库无关，按环境规范处理）。
- **提示找不到 `npm`**：未安装 Node 或未加入 PATH；重新安装 Node 并勾选 “Add to PATH”，或关闭终端后重新打开。

## 数据存储

产品列表保存在后端的 **`data/products.json`** 文件中，程序退出时会自动保存。

**导出**：在列表页「数据备份」中点击「导出 JSON」，得到 `tier-slist-backup-YYYY-MM-DD.json`。文件内容为 **JSON 数组**，元素为产品对象（含 `id`、区域、品类、三档 `economy` / `mid` / `high`、`selectedTier` 等）。空列表时也可导出，文件为 `[]`。

**导入**：选择上述格式的 JSON 文件。解析失败或任一条记录无法识别时 **不会修改** 数据，并显示错误说明。校验通过后需 **确认** 再写入，规则如下。

| 情况 | 行为 |
|------|------|
| 文件中的 `id` 与现有某条相同 | 以文件中的整条记录 **覆盖** 该条 |
| 文件中的 `id` 不存在 | **追加** 为新记录 |
| 现有、文件中未出现的 `id` | **保留** 不变 |
| 文件中同一 `id` 出现多次 | **以后出现的为准** |

若需要列表与文件 **完全一致**，可先清空现有数据（例如导出备份后，在界面中删除全部产品）再导入同一份文件。请勿手动篡改 JSON 结构。
