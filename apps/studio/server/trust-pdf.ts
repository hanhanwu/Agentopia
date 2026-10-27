import type { IncomingMessage, ServerResponse } from 'node:http';
import { chromium, type Browser } from 'playwright';
import { parseTrustResponse, OUTCOME_GROUPS, type TrustReport } from '../src/trust-score.ts';
import { projectTrustScore } from '../src/trust-projection.ts';
import { escapeMarkup } from '../src/markup.ts';
import { buildTrustPresentation } from './trust-presentation.ts';
import { LocalAPIError, readJSON, requireLocalRequest, sendJSON } from './local-api.ts';

const esc = (value: unknown) => escapeMarkup(String(value));
export function trustPDFHTML(report: TrustReport) {
  const view = projectTrustScore(report.summary.total_score, report.summary.configured_maximum, report.status);
  const presentation = buildTrustPresentation(report);
  const items = (group: 'passed' | 'failed' | 'tips') => presentation[group].length
    ? `<ul>${presentation[group].map(item => `<li>${esc(item.text)}<small>Rules: ${esc(item.rule_ids.join(', '))}; evidence: ${esc(item.evidence_ids.join(', '))}</small></li>`).join('')}</ul>`
    : `<p>${esc(presentation[`${group}_empty`])}</p>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Agentopia assessment</title><style>
    @page { size: A4; margin: 18mm; } body { font: 11px/1.55 Arial,sans-serif; color:#142839; }
    h1 { font-size:26px; } h2 { margin-top:24px; font-size:18px; } h3 { font-size:13px; }
    p,li,pre,small { overflow-wrap:anywhere; } pre { white-space:pre-wrap; font:9px/1.5 monospace; }
    small { display:block; color:#425b70; } h2,h3 { break-after:avoid; } li { margin-bottom:8px; }
    .rule { border-top:1px solid #c6d2dc; padding-top:8px; } .endpoint { font-family:monospace; }
    </style></head><body><h1>Agentopia MCP Trust Assessment</h1>
    <p class="endpoint">${esc(report.subject.endpoint)}</p><p>Score: ${esc(view.score ?? '—')} / ${esc(report.summary.configured_maximum)} configured points · ${esc(view.rating ?? 'Unavailable')}</p>
    <p>Assessed maximum: ${esc(report.summary.assessed_maximum)}. Configured maximum: ${esc(report.summary.configured_maximum)}. Rule pass percentage: ${esc(report.summary.pass_percentage ?? '—')}%.</p>
    <p>${OUTCOME_GROUPS.map(group => `${group}: ${report.summary[`${group}_rules`]}`).join(' · ')}</p>
    <p>Assessment status: ${esc(report.status)}. Collection status: ${esc(report.collection_status ?? 'Not reported')}.</p>
    <p>This exports the supplied current assessment; it does not recollect or independently authenticate it. Structural and protocol checks do not establish tool execution, task competence, or comprehensive security. Skipped and unknown checks are not passes. The rating uses equal quarters of configured points.</p>
    <h2>Limitations</h2><ul>${(report.limitations ?? []).map(value => `<li>${esc(value)}</li>`).join('') || '<li>No additional collection limitations reported.</li>'}</ul>
    <h2>Reason — passed</h2>${items('passed')}<h2>Reason — failed</h2>${items('failed')}<h2>Improvement Tips</h2>${items('tips')}
    <h2>Provenance</h2><pre>${esc(JSON.stringify({subject: report.subject, observed_at: report.observed_at, scored_at: report.scored_at, engine_version: report.engine_version, policy: report.policy}, null, 2))}</pre>
    <h2>Complete rule evidence</h2>${OUTCOME_GROUPS.map(group => `<h2>${esc(group)}</h2>${report.rules[group].map(rule => `<section class="rule"><h3>${esc(rule.name)} · ${esc(rule.id)}</h3><p>${esc(rule.reason)}</p><pre>${esc(JSON.stringify(rule, null, 2))}</pre></section>`).join('')}`).join('')}
    <h2>Observations</h2><pre>${esc(JSON.stringify(report.observations, null, 2))}</pre></body></html>`;
}

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
      headerTemplate: '<span></span>', footerTemplate: '<div style="font:9px Arial;width:100%;text-align:center"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
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
