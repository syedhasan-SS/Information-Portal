/**
 * Report Image Renderer
 * Renders an HTML string to a PNG buffer using the system Chrome in headless mode.
 * Works on Linux servers (apt install chromium-browser) and macOS dev machines.
 *
 * Also provides a lightweight in-memory image cache so the PNG can be served
 * temporarily via HTTP (used when Slack files:write scope is unavailable).
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// ── In-memory image cache ─────────────────────────────────────────────────────

interface CachedImage {
  buffer: Buffer;
  expiresAt: number;
}

const imageCache = new Map<string, CachedImage>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Store a PNG buffer and return a short-lived token for HTTP retrieval */
export function cacheReportImage(png: Buffer): string {
  const token = randomUUID();
  imageCache.set(token, { buffer: png, expiresAt: Date.now() + CACHE_TTL_MS });
  setTimeout(() => imageCache.delete(token), CACHE_TTL_MS + 1000);
  return token;
}

/** Retrieve a cached PNG buffer by token (null if expired/missing) */
export function getCachedImage(token: string): Buffer | null {
  const entry = imageCache.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { imageCache.delete(token); return null; }
  return entry.buffer;
}

// ── Chrome path detection ─────────────────────────────────────────────────────

function findChrome(): string | null {
  const candidates = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/local/bin/chromium',
    '/snap/bin/chromium',
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  try {
    const which = execSync(
      'which google-chrome || which chromium-browser || which chromium 2>/dev/null',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (which) return which.split('\n')[0];
  } catch {}
  return null;
}

// ── Renderer ─────────────────────────────────────────────────────────────────

/**
 * Renders an HTML string to a PNG buffer using headless Chrome.
 * @returns PNG Buffer, or null if Chrome is unavailable.
 */
export async function renderHtmlToPng(html: string, width = 900): Promise<Buffer | null> {
  const chrome = findChrome();
  if (!chrome) {
    console.warn('[ReportImage] Chrome not found — cannot render report image');
    return null;
  }

  const ts       = Date.now();
  const htmlPath = join(tmpdir(), `flow-report-${ts}.html`);
  const pngPath  = join(tmpdir(), `flow-report-${ts}.png`);

  try {
    writeFileSync(htmlPath, html, 'utf8');

    const cmd = [
      `"${chrome}"`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      `--screenshot="${pngPath}"`,
      `--window-size=${width},5000`,
      '--hide-scrollbars',
      '--virtual-time-budget=4000',
      `"file://${htmlPath}"`,
    ].join(' ');

    execSync(cmd, { timeout: 20000, stdio: 'ignore' });

    if (!existsSync(pngPath)) {
      console.error('[ReportImage] Chrome ran but produced no output file');
      return null;
    }

    const png = readFileSync(pngPath);
    console.log(`[ReportImage] Screenshot captured: ${png.length} bytes`);
    return png;
  } catch (err: any) {
    console.error('[ReportImage] Screenshot failed:', err.message);
    return null;
  } finally {
    try { unlinkSync(htmlPath); } catch {}
    try { unlinkSync(pngPath); } catch {}
  }
}
