import { type TrustMode, type DimensionDisplay } from './trust-v23.ts';
import { escapeMarkup } from './markup.ts';
import { TRUST_API } from './trust-contract.ts';
import { MAX_MESSAGE_LENGTH, parseChatRequest, parseChatResponse, type ChatRequest, type ChatResponse } from './mochi-contract.ts';
import type { TrustReport } from './trust-score.ts';

export async function requestMochi(body: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
  const response = await fetch(TRUST_API.chat, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parseChatRequest(body)), signal });
  if (!response.ok) throw new Error(response.status === 410 ? 'This conversation has expired. Run a new assessment.' : 'Mochi could not reply. Try again.');
  return parseChatResponse(await response.json());
}

export function renderDimensionCard(title: string, mode: string, value: DimensionDisplay): string {
  const list = (items: string[], className: string, label: string) => items.length
    ? `<ul class="${className}" aria-label="${label}">${items.map(text => `<li>${escapeMarkup(text)}</li>`).join('')}</ul>` : '';
  const reasons = (value.guidance_status==='pending' ? '<p class="mochi-chat__preparing" role="status">Preparing reasons and tips…</p>' : '')
    + list(value.positive_reasons, 'mochi-chat__reasons mochi-chat__reasons--positive', 'What helped the score')
    + list(value.negative_reasons, 'mochi-chat__reasons mochi-chat__reasons--negative', 'What lowered the score')
    + list(value.assessment_notes ?? [], 'mochi-chat__reasons mochi-chat__reasons--negative', 'Assessment availability')
    + (value.guidance_status === 'unavailable'
      ? list(['Explanations could not be generated. Run a new assessment to retry.'], 'mochi-chat__reasons mochi-chat__reasons--negative', 'Explanation availability') : '');
  const gainBadge = value.tips_gain != null
    ? `<span class="trust-tips__gain" aria-label="Estimated overall score increase">+${Number(value.tips_gain.toFixed(1))} pts</span>` : '';
  const tips = value.tips.length ? `<h4 class="mochi-chat__tips-heading">Improvement tips${gainBadge}</h4>`
    + `<ul class="mochi-chat__suggestions" aria-label="Improvement tips">${value.tips.map(text => `<li>${escapeMarkup(text)}</li>`).join('')}</ul>` : '';
  return `<h3>${escapeMarkup(title)} · ${escapeMarkup(mode)}</h3>`
    + (reasons ? `<h4>Reasons</h4>${reasons}` : '')
    + tips;
}

export function mountMochiChat(options: { layout: HTMLElement; panel: HTMLElement; artwork: () => string; getReport: () => TrustReport | null; getMode?: () => TrustMode }) {
  const { layout, panel, artwork, getReport } = options;
  panel.id = 'trust-mochi-chat';
  panel.innerHTML = `<header class="mochi-chat__header"><svg class="mochi-logo" viewBox="0 0 276 270" aria-hidden="true">${artwork()}</svg><h2>Mochi</h2>
    <button class="mochi-chat__close" type="button" aria-label="Close Mochi"><svg viewBox="0 0 36 36" aria-hidden="true"><path d="m13 13 10 10m0-10L13 23"/></svg></button></header>
    <div class="mochi-chat__messages" role="log" aria-label="Conversation" aria-live="polite" tabindex="0"></div>
    <p class="mochi-chat__status" role="status" hidden></p>
    <form class="mochi-chat__composer"><textarea aria-label="Message Mochi" placeholder="Message Mochi…" maxlength="${MAX_MESSAGE_LENGTH}" rows="2"></textarea>
    <button type="submit" aria-label="Send message"><svg viewBox="0 0 34 34" aria-hidden="true"><path d="M17 25V10m-5 5 5-5 5 5"/></svg></button></form>`;
  const messages = panel.querySelector<HTMLElement>('.mochi-chat__messages')!;
  const composer = panel.querySelector<HTMLFormElement>('form')!;
  const input = panel.querySelector<HTMLTextAreaElement>('textarea')!;
  const send = composer.querySelector<HTMLButtonElement>('button')!;
  const status = panel.querySelector<HTMLElement>('[role="status"]')!;
  let session: string | null = null, reference: string | null = null;
  let pending: AbortController | null = null;
  let opener: HTMLElement | SVGElement | null = null;
  const dimensionCard = document.createElement('section');
  dimensionCard.className = 'mochi-chat__dimension'; dimensionCard.hidden = true;
  messages.before(dimensionCard);
  function append(text: string, role: 'user' | 'assistant') {
    const bubble = document.createElement('div');
    bubble.className = `mochi-chat__message mochi-chat__message--${role}`;
    bubble.setAttribute('aria-label', role === 'user' ? 'You' : 'Mochi');
    bubble.textContent = text; messages.append(bubble); messages.scrollTop = messages.scrollHeight;
  }
  function update() { send.disabled = !!pending || !input.value.trim(); composer.setAttribute('aria-busy', String(!!pending)); }
  function close() {
    panel.hidden = true; layout.classList.remove('has-mochi');
    layout.querySelectorAll('[data-dimension]').forEach(el => el.setAttribute('aria-expanded', 'false'));
    opener?.setAttribute('aria-expanded', 'false'); opener?.focus({ preventScroll: true });
  }
  function reset() {
    pending?.abort(); pending = null; session = null; reference = null;
    close(); opener = null; input.value = ''; messages.replaceChildren(); clearDimension(); status.hidden = true; update();
  }
  async function exchange(message?: string) {
    const report = getReport(); if (!report || pending) return;
    const controller = new AbortController(); pending = controller; update();
    status.hidden = false; status.textContent = message ? 'Mochi is thinking…' : 'Connecting…';
    const deadline = window.setTimeout(() => controller.abort(), 35000);
    try {
      if (!session) {
        const result = await requestMochi({ export_id: report.export_id, ...(report.v23 ? {mode: options.getMode?.() ?? 'static'} : {}) }, controller.signal);
        if (pending !== controller || getReport()?.export_id !== report.export_id) return;
        session = result.session_id;
        if (!messages.childElementCount) append(result.reply, 'assistant');
      }
      if (message) {
        const result = await requestMochi({ session_id: session!, message }, controller.signal);
        if (pending !== controller || getReport()?.export_id !== report.export_id) return;
        if (result.session_id !== session) throw new Error('Invalid conversation.');
        append(result.reply, 'assistant');
      }
      status.hidden = true;
    } catch (error) {
      if (pending === controller) {
        status.textContent = error instanceof Error && !controller.signal.aborted ? error.message : 'Mochi could not reply. Try again.';
        status.hidden = false;
      }
    } finally { clearTimeout(deadline); if (pending === controller) {pending = null; update();} }
  }
  function toggle(button: HTMLElement | SVGElement) {
    if (!panel.hidden) {close();return;}
    const report = getReport(); if (!report) return;
    if (reference !== report.export_id) {reset();reference = report.export_id;}
    opener = button; panel.hidden = false; layout.classList.add('has-mochi');
    button.setAttribute('aria-expanded', 'true'); input.focus({preventScroll:true});
    if (!messages.childElementCount) append('What would you like to know about this score?', 'assistant');
    if (!session && !pending) void exchange();
  }
  composer.addEventListener('submit', event => {
    event.preventDefault(); const message = input.value.trim(); if (!message || pending) return;
    append(message, 'user'); input.value = ''; void exchange(message);
  });
  input.addEventListener('input', update);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {event.preventDefault();composer.requestSubmit();}
  });
  panel.querySelector('button')!.addEventListener('click', close);
  layout.addEventListener('keydown', event => {if(event.key === 'Escape' && !panel.hidden) {event.preventDefault();close();}});
  function clearDimension() {dimensionCard.hidden = true; dimensionCard.replaceChildren();}
  function showDimension(button: HTMLElement | SVGElement, title: string, mode: string, value: DimensionDisplay, refresh = false) {
    if (refresh && panel.hidden) return;
    if (panel.hidden) toggle(button);
    opener?.setAttribute('aria-expanded', 'false'); opener = button; button.setAttribute('aria-expanded', 'true');
    dimensionCard.innerHTML = renderDimensionCard(title, mode, value);
    dimensionCard.hidden = false;
    if (!refresh) input.focus({preventScroll:true});
  }
  function modeChanged() {
    pending?.abort(); pending = null; session = null; messages.replaceChildren(); status.hidden = true; update();
    if (!panel.hidden) void exchange();
  }
  update(); return {toggle, reset, showDimension, clearDimension, modeChanged};
}
