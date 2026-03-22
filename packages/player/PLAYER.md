# @nce/player

**无界面播放器**规则与偏好编解码：曲级 `ended` 决策、单元列表边界、倍速档位循环、翻译行显示模式循环，以及 **`parsePlayerPreferences` / `merge` / `serialize`**。本包 **不** 使用 `localStorage`、`sessionStorage`，**不** 操作 `<audio>`，**不** `fetch` MP3/LRC；持久化与会话状态在 **`app`**（推荐 **Zustand + `persist`**），书目与 URL 在 **`@nce/catalog`**。

应用接入与增量开发见本文；产品说明见 [`docs/product.md`](../../docs/product.md)。

---

## 依赖与入口

```json
{
  "dependencies": {
    "@nce/player": "workspace:*"
  }
}
```

- **主入口**：`@nce/player` → `src/index.ts`（`export default player` + `export type { … }`）。

---

## 使用约定

1. **运行时**：`import player from "@nce/player"`，使用 **`player.xxx`**。
2. **类型**：`import type { PlayerPreferences, TrackPlayMode, … } from "@nce/player"`。
3. **无 `player.init()`**：默认导出为纯函数与常量；由 **`app`** 创建 Zustand store 并在 rehydrate 时用 `player.parsePlayerPreferences` 归一化偏好字符串。

### 与 `@nce/catalog`、`app` 的分工

| 层级 | 职责 |
|------|------|
| **`@nce/catalog`** | `catalog.init`、`getUnitMedia`（只产出 URL）；`parseLyrics`；包内无 `fetch`。 |
| **`app`** | `<audio src>` 与浏览器拉 MP3；`fetch(lrcUrl)`；Zustand + persist 写磁盘。 |
| **`@nce/player`** | 规则与偏好编解码；导出 **`PREFERENCES_STORAGE_KEY`** 供 `app` 的 persist 配置使用（本包不读盘）。 |

### `player` 成员一览

| 成员 | 说明 |
|------|------|
| `PLAYBACK_SPEEDS` | 倍速档位（与旧站 `NCE/js/main.js` 一致：`0.5` … `2`）。 |
| `cyclePlaybackRate` / `normalizePlaybackRate` | 档位循环；非法值先归一到最近档位。 |
| `nextUnitIndex` / `prevUnitIndex` / `canNext` / `canPrev` | 单元列表边界（末尾/开头不越界）。 |
| `resolveAfterTrackEnded` | `sequential` / `repeatOne` → `next` / `replay` / `stop`。 |
| `DEFAULT_PLAYER_PREFERENCES` | 默认偏好对象。 |
| `parsePlayerPreferences` / `mergePlayerPreferences` / `serializePlayerPreferences` | 字符串 ↔ 对象；损坏 JSON 回退默认。 |
| `PREFERENCES_STORAGE_KEY` | `nce:player-preferences`（仅给 `app` persist 用）。 |
| `cycleTranslationMode` | `show` → `hide` → `blur` → `show`。 |

---

## 启动与数据流（摘要）

1. **`app`**：`catalog.init`（若尚未执行）。  
2. Zustand `persist` rehydrate → 原始字符串。  
3. `player.parsePlayerPreferences(raw)` → 写入 store。  
4. 播放中：`ended` / 切课 / 调速时把模式、索引、列表长度等传给 `player`，按返回值更新 store 与 DOM/audio。

---

## 测试

- `pnpm --filter @nce/player test:run`  
- `pnpm --filter @nce/player typecheck`

单测覆盖 `internal/*` 与门面 `player.public.test.ts`；验收：**包源码中不出现** `localStorage` / `sessionStorage` API 调用（仅注释与测试中断言可提及）。

---

## 与旧版 NCE 的差异

- 旧站将句级点读（`single` / `continuous`）与 DOM、存储混在一起；本包 **首版以曲级**顺序/单曲循环为主。句级状态机若需要，可作为后续独立纯函数模块。

---

## 修订记录

| 日期 | 变更 |
|------|------|
| 2026-03-21 | 首版：`@nce/player` 包、门面 API、Vitest、PLAYER.md。 |
