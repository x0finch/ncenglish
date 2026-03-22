# @nce/catalog

新概念英语 **书目与媒体目录** 的 workspace 包：内置 `nce-r2-index.json`（v2），对外只暴露 **默认导出的 `catalog` 对象** 与若干 **TypeScript 类型**。实现细节（Zod、URL 拼接、LRC 解析等）放在 `src/internal/`，**不通过包入口导出**。

本文档供 **应用接入** 与 **本包增量开发** 查阅；产品级说明见仓库 [`docs/product.md`](../../docs/product.md)（相对本文件：monorepo 内层根下的 `docs`）。

---

## 依赖与入口

在 monorepo 的 `app`（或其它包）中：

```json
{
  "dependencies": {
    "@nce/catalog": "workspace:*"
  }
}
```

- **主入口**：`@nce/catalog` → `src/index.ts`（`export default catalog` + `export type { … }`）。
- **索引 JSON 子路径**（可选，供 bundler 直接引用静态文件）：
  - `@nce/catalog/nce-r2-index.json` → 包根目录下同名文件。

---

## 外部使用约定

1. **运行时**只使用默认导出：`import catalog from "@nce/catalog"`，通过 **`catalog.xxx`** 调用。
2. **类型**单独导入：`import type { BookDetail, UnitMedia, … } from "@nce/catalog"`。
3. 调用 **`getUnitMedia`** 前必须先 **`catalog.init({ baseUrl })`**（R2 或 CDN 的公开根 URL，末尾斜杠可有可无）。

### 最小示例

```ts
import catalog from "@nce/catalog";
import type { BookSummary, UnitMedia } from "@nce/catalog";

catalog.init({ baseUrl: import.meta.env.VITE_NCE_MEDIA_BASE_URL });

const books: BookSummary[] = catalog.listBooks();
const media: UnitMedia = catalog.getUnitMedia(
  "NCE1",
  "001&002.Excuse Me",
);
```

### `catalog` 方法一览

| 方法 | 说明 |
|------|------|
| `init({ baseUrl })` | 配置媒体 URL 所用基址；未调用时 `getUnitMedia` 会抛错。 |
| `getIndex()` | 返回完整索引 **`CatalogIndex`**（与 bundled JSON v2 同形）。 |
| `listBooks()` | 书库摘要列表 **`BookSummary[]`**（含 `edition`、`unitCount`）。 |
| `getBook(bookKey)` | 单册详情 **`BookDetail \| undefined`**。 |
| `getBookCoverUrl(bookKey)` | 封面图 URL（与 `getUnitMedia(…).coverUrl` 相同）；须已 **`init`**；未知书 **throw**。 |
| `listUnits(bookKey)` | 单元列表 **`Unit[]`**；未知书返回 `[]`。 |
| `getUnitMedia(bookKey, unitEntry)` | **`UnitMedia`**（`audioUrl` / `lrcUrl` / `coverUrl` / `bookJsonUrl`）；未知书或单元 **throw**。 |
| `parseLyrics(text, options?)` | LRC 文本 → **`LyricLine[]`**；可选 `useLegacySyncOffset` 对齐旧站 LRCParser。 |
| `activeLyricIndex(lines, timeSec)` | 根据 **`LyricLine[]`** 与当前秒数返回高亮行下标（`-1` 表示无匹配行）。 |

### 对外类型一览

| 类型 | 用途 |
|------|------|
| `Catalog` | `typeof catalog`，用于标注默认导出。 |
| `CatalogIndex` | 完整索引（底层为内部 `NceIndex` 别名）。 |
| `CatalogInitOptions` | `init` 的参数。 |
| `BookSummary` / `BookDetail` | 列表项与详情。 |
| `Unit` | 单元 `entry` + 列表 `index`（`listUnits` 一行）。 |
| `UnitMedia` | 四个可请求 URL。 |
| `LyricLine` | 歌词行（`timeSec`、`english`、`chinese`）；若要单行展示可在 UI 层拼接（例如有译文时 `` `${english} | ${chinese}` ``，否则只用 `english`）。 |
| `ParseLyricsOptions` | `parseLyrics` 的可选参数。 |

---

## 数据与索引维护

- **源文件**：[`nce-r2-index.json`](./nce-r2-index.json)（与 `package.json` 同级）。
- **v2 约定**：每册含 `mirrorRoot`、`coverFile`、`units[]`（单元 basename，与 R2 上 `.mp3` / `.lrc` 键一致）；顶层 `encoding` 描述占位模板。
- **重新生成**：仓库根目录下 `scripts/mirror-nce/`（如 `generate-r2-index.mjs`）默认输出路径已指向本包内该 JSON；改 schema 后需同步更新 **`src/internal/schema.ts`** 与相关测试。

---

## 包内目录（增量开发）

```
packages/catalog/
  CATALOG.md                 # 本文档
  nce-r2-index.json
  package.json
  src/
    index.ts                 # 仅转发 default + 类型
    catalog.ts               # 对外门面、公共类型、bundled 索引加载
    internal/
      schema.ts              # Zod + Nce*
      parse.ts               # parseNceIndex
      resolve.ts             # URL 拼接（encode 路径段）
      queries.ts             # getBookByKey 等
      parse-lrc.ts           # LRC 与时间轴
    __tests__/
      catalog.public.test.ts # 门面行为
      internal/              # 内部模块单测
```

**增量开发建议**：

- 新增 **对外能力**：在 `catalog.ts` 中扩展 `Catalog` 类型与 `catalog` 实现，并在 `index.ts` 的 `export type` 中补充类型；更新本文档与 `catalog.public.test.ts`。
- 仅 **内部算法/校验** 变更：改 `internal/*`，保持 `src/index.ts` 导出不变；补充或调整 `internal` 测试。
- **`__resetCatalogStateForTesting`**（`catalog.ts` 导出）：仅供 Vitest 重置模块级缓存，**勿作公共 API**，也不要从 `index.ts` 导出。

---

## 测试与质量

```bash
pnpm --filter @nce/catalog test:run
pnpm --filter @nce/catalog typecheck
```

---

## 错误与边界

- `getUnitMedia`：未 `init` → 抛出含 `catalog.init` 的 `Error`；未知 `bookKey` / `unitEntry` → 抛出说明性 `Error`。
- `parseLyrics`：非法或非 LRC 行会被跳过；返回数组按时间升序。
- `getIndex()`：依赖 bundled JSON；若 JSON 与 `schema.ts` 不一致，`parseNceIndex` 在首次访问时抛 Zod 错误。

---

## 修订记录（手动维护）

| 日期 | 摘要 |
|------|------|
| 2026-03-21 | 初版：门面 API、`internal` 分层、`CATALOG.md` 建立。 |
| 2026-03-21 | 对外类型去掉 `Dto` 后缀（`BookDetail`、`UnitMedia`、`CatalogIndex` 等）。 |
| 2026-03-21 | `LyricLine` 去掉 `fullText`，单行文案由调用方用 `english` / `chinese` 拼接。 |

后续对本包有行为或导出变更时，请在本表追加一行，并同步更新上文各节。
