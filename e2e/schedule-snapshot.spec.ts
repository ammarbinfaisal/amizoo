import { test, expect } from "playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

test.describe("Schedule snapshot", () => {
  test("renders the Amizone-style schedule table", async ({ page }) => {
    await page.goto("/test/schedule-snapshot");

    // Wait for the snapshot component to render
    const snapshot = page.getByTestId("visible-schedule-snapshot").locator(".amizone-schedule-snapshot");
    await expect(snapshot).toBeVisible({ timeout: 10_000 });

    // Verify key elements
    await expect(snapshot.locator(".widget-header h4")).toHaveText("My Classes");
    await expect(snapshot.locator(".fc-center h2")).toHaveText("February 13, 2026");
    await expect(snapshot.locator(".fc-list-heading-main")).toHaveText("Friday");

    // Verify all 5 class rows render
    const rows = snapshot.locator(".fc-list-item");
    await expect(rows).toHaveCount(5);

    // Verify time format is multiline (HH:MM / - / HH:MM)
    const firstTime = rows.first().locator(".fc-list-item-time");
    await expect(firstTime).toContainText("09:15");
    await expect(firstTime).toContainText("10:10");

    // Verify dot colors: first class is PRESENT (green), rest are PENDING (blue)
    const firstDot = rows.first().locator(".fc-event-dot");
    const firstDotBg = await firstDot.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // #28a745 → rgb(40, 167, 69)
    expect(firstDotBg).toBe("rgb(40, 167, 69)");

    const secondDot = rows.nth(1).locator(".fc-event-dot");
    const secondDotBg = await secondDot.evaluate(
      (el) => getComputedStyle(el).backgroundColor
    );
    // #3a87ad → rgb(58, 135, 173)
    expect(secondDotBg).toBe("rgb(58, 135, 173)");

    // Take a full-component screenshot for visual comparison
    await fs.mkdir("test-results", { recursive: true });
    await snapshot.screenshot({
      path: path.join("test-results", "schedule-snapshot.png"),
    });
  });

  test("column proportions match original layout", async ({ page }) => {
    await page.goto("/test/schedule-snapshot");
    const snapshot = page.getByTestId("visible-schedule-snapshot").locator(".amizone-schedule-snapshot");
    await snapshot.waitFor({ timeout: 10_000 });

    // Measure column widths of the first data row
    const firstRow = snapshot.locator(".fc-list-item").first();
    const timeCol = firstRow.locator(".fc-list-item-time");
    const markerCol = firstRow.locator(".fc-list-item-marker");
    const titleCol = firstRow.locator(".fc-list-item-title");

    const timeBox = await timeCol.boundingBox();
    const markerBox = await markerCol.boundingBox();
    const titleBox = await titleCol.boundingBox();

    expect(timeBox).toBeTruthy();
    expect(markerBox).toBeTruthy();
    expect(titleBox).toBeTruthy();

    const totalWidth = timeBox!.width + markerBox!.width + titleBox!.width;

    // Time column should be ~14% of total (original Amizone is ~14-15%)
    const timePct = (timeBox!.width / totalWidth) * 100;
    expect(timePct).toBeGreaterThan(10);
    expect(timePct).toBeLessThan(20);

    // Marker column should be ~5% of total
    const markerPct = (markerBox!.width / totalWidth) * 100;
    expect(markerPct).toBeGreaterThan(2);
    expect(markerPct).toBeLessThan(10);

    // Title column should be the majority (>70%)
    const titlePct = (titleBox!.width / totalWidth) * 100;
    expect(titlePct).toBeGreaterThan(70);
  });
});
