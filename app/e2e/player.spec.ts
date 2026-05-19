import { expect, test, type Page } from "@playwright/test";
import { step } from "./step.ts";

async function openPlayNce1(page: Page) {
  await step("打开 NCE1 第 1 课 /play/NCE1?unit=0", () =>
    page.goto("/play/NCE1?unit=0"),
  );
  await step("课时标题应包含 Excuse Me", async () => {
    await expect(page.getByRole("heading", { level: 2 })).toContainText(
      /Excuse Me/i,
    );
  });
  await step("等待首条歌词 Seek 按钮出现", async () => {
    await expect(
      page.getByRole("button", { name: /^Seek to / }).first(),
    ).toBeVisible({ timeout: 30_000 });
  });
}

test.describe("player", () => {
  test("back to library from sidebar", async ({ page }) => {
    await step("打开 /play/NCE1", () => page.goto("/play/NCE1"));
    await step("点击侧栏 Back to library", () =>
      page.getByRole("button", { name: "Back to library" }).click(),
    );
    await step("应回到 /library", async () => {
      await expect(page).toHaveURL(/\/library$/);
    });
  });

  test("mobile sidebar toggles and can select a lesson", async ({ page }) => {
    await step("设为手机视口 390×844", () =>
      page.setViewportSize({ width: 390, height: 844 }),
    );
    await step("打开 /play/NCE1?unit=0", () => page.goto("/play/NCE1?unit=0"));
    await step("点击 Toggle Sidebar 打开抽屉", () =>
      page.getByRole("button", { name: "Toggle Sidebar" }).click(),
    );
    const sheet = page.getByRole("dialog", { name: "Sidebar" });
    await step("在侧栏中点击第 2 课 003&004.Sorry, Sir", () =>
      sheet
        .getByRole("button", { name: "003&004.Sorry, Sir", exact: true })
        .click(),
    );
    await step("主区域标题应变为 Sorry 课", async () => {
      await expect(
        page.getByRole("heading", { name: /003&004|Sorry, Sir/i }),
      ).toBeVisible();
    });
    await step("URL unit 应为 1", async () => {
      await expect(page).toHaveURL(/unit=1/);
    });
  });

  test("desktop lesson list switches unit and URL", async ({ page }) => {
    await step("设为桌面视口 1280×720", () =>
      page.setViewportSize({ width: 1280, height: 720 }),
    );
    await step("打开 /play/NCE1?unit=0", () => page.goto("/play/NCE1?unit=0"));
    await step("在侧栏点击 005&006.Nice to Meet You", () =>
      page
        .getByRole("button", { name: "005&006.Nice to Meet You", exact: true })
        .click(),
    );
    await step("标题应包含 Nice to Meet You", async () => {
      await expect(page.getByRole("heading", { level: 2 })).toContainText(
        /Nice to Meet You/i,
      );
    });
    await step("URL unit 应为 2", async () => {
      await expect(page).toHaveURL(/unit=2/);
    });
  });

  test("lyric lines are seek targets with accessible names", async ({
    page,
  }) => {
    await openPlayNce1(page);
    await step("应存在带 Excuse me 的 Seek 歌词按钮", async () => {
      const line = page.getByRole("button", {
        name: /Seek to 0:0[1-9].*Excuse me/i,
      });
      await expect(line.first()).toBeVisible();
    });
  });

  test("clicking a lyric starts playback (pause control appears)", async ({
    page,
  }) => {
    await openPlayNce1(page);
    await step("点击第一条非 0:00 的歌词行", () =>
      page
        .getByRole("button", {
          name: /Seek to 0:0[1-9]/,
        })
        .first()
        .click(),
    );
    await step("audio.currentTime 应大于 0（已开始播放）", async () => {
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const a = document.querySelector("audio");
            return a?.currentTime ?? 0;
          }),
        )
        .toBeGreaterThan(0.2);
    });
    await step("运输条应出现 Pause 按钮", async () => {
      await expect(
        page.getByRole("button", { name: "Pause", exact: true }),
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test("lyric tap mode toggles aria-label", async ({ page }) => {
    await openPlayNce1(page);
    const toggle = page.getByRole("button", {
      name: /Lyric tap mode:/,
    });
    const before = await step("读取歌词点击模式切换按钮的 aria-label", () =>
      toggle.getAttribute("aria-label"),
    );
    await step("第一次点击切换歌词点击模式", () => toggle.click());
    const after = await toggle.getAttribute("aria-label");
    await step("aria-label 应与切换前不同", async () => {
      expect(before).not.toEqual(after);
    });
    await step("再次点击切回原模式", () => toggle.click());
    await step("aria-label 应恢复初始值", async () => {
      await expect(toggle).toHaveAttribute("aria-label", before ?? "");
    });
  });

  test("play and pause toggle", async ({ page }) => {
    await openPlayNce1(page);
    const transport = page.getByRole("button", { name: "Play", exact: true });
    await step("点击 Play", () => transport.click());
    await step("应出现 Pause", async () => {
      await expect(
        page.getByRole("button", { name: "Pause", exact: true }),
      ).toBeVisible({
        timeout: 15_000,
      });
    });
    await step("点击 Pause", () =>
      page.getByRole("button", { name: "Pause", exact: true }).click(),
    );
    await step("应再次出现 Play", async () => {
      await expect(
        page.getByRole("button", { name: "Play", exact: true }),
      ).toBeVisible();
    });
  });

  test("next and previous lesson", async ({ page }) => {
    await step("打开 /play/NCE1?unit=1", () => page.goto("/play/NCE1?unit=1"));
    await step("标题应包含 Sorry", async () => {
      await expect(page.getByRole("heading", { level: 2 })).toContainText(
        /Sorry/i,
      );
    });
    await step("点击 Previous lesson", () =>
      page.getByRole("button", { name: "Previous lesson" }).click(),
    );
    await step("URL 应为 unit=0", async () => {
      await expect(page).toHaveURL(/unit=0/);
    });
    await step("标题应回到 Excuse Me", async () => {
      await expect(page.getByRole("heading", { level: 2 })).toContainText(
        /Excuse Me/i,
      );
    });
    await step("点击 Next lesson", () =>
      page.getByRole("button", { name: "Next lesson" }).click(),
    );
    await step("URL 应回到 unit=1", async () => {
      await expect(page).toHaveURL(/unit=1/);
    });
  });

  test("previous lesson at first unit does not leave book", async ({
    page,
  }) => {
    await step("打开 /play/NCE1?unit=0", () => page.goto("/play/NCE1?unit=0"));
    const title = page.getByRole("heading", { level: 2 });
    const before = await step("记录当前课时标题文本", () => title.textContent());
    await step("在第一课点击 Previous lesson", () =>
      page.getByRole("button", { name: "Previous lesson" }).click(),
    );
    await step("URL 仍应为 unit=0", async () => {
      await expect(page).toHaveURL(/unit=0/);
    });
    await step("标题文本应不变", async () => {
      await expect(title).toHaveText(before ?? "");
    });
  });

  test("track play mode cycles in aria-label", async ({ page }) => {
    await openPlayNce1(page);
    const btn = page.getByRole("button", {
      name: /Sequential play|Reverse course order|Repeat one/,
    });
    await step("初始应为 Sequential play", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Sequential play/);
    });
    await step("点击切换为 Reverse course order", () => btn.click());
    await step("aria-label 应为 Reverse course order", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Reverse course order/);
    });
    await step("点击切换为 Repeat one", () => btn.click());
    await step("aria-label 应为 Repeat one", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Repeat one/);
    });
    await step("点击回到 Sequential play", () => btn.click());
    await step("aria-label 应回到 Sequential play", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Sequential play/);
    });
  });

  test("playback rate cycles", async ({ page }) => {
    await openPlayNce1(page);
    const btn = page.getByRole("button", { name: /Playback speed/ });
    await step("初始倍速应为 1x", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Playback speed 1x/);
    });
    await step("点击倍速：1 → 1.25", () => btn.click());
    await step("应为 1.25x", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Playback speed 1\.25x/);
    });
    await step("点击倍速：1.25 → 1.5", () => btn.click());
    await step("应为 1.5x", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Playback speed 1\.5x/);
    });
    await step("点击倍速：1.5 → 2", () => btn.click());
    await step("应为 2x", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Playback speed 2x/);
    });
    await step("点击倍速：2 → 0.5（循环）", () => btn.click());
    await step("应为 0.5x", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Playback speed 0\.5x/);
    });
  });

  test("translation mode cycles aria-label", async ({ page }) => {
    await openPlayNce1(page);
    const btn = page.getByRole("button", {
      name: /Click to cycle display mode$/,
    });
    const first = await step("记录翻译显示模式按钮初始 aria-label", () =>
      btn.getAttribute("aria-label"),
    );
    await step("切换翻译模式 ×1", () => btn.click());
    await step("aria-label 应变", async () => {
      await expect(btn).not.toHaveAttribute("aria-label", first ?? "");
    });
    await step("再点击三次应回到初始模式", async () => {
      await btn.click();
      await btn.click();
      await btn.click();
    });
    await step("aria-label 应恢复", async () => {
      await expect(btn).toHaveAttribute("aria-label", first ?? "");
    });
  });

  test("seek slider updates after audio metadata loads", async ({ page }) => {
    await openPlayNce1(page);
    const seek = page.getByRole("slider", { name: "Seek" });
    await step("等待 Seek 滑块 max（时长）加载完成", async () => {
      await expect
        .poll(async () =>
          Number((await seek.evaluate((el) => (el as HTMLInputElement).max)) || 0),
        )
        .toBeGreaterThan(5);
    });
    await step("将滑块拖到约 25% 位置", () =>
      seek.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.value = String(Number(input.max) * 0.25);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    );
    await step("滑块 value 应明显大于 0", async () => {
      await expect
        .poll(async () =>
          seek.evaluate((el) => Number((el as HTMLInputElement).value) || 0),
        )
        .toBeGreaterThan(1);
    });
  });

  test("reload keeps book and unit from URL", async ({ page }) => {
    await step("打开 /play/NCE1?unit=3", () => page.goto("/play/NCE1?unit=3"));
    await step("确认 URL 含 unit=3", async () => {
      await expect(page).toHaveURL(/unit=3/);
    });
    await step("刷新页面", () => page.reload());
    await step("刷新后 URL 仍应为 unit=3", async () => {
      await expect(page).toHaveURL(/unit=3/);
    });
    await step("应仍显示课时标题", async () => {
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    });
  });

  test("reload keeps playback rate preference", async ({ page }) => {
    await openPlayNce1(page);
    const btn = page.getByRole("button", { name: /Playback speed/ });
    await step("点击一次倍速到 1.25x", () => btn.click());
    await step("确认 aria-label 为 1.25x", async () => {
      await expect(btn).toHaveAttribute("aria-label", /Playback speed 1\.25x/);
    });
    await step("刷新页面", () => page.reload());
    await step("刷新后倍速按钮仍应为 1.25x", async () => {
      await expect(
        page.getByRole("button", { name: /Playback speed 1\.25x/ }),
      ).toBeVisible();
    });
  });
});
