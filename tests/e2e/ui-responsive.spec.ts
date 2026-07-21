import { expect, test } from "@playwright/test";

const widths = [360, 390, 430, 768, 1280, 1440];
const publicPaths = ["/", "/login", "/signup"];

for (const width of widths) {
  test(`public screens fit ${width}px without horizontal scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    for (const path of publicPaths) {
      await page.goto(path);

      const sizes = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));

      expect(sizes.content, `${path} should fit within a ${width}px viewport`).toBeLessThanOrEqual(sizes.viewport);
    }
  });
}
