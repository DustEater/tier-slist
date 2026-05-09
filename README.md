# tire-slist — 产品挑选列表

基于 **Node.js + Vite + React** 的静态前端工程，在 **Windows、macOS、Linux** 上均可开发与运行（不依赖 Bash 或 Unix 专有命令）。

## 功能说明

- **区域分类**：首页按「区域」分块展示；添加时可选择客厅/卧室等或自定义区域。
- **品类与商品**：每条记录有一个 **品类名**（如鼠标）；经济 / 中 / 高三档各自可填 **商品名**、价格、链接（可选）；**至少完整填写一档即可**，其余整档留空。
- **首页**：全宽排版，按区域分块，卡片网格对比三档。
- **选用档位**：列表中用下拉框选择当前方案采用的档位；**合计金额按该档位的「价格」**累加。
- **链接**：按档位填写；某档无链接时列表该格显示「—」。
- **编辑**：列表每行「编辑」进入 `/edit/:id`，保存后写回 localStorage。

## 源代码结构（`src/`）

| 路径 | 说明 |
|------|------|
| `app/App.tsx` | 路由与根布局 |
| `pages/` | 页面：列表、添加、编辑 |
| `components/catalog/` | 首页产品卡片等展示组件 |
| `components/forms/` | 表单区块（三档输入） |
| `context/ProductsContext.tsx` | 全局状态与 localStorage 同步 |
| `domain/` | 领域模型（`product.ts`）与表单解析（`productForm.ts`） |
| `persistence/productsStorage.ts` | 读写 localStorage、旧数据迁移 |
| `catalog/groupByArea.ts` | 按区域分组排序 |
| `lib/formatMoney.ts` | 金额格式化 |
| `styles/index.css` | 全局样式 |

## 环境要求

- **Node.js**：建议 **20.x LTS** 或 **18.x LTS**（[Windows 安装包](https://nodejs.org/)）
- 包管理器：随 Node 安装的 **npm** 即可（也可用 pnpm / yarn，需自行替换命令）

安装完成后在 **PowerShell**、**命令提示符 (cmd)** 或 **Windows Terminal** 中执行下方命令即可。

## 在 Windows 上运行

1. 将本仓库放到任意目录，例如 `D:\work\web_pick`。
2. 打开终端，`cd` 到该目录：

   ```text
   cd /d D:\work\web_pick
   ```

3. 安装依赖（首次或 `package.json` 变更后）：

   ```text
   npm install
   ```

4. 启动开发服务器：

   - **方式 A**：双击项目根目录下的 **`dev.bat`**（首次会自动执行 `npm install`）。
   - **方式 B**：在终端执行 `npm run dev`。

5. 终端里会打印本地地址（一般为 `http://127.0.0.1:5173`），用 **Edge / Chrome** 打开即可。

## 其他命令

| 命令            | 说明                 |
|-----------------|----------------------|
| `npm run dev`   | 开发模式，热更新     |
| `npm run build` | 生产构建，输出到 `dist` |
| `npm run preview` | 本地预览构建结果   |

## 常见问题（Windows）

- **提示找不到 `npm`**：说明未安装 Node 或未加入 PATH，重新安装 Node 并勾选 “Add to PATH”，或重启终端。
- **公司网络下 `npm install` 很慢或失败**：可配置 npm 镜像或代理（与本仓库无关，按你司规范处理）。
- **端口被占用**：改用其他端口启动，例如 `npm run dev -- --port 5174`。

## 数据存储

产品列表保存在浏览器 **localStorage** 中，与操作系统无关；换电脑或换浏览器需自行迁移数据（当前版本未做导出/导入文件功能）。
