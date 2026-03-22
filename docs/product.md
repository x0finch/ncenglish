# NCE 播放器 — 产品文档

## 1. 产品定位

**NCE 播放器**是一款面向「新概念英语」学习者的**现代化听读网站**，交互与信息架构对标主流**音乐播放器**（曲库 / 播放队列 / 歌词同步 / 播放控制），降低认知成本，让用户专注在「选课 → 听 → 跟读」的闭环上。

- **核心价值**：稳定、快速地播放已托管在自有 R2 上的音频与字幕资源；界面清晰、可键盘与触控友好操作。
- **与旧版关系**：`NCE/` 目录为历史实现（Vanilla JS + `data.json`）；新版在仓库 **`ncEnglish/` 根下**以 **pnpm workspace（多包 monorepo）** 组织，应用包为 **Vite + React + [TanStack Router](https://tanstack.com/router)** 的 **SPA**（无 SSR），**部署目标为静态托管**（如 **GitHub Pages**：`pnpm build` 产出 `dist/`，并复制 `index.html` 为 `404.html` 以支持前端路由）。数据源仍为 **`nce-r2-index.json`（R2 资源索引 v2）**。

## 2. 目标用户与典型场景

| 用户       | 场景                               |
| ---------- | ---------------------------------- |
| 自学者     | 按册选课，连续播放多课，变速精听   |
| 复习者     | 从上次进度继续，快速切换课文       |
| 移动端用户 | 单手操作播放条、列表滚动与封面展示 |

## 3. 数据与资源模型（与索引对齐）

应用以 **`nce-r2-index.json`** 为唯一「书目与单元清单」来源（`version: 2`）；该文件与解析逻辑一同放在 **`packages/catalog`**（亦可通过子路径导出供 `app` 引用）。运行时另需配置 **R2 公共访问基址**（或 CDN 前缀），将索引中的模板解析为真实 URL。

### 3.1 索引字段（逻辑含义）

- **`books[]`**：每一册书一条记录。
  - **`key`**：稳定标识（如 `NCE1`、`NCE2`、`NCE3`、`NCE4`、`NCE1(85)` … `NCE4(85)`）。
  - **`title` / `bookName` / `bookLevel`**：展示用文案。
  - **`mirrorRoot`**：该册在存储中的根路径（如 `nce/NCE1`），用于拼接音频、封面、可选 `book.json`。
  - **`coverFile`**：封面文件名（如 `NCE1.jpg`）。
  - **`units[]`**：单元条目；**`encoding.unitEntry` 说明其 basename 与 R2 上 `.mp3` / `.lrc` 的 key 对齐**。

### 3.2 资源 URL 构造（与 `encoding` 一致）

索引顶层 **`encoding`** 描述占位符含义（产品层约定如下，实现时需与 JSON 内说明一致）：

| 类型           | 规则（概念）                                                           |
| -------------- | ---------------------------------------------------------------------- |
| 封面           | `{mirrorRoot}/{coverFile}`                                             |
| 音频           | `{mirrorRoot}/{unit}.mp3`（`unit` 为 `units[]` 中对应 basename）       |
| 歌词           | `{mirrorRoot}/{unit}.lrc`                                              |
| 可选书本元数据 | `{mirrorRoot}/book.json`（若存在，可用于扩展课文正文等；首版可仅预留） |

**配置项（环境变量）**：`VITE_NCE_MEDIA_BASE_URL` — 浏览器直接请求的**公开媒体根**（R2 公共读域名、自定义域名或 CDN 前缀，末尾无斜杠）。应用将 `{baseUrl}` 与索引中的 `mirrorRoot`、单元 basename 拼接为完整 MP3/LRC/封面 URL；**不再**经 Worker 转发。索引中的 `mirrorRoot` / 单元 basename 须与对象存储中的 key 一致；跨域时需为媒体源配置 **CORS**。

## 4. 功能范围

### 4.1 首版（MVP）— 必做

1. **书库（Library）**
   - 展示全部 `books`，分组或标签区分「经典版 / 85 版」（按 `key` 中 `(85)` 或业务规则）。
   - 每册：封面、标题、级别、单元数量。

2. **单元列表（Playlist）**
   - 当前册下单元列表；支持搜索/过滤（按标题关键词）。
   - 点击单元：**切换当前曲目**并自动加载对应 `.lrc`（若不存在则歌词区显示友好占位）。

3. **播放器（Now Playing）**
   - 播放 / 暂停、上一曲 / 下一曲。
   - 进度条拖拽与点击定位；显示当前时间与总时长。
   - **播放速度**：多档可选（建议与旧版类似：0.5×～2×）。
   - **播放模式**：至少支持顺序播放与单曲循环（可扩展列表循环）；模式持久化（`localStorage`，由 **`app`** 内 Zustand `persist` 写入，**非** `@nce/player` 直连存储）。

4. **歌词面板（Lyrics）**
   - 解析 LRC（含时间轴）；**随播放高亮当前行**，并自动滚动到可视区域。
   - **翻译行显示开关**（若 LRC 含翻译行或约定格式；若无则仅英文也可，开关可灰化或隐藏）。

5. **状态持久化**
   - 记住：当前册、当前单元、播放模式、翻译开关、倍速（与旧版用户习惯兼容）。

6. **深链接 / 可分享状态（建议）**
   - URL 携带 `book` 与 `unit`（query 或 path），刷新可恢复；与 `localStorage` 协同（URL 优先）。

### 4.2 体验与可访问性

- 键盘快捷键（建议）：空格播放/暂停，左右方向键快进/快退（可选），`[` `]` 调速（可选）。
- 加载与错误态：音频 404、索引拉取失败、CORS 问题时明确文案与重试入口。
- 响应式布局：桌面双栏（列表 + 播放/歌词），窄屏单栏堆叠 + 底部迷你播放条或可展开全屏播放器。

### 4.3 明确不做与 PWA 边界（首版）

- 用户账号、云端同步进度（除非后续单独立项）。
- **离线下载整课音频**到 Cache Storage、**离线保证播放 MP3/LRC**（首版不做）。
- **PWA（首版已纳入）**：**Web App Manifest + 可安装**；Service Worker **仅预缓存构建后的静态资源壳**（JS/CSS 等），**不**默认把 MP3/LRC 纳入 Workbox 预缓存。
- 服务端鉴权（当前假设媒体为**公共可读 URL**或 CDN；防盗链与用量由存储/CDN 策略处理）。

## 5. 信息架构与页面结构（建议）

路由实现上与 TanStack Router 文件路由约定一致：**`app/src/routes/` 下文件即路由**。

```
/                    → 默认进入「上次册」或书库首页
/library             → 书库（可选与 / 合并）
/play/$bookKey       → 播放页：单元列表 + 播放器 + 歌词（动态段命名遵循 TanStack Router 惯例）
```

也可采用 query 补充状态：`/play/NCE1?unit=…`。深链接以 **path 参数优先** 时，利于分享；托管在子路径时需配置构建 **`base` / `VITE_BASE_PATH`** 与 R2 CORS 中的站点来源。

## 6. 技术选型（已定）

| 层级          | 选型                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 仓库组织      | [pnpm workspace](https://pnpm.io/workspaces)（**包级模块化**，单仓多 `package`）                                                                                                                                         |
| 包管理        | [pnpm](https://pnpm.io/)                                                                                                                                                                                                 |
| 路由          | [TanStack Router](https://tanstack.com/router)（文件路由 SPA，`@tanstack/router-plugin`）                                                                                                                                 |
| 构建工具      | [Vite](https://vitejs.dev/)                                                                                                                                                                                              |
| 运行时 / 部署 | 纯静态 **`dist/`**（如 [GitHub Pages](https://pages.github.com/)）；媒体为浏览器直连公开 URL                                                                                                                                |
| UI 框架       | [React](https://react.dev/)                                                                                                                                                                                              |
| 组件库        | [HeroUI](https://heroui.com/)（与 Tailwind 生态配合）                                                                                                                                                                    |
| 样式          | [Tailwind CSS](https://tailwindcss.com/)                                                                                                                                                                                 |

**说明**：HeroUI 负责按钮、列表、选择器、Sheet/Modal、主题等基础组件；播放器进度条、歌词滚动区域可在其之上做轻量定制。React 主版本须与 HeroUI 官方要求对齐。

**GitHub Pages**：构建时设置 `VITE_BASE_PATH=/<仓库名>/`（与 Pages 的 project site 路径一致）；仓库可提供 GitHub Actions 将 `app/dist` 部署到 Pages。

## 7. pnpm 级模块化（monorepo 结构）

「模块化」指 **workspace 内多个独立 `package`**（各自 `package.json`、可声明依赖关系），而不是仅在一个应用里分子目录。目标是：**纯逻辑与 UI 可拆分、可单独测试、可被未来其它入口（如管理端、CLI）复用**。

### 7.1 约定

- **仓库根**：`pnpm-workspace.yaml` 声明 `app`、`packages/*`（或等价 glob）。
- **应用包（deployable）**：**`app/`**，Vite + React + TanStack Router SPA；包含 `src/routes`、`index.html`、`vite.config.ts`；根布局挂载 Header、路由出口、Tailwind 入口。
- **库包（internal）**：使用 `workspace:*` 互相引用；**默认不发布 npm**（`private: true`），除非日后单独开源某个包。
- **依赖方向**：`app` → 各 `packages/*`；**库包之间禁止环依赖**；与 React 无关的逻辑放在 **无 `react` 依赖** 的包中，便于单元测试与复用。

### 7.2 建议包拆分（首版可合并，随复杂度再拆）

| 包名（示例）               | 职责                                                                                                                                                                    | 典型依赖                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@nce/catalog`             | **目录门面**：内置 `nce-r2-index.json`；对外仅 **门面方法**（`init`、`listBooks`、`getBook`、`listUnits`、`getUnitMedia`、`parseLyrics` 等），底层校验与 URL 拼接不导出 | 无 UI                                                                                      |
| `@nce/player`              | 无界面播放器规则：曲级 ended 决策、单元导航、倍速档位、`parse`/`merge`/`serialize` 偏好；**不**读写 `localStorage`（由 `app` + Zustand `persist` 落盘）                | 无 UI、无 `react` / `zustand`                                                              |
| `@nce/ui`（可选）          | 跨页面复用的 React 展示组件（非业务）                                                                                                                                   | `react`                                                                                    |
| `app`                      | 页面组合、HeroUI + Tailwind、`<audio>` 与歌词滚动、全局状态或 context；Start 路由与可选 Server Functions                                                                | `react`、`@tanstack/react-start`、`vite`、Cloudflare 相关 devDep、`wrangler`、workspace 包 |

**`@nce/catalog` 对外约定**：`import catalog from "@nce/catalog"`；先 **`catalog.init({ baseUrl })`**，再调目录/媒体/歌词相关 **`catalog.xxx`**；**类型**如 `BookDetail`、`UnitMedia`、`LyricLine`、`CatalogIndex` 等用 `import type { … } from "@nce/catalog"`。

包名前缀 `@nce/` 仅为示例，实现时可改为项目实际 scope。

### 7.3 目录树（产品层示意）

```
ncEnglish/
  pnpm-workspace.yaml
  package.json              # root：devDependencies、统一脚本（如 dev / build / cf:dev / cf:deploy → filter app）
  app/
    package.json
    vite.config.ts          # tanstackStart +（CF 模式下）@cloudflare/vite-plugin
    worker-entry.ts         # Cloudflare Worker：转发至 @tanstack/react-start/server-entry
    wrangler.jsonc          # Workers 配置；NCE 首版可无 D1/KV，仅 HTTP 与静态资源策略
    index.html              # 以 Start 模板为准
    src/
      routes/               # TanStack Start 文件路由（__root、index、play/$bookKey 等）
      …                     # 应用内仍可按 feature 分子目录（与 pnpm 包级拆分正交）
    public/
  packages/
    catalog/
      package.json            # name: @nce/catalog；exports 含 ./nce-r2-index.json
      nce-r2-index.json       # 书目索引源文件（与包同行维护）
      src/
        index.ts              # 包入口：default catalog + 类型再导出
        catalog.ts            # 对外门面与公共类型（与 index 同级）
        internal/             # 不对外导出：schema、解析、URL、查询、LRC
        __tests__/
          catalog.public.test.ts
          internal/
    player/
      package.json            # name: @nce/player
      PLAYER.md
      src/
        index.ts              # default player + 类型再导出
        player.ts             # 门面
        internal/
        __tests__/
```

### 7.4 与「应用内分层」的关系

`app/src` 下仍可采用 `features/`、`shared/` 等文件夹组织路由与页面级代码；**pnpm 包负责跨边界复用与强制依赖方向**，文件夹负责单应用内可读性。二者同时存在并不矛盾。

**原则**：凡是「不依赖 React、且可被测试用例直接调用」的能力，优先落在 `packages/*`；凡是「页面编排与 HeroUI 拼装」，留在 `app`。

## 8. 配置与安全说明

- **基址配置**：公开媒体根通过 **`VITE_NCE_MEDIA_BASE_URL`** 注入，**不把密钥写进前端仓库**。浏览器直接请求该源上的对象；若未来需要签名 URL 或私有桶，再在应用层或边缘层扩展（首版以公共读为主）。
- **CORS**：若音频与页面不同源，需对象存储 / CDN 配置允许 `GET` 与 `Range`（拖动进度依赖字节范围请求时更稳）。
- **Cloudflare**：`wrangler.jsonc` 中 `name`、`routes` / `workers_dev`、兼容性日期与 flags 按部署账号调整；生产发布流程对齐参考项目的 `cf:build` + `wrangler deploy`（或 CI 中使用构建产物目录下的 wrangler 配置，以 Start + 插件实际输出为准）。

## 9. 成功标准（验收参考）

- 8 册书（含 85 版）均可列出单元并播放对应 MP3。
- 歌词与音频时间同步误差在可接受范围内（以 LRC 时间戳为准）；无 LRC 时不崩溃。
- 刷新页面后恢复上次册与单元（及播放模式、倍速等约定项）。
- Lighthouse：性能与可访问性无「明显红灯」（具体阈值可在实现阶段定量化）。

## 10. 后续迭代（Backlog，未定优先级）

- 课文正文展示（消费 `book.json` 若结构明确）。
- 睡眠定时、AB 循环复读区间。
- PWA / 离线缓存策略。
- 与「生词本」或笔记联动（需后端时再议）。

---

**文档版本**：v0.5（`@nce/lrc` 并入 `@nce/catalog`；索引 JSON 位于 `packages/catalog`）  
**依据数据**：`packages/catalog/nce-r2-index.json`（`version: 2`，`generatedAt` 以文件为准）  
**参考旧版行为**：`NCE/js/main.js`（播放模式、倍速、翻译、歌词缓存等）  
**参考工程**：`/Users/dev/_self/agent-workplace/oh-my-ethereum`（`app/`：Vite + TanStack Start + Cloudflare 插件与 Worker 入口）
