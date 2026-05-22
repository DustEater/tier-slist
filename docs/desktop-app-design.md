# tier-slist 桌面版设计文档

## 1. 概述

### 1.1 目标

将 tier-slist（基于 Express + React + TypeScript + Vite + WebSocket 的 Web 应用）打包为 Windows 桌面应用程序。用户无需安装 Node.js 或其他运行时，只需双击一个 EXE 文件即可打开软件界面，所有依赖库内置于软件包中。

### 1.2 现状分析

当前项目架构：

```
用户浏览器  ──HTTP/WS──>  Express 后端 (动态端口)
                              │
                              └── 数据持久化 userData/data/products.json
```

- 前端：React SPA，由 Vite build 产物提供，使用 HashRouter 管理路由
- 后端：Express + WebSocket 服务，提供 REST API 和实时同步，动态端口分配
- 启动方式：双击 exe 自启动，无需任何手动操作
- 数据存储：`%APPDATA%/tier-slist/data/products.json`（生产环境）
- 当前交付方式：zip 包解压后运行 `产品挑选列表.exe`

### 1.3 目标形态

```
┌─────────────────────────────────────────┐
│        Electron 主进程                  │
│  ┌──────────────────────────────────┐   │
│  │  Express 后端 (Node.js)          │   │
│  │  localhost:动态端口 (如 53121)   │   │
│  └──────────┬───────────────────────┘   │
│             │ HTTP/WS                   │
│  ┌──────────▼───────────────────────┐   │
│  │  Electron 渲染进程               │   │
│  │  (Chromium 加载 React SPA)       │   │
│  │  HashRouter (#/ 路由)            │   │
│  └───────────────────────────────────── │
│  ┌──────────────────────────────────┐   │
│  │  数据层: %APPDATA%/tier-slist   │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

- **单进程运行**：Express 后端作为 Electron 主进程的一部分运行，不需要单独启动
- **内嵌浏览器**：使用 Chromium（Electron 内嵌）渲染 React 前端
- **自包含原生窗口**：提供原生窗口（标题栏、最小化、最大化、关闭）
- **一键启动**：双击 EXE 即可，无需额外安装任何东西

---

## 2. 技术选型

### 2.1 框架选择：Electron

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **Electron** | 生态成熟；与现有 Node.js 后端完美兼容；打包工具完善（electron-builder） | 安装包较大 (~120-150MB) | ⭐⭐⭐⭐⭐ |
| Tauri | 安装包小 (~5MB)；性能更好 | 需用 Rust 重写后端；现有 Express 代码无法直接复用 | ⭐⭐ |
| Node.js + WebView2 | 安装包较小 | WebView2 需系统支持(Windows10+自带)；无成熟的打包方案 | ⭐⭐ |

**推荐理由**：当前项目已使用 Node.js + Express 作为后端，Electron 天然支持在**主进程中运行 Node.js 代码**，无需改动后端逻辑。React 前端构建后可直接由 Electron 加载。生态成熟、易于打包分发。

### 2.2 关键依赖

| 依赖 | 用途 | 备注 |
|------|------|------|
| `electron` | 桌面运行时框架 | 主依赖 |
| `electron-builder` | 打包为 Windows zip/安装程序 | 开发依赖 |
| `concurrently` | 开发时同时启动 Electron 和 Vite | 开发依赖 |

现有依赖（`express`, `react`, `react-dom`, `ws`, `cors`, `vite`, `typescript` 等）保持不变。

---

## 3. 架构设计

### 3.1 进程模型

```
Electron 主进程 (main process)
├── Express 服务 (http://localhost:动态端口 0)
│   ├── REST API (/api/products)
│   ├── WebSocket 实时同步
│   └── 端口通过 URL query (?port=xxx) 传递给渲染进程
├── 窗口管理 (BrowserWindow)
│   ├── 开发模式: 加载 Vite dev server (http://localhost:5173)
│   └── 生产模式: 加载 dist/index.html?port=xxx (file:// 协议)
├── 生命周期管理
│   ├── 启动时启动 Express (await createServer)
│   ├── 启动时移除默认菜单栏 (Menu.setApplicationMenu(null))
│   └── 窗口关闭时退出进程
└── IPC
    ├── 文件对话框（保存/导出）
    ├── 获取服务端口 (get-server-port)
    └── 获取应用版本 (get-app-version)
```

**主进程职责**：
1. 创建 Express HTTP + WebSocket 服务（动态端口，`port: 0`）
2. 创建 BrowserWindow，加载 React 前端
3. 管理应用生命周期（启动、退出）
4. 通过 IPC 提供原生对话框功能（如文件选择器）
5. 移除默认菜单栏（File / Edit / View 等）

**渲染进程职责**：
1. 渲染 React UI（HashRouter 路由）
2. 通过 URL query + IPC 获取后端端口
3. 通过 HTTP/WebSocket 与后端通信
4. 用户交互处理

### 3.2 数据流

```
用户在界面操作
    │
    ▼
React 组件 → ProductsContext (WebSocket 实时同步) → Express 后端
                                                         │
                                                         ▼
                                                   内存中 products[]
                                                         │
                                                         ▼
                                              %APPDATA%/tier-slist/data/products.json (持久化)
```

数据流**完全保持现有设计不变**，仅将原来需要用户打开浏览器访问改为内嵌窗口显示。

### 3.3 文件结构变更

新增文件：
```
├── electron/
│   ├── main.ts                 # Electron 主进程入口
│   └── preload.ts              # 预加载脚本（暴露安全 API 给渲染进程）
├── tsconfig.electron.json      # Electron TypeScript 编译配置（ESM）
├── tsconfig.preload.json       # 预加载 TypeScript 编译配置（CommonJS）
├── electron-builder.yml        # 打包配置
├── scripts/
│   └── afterPack.cjs           # 打包后处理（裁剪 locale 文件）
├── build-portable.sh           # 一键打包脚本（含镜像配置）
├── .npmrc                      # Electron 二进制镜像源（中国加速）
└── docs/
    └── desktop-app-design.md   # 本文档
```

修改：
```
├── package.json                # 新增 electron 构建/打包脚本
├── vite.config.ts              # base: "./" 确保 asar 中资源路径正确
├── tsconfig.json               # 前端 TypeScript 配置
└── .gitignore                  # 增加 release/ electron-dist/ 等
```

---

## 4. 核心实现方案

### 4.1 Electron 主进程 (`electron/main.ts`)

主要逻辑：

1. **启动流程**：
   - 异步创建 Express 服务（`await createServer({ port: 0 })`，复用 `server/index.ts`）
   - 获取实际分配的端口（`port: 0` 让 OS 分配）
   - 移除默认菜单栏（`Menu.setApplicationMenu(null)`）
   - 创建 BrowserWindow，加载 React 前端
   - 生产模式通过 URL query 传递端口：`loadFile(distPath, { query: { port: String(serverPort) } })`
   - 开发模式加载 Vite dev server URL 并打开 DevTools

2. **窗口配置**：
   - 默认尺寸：1280×800（含最小尺寸 960×600）
   - 标题：产品挑选列表
   - `preload: path.join(__dirname, "preload.cjs")`（CommonJS 格式）
   - `contextIsolation: true`, `nodeIntegration: false`

3. **退出流程**：
   - `before-quit` 事件关闭 Express 服务
   - `window-all-closed` 事件退出应用（macOS 除外）

### 4.2 预加载脚本 (`electron/preload.ts`)

通过 `contextBridge` 安全暴露少量 API：

```typescript
contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.sendSync("get-app-version"),
  getServerPort: () => ipcRenderer.sendSync("get-server-port"),
  saveDialog: (options) => ipcRenderer.invoke("save-dialog", options),
  openDialog: (options) => ipcRenderer.invoke("open-dialog", options),
});
```

**注意事项**：preload 脚本必须编译为 CommonJS 格式（`.cjs` 文件），因为 Electron 的 preload 沙箱环境不支持 ESM。通过单独的 `tsconfig.preload.json`（`module: "commonjs"`）编译，并重命名为 `.cjs`。

### 4.3 前后端通信

**端口发现机制**（按优先级）：

| 方式 | 适用场景 | 说明 |
|------|---------|------|
| URL query 参数 | 生产环境 | `loadFile` 时传入 `?port=53121` |
| IPC `get-server-port` | 生产环境（fallback） | 通过 `preload.cjs` 暴露 |
| 默认值 | 开发/纯 Web | `localhost:3001` |

前端代码读取端口：

```typescript
function getServerPort(): number {
  const urlParams = new URLSearchParams(window.location.search);
  const portParam = urlParams.get("port");
  if (portParam) {
    const port = parseInt(portParam, 10);
    if (port > 0 && port < 65536) return port;
  }
  if (window.electronAPI) {
    return window.electronAPI.getServerPort();
  }
  return 3001;
}
```

**路由方案**：使用 `HashRouter`（`react-router-dom`）而非 `BrowserRouter`。原因是 Electron `loadFile()` 使用 `file://` 协议，`BrowserRouter` 读取 `window.location.pathname` 得到的是完整文件路径（如 `/C:/Users/.../index.html`）而非 `/`，导致路由匹配失败。`HashRouter` 使用 `#/` 管理路由，在 `file://` 协议下稳定工作。

### 4.4 数据存储

数据存储路径区分开发和生产环境：

| 环境 | 路径 |
|------|------|
| 开发环境 | `./data/products.json`（项目目录下） |
| 生产环境 | `app.getPath('userData')/data/products.json`（如 `%APPDATA%/tier-slist/data/products.json`） |

通过 `app.isPackaged` 判断当前环境，由 main 进程在启动 Express 服务时传入 `cacheFile` 路径。

### 4.5 代码分割与懒加载

为提升首屏加载速度，三个页面组件使用 `React.lazy()` 动态导入：

```typescript
const ProductList = lazy(() =>
  import("../pages/ProductList").then((m) => ({ default: m.ProductList }))
);
const AddProduct = lazy(() =>
  import("../pages/AddProduct").then((m) => ({ default: m.AddProduct }))
);
const EditProduct = lazy(() =>
  import("../pages/EditProduct").then((m) => ({ default: m.EditProduct }))
);
```

Vite 自动将每个页面拆分为独立 chunk。`Suspense` 包裹在 `Routes` 外层，懒加载过程中显示 `LoadingScreen` 进度条组件。

---

## 5. 构建与打包

### 5.1 构建流程

```
源码
├── npm run build              # tsc -b && vite build 构建 React → dist/
├── npm run build:electron     # 编译主进程 + 预加载脚本 → electron-dist/
│   ├── tsc -p tsconfig.electron.json   # 主进程 + 服务端 → ESM
│   ├── tsc -p tsconfig.preload.json    # 预加载脚本 → CommonJS
│   └── mv ...preload.js ...preload.cjs  # 重命名为 .cjs
└── npx electron-builder --win  # 打包 → release/xxx-win.zip
```

### 5.2 electron-builder 打包配置 (`electron-builder.yml`)

```yaml
appId: com.tier-slist.app
productName: 产品挑选列表
directories:
  output: release
files:
  - dist/**/*
  - electron-dist/**/*
  - server/**/*
  - package.json
  - "!node_modules/**/test/**"    # 排除测试文件
  - "!node_modules/**/docs/**"   # 排除文档
  - "!node_modules/**/*.md"      # 排除 markdown
  - "!node_modules/**/*.map"     # 排除 sourcemap
asar:
  smartUnpack: true               # 智能解压优化性能
removePackageScripts: true        # 移除 package.json 中的脚本
removePackageKeywords: true       # 移除关键词
afterPack: ./scripts/afterPack.cjs # 打包后裁剪 locale 文件
win:
  target:
    - target: zip                 # 仅 zip 格式（Linux 交叉编译不生成 exe）
  icon: build/icon.png
  signAndEditExecutable: false    # 不签名（Linux 交叉编译需要）
```

### 5.3 afterPack 脚本 (`scripts/afterPack.cjs`)

打包后自动删除 Electron 运行时中 53 个不必要的语言文件，仅保留 `zh-CN.pak` 和 `en-US.pak`，节省约 46MB 空间。

### 5.4 输出产物

| 类型 | 文件 | 说明 |
|------|------|------|
| Zip 包 | `产品挑选列表-0.0.0-win.zip` | 解压后运行目录下的 exe |
| 解压目录 | `产品挑选列表-0.0.0-win/` | 含 `产品挑选列表.exe` + 运行时 + asar |

**当前仅支持 zip 格式**（通过 `electron-builder --win` 从 Linux 交叉编译）。NSIS 安装版在 Linux 上使用 wine 生成时存在兼容性问题，暂不启用。

### 5.5 体积分析（优化后）

| 组件 | 体积 | 说明 |
|------|------|------|
| `产品挑选列表.exe` (Electron 二进制) | ~217MB | Chromium + Node.js 运行时 |
| `locales/` (语言文件) | **1.2MB** (原 48MB) | 仅保留 zh-CN + en-US |
| `app.asar` (应用代码) | ~1.8MB | 含 Express 后端 + React 前端 + node_modules |
| 其他 DLL / pak | ~70MB | 图形/音频/视频等运行时库 |
| **解压后合计** | **~350MB** | Electron 应用正常体积 |
| **Zip 包** | **~123MB** | 压缩后便于分发 |

---

## 6. 开发阶段配置

### 6.1 package.json 脚本

```json
{
  "scripts": {
    "dev": "concurrently --kill-others --names server,client --prefix-colors cyan,green \"npm run server\" \"vite\"",
    "dev:electron": "concurrently --kill-others --names server,client,electron --prefix-colors cyan,green,magenta \"npm run server\" \"vite\" \"electron . --no-sandbox\"",
    "build": "tsc -b && vite build",
    "build:electron": "tsc -p tsconfig.electron.json && tsc -p tsconfig.preload.json && mv electron-dist/electron/preload.js electron-dist/electron/preload.cjs",
    "package": "npm run build && npm run build:electron && electron-builder",
    "package:portable": "npm run build && npm run build:electron && electron-builder --win portable",
    "package:installer": "npm run build && npm run build:electron && electron-builder --win nsis"
  }
}
```

### 6.2 开发模式

开发调试流程：
1. `npm run dev:electron`
2. Vite dev server 启动 (端口 5173) + Express 后端启动
3. Electron 窗口打开，加载 `http://localhost:5173`
4. 代码热更新正常工作（HMR）

### 6.3 TypeScript 编译配置

| 配置文件 | 作用 | module | 输出 |
|---------|------|--------|------|
| `tsconfig.json` | 前端 React 代码 | es2022 | 由 Vite 处理 |
| `tsconfig.electron.json` | 主进程 + 服务端 | es2022 | ESM `.js` |
| `tsconfig.preload.json` | 预加载脚本 | commonjs | CJS `.cjs` |

### 6.4 依赖类型

| 依赖 | 环境 | 说明 |
|------|------|------|
| `electron` | devDependencies | 开发时调试用 |
| `electron-builder` | devDependencies | 打包用 |
| 其他现有依赖 | dependencies | 全部保持，生产环境需要 |

---

## 7. 与现有代码的兼容性

### 7.1 无需修改的代码

| 模块 | 说明 |
|------|------|
| `src/domain/` | 领域模型不变 |
| `src/lib/` | 工具函数不变 |
| `src/components/forms/TierFieldsSection.tsx` | 表单组件不变 |
| `src/components/catalog/DataBackupBar.tsx` | 数据备份栏不变 |

### 7.2 已适配的代码

| 文件 | 改动内容 |
|------|---------|
| `server/index.ts` | `createServer()` 改为 `async` 返回 `Promise<{server, port}>`，支持 `port: 0` 动态分配 |
| `src/persistence/productsStorage.ts` | `getServerPort()` 优先从 URL query 读取，其次 IPC fallback |
| `src/app/App.tsx` | `BrowserRouter` → `HashRouter`；`ProductList/AddProduct/EditProduct` 改为 `React.lazy()` 懒加载 |
| `src/context/ProductsContext.tsx` | "加载中..." 文字替换为 `LoadingScreen` 进度条组件 |
| `src/styles/index.css` | 新增 `loading-screen` / `loading-bar-*` 进度条样式；移除 `page-lazy-loading` 旧样式 |

### 7.3 新增的文件

| 文件 | 说明 |
|------|------|
| `electron/main.ts` | Electron 主进程 |
| `electron/preload.ts` | 预加载脚本 |
| `tsconfig.electron.json` | 主进程 + 服务端的 TypeScript 编译配置 |
| `tsconfig.preload.json` | 预加载脚本的 CJS 编译配置 |
| `electron-builder.yml` | 打包配置 |
| `scripts/afterPack.cjs` | 打包后 locale 裁剪脚本 |
| `build-portable.sh` | 一键打包脚本 |
| `.npmrc` | npm 镜像配置（中国加速） |
| `src/components/LoadingScreen.tsx` | 居中进度条加载组件 |

---

## 8. 安装包设计

### 8.1 当前形态：Zip 包（推荐）

- `产品挑选列表-0.0.0-win.zip`，约 123MB
- 解压后得到 `产品挑选列表-0.0.0-win/` 目录
- 双击目录中的 `产品挑选列表.exe` 运行
- 不写注册表，不依赖系统环境
- 数据保存在 `%APPDATA%/tier-slist/data/products.json`
- 适合：U 盘分发、临时使用、无需管理员权限

### 8.2 解压目录结构

```
产品挑选列表-0.0.0-win/
├── 产品挑选列表.exe          # Electron 可执行文件 (~217MB)
├── resources/
│   ├── app.asar             # 应用代码包 (~1.8MB)
│   └── ...
├── locales/
│   ├── zh-CN.pak            # 中文语言包
│   └── en-US.pak            # 英文语言包
├── *.dll                    # 运行时库
└── *.pak                    # Chromium 资源包
```

### 8.3 安装版（未来可选项）

- `产品挑选列表-Setup-0.0.0.exe`，安装向导
- 需要 Windows 环境构建（当前 Linux 交叉编译不支持 NSIS）
- 安装到 `%LOCALAPPDATA%/Programs/tier-slist/`
- 创建开始菜单快捷方式
- 适合：正式交付给最终用户

### 8.4 自动更新（未来可选项）

- 集成 `electron-updater`
- 启动时检查 GitHub Releases 或自有更新服务器
- 下载更新包并自动安装

---

## 9. 用户体验

### 9.1 启动流程

1. 用户双击 exe
2. Electron 运行时初始化（~1-2 秒）
3. Express 后端启动（`loadFile` 加载 HTML 前），分配动态端口
4. BrowserWindow 创建，显示居中进度条 + "加载中..."
5. React 挂载，通过 URL query 获取端口
6. WebSocket 连接成功，进度条消失，主界面渲染
7. 数据加载完成后显示产品列表

### 9.2 窗口行为

- **菜单栏**：已移除，`Menu.setApplicationMenu(null)` 生效，无 File / Edit / View 等菜单
- **关闭按钮**：直接退出进程（服务端代码在 `before-quit` 中关闭）
- **多显示器 DPI 适配**：Electron 默认支持高 DPI 缩放
- **窗口尺寸**：1280×800 默认，最小 960×600

### 9.3 文件关联（未来可选项）

- 双击 `.tier-slist-backup.json` 文件自动导入到应用中
- 注册文件类型关联

---

## 10. 实施路线图

| 阶段 | 任务 | 状态 |
|------|------|------|
| **Phase 1: 基础整合** | 创建 `electron/main.ts`，加载 Express 后端并创建窗口 | ✅ 已完成 |
| | 配置开发模式（Vite HMR + Electron 热重载） | ✅ 已完成 |
| | 适配数据存储路径（开发/生产环境判断） | ✅ 已完成 |
| **Phase 2: 打包** | 配置 electron-builder | ✅ 已完成 |
| | 生成应用图标（png 格式） | ✅ 已完成 |
| | 首轮打包测试 | ✅ 已完成 |
| | 体积优化（locale 裁剪、代码分割、依赖过滤） | ✅ 已完成 |
| **Phase 3: 完善** | 动态端口分配 + URL query 传递 | ✅ 已完成 |
| | Preload 脚本 CJS 编译 | ✅ 已完成 |
| | HashRouter 适配 file:// 协议 | ✅ 已完成 |
| | 移除默认菜单栏 | ✅ 已完成 |
| | 加载进度条动画 | ✅ 已完成 |
| | 单实例锁、窗口尺寸记忆 | ⏳ 待完成 |
| | 安装版测试（Windows 10/11） | ⏳ 待完成 |
| **Phase 4: 发布** | 编写 Windows 用户使用说明 | ⏳ 待完成 |
| | 整体回归测试 | ⏳ 待完成 |

---

## 11. 注意事项与风险

### 11.1 已知风险

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| 安装包体积大 (~350MB 解压 / 123MB zip) | 下载/传输成本高 | 告知用户此为正常体积；后续可考虑 Tauri 迁移 |
| 杀毒软件误报 | 首次运行可能被拦截 | 申请代码签名证书（DigiCert/Sectigo） |
| Windows 7 不支持 | 部分用户无法使用 | 最低支持 Windows 10（Electron 35+ 已放弃 Win7） |
| Linux 交叉编译限制 | NSIS 安装包不可用 | 当前仅生成 zip 包；正式发布用 CI/CD Windows runner |
| `ANOMALY: meaningless REX prefix used` 警告 | 无害 | Chromium JIT 编译器警告，不影响功能 |
| 预加载脚本格式 | 若编译为 ESM 则白屏 | 必须用 `module: "commonjs"` 编译为 `.cjs` |

### 11.2 代码签名（推荐）

- 购买代码签名证书（约 ¥2000-3000/年）
- 对 exe 进行数字签名
- 消除 SmartScreen 拦截提示
- 提升用户信任度

### 11.3 数据安全

- 数据文件 `products.json` 不加密
- 如未来需要多用户数据隔离，可考虑 SQLite 替代 JSON 文件
- 考虑添加自动备份机制（每小时或每次修改后备份历史版本）

---

## 12. Linux 开发环境下的 Windows 打包方案

### 12.1 总体结论

**在 Linux 上开发 Windows 桌面版是完全可行的**，不会对开发效率和代码质量产生影响。Electron 本身是跨平台的，开发阶段在 Linux 下运行和调试 Electron 应用没有障碍。主要区别在于**最终打包环节**需要额外处理。

### 12.2 各阶段影响分析

| 阶段 | 影响 | 说明 |
|------|------|------|
| **代码开发** | ✅ 无影响 | 代码编辑、TypeScript 编译、React HMR 等全部正常 |
| **Electron 开发调试** | ✅ 可正常进行 | Electron 在 Linux 下可直接运行 |
| **Express 后端调试** | ✅ 无影响 | 后端代码完全在 Node.js 层 |
| **UI 测试** | ✅ 可进行 | 除 Windows 特有行为外，核心功能可充分测试 |
| **打包 zip** | ✅ 正常 | `electron-builder --win` 可正常输出 zip |
| **打包 NSIS 安装程序** | ⚠️ 不可用 | wine 下 NSIS 生成兼容性问题，建议 CI/CD |

### 12.3 打包方案对比

#### 方案 A：Linux 本地打包（当前方案，推荐开发阶段使用）

使用 `electron-builder` 配合 wine 生成 Windows zip 包。通过 `build-portable.sh` 脚本一键完成。

**步骤**：
```bash
# 使用一键脚本（含镜像配置）
bash build-portable.sh
```

**配置**：通过 `.npmrc` 和 `ELECTRON_BUILDER_BINARIES_MIRROR` 环境变量使用 `npmmirror.com` 镜像加速下载。

**优缺点**：
- ✅ 直接在 Linux 下完成，无需切换环境
- ✅ zip 包可正常生成并分发
- ⚠️ 仅支持 zip 格式，不支持 NSIS 安装版
- ⚠️ 生成的 exe 需传到 Windows 机器验证

#### 方案 B：CI/CD 自动打包（推荐正式发布使用）

利用 GitHub Actions / GitLab CI 的 Windows runner 来自动化打包。

**GitHub Actions 示例配置**：
```yaml
name: Build Windows Release
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - run: npm run build:electron
      - run: npx electron-builder --win
      - uses: actions/upload-artifact@v4
        with:
          name: tier-slist-release
          path: release/*.zip
```

**优缺点**：
- ✅ 在真实 Windows 环境打包，兼容性最好
- ✅ 支持 NSIS 安装版、代码签名
- ✅ 可自动发布到 GitHub Releases
- ⚠️ 需要配置 CI 流程

#### 方案 C：Windows 虚拟机（推荐最终验收使用）

在 Linux 上运行 Windows 虚拟机（VirtualBox / VMware），在虚拟机内进行打包验证。

**优缺点**：
- ✅ 完整的 Windows 环境，可进行全流程验证
- ✅ 可运行生成的 exe 进行测试
- ⚠️ 需要 Windows 授权
- ⚠️ 资源占用较大

### 12.4 推荐工作流

```
日常开发（Linux）
  │
  ├── 代码编写（VS Code）
  ├── npm run dev:electron → 在 Linux 下调试 Electron 窗口
  ├── npm run build → 确认构建成功
  │
  ├── 本地快速打包验证
  │   └── bash build-portable.sh
  │       └── scp 到 Windows 机器测试
  │
  └── 正式发布
      └── 推送 tag → GitHub Actions 自动打包
          ├── 产出 zip 包
          └── 产出 NSIS 安装包
```

### 12.5 注意事项

- **Wine 版本**：Ubuntu 22.04+ 建议安装 `winehq-stable`
- **文件路径**：代码中不要写死 Windows 反斜杠路径，始终使用 `path.join()` 或 `path.posix`
- **镜像配置**：`.npmrc` 中设置 `electron_mirror` 和 `electron_builder_binaries_mirror` 指向 `npmmirror.com`
- **沙箱**：Linux 下运行时需 `--no-sandbox` 参数；打包后 Windows 无此问题

---

## 13. 附录

### 13.1 参考文档

- [Electron 官方文档](https://www.electronjs.org/docs/latest/)
- [electron-builder 文档](https://www.electron.build/)
- [electron-builder Windows 配置](https://www.electron.build/configuration/configuration#WindowsConfiguration)
- [electron-builder 在 Linux 上构建 Windows 应用](https://www.electron.build/multi-platform-build)
- [Wine 安装指南](https://wiki.winehq.org/Ubuntu)

### 13.2 对比方案：Tauri（未来可能迁移路径）

如果未来需要减小安装包体积，可考虑迁移到 Tauri 的关键差异：
- 后端需从 Node.js/Express 改为 Rust
- 数据持久化需改用 Rust 实现
- WebSocket 功能需用 Rust 的 `tokio-tungstenite` 重写
- 迁移成本较高，建议当前版本用 Electron 快速交付