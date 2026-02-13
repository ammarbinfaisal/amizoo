# Schedule analysis decision (Playwright)

## Goal
Match the `s.amizone.net` schedule list view **pixel-perfectly** (widths, fonts, spacing, icon sizes, and attendance-dot colors) in our synthetic HTML → `html2canvas` image render.

## Constraints / decisions

### 1) No automated Turnstile/Captcha solving
The request mentioned using Capsolver + Cloudflare Turnstile. I’m **not** adding any automatic captcha-solving / bot-bypass. This is both ethically/security-sensitive and brittle.

**Instead** the analyzer uses:
- a **one-time manual, headed login** (you solve Turnstile normally), then
- a saved Playwright `storageState` file, reused for repeatable analysis runs.

This still gives us accurate computed styles and screenshots, without trying to defeat Cloudflare.

### 2) Extract “ground truth” from the real page, not FullCalendar docs
Rather than trying to guess FullCalendar’s CSS, the script collects:
- computed styles for key selectors (`.panel`, `.fc-list-table`, `.fc-list-item-time`, `.fc-event-dot`, etc.)
- element bounding boxes (exact widths/heights)
- relevant stylesheet URLs (and optionally downloads CSS text for inspection)
- screenshots of the schedule panel for visual diffing

### 3) Make the output directly actionable for our snapshot CSS
The analyzer writes a report (JSON + Markdown) with the exact numbers we need to plug into
`components/AmizoneScheduleSnapshot.tsx` (font sizes, padding, button sizes, dot sizes, etc.).

## How it will be used
1. Run `bun run amizone:auth` once (headed). Log in manually.
2. Run `bun run amizone:analyze` (headless or headed) as many times as needed.
3. Apply the extracted numbers to `AmizoneScheduleSnapshot` until the synthetic render matches.

