import { expect, test } from "@playwright/test";
import { encodeSession, NCE_SESSION_KEY } from "./helpers.ts";
import { step } from "./step.ts";

test.describe("routing", () => {
  test("home redirects to library when no persisted session", async ({
    page,
  }) => {
    await step("注入：清除 nce:app-session", () =>
      page.addInitScript((key) => {
        localStorage.removeItem(key);
      }, NCE_SESSION_KEY),
    );
    await step("访问首页 /", () => page.goto("/"));
    await step("应重定向到 /library", async () => {
      await expect(page).toHaveURL(/\/library$/);
    });
    await step("应看到书库标题", async () => {
      await expect(
        page.getByRole("heading", { name: "New Concept English" }),
      ).toBeVisible();
    });
  });

  test("home redirects to play when session has bookKey", async ({ page }) => {
    await step("先打开 /library 以写入同源 localStorage", () =>
      page.goto("/library"),
    );
    await step("写入会话：bookKey=NCE1", () =>
      page.evaluate(
        ([key, raw]) => localStorage.setItem(key, raw),
        [NCE_SESSION_KEY, encodeSession({ bookKey: "NCE1", unitIndex: 0 })] as const,
      ),
    );
    await step("再次访问 /", () => page.goto("/"));
    await step("应重定向到 /play/NCE1", async () => {
      await expect(page).toHaveURL(/\/play\/NCE1/);
    });
  });

  test("play deep link loads and shows lesson heading", async ({ page }) => {
    const res = await step("打开深链 /play/NCE1?unit=0", () =>
      page.goto("/play/NCE1?unit=0"),
    );
    await step("HTTP 响应应成功", async () => {
      expect(res?.ok()).toBeTruthy();
    });
    await step("课时标题应包含 001/002 或 Excuse Me", async () => {
      await expect(page.getByRole("heading", { level: 2 })).toContainText(
        /001.?002|Excuse Me/i,
      );
    });
    await step("URL 应保留 unit=0", async () => {
      await expect(page).toHaveURL(/\/play\/NCE1\?unit=0/);
    });
  });

  test("invalid unit query is clamped to last lesson", async ({ page }) => {
    await step("打开 /play/NCE1?unit=999999", () =>
      page.goto("/play/NCE1?unit=999999"),
    );
    await step("URL 中 unit 应被夹紧为最后一课 (71)", async () => {
      await expect(page).toHaveURL(/unit=71/);
    });
  });

  test("non-numeric unit query is ignored", async ({ page }) => {
    await step("打开 /play/NCE1?unit=abc", () =>
      page.goto("/play/NCE1?unit=abc"),
    );
    await step("应回退为 unit=0", async () => {
      await expect(page).toHaveURL(/\/play\/NCE1\?unit=0/);
    });
  });

  test("unknown bookKey shows empty lesson list", async ({ page }) => {
    await step("打开无效书 /play/INVALID-BOOK-KEY", () =>
      page.goto("/play/INVALID-BOOK-KEY"),
    );
    await step("侧栏应显示 No lessons.", async () => {
      await expect(page.getByText("No lessons.")).toBeVisible();
    });
    await step("主标题应为占位符 —", async () => {
      await expect(page.getByRole("heading", { level: 2 })).toHaveText("—");
    });
  });

  test("document title", async ({ page }) => {
    await step("打开书库", () => page.goto("/library"));
    await step("标题应为 NCE Player", async () => {
      await expect(page).toHaveTitle("NCE Player");
    });
    await step("打开播放页", () => page.goto("/play/NCE1"));
    await step("标题仍应为 NCE Player", async () => {
      await expect(page).toHaveTitle("NCE Player");
    });
  });
});
