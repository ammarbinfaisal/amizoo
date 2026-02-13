import { chromium, type Browser, type Page } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

type Mode = "auth" | "analyze";

type ComputedSample = {
  selector: string;
  count: number;
  sampleText?: string;
  rect?: { x: number; y: number; width: number; height: number };
  css?: Record<string, string>;
};

type AnalyzeResult = {
  url: string;
  timestamp: string;
  selectors: ComputedSample[];
  toolbarDateText?: string;
  stylesheets: { href: string }[];
  screenshots: { fullPage: string; panel: string };
};

const DEFAULT_BASE_URL = "https://s.amizone.net";
const STORAGE_STATE_PATH = path.resolve(".cache/amizone.storage.json");
const OUT_DIR = path.resolve(".cache/amizone-style-analysis");

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

async function ensureOutDir() {
  await mkdir(OUT_DIR, { recursive: true });
}

async function launchBrowser(): Promise<Browser> {
  const slowMo = Number(getArg("slowMo") ?? "0") || 0;
  return chromium.launch({
    headless: !hasFlag("headed"),
    slowMo,
  });
}

async function gotoBase(page: Page, baseUrl: string) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
}

async function waitForSchedule(page: Page) {
  // Best-effort: various Amizone pages use a Bootstrap panel + FullCalendar.
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
  await page.waitForSelector(".panel, .fc, #calendar", { timeout: 60_000 });
  await page.waitForTimeout(500);
}

async function saveStorageState(page: Page) {
  const ctx = page.context();
  const storage = await ctx.storageState();
  await mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await writeFile(STORAGE_STATE_PATH, JSON.stringify(storage, null, 2), "utf8");
}

async function loadStorageState(): Promise<any> {
  const raw = await readFile(STORAGE_STATE_PATH, "utf8");
  return JSON.parse(raw);
}

function cssPropsToSample(): string[] {
  return [
    "display",
    "position",
    "boxSizing",
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "gap",
    "alignItems",
    "justifyContent",
    "textAlign",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing",
    "color",
    "backgroundColor",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderTopStyle",
    "borderRightStyle",
    "borderBottomStyle",
    "borderLeftStyle",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "borderRadius",
  ];
}

async function sampleSelectors(page: Page, selectors: string[]): Promise<ComputedSample[]> {
  const props = cssPropsToSample();
  return page.evaluate(
    ({ selectors, props }) => {
      const out: ComputedSample[] = [];
      for (const selector of selectors) {
        const els = Array.from(document.querySelectorAll(selector));
        const first = els[0] as HTMLElement | undefined;
        if (!first) {
          out.push({ selector, count: 0 });
          continue;
        }

        const cs = getComputedStyle(first);
        const css: Record<string, string> = {};
        for (const p of props) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          css[p] = String((cs as any)[p] ?? "");
        }

        const r = first.getBoundingClientRect();
        const text = (first.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 140);

        out.push({
          selector,
          count: els.length,
          sampleText: text || undefined,
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          css,
        });
      }
      return out;
    },
    { selectors, props }
  );
}

async function getToolbarDateText(page: Page): Promise<string | undefined> {
  const candidates = [
    ".fc-center h2",
    ".dateTitle",
    ".fc-toolbar .fc-center",
    ".panel-body h2",
    "h2",
  ];
  for (const sel of candidates) {
    const el = await page.$(sel);
    if (!el) continue;
    const txt = (await el.textContent())?.replace(/\s+/g, " ").trim();
    if (txt && /[A-Za-z]/.test(txt) && /\d/.test(txt)) return txt;
  }
  return undefined;
}

async function listStylesheets(page: Page): Promise<{ href: string }[]> {
  return page.evaluate(() => {
    const hrefs = new Set<string>();
    for (const ss of Array.from(document.styleSheets)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const href = (ss as any).href as string | null;
      if (href) hrefs.add(href);
    }
    return Array.from(hrefs).map((href) => ({ href }));
  });
}

async function downloadInterestingCss(page: Page, outDir: string, sheets: { href: string }[]) {
  const interesting = sheets
    .map((s) => s.href)
    .filter((href) => /fullcalendar|calendar|fc-|bootstrap|fontawesome|fa\.css/i.test(href));

  const req = page.request;
  for (const href of interesting) {
    try {
      const resp = await req.get(href);
      if (!resp.ok()) continue;
      const text = await resp.text();
      const safe = href.replace(/[^a-z0-9]+/gi, "_").slice(0, 140);
      await writeFile(path.join(outDir, `sheet_${safe}.css`), text, "utf8");
    } catch {
      // ignore
    }
  }
}

async function screenshotPanel(page: Page, outDir: string) {
  const fullPagePath = path.join(outDir, "full.png");
  const panelPath = path.join(outDir, "panel.png");

  await page.screenshot({ path: fullPagePath, fullPage: true });

  const panel = (await page.$(".panel")) ?? (await page.$("#calendar")) ?? (await page.$(".fc"));
  if (panel) {
    await panel.screenshot({ path: panelPath });
  } else {
    await page.screenshot({ path: panelPath, fullPage: true });
  }

  return { fullPagePath, panelPath };
}

async function runAuth(baseUrl: string) {
  await ensureOutDir();
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  await gotoBase(page, baseUrl);

  // Manual step: user logs in and completes Turnstile naturally.
  // We just wait for the schedule/FC UI to appear, then persist cookies/localStorage.
  await waitForSchedule(page);
  await saveStorageState(page);

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`Saved storageState to ${STORAGE_STATE_PATH}`);
}

async function runAnalyze(baseUrl: string) {
  await ensureOutDir();

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(OUT_DIR, stamp);
  await mkdir(outDir, { recursive: true });

  const storageState = await loadStorageState();
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState,
  });
  const page = await context.newPage();

  await gotoBase(page, baseUrl);
  await waitForSchedule(page);

  const selectors = [
    ".panel",
    ".panel-heading",
    ".panel-title",
    ".panel-body",
    ".fc",
    ".fc-toolbar",
    ".fc-center h2",
    ".fc button",
    ".fc-prev-button",
    ".fc-next-button",
    ".fc-list-table",
    ".fc-list-heading td",
    ".fc-list-item-time",
    ".fc-list-item-marker",
    ".fc-event-dot",
    ".fc-list-item-title",
    ".fc-list-item-title a",
  ];

  const samples = await sampleSelectors(page, selectors);
  const toolbarDateText = await getToolbarDateText(page);
  const stylesheets = await listStylesheets(page);

  const shots = await screenshotPanel(page, outDir);
  await downloadInterestingCss(page, outDir, stylesheets);

  const result: AnalyzeResult = {
    url: page.url(),
    timestamp: now.toISOString(),
    toolbarDateText,
    selectors: samples,
    stylesheets,
    screenshots: {
      fullPage: path.relative(process.cwd(), shots.fullPagePath),
      panel: path.relative(process.cwd(), shots.panelPath),
    },
  };

  await writeFile(path.join(outDir, "analysis.json"), JSON.stringify(result, null, 2), "utf8");

  const mdLines: string[] = [];
  mdLines.push(`# Amizone style analysis`);
  mdLines.push(`- Timestamp: \`${result.timestamp}\``);
  mdLines.push(`- URL: \`${result.url}\``);
  if (toolbarDateText) mdLines.push(`- Toolbar date text: \`${toolbarDateText}\``);
  mdLines.push(`- Screenshots: \`${result.screenshots.fullPage}\`, \`${result.screenshots.panel}\``);
  mdLines.push("");
  mdLines.push(`## Key computed styles`);
  for (const s of result.selectors) {
    mdLines.push(`### \`${s.selector}\``);
    mdLines.push(`- count: \`${s.count}\``);
    if (s.sampleText) mdLines.push(`- sampleText: \`${s.sampleText}\``);
    if (s.rect) mdLines.push(`- rect: \`${Math.round(s.rect.width)}x${Math.round(s.rect.height)}\``);
    if (s.css) {
      const pick = [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "lineHeight",
        "color",
        "backgroundColor",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "borderTopWidth",
        "borderTopColor",
        "borderRadius",
        "width",
        "height",
      ];
      for (const k of pick) {
        if (s.css[k]) mdLines.push(`- ${k}: \`${s.css[k]}\``);
      }
    }
    mdLines.push("");
  }
  mdLines.push(`## Stylesheets`);
  for (const ss of result.stylesheets) {
    mdLines.push(`- \`${ss.href}\``);
  }
  mdLines.push("");
  mdLines.push(`## Notes`);
  mdLines.push(`- If selector counts are 0, the page markup differs; update selector list in \`scripts/amizone-style-analyzer.ts\`.`);
  mdLines.push(`- Downloaded CSS (if matched) is saved next to this report for inspection.`);

  await writeFile(path.join(outDir, "analysis.md"), mdLines.join("\n"), "utf8");

  await browser.close();
  // eslint-disable-next-line no-console
  console.log(`Wrote analysis to ${path.relative(process.cwd(), outDir)}/analysis.md`);
}

async function main() {
  const mode = (getArg("mode") ?? "analyze") as Mode;
  const baseUrl = process.env.AMIZONE_URL ?? DEFAULT_BASE_URL;

  if (mode !== "auth" && mode !== "analyze") {
    throw new Error(`Unknown --mode ${mode}`);
  }

  if (mode === "auth") {
    if (!hasFlag("headed")) {
      // eslint-disable-next-line no-console
      console.log("Tip: run with --headed for manual login");
    }
    await runAuth(baseUrl);
    return;
  }

  // analyze
  try {
    await readFile(STORAGE_STATE_PATH, "utf8");
  } catch {
    throw new Error(`Missing ${STORAGE_STATE_PATH}. Run: bun run amizone:auth`);
  }
  await runAnalyze(baseUrl);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

