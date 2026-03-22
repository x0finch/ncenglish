import { expect, test } from "@playwright/test";

test("library loads and lists classic section", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
  await expect(page.getByText("Classic", { exact: true })).toBeVisible();
});

test("play route renders for NCE1", async ({ page }) => {
  const res = await page.goto("/play/NCE1");
  expect(res?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Units" })).toBeVisible();
});
