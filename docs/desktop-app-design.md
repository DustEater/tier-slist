# tier-slist 桌面版设计文档

## 1. 概述

### 1.1 目标

将 tier-slist（基于 Express + React + TypeScript + Vite + WebSocket 的 Web 应用）打包为 Windows 桌面应用程序。用户无需安装 Node.js 或其他运行时，只需双击一个 EXE 文件即可打开软件界面，所有依赖库内置于软件包中。

### 1.2 现状分析

当前项目架构：

```
用户浏览器  ──HTTP/WS──>  Express 后端 (端口 3001)
                              │
                              └── 数据持久化 data/products.json
```

- 前端：React SPA，由 Vite dev server 或 Vite build 产物提供
- 后端：Express + WebSocket 服务，提供 REST API 和实时同步
- 启动方式：`npm run dev`（concurrently 同时启动前后端），依赖 Node.js 运行时
- 数据存储：`data/products.json` 本地文件
- 当前交付方式：用户需自行安装 Node.js，克隆代码，执行 `npm install && npm run dev`

### 1.3 目标形态

```
┌─────────────────────────────────────┐
│        Electron 主进程              │
│  ┌──────────────────────────────┐   │
│  │  Express 后端 (Node.js)      │   │
│  │  localhost:3001              │   │
│  └──────────┬───────────────────┘   │
│             │ HTTP/WS               │
│  ┌──────────▼───────────────────┐   │
│  │  Electron 渲染进程           │   │
│  │  (Chromium 加载 React SPA)   │   │
│  └─────────────────────────────────   │
│  ┌──────────────────────────────┐   │
│  │  数据层: data/products.json  │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

- **单进程运行**：Express 后端作为 Electron 主进程的一部分运行，不需要单独启动
- **内嵌浏览器**：使用 Chromium（Electron 内嵌）渲染 React 前端
- **自包含**原生窗口**：提供原生窗口（标题栏、最小化、最大化、关闭）
- **一键启动**：双击 EXE 即可，无需额外安装任何东西

---

## 2. 技术选型

### 2.1 框架选择：Electron

| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **Electron** | 生态成熟；与现有 Node.js 后端完美兼容；打包工具完善（electron-builder） | 安装包较大 (~50-100MB) | ⭐⭐⭐⭐⭐ |
| Tauri | 安装包小 (~5MB)；性能更好 | 需用 Rust 重写后端；现有 Express 代码无法直接复用 | ⭐⭐ |
| Node.js + WebView2 | 安装包较小 | WebView2 需系统支持(Windows10+自带)；无成熟的打包方案 | ⭐⭐ |

**推荐理由**：当前项目已使用 Node.js + Express 作为后端，Electron 天然支持在**主进程中运行 Node.js 代码**，无需改动后端逻辑。React 前端构建后可直接由 Electron 加载。生态成熟、易于打包分发。

### 2.2 关键依赖

| 依赖 | 用途 | 备注 |
|------|------|------|
| `electron` | 桌面运行时框架 | 主依赖 |
| `electron-builder` | 打包为 Windows 安装程序/便携版 | 开发依赖 |
| `concurrently` | 开发时同时启动 Electron 和 Vite | 开发依赖 |

现有依赖（`express`, `react`, `react-dom`, `ws`, `cors`, `vite`, `typescript` 等）保持不变。

---

## 3. 架构设计

### 3.1 进程模型

```
Electron 主进程 (main process)
├── Express 服务 (http://localhost:3001)
│   ├── REST API (/api/products)
│   └── WebSocket 实时同步
├── 窗口管理 (BrowserWindow)
│   └── 加载 Vite dev server 或 build 产物
├── 生命周期管理
│   ├── 启动时启动 Express
│   ├── 窗口关闭时保存数据并退出
│   └── 托盘图标（可选）
└── IPC (可选)
    ├── 文件对话框（保存/导出）
    └── 系统信息
```

**主进程职责**：
1. 创建 Express HTTP + WebSocket 服务（在随机端口或固定 3001 端口上）
2. 创建 BrowserWindow，加载 React 前端
3. 管理应用生命周期（启动、退出保存数据）
4. 通过 IPC 提供原生对话框功能（如文件选择器）

**渲染进程职责**：
1. 渲染 React UI
2. 通过 HTTP/WebSocket 与后端通信（与现有逻辑一致）
3. 用户交互处理

### 3.2 数据流

```
用户在界面操作
    │
    ▼
React 组件 → ProductsContext (WebSocket) → Express 后端
                                                │
                                                ▼
                                          内存中 products[]
                                                │
                                                ▼
                                          data/products.json (持久化)
```

数据流**完全保持现有设计不变**，仅将原来需要用户打开浏览器访问改为内嵌窗口显示。

### 3.3 文件结构变更

新增文件：
```
├── electron/
│   ├── main.ts              # Electron 主进程入口
│   └── preload.ts           # 预加载脚本（暴露安全 API 给渲染进程）
├── electron-builder.yml     # 打包配置
├── data/                    # 图标资源（ico/png）
└── docs/
    └── desktop-app-design.md  # 本文档
```

修改：
```
├── package.json             # 新增 electron 相关脚本和依赖
├── vite.config.ts           # 新增 electron 兼容配置
├── tsconfig.json            # 新增 electron 编译配置
└── .gitignore               # 新增打包输出目录
```

---

## 4. 核心实现方案

### 4.1 Electron 主进程 (`electron/main.ts`)

主要逻辑：

1. **启动流程**：
   - 创建 Express 服务（复用 `server/index.ts` 的逻辑）
   - 等待服务就绪
   - 创建 BrowserWindow，加载 React 前端
   - 开发模式下加载 Vite dev server URL，生产模式下加载 `dist/index.html`

2. **窗口配置**：
   - 默认尺寸：1280×800（含最小尺寸 960×600）
   - 标题：产品挑选列表
   - 禁用右键菜单（可选）
   - 关闭时确认保存数据

3. **退出流程**：
   - 窗口关闭时触发数据保存
   - 等待保存完成后退出进程

### 4.2 预加载脚本 (`electron/preload.ts`)

通过 `contextBridge` 安全暴露少量 API：
- `electronAPI.saveDialog(filter)`：触发原生保存文件对话框
- `electronAPI.openDialog(filter)`：触发原生文件选择对话框
- `electronAPI.getAppVersion()`：获取应用版本号

### 4.3 前后端通信

保持现有模式不变：
- React 应用通过 `http://localhost:3001` 访问后端 API
- 通过 `ws://localhost:3001` 建立 WebSocket 连接
- 开发模式下，Vite 代理配置可保持开发体验

生产环境下，Electron 将启动 Express 服务并通知渲染进程服务端口。

### 4.4 数据存储

数据存储路径需要适应桌面版：

| 环境 | 路径 |
|------|------|
| 开发环境 | `./data/products.json`（项目目录下） |
| 生产环境 | `app.getPath('userData')/data/products.json`（如 `%APPDATA%/tier-slist/data/products.json`） |

通过 `app.isPackaged` 判断当前环境，决定数据文件存储位置。这样可以避免多实例数据冲突。

---

## 5. 构建与打包

### 5.1 构建流程

```
源码
├── npm run build          # Vite 构建 React → dist/
├── npm run build:build:electron  # 编译 electron/main.ts → electron-dist/
└── npm run package        # electron-builder 打包 → release/
```

### 5.2 electron-builder 打包配置 (`electron-builder.yml`)

```
appId: com.tier-slist.app
productName: 产品挑选列表
directories:
  output: release
files:
  - dist/**/*            # React build 产物
  - electron-dist/**/*   # Electron 主进程编译产物
  - server/**/*          # Express 后端代码
  - package.json
extraResources:
  - from: node_modules    # 所有依赖
    to: node_modules
    filter:
      - "**/*"
win:
  target:
    - target: portable    # 便携版（单 exe，免安装）
    - target: nsis        # 安装版（msi 或 nsis）
  icon: build/icon.ico
```

### 5.3 输出产物

| 类型 | 文件 | 说明 |
|------|------|------|
| 便携版 (Portable) | `产品挑选列表-1.0.0.exe` | 单个 exe，免安装，适合 U 盘分发 |
| 安装版 (NSIS) | `产品挑选列表-Setup-1.0.0.exe` | 安装到 Program Files，含开始菜单快捷方式 |

两种产物**都包含完整的 Node.js 运行时 + Chromium + 所有 npm 依赖**，用户双击即可运行。

### 5.4 体积预估

| 组件 | 体积 |
|------|------|
| Electron (Chromium + Node.js) | ~50-70MB |
| npm 依赖 (node_modules) | ~30-40MB |
| React 前端构建产物 | ~1-2MB |
| **合计** | **~80-120MB** |

---

## 6. 开发阶段配置

### 6.1 package.json 新增脚本

```json
{
  "scripts": {
    "dev": "concurrently ...",    // 保持原有
    "dev:electron": "concurrently --kill-others \"npm run server\" \"vite\" \"electron .\"",
    "build": "vite build",
    "build:electron": "tsc -p tsconfig.electron.json",
    "package": "npm run build && npm run build:electron && electron-builder",
    "package:portable": "npm run build && npm run build:electron && electron-builder --win portable",
    "package:installer": "npm run build && npm run build:electron && electron-builder --win nsis"
  }
}
```

### 6.2 开发模式

开发调试流程：
1. `npm run dev:electron`
2. Vite dev server 启动 (端口 5173)
3. Express 后端启动 (端口 3001)
4. Electron 窗口打开，加载 `http://localhost:5173`
5. 代码热更新正常工作（HMR）

### 6.3 依赖类型

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
| `src/` 下所有 React 组件 | UI 逻辑完全不变 |
| `src/context/ProductsContext.tsx` | WebSocket 连接逻辑不变 |
| `src/persistence/productsStorage.ts` | API 调用逻辑不变 |
| `src/domain/` | 领域模型不变 |
| `server/index.ts` | Express 后端逻辑不变 |

### 7.2 需要微调的代码

| 文件 | 改动内容 | ༔改内容 |
|------|---------|
| `server/index.ts` | 端口改为动态分配或环境变量读取；数据路径支持 `userData` |
| `src/persistence/productsStorage.ts` | 后端地址改为从环境变量或固定 localhost 读取 |

### 7.3 需要新增的代码

| 文件 | 说明 |
|------|------|
| `electron/main.ts` | Electron 主进程 |
| `electron/preload.ts` | 预加载脚本 |
| `tsconfig.electron.json` | Electron 的 TypeScript 编译配置 |
| `electron-builder.yml` |  ../../` | 打包配置 |

---

## 8. 安装包设计

### 8.1 便携版（推荐）

- 单个 `产品挑选列表.exe` 文件，约 80-120MB
- 双击直接运行，不写注册表
- 数据保存在 exe 同级目录下的 `data/` 文件夹或 `%APPDATA%/tier-slist/`
- 适合：U 盘分发、临时使用、无需管理员权限

### 8.2 安装版

- `产品挑选列表-Setup-1.0.0.exe`，安装向导
- 安装到 `%LOCALAPPDATA%/Programs/tier-slist/`
- 创建开始菜单快捷方式
- 可以选择是否创建桌面快捷放到桌面
- 卸载时可通过控制面板卸载
- 适合：正式交付给最终用户

### 8.3 自动更新（未来可选项）

- 集成 `electron-updater`
- 启动时检查 GitHub Releases 或自有更新服务器
- 下载更新包并自动安装

---

## 9. 用户体验

### 9.1 启动流程

1. 用户双击 exe
2. 显示启动画面（可选，因 Electron 启动需要 ~1-2 秒）
3. 后端服务在后台启动（~200ms）
4. 主窗口出现，加载 UI
5. 窗口底部可显示状态栏（服务状态、数据条数）

### 9.2 窗口行为

- **关闭按钮**：如果数据未保存，弹出确认对话框
- **最小化到托盘**（可选）：关闭时最小化到系统托盘，后台运行
- **单实例锁**：防止打开多个窗口导致数据冲突
- **多显示器 DPI 适配：Electron 默认支持高 DPI 缩放

### 9.3 文件关联（未来可选项）

- 双击 `.tier-slist-backup.json` 文件自动导入到应用中
- 注册文件类型关联

---

## 10. 实施路线图

| 阶段 | 任务 | 预计工作量 |
|------|------|-----------|
| **Phase 1: 基础整合** | 创建 `electron/main.ts`，在 Electron 中加载 Express 后端并创建窗口 | 1-2 天 |
| | 配置开发模式（Vite HMR + Electron 热重载） | 0.5 天 |
| | 适配数据存储路径（开发/生产环境判断 | 0.5 天 |
| **Phase 2: 打包** | 配置 electron-builder | 0.5 天 |
| | 生成应用图标（ico 格式） | 0.5 天 |
| | 首轮打包测试 | 0.5 天 |
| **Phase 3: 完善** | 单实例锁、退出确认、窗口尺寸记忆 | 1 天 |
| | 安装版测试（Windows 10/11） | 0.5 天 |
| | 便携版测试 | 0.5 天 |
| **Phase 4: 发布** | 编写 Windows 用户使用说明 | 0.5 天 |
| | 整体回归测试 | 1 天 |
| **合计** | | **~7 天** |

---

## 11. 注意事项与风险

### 11.1 已知风险

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| 安装包体积大 (~100MB) | 下载/ | 下载/传输成本高 | 告知用户此为正常体积；后续可考虑 Tauri 迁移 |
| 杀毒软件误报 | 首次运行可能被拦截 | 申请代码签名证书（DigiCert/ Sectigo） |
| Windows 7 不支持 | 部分用户无法使用 | 最低支持 Windows 10（Electron 30+ 已放弃 Win7） |
| 端口 3001 被占用 | 后端启动失败 | 改为随机端口，通过 IPC 通知渲染进程 |

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
| **Electron 开发调试** | ✅ 可正常进行 | Electron 在 Linux 下可直接运行，`npm run dev:electron` 正常工作 |
| **Express 后端调试** | ✅ 无影响 | 后端代码完全在 Node.js 层，与操作系统无关 |
| **UI 测试** | ✅ 可进行 | 除 Windows 特有行为（如系统托盘、任务栏）外，核心功能可充分测试 |
| **Windows 特有功能调试** | ⚠️ 需 Windows 环境 | 如：安装包测试、Windows 通知、注册表操作、文件关联 |
| **打包为 Windows EXE** | ⚠️ 可打包但需额外工具 | 需安装 `wine` 等工具，或使用 CI/CD |
| **生成 NSIS 安装程序** | ⚠️ 依赖 wine | NSIS 安装程序制作需要 Windows 环境或 wine |

### 12.3 三种打包方案对比

#### 方案 A：Linux 本地直接打包（推荐开发阶段使用）

使用 `electron-builder` 的 Linux 版配合 `wine` 生成 Windows 安装包。

**步骤**：
```bash
# 安装 wine（必要）
sudo apt install wine wine64

# 安装 electron-builder
npm install -D electron-builder

# 打包 Windows 便携版（-c.extraMetadata.xxx 等配置可选）
npm run package:portable
```

**优缺点**：
- ✅ 直接在 Linux 下完成，无需切换环境
- ✅ 便携版 exe 可正常生成
- ⚠️ NSIS 安装版需要 wine，生成质量偶有问题
- ⚠️ 生成的 exe 在 Linux 上无法运行测试，需传到 Windows 机器验证

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
      - run: npx electron-builder --win portable
      - uses: actions/upload-artifact@v4
        with:
          name: tier-slist-portable
          path: release/*.exe
```

**优缺点**：
- ✅ 在真实 Windows 环境打包，兼容性最好
- ✅ 支持 NSIS 安装版、代码签名
- ✅ 可自动发布到 GitHub Releases
- ⚠️ 需要配置 CI 流程（一次性工作）
- ⚠️ 推送代码后才出包，本地无法即时验证

#### 方案 C：Windows 虚拟机（推荐最终验收使用）

在 Linux 上运行 Windows 虚拟机（VirtualBox / VMware），在虚拟机内进行开发和打包验证。

**优缺点**：
- ✅ 完整的 Windows 环境，可进行全流程验证
- ✅ 可运行生成的 exe 进行测试
- ⚠️ 需要 Windows 授权（试用版也可以）
- ⚠️ 资源占用较大（建议 8GB+ 内存分配给虚拟机）

### 12.4 推荐工作流

```
日常开发（Linux）
  │
  ├── 代码编写（VS Code / WebStorm）
  ├── npm run dev:electron → 在 Linux 下调试 Electron 窗口
  ├── npm run build → 确认构建成功
  │
  ├── 本地快速打包验证
  │   └── npm run package:portable（需 wine）
  │       └── scp 到 Windows 机器 / 传给同事测试
  │
  └── 正式发布
      └── 推送 tag → GitHub Actions 自动打包
          ├── 产出 portable exe
          └── 产出 NSIS 安装包
```

### 12.5 注意事项

- **Wine 版本**：Ubuntu 22.04+ 建议安装 `winehq-stable`（官方源版本可能过旧）
- **Node.js 版本**：Linux 和 Windows 打包尽量使用同一大版本（如 20.x），避免依赖兼容问题
- **文件路径**：代码中不要写死 Windows 反斜杠路径，始终使用 `path.join()` 或 `path.posix`
- **换行符**：`.gitattributes` 中设置 `* text=auto`，避免 CRLF/LF 问题
- **图标**：Windows 需要 `.ico` 格式图标，可以在 Linux 上用 `imagemagick` 转换：
  ```bash
  # 将 PNG 转换为 ICO（需安装 imagemagick）
  convert icon.png -define icon:auto-resize=256,64,48,32,16 icon.ico
  ```

---

## 13. 附录

### 13.1 参考文档

- [Electron 官方文档](https://www.electronjs.org/docs/latest/)
- [electron-builder 文档](https://www.electron.build/)
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