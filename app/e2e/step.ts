import { test } from "@playwright/test";

/**
 * Wraps work in Playwright `test.step` (visible in HTML report, trace, UI mode).
 * Set PLAYWRIGHT_STEP_LOG=1 to also print each step to the terminal while tests run.
 */
export async function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  if (process.env.PLAYWRIGHT_STEP_LOG === "1") {
    // eslint-disable-next-line no-console -- intentional e2e narration for headed runs
    console.log(`\n▶ ${title}`);
  }
  return test.step(title, body);
}
