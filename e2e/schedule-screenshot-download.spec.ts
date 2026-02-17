import { test, expect } from "playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function sha256(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

test.describe("Schedule screenshot download", () => {
  test("downloads a stable PNG via html2canvas", async ({ page }) => {
    if (process.env.E2E_LOCAL_AMIZONE === "1") {
      const res = await page.request.get("http://localhost:8080/health");
      expect(res.ok()).toBeTruthy();
    }

    await page.goto("/test/schedule-snapshot");

    const btn = page.getByTestId("schedule-screenshot").first();
    await expect(btn).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      btn.click(),
    ]);

    const downloadedPath = await download.path();
    expect(downloadedPath, "download.path() should be available (acceptDownloads=true)").toBeTruthy();

    const downloadedBytes = await fs.readFile(downloadedPath!);
    expect(downloadedBytes.byteLength).toBeGreaterThan(10_000);

    // Golden image captured from the UI; keep this updated when snapshot CSS changes intentionally.
    const goldenPath = path.resolve("e2e/fixtures/schedule-2026-02-13.png");
    if (process.env.UPDATE_GOLDEN === "1") {
      await fs.writeFile(goldenPath, downloadedBytes);
      return;
    }

    const goldenBytes = await fs.readFile(goldenPath);

    expect(sha256(downloadedBytes)).toBe(sha256(goldenBytes));
  });
});
