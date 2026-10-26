import './entry-flow.css';
import {
  categorySummaries, fetchTrustReport, OUTCOME_GROUPS, resolveTrustInput,
  type OutcomeGroup, type SubjectType, type TrustReport, type TrustRule,
} from './trust-score.ts';

import { escapeMarkup as escapeHTML } from './markup.ts';

const monoJSON = (value: unknown) => `<pre>${escapeHTML(JSON.stringify(value, null, 2))}</pre>`;
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
            <input class="trust-input" name="identifier" aria-label="Identifier" placeholder="Example: https://server.com/mcp" autocomplete="off" spellcheck="false" required/>
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
  let activeGroup: OutcomeGroup = 'failed';
  let reportData: TrustReport | null = null;
  let pending: AbortController | null = null;

  function updateForm() {
    form.querySelectorAll<HTMLButtonElement>('[data-subject]').forEach(button => {
      button.classList.toggle('is-inactive', subject !== null && button.dataset.subject !== subject);
      button.setAttribute('aria-pressed', String(button.dataset.subject === subject));
    });
    submit.hidden = subject === null || input.value.trim().length === 0;
    submit.disabled = submit.hidden || pending !== null;
  }

  function clearReport() {
    pending?.abort(); pending = null;
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

  const detailField = (name: string, value: unknown) => `<div><dt>${escapeHTML(name)}</dt><dd>${escapeHTML(value)}</dd></div>`;
  const observedTime = (value: string) => new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium', timeStyle: 'long', timeZone: 'America/Los_Angeles',
  }).format(new Date(value));

  function ruleMarkup(rule: TrustRule) {
    const observations = Object.fromEntries(rule.observation_keys.map(key => [key, reportData!.observations[key] ?? null]));
    return `<details class="trust-rule">
      <summary><span>${escapeHTML(rule.name)}</span><b>${rule.earned} / ${rule.possible}</b></summary>
      <p>${escapeHTML(rule.reason)}</p>
      <dl>${detailField('Rule', rule.id)}${detailField('Category', rule.category)}
        ${detailField('Configured weight', rule.configured_weight)}${detailField('Effective weight', rule.weight)}
        ${detailField('Applicability', rule.applicability)}${detailField('Outcome', rule.outcome)}
        ${detailField('Evidence IDs', rule.evidence_ids.join(', ') || 'None')}
      </dl>
      <details><summary>Definition & specification basis</summary>${monoJSON(rule.definition)}<p>${escapeHTML(rule.basis)}</p></details>
      <details><summary>Referenced observations</summary>${monoJSON(observations)}</details>
    </details>`;
  }

  function renderReport(data: TrustReport) {
    reportData = data;
    const { summary, subject: target, policy } = data;
    report.dataset.state = 'ready';
    report.innerHTML = `
      <header class="trust-report__header">
        <h3>MCP Trust Score</h3><p class="trust-report__status">LIVE · ${escapeHTML(data.status.toUpperCase())}</p>
        <p class="trust-report__endpoint">${escapeHTML(target.endpoint)}</p>
      </header>
      <div class="trust-metrics">
        <section class="trust-metric"><h4>Weighted points</h4><p class="trust-metric__value">${summary.total_score}<span>/ ${summary.assessed_maximum}</span></p><p class="trust-metric__context">Configured max ${summary.configured_maximum}</p></section>
        <section class="trust-metric"><h4>Rule pass rate</h4><p class="trust-metric__value">${summary.pass_percentage === null ? '—' : `${summary.pass_percentage}%`}</p><p class="trust-metric__context">${summary.passed_rules} / ${summary.total_rules} rules</p></section>
      </div>
      <div class="trust-outcomes" role="group" aria-label="Rule outcomes">${OUTCOME_GROUPS.map(group => `
        <button type="button" class="trust-outcome trust-outcome--${group}" data-outcome="${group}" aria-pressed="${group === activeGroup}" aria-controls="trust-rule-list">
          <strong>${summary[`${group}_rules`]}</strong><span>${groupName(group)}</span>
        </button>`).join('')}
      </div>
      <details class="trust-disclosure trust-categories"><summary>Categories</summary>
        <div class="trust-category-row trust-category-row--header"><span>Category</span><span>Points</span><span>Passed</span></div>
        ${categorySummaries(data).map(category => `<div class="trust-category-row"><strong>${escapeHTML(category.category)}</strong><span>${category.earned} / ${category.possible}</span><span>${category.passed} / ${category.total}</span><small>Configured maximum ${category.configured}</small></div>`).join('')}
      </details>
      <details class="trust-disclosure trust-rules"><summary>Rule details</summary><div id="trust-rule-list"></div></details>
      <div class="trust-report__footer"><details class="trust-disclosure trust-metadata"><summary>Report details</summary>
        <dl>${detailField('Source', 'Direct MCP endpoint assessment')}${detailField('Subject', target.name)}
          ${detailField('Endpoint', target.endpoint)}${detailField('Assessment', data.status)}
          ${detailField('Collection status', data.collection_status ?? 'Not reported')}
          ${detailField('Observed', observedTime(data.observed_at))}${detailField('Scored', observedTime(data.scored_at))}
          ${detailField('Engine', data.engine_version)}${detailField('Policy', `${policy.id} / ${policy.version}`)}${detailField('Policy SHA-256', policy.sha256)}${detailField('Collection limits', (data.limitations ?? []).join(' '))}
        </dl>
      </details><button class="gold-button trust-download" type="button" data-download-report>↓ JSON</button></div>`;
    renderRules();
  }

  function renderRules() {
    const list = report.querySelector<HTMLElement>('#trust-rule-list');
    if (!list || !reportData) return;
    list.innerHTML = `<h4>${groupName(activeGroup)} · ${reportData.rules[activeGroup].length}</h4>${reportData.rules[activeGroup].map(ruleMarkup).join('')}`;
    report.querySelectorAll<HTMLButtonElement>('[data-outcome]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.outcome === activeGroup)));
  }

  function showStatus(message: string, state = 'error') {
    report.dataset.state = state;
    report.innerHTML = `<div class="trust-unavailable"><h3 id="trust-report-message">${escapeHTML(message)}</h3></div>`;
  }

  host.querySelector('[data-open-trust]')!.addEventListener('click', () => {
    subject = null; activeGroup = 'failed'; input.value = ''; input.removeAttribute('aria-invalid');
    input.placeholder = 'Example: https://server.com/mcp';
    clearReport();
    portal.hidden = true; screen.hidden = false; input.focus({ preventScroll: true });
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
    const deadline = window.setTimeout(() => controller.abort(new Error('The assessment timed out. Try again.')), 100000);
    updateForm();
    showStatus('Calculating the Trust Score...', 'loading'); report.setAttribute('aria-busy', 'true');
    try {
      const data = await fetchTrustReport(result.endpoint, controller.signal);
      if (pending === controller) { activeGroup = 'failed'; renderReport(data); }
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
  report.addEventListener('click', event => {
    const target = event.target as Element;
    const outcome = target.closest<HTMLButtonElement>('[data-outcome]');
    if (outcome) {
      activeGroup = outcome.dataset.outcome as OutcomeGroup; renderRules();
      report.querySelector<HTMLDetailsElement>('.trust-rules')!.open = true;
    }
    if (target.closest('[data-download-report]') && reportData) {
      const url = URL.createObjectURL(new Blob([JSON.stringify(reportData, null, 2) + '\n'], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'agentopia-mcp-trust-score-v1.json';
      link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  return { showPortal };
}
