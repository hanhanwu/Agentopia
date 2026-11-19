import { TRUST_DIMENSIONS, DIMENSION_LABELS, type TrustDimension, type TrustMode } from './trust-v23.ts';
import { mountMochiChat } from './mochi-chat.ts';
import './entry-flow.css';
import {
  fetchTrustReport, watchTrustExplanations, resolveTrustInput,
  type SubjectType, type TrustReport,
} from './trust-score.ts';

import { escapeMarkup as escapeHTML } from './markup.ts';

const shield = '<path d="M16 3 27 7v9c0 7-11 13-11 13S5 23 5 16V7Z M10 16l4 4 8-9"/>';
const globe = '<circle cx="16" cy="16" r="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path d="M4 16h24"/>';
const icon = (paths: string) => `<svg class="entry-action__icon" viewBox="0 0 32 32" aria-hidden="true">${paths}</svg>`;

export function mountEntryFlow(options: {
  root: HTMLElement;
  serviceArtwork: (variant: 1 | 2 | 3 | 4 | 5 | 6 | 7) => string;
  mcpLogo: string;
  mochiArtwork: () => string;
  onWorld: () => void;
}) {
  const { root, serviceArtwork, mcpLogo, mochiArtwork, onWorld } = options;
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
    <div class="trust-layout" data-trust-layout hidden>
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
    </main>
    <aside class="mochi-chat" aria-label="Chat with Mochi" hidden></aside></div>`;

  const portal = host.querySelector<HTMLElement>('.entry-portal')!;
  const splash = host.querySelector<HTMLElement>('.entry-splash')!;
  const screen = host.querySelector<HTMLElement>('.trust-screen')!;
  const form = host.querySelector<HTMLFormElement>('.trust-form')!;
  const input = form.querySelector<HTMLInputElement>('.trust-input')!;
  const submit = form.querySelector<HTMLButtonElement>('.trust-submit')!;
  const report = host.querySelector<HTMLElement>('.trust-report')!;
  const layout = host.querySelector<HTMLElement>('[data-trust-layout]')!;
  const chat = mountMochiChat({ layout, panel: host.querySelector<HTMLElement>('.mochi-chat')!, artwork: mochiArtwork, getReport: () => reportData, getMode: () => mode });
  let subject: SubjectType | null = null;
  let gaugeFrame = 0;
  let mode: TrustMode = 'static';
  let activeDimension: TrustDimension | null = null;
  let reportData: TrustReport | null = null;
  let pending: AbortController | null = null;
  let detailsPending: AbortController | null = null;

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
    chat.reset();
    pending?.abort(); pending = null; detailsPending?.abort(); detailsPending = null;
    cancelAnimationFrame(gaugeFrame); mode = 'static'; activeDimension = null;
    reportData = null; report.setAttribute('aria-busy', 'false');
    report.replaceChildren();
    report.dataset.state = 'empty';
    updateForm();
  }

  function showPortal(focus = true) {
    splash.hidden = true; layout.hidden = true; screen.hidden = true; portal.hidden = false; host.hidden = false;
    if (focus) portal.querySelector<HTMLButtonElement>('[data-open-trust]')!.focus({ preventScroll: true });
  }
  const splashTimer = window.setTimeout(() => showPortal(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1300);

  function renderReport(data: TrustReport) {
    reportData = data;
    if (!data.v23) { showStatus('The assessment service needs the V2.3 update.'); return; }
    const selected = data.v23.modes[mode];
    const view = selected.score_display;
    const point = (score: number | null, index: number) => {
      const angle = (-90 + index * 120) * Math.PI / 180;
      const radius = (score ?? 0) / 100 * 140;
      return [250 + Math.cos(angle) * radius, 226 + Math.sin(angle) * radius];
    };
    const points = TRUST_DIMENSIONS.map((d, i) => point(selected.dimensions[d].score_display.score ?? 100, i));
    const radarLabels = [[250, 50, 74], [434, 328, 352], [66, 328, 352]];
    report.dataset.state = 'ready';
    report.innerHTML = `
      <div class="trust-score-mode" role="status">Static${mode === 'combined' ? ' + <span>Dynamic</span>' : ''}</div>
      <div class="trust-report__body">
      <svg class="trust-score-gauge" viewBox="0 0 500 314" role="img" aria-label="${escapeHTML(`Score ${view.score ?? 'unavailable'} of ${view.maximum}. ${view.rating ?? ''}`)}">
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
      <div class="trust-score-pagination" role="tablist" aria-label="Score evidence">
        ${(['static', 'combined'] as const).map(m => `<button type="button" role="tab" data-mode="${m}" aria-label="${m === 'static' ? 'Static' : 'Static + Dynamic'} scores" aria-selected="${mode === m}" tabindex="${mode === m ? 0 : -1}"><span></span></button>`).join('')}
      </div>
      <svg class="trust-radar" viewBox="0 0 500 380" aria-label="Connection, Capability and Security scores" style="--score-color:${view.color}">
        <g fill="none" stroke="#29445b" stroke-width="1">${[35,70,105,140].map(r => `<circle cx="250" cy="226" r="${r}"/>`).join('')}
        ${TRUST_DIMENSIONS.map((_, i) => {const [x,y] = point(100, i); return `<path d="M250 226L${x} ${y}"/>`;}).join('')}</g>
        ${TRUST_DIMENSIONS.every(d => selected.dimensions[d].score_display.score !== null) ? `<polygon class="trust-radar__area" points="${points.map(p => p.join(',')).join(' ')}"/>` : ''}
        ${TRUST_DIMENSIONS.map((d, i) => {
          const value = selected.dimensions[d].score_display.score;
          const [x,y] = points[i], [lx,ly,vy] = radarLabels[i];
          return `<text class="trust-radar__label" x="${lx}" y="${ly}">${DIMENSION_LABELS[d]}</text><text class="trust-radar__value" x="${lx}" y="${vy}">${value === null ? '—' : value.toFixed(1)}</text>
          <g role="button" tabindex="0" data-dimension="${d}" aria-label="${DIMENSION_LABELS[d]} ${value ?? 'unavailable'}: reasons and improvement tips" aria-controls="trust-mochi-chat" aria-expanded="${activeDimension === d && layout.classList.contains('has-mochi')}">
            <circle class="trust-radar__hit" cx="${x}" cy="${y}" r="22"/>
            <circle class="trust-radar__point" cx="${x}" cy="${y}" r="4" ${value === null ? 'style="fill:#030b12;stroke:#7d9cae"' : ''}/>
          </g>`;
        }).join('')}
      </svg>
      </div>
      <button class="trust-mochi-launcher" type="button" data-ask-mochi aria-label="Ask Mochi" aria-expanded="false" aria-controls="trust-mochi-chat"><svg class="mochi-logo" viewBox="0 0 276 270" aria-hidden="true">${mochiArtwork()}</svg></button>`;
    if (activeDimension) refreshDimension();
    cancelAnimationFrame(gaugeFrame);
    const liquid = report.querySelector<SVGGElement>('.trust-liquid')!;
    const fill = report.querySelector<SVGUseElement>('.trust-liquid__fill')!;
    const sheen = report.querySelector<SVGUseElement>('.trust-liquid__sheen')!;
    const draw = (progress: number) => {
      liquid.setAttribute('visibility', progress > 0 ? 'visible' : 'hidden');
      // Follow the liquid's position along the full arch, not the final score's color.
      const color = progress < 0.25 ? '#f87171'
        : progress < 0.5 ? '#ffad5c'
        : progress < 0.75 ? '#ffd166'
        : '#9be477';
      fill.setAttribute('stroke', color);
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

  function loadExplanations(data: TrustReport) {
    if(data.explanations_status!=='pending')return;
    const controller=new AbortController();detailsPending=controller;
    const timeout=window.setTimeout(()=>controller.abort(),75000);
    void watchTrustExplanations(data,controller.signal,updated=>{
      if(detailsPending!==controller || reportData?.export_id!==data.export_id)return;
      reportData=updated;if(activeDimension)refreshDimension();
    }).catch(()=>{
      if(detailsPending!==controller || reportData?.export_id!==data.export_id)return;
      reportData.explanations_status='unavailable';
      if(reportData.v23)for(const m of Object.values(reportData.v23.modes))for(const d of Object.values(m.dimensions))
        if(d.guidance_status==='pending')d.guidance_status='unavailable';
      if(activeDimension)refreshDimension();
    }).finally(()=>{window.clearTimeout(timeout);if(detailsPending===controller)detailsPending=null;});
  }

  function showStatus(message: string, state = 'error') {
    report.dataset.state = state;
    report.innerHTML = `<div class="trust-unavailable"><h3 id="trust-report-message">${escapeHTML(message)}</h3></div>`;
  }

  host.querySelector('[data-open-trust]')!.addEventListener('click', () => {
    subject = null; input.value = ''; input.removeAttribute('aria-invalid');
    input.placeholder = 'Example: https://server.com/mcp';
    clearReport();
    portal.hidden = true; layout.hidden = false; screen.hidden = false;
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
      const data = await fetchTrustReport(result.endpoint, controller.signal, true);
      if (pending === controller) { renderReport(data); loadExplanations(data); }
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
  function refreshDimension(opener?: HTMLElement | SVGElement) {
    if (!activeDimension || !reportData?.v23) return;
    const element = opener ?? report.querySelector<SVGGElement>(`[data-dimension="${activeDimension}"]`)!;
    chat.showDimension(element, DIMENSION_LABELS[activeDimension], mode === 'static' ? 'Static' : 'Static + Dynamic', reportData.v23.modes[mode].dimensions[activeDimension], !opener);
  }
  function selectMode(next: TrustMode, focus = false) {
    if (!reportData || mode === next) return;
    mode = next; chat.modeChanged(); renderReport(reportData);
    if (focus) report.querySelector<HTMLButtonElement>(`[data-mode="${mode}"]`)!.focus({preventScroll:true});
  }
  report.addEventListener('click', event => {
    const target = event.target as Element;
    const tab = target.closest<HTMLElement>('[data-mode]');
    if (tab) {selectMode(tab.dataset.mode as TrustMode, true); return;}
    const dimension = target.closest<SVGGElement>('[data-dimension]');
    if (dimension) {activeDimension = dimension.dataset.dimension as TrustDimension; refreshDimension(dimension); return;}
    const ask = target.closest<HTMLButtonElement>('[data-ask-mochi]');
    if (ask) {activeDimension = null; chat.clearDimension(); chat.toggle(ask);}
  });
  report.addEventListener('keydown', event => {
    const target = event.target as Element;
    if (target.closest('[role="tablist"]') && ['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
      event.preventDefault(); selectMode(event.key === 'Home' ? 'static' : event.key === 'End' ? 'combined' : mode === 'static' ? 'combined' : 'static', true);
    }
    const dimension = target.closest<SVGGElement>('[data-dimension]');
    if (dimension && ['Enter', ' '].includes(event.key)) {event.preventDefault(); activeDimension = dimension.dataset.dimension as TrustDimension; refreshDimension(dimension);}
  });
  let drag: {x: number; y: number; id: number} | null = null;
  report.addEventListener('pointerdown', event => {
    if (!(event.target as Element).closest('button, [role="button"]')) drag = {x:event.clientX, y:event.clientY, id:event.pointerId};
  });
  report.addEventListener('pointerup', event => {
    if (drag?.id === event.pointerId) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) selectMode(dx < 0 ? 'combined' : 'static');
    }
    drag = null;
  });
  report.addEventListener('pointercancel', () => {drag = null;});
  let wheelAt = 0;
  report.addEventListener('wheel', event => {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) && Math.abs(event.deltaX) > 12) {
      event.preventDefault();
      if (performance.now() - wheelAt > 500) {selectMode(event.deltaX > 0 ? 'combined' : 'static'); wheelAt = performance.now();}
    }
  }, {passive:false});
  return { showPortal };
}
