import type { IncomingMessage, ServerResponse } from 'node:http';
import { chromium, type Browser } from 'playwright';
import { parseTrustResponse, type TrustReport } from '../src/trust-score.ts';
import { LocalAPIError, readJSON, requireLocalRequest, sendJSON } from './local-api.ts';

import { trustPDFHTML } from './trust-pdf-layout.ts';
export { trustPDFHTML };

// Chromium headers are isolated from document CSS and repeat on every printed page.
const PDF_HEADER = `<div style="width:calc(100% - 26mm);margin:0 13mm;padding:9px 12px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;background:#030b12;border-bottom:1px solid #45ff8a;-webkit-print-color-adjust:exact;print-color-adjust:exact">
  <span style="font-family:'Avenir Next Condensed','Helvetica Neue',Arial,sans-serif;font-size:25px;line-height:1;font-style:italic;font-weight:600;letter-spacing:1.6px;transform:skewX(-10deg) scaleX(.94);transform-origin:left center;color:#45ff8a;text-shadow:1px 1px 0 #17502a">AGENTOPIA</span>
  <span style="font:600 10px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1px;color:#8aa5b8">MCP TRUST ASSESSMENT</span>
</div>`;

/** No endpoint navigation, scripts, remote assets, or browser installation during export. */
export async function renderTrustPDF(report: TrustReport, signal: AbortSignal): Promise<Buffer> {
  let browser: Browser | undefined;
  const close = () => { void browser?.close().catch(() => {}); };
  signal.addEventListener('abort', close, { once: true });
  try {
    signal.throwIfAborted();
    const launch = { headless: true, timeout: 12000 };
    if (process.env.AGENTOPIA_CHROME_PATH) browser = await chromium.launch({ ...launch, executablePath: process.env.AGENTOPIA_CHROME_PATH });
    else {
      try { browser = await chromium.launch({ ...launch, channel: 'chrome' }); }
      catch { signal.throwIfAborted(); browser = await chromium.launch(launch); }
    }
    signal.throwIfAborted();
    const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    await page.setContent(trustPDFHTML(report), { timeout: 10000, waitUntil: 'load' });
    signal.throwIfAborted();
    return await page.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: true,
      headerTemplate: PDF_HEADER, footerTemplate: '<div style="font:9px Arial;width:100%;text-align:center;color:#8aa5b8"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
  } finally { signal.removeEventListener('abort', close); await browser?.close().catch(() => {}); }
}
export function createTrustPDFHandler(render = renderTrustPDF) {
  const jobs = new Set<AbortController>();
  return {
    close() { for (const job of jobs) job.abort(); },
    async handle(req: IncomingMessage, res: ServerResponse) {
      try {
        requireLocalRequest(req);
        if (req.method !== 'POST') throw new LocalAPIError(405, 'Use POST to export a report.');
        if (jobs.size >= 2) throw new LocalAPIError(429, 'Two PDF exports are running. Try again shortly.');
        const payload = await readJSON(req, 6 * 1024 * 1024);
        let report: TrustReport;
        try { report = parseTrustResponse(payload); } catch { throw new LocalAPIError(400, 'Invalid assessment for PDF export.'); }
        if (jobs.size >= 2) throw new LocalAPIError(429, 'Two PDF exports are running. Try again shortly.');
        const controller = new AbortController(); jobs.add(controller);
        const cancel = () => controller.abort(); res.once('close', cancel);
        const deadline = setTimeout(() => controller.abort(), 30000);
        let abort: () => void = () => {};
        try {
          const cancelled = new Promise<never>((_resolve, reject) => {
            abort = () => reject(new LocalAPIError(504, 'PDF export stopped or timed out. Try again.'));
            controller.signal.addEventListener('abort', abort, { once: true });
          });
          const pdf = await Promise.race([render(report, controller.signal), cancelled]);
          if (pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid renderer output');
          if (res.destroyed) return;
          res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': 'attachment; filename="agentopia-mcp-trust-score.pdf"' });
          res.end(pdf);
        } finally {
          clearTimeout(deadline); controller.signal.removeEventListener('abort', abort);
          controller.abort(); jobs.delete(controller); res.removeListener('close', cancel);
        }
      } catch (error) {
        const failure = error instanceof LocalAPIError ? error : new LocalAPIError(500, 'The PDF could not be exported. Try again.');
        sendJSON(res, failure.status, { error: failure.message });
      }
    },
  };
}
