import './entry-flow.css';
import {
  fetchTrustReport, OUTCOME_GROUPS, resolveTrustInput,
  type OutcomeGroup, type SubjectType, type TrustReport,
} from './trust-score.ts';

import { escapeMarkup as escapeHTML } from './markup.ts';

import { projectTrustScore, quarter, RATING_COLORS } from './trust-projection.ts';
const groupName = (group: OutcomeGroup) => group[0].toUpperCase() + group.slice(1);
const shield = '<path d="M16 3 27 7v9c0 7-11 13-11 13S5 23 5 16V7Z M10 16l4 4 8-9"/>';
const globe = '<circle cx="16" cy="16" r="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path d="M4 16h24"/>';
const icon = (paths: string) => `<svg class="entry-action__icon" viewBox="0 0 32 32" aria-hidden="true">${paths}</svg>`;

export function mountEntryFlow(options: {
  root: HTMLElement;
  serviceArtwork: (variant: 1 | 2 | 3 | 4 | 5 | 6 | 7) => string;
  mcpLogo: string;
  onWorld: () => void;
}) {
  const { root, serviceArtwork, mcpLogo, onWorld } = options;
  const host = document.createElement('div');
  host.className = 'entry-flow';
  root.prepend(host);
  const scouts = [
    [108, 225, '#ffad5c'], [1212, 243, '#aa8cff'], [252, 675, '#9be477'],
    [1068, 657, '#61c7ff'], [660, 756, '#ff6fae'], [396, 135, '#5f8dff'], [924, 144, '#ffd166'],
  ] as const;
  host.innerHTML = `
    <section class="entry-splash" aria-label="Agentopia introduction">
      <div class="world-intro__logo" data-text="AGENTOPIA" aria-hidden="true">AGENTOPIA</div>
    </section>
    <section class="entry-portal" aria-label="Agentopia home" hidden>
      <div class="panel-heading"><h2 data-text="AGENTOPIA">AGENTOPIA</h2></div>
      <div class="entry-agent-field" aria-hidden="true">${scouts.map(([x, y, color], i) => `
        <span class="entry-scout" style="left:${x / 14.4}%;top:${y / 9}%;color:${color};--hop-delay:${-i * .42}s">
          <svg viewBox="0 0 276 270">${serviceArtwork((i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7)}</svg>
        </span>`).join('')}
      </div>
      <div class="entry-actions">
        <button class="gold-button entry-action" type="button" data-open-trust>${icon(shield)}<span>Check Trust Score</span></button>
        <button class="gold-button entry-action" type="button" data-open-world>${icon(globe)}<span>Understand Agents’ World</span></button>
      </div>
    </section>
    <main class="studio trust-screen" aria-label="Check Trust Score" hidden>
      <section class="world-panel" aria-label="Agentopia trust input">
        <div class="panel-heading"><h2 data-text="AGENTOPIA">AGENTOPIA</h2></div>
        <div class="world-frame trust-world-frame">
          <button class="gold-button trust-home" type="button" data-trust-home>← Home</button>
          <form class="trust-form" novalidate>
            <div class="trust-subjects" role="group" aria-label="Subject type">
              <button class="gold-button trust-subject" type="button" data-subject="agent" aria-pressed="false">
                <svg viewBox="0 0 276 270" aria-hidden="true">${serviceArtwork(4)}</svg><span>Agent</span>
              </button>
              <button class="gold-button trust-subject" type="button" data-subject="mcp" aria-pressed="false">
                <img src="${mcpLogo}" alt=""/><span>MCP Server</span>
              </button>
            </div>
            <div class="trust-input-slot"><input class="trust-input" name="identifier" aria-label="Identifier" placeholder="Example: https://server.com/mcp" autocomplete="off" spellcheck="false" required hidden disabled/></div>
            <div class="trust-submit-slot"><button class="gold-button trust-submit" type="submit" hidden disabled>Check Trust Score</button></div>
          </form>
        </div>
      </section>
      <aside class="inspector-panel" aria-labelledby="trust-skynet-title">
        <div class="inspector-heading"><h2 id="trust-skynet-title" data-text="SKYNET">SKYNET</h2></div>
        <div class="trust-report" aria-live="polite"></div>
      </aside>
    </main>`;

  const portal = host.querySelector<HTMLElement>('.entry-portal')!;
  const splash = host.querySelector<HTMLElement>('.entry-splash')!;
  const screen = host.querySelector<HTMLElement>('.trust-screen')!;
  const form = host.querySelector<HTMLFormElement>('.trust-form')!;
  const input = form.querySelector<HTMLInputElement>('.trust-input')!;
  const submit = form.querySelector<HTMLButtonElement>('.trust-submit')!;
  const report = host.querySelector<HTMLElement>('.trust-report')!;
  let subject: SubjectType | null = null;
  let gaugeFrame = 0;
  let exportPending: AbortController | null = null;
  let reportData: TrustReport | null = null;
  let pending: AbortController | null = null;

  function updateForm() {
    form.querySelectorAll<HTMLButtonElement>('[data-subject]').forEach(button => {
      button.classList.toggle('is-inactive', subject !== null && button.dataset.subject !== subject);
      button.setAttribute('aria-pressed', String(button.dataset.subject === subject));
    });
    input.hidden = subject === null;
    input.disabled = subject === null;
    submit.hidden = subject === null || input.value.trim().length === 0;
    submit.disabled = submit.hidden || pending !== null;
  }

  function clearReport() {
    pending?.abort(); pending = null;
    cancelAnimationFrame(gaugeFrame); exportPending?.abort(); exportPending = null;
    reportData = null; report.setAttribute('aria-busy', 'false');
    report.replaceChildren();
    report.dataset.state = 'empty';
    updateForm();
  }

  function showPortal(focus = true) {
    splash.hidden = true; screen.hidden = true; portal.hidden = false; host.hidden = false;
    if (focus) portal.querySelector<HTMLButtonElement>('[data-open-trust]')!.focus({ preventScroll: true });
  }
  const splashTimer = window.setTimeout(() => showPortal(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1300);

  function renderReport(data: TrustReport) {
    reportData = data;
    const { summary, subject: target, presentation } = data;
    const view = projectTrustScore(summary.total_score, summary.configured_maximum, data.status);
    const list = (group: 'passed' | 'failed' | 'tips') => presentation?.[group].length
      ? group === 'tips' ? presentation[group].map(item => `<p>${escapeHTML(item.text)}</p>`).join('')
        : `<ul>${presentation[group].map(item => `<li>${escapeHTML(item.text)}</li>`).join('')}</ul>`
      : `<p>${escapeHTML(presentation?.[`${group}_empty`] ?? 'No assessment details available.')}</p>`;
    report.dataset.state = 'ready';
    report.innerHTML = `
      <header class="trust-report__header"><p class="trust-report__endpoint">${escapeHTML(target.endpoint)}</p></header>
      <div class="trust-report__body">
      <svg class="trust-score-gauge" viewBox="0 0 500 314" role="img" aria-label="${escapeHTML(`Score ${view.score ?? 'unavailable'} of ${view.maximum} configured points. ${view.rating ?? ''}. ${data.status} assessment. Assessed maximum ${summary.assessed_maximum}. ${(data.limitations ?? []).join(' ')}`)}">
        <defs><path id="score-arc" d="M78 272 A172 172 0 0 1 422 272" pathLength="100"/></defs>
        <path d="M64 272 A186 186 0 0 1 436 272 A14 14 0 0 1 408 272 A158 158 0 0 0 92 272 A14 14 0 0 1 64 272 Z" fill="none" stroke="#7d9cae" stroke-opacity=".55" stroke-width="1.5"/>
        <g fill="none" stroke-linecap="round" class="trust-liquid" visibility="hidden">
          <use href="#score-arc" class="trust-liquid__fill" stroke-width="28"/>
          <use href="#score-arc" class="trust-liquid__sheen" transform="translate(0 -5)" stroke="white" stroke-opacity=".23" stroke-width="3"/>
        </g>
        <g fill="none" stroke="#8aa5b8" stroke-opacity=".8" stroke-width="1.5">
          <path d="M138.2771 160.2771 L118.4781 140.4781 M250 114 L250 86 M361.7229 160.2771 L381.5219 140.4781"/>
        </g>
        <g fill="#8aa5b8" font-size="14" font-weight="600" text-anchor="middle">
          <text x="48.5943" y="180.575">Poor</text><text x="166.575" y="62.5943">Fair</text>
          <text x="333.425" y="62.5943">Good</text><text x="451.4057" y="180.575">Very Good</text>
        </g>
        <text x="250" y="238" text-anchor="middle" fill="#c9efff" font-size="68" font-weight="750">${view.score ?? '—'}</text>
        <text x="250" y="286" text-anchor="middle" fill="#61c7ff" font-size="36" font-weight="600">${view.rating ?? ''}</text>
        <g fill="#8aa5b8" font-size="18" font-weight="600" text-anchor="middle"><text x="78" y="312">0</text><text x="422" y="312">${view.maximum}</text></g>
      </svg>
      <div class="trust-outcomes" aria-label="Rule outcomes">${OUTCOME_GROUPS.map(group => `
        <div class="trust-outcome trust-outcome--${group}"><strong>${summary[`${group}_rules`]}</strong><span>${groupName(group)}</span></div>`).join('')}
      </div>
      <details class="trust-disclosure trust-reason"><summary>Reason</summary><div class="trust-disclosure__content">
        <section class="trust-reason__passed" aria-label="Passed checks">${list('passed')}</section>
        <section class="trust-reason__failed" aria-label="Failed checks">${list('failed')}</section>
      </div></details>
      <details class="trust-disclosure trust-tips"><summary>Improvement Tips</summary><div class="trust-disclosure__content">${list('tips')}</div></details>
      <div class="trust-report__footer"><button class="gold-button trust-download" type="button" data-download-report>↓ PDF</button></div>
      <p class="trust-export-error" role="status" hidden></p></div>`;
    cancelAnimationFrame(gaugeFrame);
    const liquid = report.querySelector<SVGGElement>('.trust-liquid')!;
    const fill = report.querySelector<SVGUseElement>('.trust-liquid__fill')!;
    const sheen = report.querySelector<SVGUseElement>('.trust-liquid__sheen')!;
    const draw = (progress: number) => {
      liquid.setAttribute('visibility', progress > 0 ? 'visible' : 'hidden');
      fill.setAttribute('stroke', RATING_COLORS[quarter(progress)]);
      for (const path of [fill, sheen]) {
        path.setAttribute('stroke-dasharray', '100 100');
        path.setAttribute('stroke-dashoffset', String(100 - progress * 100));
      }
    };
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !view.ratio) draw(view.ratio);
    else {
      const start = performance.now();
      const animate = (now: number) => {
        const t = Math.min(1, (now - start) / 2400); draw(t * view.ratio);
        if (t < 1) gaugeFrame = requestAnimationFrame(animate);
      };
      draw(0); gaugeFrame = requestAnimationFrame(animate);
    }
  }

  function showStatus(message: string, state = 'error') {
    report.dataset.state = state;
    report.innerHTML = `<div class="trust-unavailable"><h3 id="trust-report-message">${escapeHTML(message)}</h3></div>`;
  }

  host.querySelector('[data-open-trust]')!.addEventListener('click', () => {
    subject = null; input.value = ''; input.removeAttribute('aria-invalid');
    input.placeholder = 'Example: https://server.com/mcp';
    clearReport();
    portal.hidden = true; screen.hidden = false;
    form.querySelector<HTMLButtonElement>('[data-subject]')!.focus({ preventScroll: true });
  });
  host.querySelector('[data-open-world]')!.addEventListener('click', () => {
    window.clearTimeout(splashTimer); host.hidden = true; onWorld();
  });
  host.querySelector('[data-trust-home]')!.addEventListener('click', () => { clearReport(); showPortal(); });
  form.querySelectorAll<HTMLButtonElement>('[data-subject]').forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.subject as SubjectType;
    subject = subject === selected ? null : selected;
    input.value = ''; input.removeAttribute('aria-invalid');
    input.placeholder = subject === 'agent' ? 'Example: agent.example.com' : 'Example: https://server.com/mcp';
    clearReport();
    input.focus({ preventScroll: true });
  }));
  input.addEventListener('input', () => {
    input.removeAttribute('aria-invalid'); clearReport();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (subject === null || !input.value.trim() || pending !== null) return;
    clearReport();
    const result = resolveTrustInput(subject, input.value);
    if (result.status !== 'ready') {
      if (result.status === 'invalid') input.setAttribute('aria-invalid', 'true');
      showStatus(result.message, result.status); return;
    }
    const controller = new AbortController(); pending = controller;
    const deadline = window.setTimeout(() => controller.abort(new Error('The assessment timed out. Try again.')), 125000);
    updateForm();
    showStatus('Calculating the Trust Score...', 'loading'); report.setAttribute('aria-busy', 'true');
    try {
      const data = await fetchTrustReport(result.endpoint, controller.signal);
      if (pending === controller) { renderReport(data); }
    } catch (error) {
      if (pending === controller) {
        const message = controller.signal.aborted ? 'The assessment timed out. Try again.'
          : error instanceof TypeError ? 'The scoring API could not be reached.'
          : error instanceof Error ? error.message : 'The assessment could not be completed.';
        showStatus(message);
      }
    } finally {
      window.clearTimeout(deadline);
      if (pending === controller) { pending = null; updateForm(); report.setAttribute('aria-busy', 'false'); }
    }
  });
  report.addEventListener('click', async event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-download-report]');
    if (!button || !reportData || exportPending) return;
    const data = reportData;
    const controller = new AbortController(); exportPending = controller;
    const errorText = report.querySelector<HTMLElement>('.trust-export-error')!;
    errorText.hidden = true; button.disabled = true; button.textContent = 'Exporting…';
    const deadline = window.setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch('/api/trust-score/v1/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema_version: '1.0', source: 'live', report: data }), signal: controller.signal });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('application/pdf')) throw new Error('The PDF could not be exported. Try again.');
      const blob = await response.blob();
      if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('Invalid PDF response. Try again.');
      if (exportPending !== controller || reportData !== data) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'agentopia-mcp-trust-score.pdf';
      link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (exportPending === controller) { errorText.textContent = 'PDF export failed. Please try again.'; errorText.hidden = false; }
    } finally {
      window.clearTimeout(deadline);
      if (exportPending === controller) { exportPending = null; button.disabled = false; button.textContent = '↓ PDF'; }
    }
  });
  return { showPortal };
}
