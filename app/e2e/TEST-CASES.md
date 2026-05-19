# NCE Player — E2E 测试用例清单

本文档基于当前代码（TanStack Router + Vite、`/library` 书库、`/play/$bookKey` 播放页）与在 `http://127.0.0.1:3000` 上的实际页面结构整理，供 Playwright 等 E2E 实现与评审使用。

**运行方式**：在 `app` 目录执行 `pnpm e2e`（`playwright.config.ts` 会按需启动 dev server）。需要**有头浏览器、单线程、放慢操作、终端逐步骤中文说明**时可用 `pnpm e2e:headed:slow`（默认约 1.8s 操作间隔 + `test.step` 描述）。更慢例如：`PLAYWRIGHT_SLOW_MO=3000 pnpm e2e:headed:slow`。关闭终端逐步说明：`PLAYWRIGHT_STEP_LOG=0 pnpm e2e:headed:slow`。

**已实现用例**：`e2e/library.spec.ts`（书库）、`e2e/routing.spec.ts`（根路径与深链）、`e2e/player.spec.ts`（播放与持久化）；共享辅助见 `e2e/helpers.ts`。

---

## 1. 路由与页面结构（测试前置知识）

| 路径 | 行为 |
|------|------|
| `/` | 若 `localStorage` 持久化会话中存在 `bookKey`，`replace` 到 `/play/$bookKey`（`unit` 清空）；否则到 `/library`。短暂显示 “Redirecting…”。 |
| `/library` | 书库：版本 Tab、搜索、书目网格；点击书目进入播放页。顶栏 `h1` 文案为 **New Concept English**（不是 “Library”）。 |
| `/play/$bookKey` | 播放页：侧栏课列表、歌词区、底部传输控件；`?unit=` 为**零基**课时索引，会随当前课时与路由同步（`replace`）。 |

**持久化**：`zustand` persist 键名 `nce:app-session`，包含 `bookKey`、`unitIndex`、`trackPlayMode`、`playbackRate`、`translationMode`、`lyricClickMode`、`suppressAutoplay` 等（歌词与加载状态不持久化）。

**注意（与现有 smoke 对齐）**：`e2e/smoke.spec.ts` 中 “Library” / “Units” 标题断言与当前 UI 不一致，实现新用例时应以实际上下文与 `aria-label` 为准（见下文推荐定位方式）。

---

## 2. 用例总览（按模块）

### A. 根路径与深链

| ID | 场景 | 优先级 | 主要步骤 | 预期 |
|----|------|--------|----------|------|
| A1 | 无会话时访问 `/` | P0 | 清除或未写入 `nce:app-session` 后打开 `/` | 最终 URL 为 `/library`；可见书库 Tab 与书目。 |
| A2 | 有会话时访问 `/` | P1 | 预先写入含有效 `bookKey` 的会话后打开 `/` | 重定向到 `/play/<bookKey>`（`unit` 行为与 store 一致）。 |
| A3 | 播放页深链 | P0 | `goto /play/NCE1?unit=0` | HTTP 成功；`h2` 为当前课显示名（如含 `001&002`）；URL 仍带合理 `unit`。 |
| A4 | 无效 `unit` 查询 | P2 | `?unit=999999` 或 `?unit=abc` | 应用将 `unit` 规范为 `undefined` 或合法索引（与 `validateSearch` / `setBook` 一致），不崩溃。 |
| A5 | 未知 `bookKey` | P2 | `goto /play/INVALID` | 不崩溃；音频/歌词逻辑有防护（可断言无有效课时或侧栏空状态，按产品约定细化）。 |

### B. 书库 `/library`

| ID | 场景 | 优先级 | 主要步骤 | 预期 |
|----|------|--------|----------|------|
| B1 | 页面骨架 | P0 | 打开 `/library` | 顶栏导航 `Primary`；`h1` “New Concept English”；Tab “All / Classic / 85 ed.”；搜索框 `Search books`。 |
| B2 | Tab — Classic | P1 | 点击 “Classic” | 仅 Classic 版本书目；不应出现 85 版卡片（与 `edition === "classic"` 一致）。 |
| B3 | Tab — 85 ed. | P1 | 点击 “85 ed.” | 仅 85 版书目。 |
| B4 | 搜索过滤 | P1 | 在搜索框输入 `NCE1` 或书名片段 | 卡片数量与 “N matches” 提示一致；无结果时出现空状态文案（如 “No books match…”）。 |
| B5 | 清空搜索 | P2 | 输入后删除关键字 | 恢复完整列表（在当前 Tab 下）。 |
| B6 | 打开一本书 | P0 | 点击某书目按钮（如 NCE1 Classic） | 导航到 `/play/NCE1`（或对应 key）；课时与歌词开始加载。 |

### C. 播放页 — 导航与侧栏

| ID | 场景 | 优先级 | 主要步骤 | 预期 |
|----|------|--------|----------|------|
| C1 | 返回书库 | P0 | 点击侧栏头部 “Back to library” | URL `/library`。 |
| C2 | 移动端侧栏开关 | P1 | 视口设为 mobile，点击 “Toggle Sidebar” | 侧栏展开/收起；课列表可点选。 |
| C3 | 切换课时 | P0 | 在侧栏点击另一课 | `unit` 查询与标题 `h2` 更新；歌词区重新加载（可先出现 “Loading lyrics…”）。 |
| C4 | URL `unit` 与课时同步 | P1 | 切换课时后观察 URL | `?unit=` 与当前选中索引一致（`replace`）。 |

### D. 播放页 — 歌词与可访问性

| ID | 场景 | 优先级 | 主要步骤 | 预期 |
|----|------|--------|----------|------|
| D1 | 歌词就绪 | P0 | 进入默认课 | 若干带时间戳的歌词按钮；`aria-label` 含 “Seek to …” 与模式提示。 |
| D2 | 歌词加载中 | P2 | 可在慢网或 mock 下 | 可见 “Loading lyrics…”。 |
| D3 | 歌词错误（CORS/HTTP） | P2 | 错误 CDN 或拦截 `fetch` | `lyricsStatus === error` 时可见错误文案（可能含 CORS 说明）。 |
| D4 | 无歌词行 | P2 | 若有空 LRC 课时 | “No lyric lines.”。 |
| D5 | 点击歌词行 — Seek only | P1 | 默认 `lyricClickMode` 为 jumpOnly，点击一行 | 播放头跳转；继续播放（不在行尾暂停）。 |
| D6 | 点击歌词行 — Line then pause | P1 | 切换 “Lyric tap mode” 到 line-then-pause，点击一行 | 在行结束前暂停（需音频可播放；可断言 `Pause` 状态或时间停在边界附近）。 |
| D7 | 歌词点击模式切换 | P2 | 点击 “Lyric tap mode” 按钮 | `aria-label` 在两种模式间切换；移动端可能出现 Sonner toast。 |

### E. 播放页 — 传输条与偏好

| ID | 场景 | 优先级 | 主要步骤 | 预期 |
|----|------|--------|----------|------|
| E1 | 播放 / 暂停 | P0 | 点击 “Play” / “Pause” | 按钮 `aria-label` 在 Play/Pause 间切换；`suppressAutoplay` 行为与手动暂停一致。 |
| E2 | 上一课 / 下一课 | P0 | 点击 “Previous lesson” / “Next lesson” | 课时切换；在首尾边界行为符合 `trackPlayMode`（顺序模式下首课上一课应无效果或保持，与 `player.canNext` 一致）。 |
| E3 | 顺序 / 倒序 / 单课循环 | P1 | 多次点击 “Sequential play…” 类按钮 | `aria-label` 在 Sequential / Reverse course order / Repeat one 间循环；倒序时按钮文案为 “Later lesson in course” 等。 |
| E4 | 倍速循环 | P1 | 点击 “Playback speed …” | 速率在 `0.5 → 0.75 → 1 → 1.25 → 1.5 → 2 → 0.5` 循环；`aria-label` 含当前倍速。 |
| E5 | 翻译显示模式循环 | P1 | 点击双语显示按钮 | Spotlight / English-first / Blur / Full 等模式切换（`aria-label` 长文案变化）；UI 上中文模糊或高亮行为肉眼/截图可验。 |
| E6 | Seek 滑块 | P1 | 拖动 “Seek” `input[type=range]` | 当前时间与播放位置变化（需 `duration` 有效）。 |
| E7 | 曲终行为 | P2 | 播放到结尾 | 顺序：下一课；倒序：上一课；单课循环：重播（与 `resolveAfterTrackEnded` 一致）。 |

### F. 跨页面与持久化

| ID | 场景 | 优先级 | 主要步骤 | 预期 |
|----|------|--------|----------|------|
| F1 | 刷新保留书与课时 | P1 | 在 `/play/NCE1?unit=3` 刷新 | 仍为该书该课（或按 persist 规则一致）。 |
| F2 | 偏好保留 | P2 | 修改倍速/循环/翻译模式后刷新 | `localStorage` 恢复后控件状态一致。 |

### G. 非功能 / 回归

| ID | 场景 | 优先级 | 主要步骤 | 预期 |
|----|------|--------|----------|------|
| G1 | 控制台无致命错误 | P1 | 监听 `console` error | 无未捕获异常（媒体 404 等按环境允许已知告警）。 |
| G2 | 文档标题 | P3 | 各路由 | `document.title` 为 “NCE Player”（当前实现）。 |

---

## 3. Playwright 定位建议（稳定优先）

- **书库标题**：`getByRole("heading", { name: "New Concept English" })` 或 `getByRole("navigation", { name: "Primary" })`。
- **书库 Tab**：`getByRole("tab", { name: "Classic" })` 等。
- **搜索**：`getByRole("searchbox", { name: "Search books" })`。
- **打开书**：`getByRole("button", { name: /NCE1 English Book/ })`（按需精确匹配 85 版）。
- **播放页课时标题**：`getByRole("heading", { level: 2 })` 或匹配课名片段。
- **传输控件**：`getByRole("button", { name: /Play|Pause/ })`、`getByRole("slider", { name: "Seek" })`。
- **返回书库**：`getByRole("button", { name: "Back to library" })`。

---

## 4. 历史 `smoke.spec.ts`（已移除）

原冒烟用例已并入上述 spec，断言已按当前 UI 修正（书库主标题、播放页课名 `h2` 等）。

---

## 5. 优先级说明

- **P0**：核心链路（书库进播放、基本播放控件、深链可用）。
- **P1**：主要学习路径（Tab/搜索、课时切换、歌词点击、模式切换）。
- **P2**：边界、错误态、持久化细节、曲终逻辑。

（完）
