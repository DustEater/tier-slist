# tier-slist — 产品挑选列表

基于 **Node.js + Vite + React** 的静态前端工程，在 **Windows、macOS、Linux** 上均可运行；本仓库日常在 **Linux** 上开发与调试，**Windows** 侧按「给最终用户使用」的方式说明。

## 功能说明

- **区域分类**：首页按「区域」分块展示；添加时可选择客厅/卧室等或自定义区域。
- **品类与商品**：每条记录有一个 **品类名**（如鼠标）；经济 / 中 / 高三档各自可填 **商品名**、价格、链接（可选）；**至少完整填写一档即可**，其余整档留空。
- **首页**：全宽排版，按区域分块，卡片网格对比三档。
- **选用档位**：列表中用下拉框选择当前方案采用的档位；**合计金额按该档位的「价格」**累加。
- **链接**：按档位填写；某档无链接时列表该格显示灰色「无链接」。
- **编辑**：列表每行「编辑」进入 `/edit/:id`，保存后写回 localStorage。
- **备份与迁移**：列表页「数据备份」区可 **导出 JSON**（与 localStorage 内结构一致，空列表导出为 `[]`）；**导入 JSON** 按 **`id` 合并**（文件中同 id 覆盖本地、新 id 追加、仅本地有的 id 保留；确认后写入），便于多人分文件维护后再合并。

## 源代码结构（`src/`）

| 路径 | 说明 |
|------|------|
| `app/App.tsx` | 路由与根布局 |
| `pages/` | 页面：列表、添加、编辑 |
| `components/catalog/` | 首页产品卡片、`DataBackupBar`（导出/导入 JSON） |
| `components/forms/` | 表单区块（三档输入） |
| `context/ProductsContext.tsx` | 全局状态与 localStorage 同步 |
| `domain/` | 领域模型（`product.ts`）、按 id 合并（`mergeProductsById.ts`）、表单解析（`productForm.ts`） |
| `persistence/productsStorage.ts` | 读写 localStorage、旧数据迁移 |
| `catalog/groupByArea.ts` | 按区域分组排序 |
| `lib/formatMoney.ts` | 金额格式化 |
| `lib/backupFilename.ts` | 导出备份默认文件名 |
| `styles/index.css` | 全局样式 |

## 环境要求

- **Node.js**：建议 **20.x LTS** 或 **18.x LTS**（[官网下载](https://nodejs.org/)）
- 包管理器：随 Node 安装的 **npm** 即可（也可用 pnpm / yarn，需自行替换命令）

## 在 Linux 上运行（开发 / 调试）

1. 将本仓库放到任意目录，在终端进入该目录，例如：

   ```bash
   cd /path/to/tier-slist
   ```

2. 安装依赖（首次或 `package.json` 变更后）：

   ```bash
   npm install
   ```

3. 启动开发服务器：

   ```bash
   npm run dev
   ```

4. 终端会打印本地地址（一般为 `http://127.0.0.1:5173`），用浏览器打开即可。

生产构建与本地预览构建结果：

```bash
npm run build
npm run preview
```

## 在 Windows 上运行（交付给最终用户）

面向只需打开网页、不改代码的使用者，步骤尽量短。

1. 将项目文件夹放到任意位置（例如 `D:\work\tier-slist`）。
2. 若本机尚未安装 Node.js，请从 [nodejs.org](https://nodejs.org/) 安装 **LTS**，安装时勾选将 Node 加入 **PATH**，装好后**新开**一个终端窗口。
3. 安装依赖并启动（二选一）：
   - **推荐**：双击项目根目录下的 **`dev.bat`**（首次会自动执行 `npm install`，随后启动开发服务器）。
   - 或在 **PowerShell** / **cmd** / **Windows Terminal** 中进入项目目录后执行 `npm install`，再执行 `npm run dev`。
4. 终端里出现本地地址后（一般为 `http://127.0.0.1:5173`），用 **Edge** 或 **Chrome** 打开即可。

## 其他命令

| 命令            | 说明                 |
|-----------------|----------------------|
| `npm run dev`   | 开发模式，热更新     |
| `npm run build` | 生产构建，输出到 `dist` |
| `npm run preview` | 本地预览构建结果   |

## 常见问题

### Linux（开发环境）

- **端口被占用**：改用其他端口，例如 `npm run dev -- --port 5174`。
- **`npm install` 很慢或失败**：可配置 npm 镜像或代理（与本仓库无关，按环境规范处理）。

### Windows（用户使用）

- **提示找不到 `npm`**：未安装 Node 或未加入 PATH；重新安装 Node 并勾选 “Add to PATH”，或关闭终端后重新打开。
- **端口被占用**：在项目目录打开终端，执行 `npm run dev -- --port 5174`（`dev.bat` 内部也是调用 `npm run dev`，换端口请用命令行并加上 `--port`）。
- **`npm install` 很慢或失败**：可配置 npm 镜像或代理（按网络环境处理）。

## 数据存储

产品列表保存在浏览器 **localStorage** 中（键名由 `src/persistence/productsStorage.ts` 定义），与操作系统无关。

**导出**：在列表页「数据备份」中点击「导出 JSON」，得到 `tier-slist-backup-YYYY-MM-DD.json`，内容为 **JSON 数组**，元素为当前版本的产品对象（含 `id`、区域、品类、三档 `economy` / `mid` / `high`、`selectedTier` 等）。空列表时同样可导出，文件为 `[]`。

**导入**：选择上述格式的 JSON 文件；解析失败或任一条记录无法识别时 **不会修改** 本地数据，并显示错误说明。校验通过后需 **确认** 再写入：**按 `id` 合并**——对文件中每个 `id`，若本地已有则整条记录以导入为准覆盖，若无则追加；本地存在且文件中未出现的 `id` **保留不变**。同 `id` 在文件中重复出现时以后者为准。若需得到与文件完全一致的列表，可先清空本地数据（例如导出备份后删除全部产品）再导入。请勿手动篡改 JSON 结构；若文件含旧版扁平字段，加载逻辑会尽量迁移，但建议以本应用导出的文件为准。
