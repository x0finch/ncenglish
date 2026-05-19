import { expect, test } from "@playwright/test";
import { nce1ClassicCard } from "./helpers.ts";
import { step } from "./step.ts";

test.describe("library", () => {
  test("page shell and tabs", async ({ page }) => {
    await step("打开书库 /library", () => page.goto("/library"));
    await step("应看到主导航 Primary", async () => {
      await expect(
        page.getByRole("navigation", { name: "Primary" }),
      ).toBeVisible();
    });
    await step("应看到标题 New Concept English", async () => {
      await expect(
        page.getByRole("heading", { name: "New Concept English" }),
      ).toBeVisible();
    });
    await step("应看到版本 Tab：All / Classic / 85 ed.", async () => {
      await expect(page.getByRole("tab", { name: "All" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Classic" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "85 ed." })).toBeVisible();
    });
    await step("应看到搜索框 Search books", async () => {
      await expect(
        page.getByRole("searchbox", { name: "Search books" }),
      ).toBeVisible();
    });
  });

  test("Classic tab hides 85 edition cards", async ({ page }) => {
    await step("打开书库", () => page.goto("/library"));
    await step("点击 Classic 标签", () =>
      page.getByRole("tab", { name: "Classic" }).click(),
    );
    await step("不应出现 85 版 NCE1 卡片", async () => {
      await expect(
        page.getByRole("button", { name: /NCE1 English Book\(85\)/ }),
      ).toHaveCount(0);
    });
    await step("仍应看到经典版 NCE1", async () => {
      await expect(nce1ClassicCard(page)).toBeVisible();
    });
  });

  test("85 edition tab lists 85 books", async ({ page }) => {
    await step("打开书库", () => page.goto("/library"));
    await step("点击 85 ed. 标签", () =>
      page.getByRole("tab", { name: "85 ed." }).click(),
    );
    await step("应看到 NCE1(85) 书目按钮", async () => {
      await expect(
        page.getByRole("button", { name: /NCE1 English Book\(85\)/ }),
      ).toBeVisible();
    });
  });

  test("search filters books and shows match count", async ({ page }) => {
    await step("打开书库", () => page.goto("/library"));
    const search = page.getByRole("searchbox", { name: "Search books" });
    await step("在搜索框输入 NCE1", () => search.fill("NCE1"));
    await step("应显示匹配数量文案", async () => {
      await expect(page.getByText(/\d+ match(es)?/)).toBeVisible();
    });
    await step("应只剩 2 个 NCE1 相关书目按钮", async () => {
      const classicButtons = page.getByRole("button", {
        name: /^NCE1 English Book/,
      });
      await expect(classicButtons).toHaveCount(2);
    });
  });

  test("clearing search restores grid", async ({ page }) => {
    await step("打开书库", () => page.goto("/library"));
    const search = page.getByRole("searchbox", { name: "Search books" });
    await step("输入无结果关键字 zzznomatch", () => search.fill("zzznomatch"));
    await step("应显示无结果提示", async () => {
      await expect(page.getByText("No books match your search.")).toBeVisible();
    });
    await step("清空搜索框", () => search.clear());
    await step("应恢复书目网格（可见 NCE4）", async () => {
      await expect(page.getByRole("button", { name: /NCE4/ }).first()).toBeVisible();
    });
  });

  test("open classic NCE1 navigates to play", async ({ page }) => {
    await step("打开书库", () => page.goto("/library"));
    await step("点击经典版 NCE1 封面卡片", () => nce1ClassicCard(page).click());
    await step("URL 应进入 /play/NCE1", async () => {
      await expect(page).toHaveURL(/\/play\/NCE1/);
    });
    await step("应看到播放页课时标题 h2", async () => {
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    });
  });
});
