import { createLivePreview } from './portable-live-preview.ts';
import type { ActivityEvent } from './activity.ts';
import { embedCodes, portableScenes, sceneEventIndex, type PortableSceneId } from './portable-scenes.ts';

type ExportJob = { id: string; state: 'queued' | 'rendering' | 'ready' | 'error'; progress: number; error?: string };
type SaveWindow = Window & {
  showSaveFilePicker?: (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{
    name: string;
    createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> }>;
  }>;
};

export function mountPortableVisualization(getEvents: () => ActivityEvent[], onReturn: () => void) {
  const root = document.createElement('main');
  root.className = 'studio portable-studio';
  root.hidden = true;
  root.setAttribute('aria-label', 'Portable Visualization');
  root.innerHTML = `
    <section class="world-panel" aria-label="Choose animation scenes">
      <div class="panel-heading"><h2 data-text="AGENTOPIA">AGENTOPIA</h2></div>
      <section class="timeline-card portable-selection">
        <h3>PORTABLE VISUALIZATION</h3>
        <div class="event-history__heading portable-selection__heading"><span>Select steps</span><small data-selection-count>0 selected</small></div>
        <div class="portable-steps">${portableScenes.map(({ id, label }) => `
          <label class="event-history__item portable-step"><input type="checkbox" value="${id}"/><span>${label}</span></label>`).join('')}</div>
      </section>
      <div class="portable-actions"><button type="button" class="publication-tip-back" data-portable-back>&lt;&lt; Back</button><button type="button" class="publication-tip-back" data-portable-submit disabled>Submit</button></div>
    </section>
    <section class="inspector-panel" aria-label="GIF preview and embed codes">
      <div class="portable-preview-heading">GIF PREVIEW</div>
      <div class="portable-preview"><img data-portable-image alt="Animation of the selected Agentopia scenes" hidden/><div class="portable-live-preview" data-portable-live role="img" aria-label="Live animation of the selected scenes" hidden></div><span class="portable-preview-empty">Select steps</span></div>
      <div class="portable-render-status"><span role="status" data-portable-status></span><progress max="100" value="0" hidden></progress><button type="button" class="publication-tip-back" data-portable-cancel hidden>Cancel</button></div>
      <div data-portable-codes hidden>${['Markdown', 'HTML'].map((label) => `<section class="timeline-card portable-code"><h3>${label}</h3><button type="button" class="publication-tip-back" data-copy="${label.toLowerCase()}">Copy</button><pre><code data-code="${label.toLowerCase()}"></code></pre></section>`).join('')}</div>
      <span class="portable-save-status" data-portable-save-status role="status"></span>
    </section>`;
  document.querySelector('#app')!.append(root);
  const element = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const status = element('[data-portable-status]');
  const saveStatus = element('[data-portable-save-status]');
  const preview = element<HTMLImageElement>('[data-portable-image]');
  const progress = element<HTMLProgressElement>('progress');
  const submit = element<HTMLButtonElement>('[data-portable-submit]');
  const cancel = element<HTMLButtonElement>('[data-portable-cancel]');
  const liveContainer = element('[data-portable-live]');
  const live = createLivePreview(liveContainer, () => { status.textContent = 'Preview unavailable. You can still submit the GIF.'; });
  const codes = element('[data-portable-codes]');
  let selected = new Set<PortableSceneId>();
  let controller: AbortController | undefined;
  let jobId: string | undefined;
  let blob: Blob | undefined;
  let objectUrl: string | undefined;
  let generation = 0;
  let saving = false;
  let eventSnapshot = '';
  let code = embedCodes('agentopia.gif');

  const request = async (url: string, init?: RequestInit) => {
    const response = await fetch(url, init);
    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(detail?.error ?? 'GIF export service is unavailable.');
    }
    return response;
  };
  const releaseJob = () => {
    if (jobId) void fetch(`/api/portable/${jobId}`, { method: 'DELETE' }).catch(() => {});
    jobId = undefined;
  };
  const stop = () => {
    generation++;
    controller?.abort();
    controller = undefined;
    releaseJob();
    cancel.hidden = true;
    progress.hidden = true;
  };
  const clearPreview = () => {
    blob = undefined;
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = undefined;
    preview.removeAttribute('src');
    preview.hidden = true;
    codes.hidden = true;
    submit.disabled = true;
    saveStatus.textContent = '';
  };
  const generate = async (version: number): Promise<Blob> => {
    const abort = new AbortController();
    controller = abort;
    status.textContent = 'Rendering GIF…';
    progress.value = 0;
    progress.hidden = false;
    cancel.hidden = false;
    try {
      const events = getEvents();
      eventSnapshot = JSON.stringify(events);
      const response = await request('/api/portable', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: abort.signal,
        body: JSON.stringify({ scenes: [...selected], events }),
      });
      let job = await response.json() as ExportJob;
      if (version !== generation) {
        void fetch(`/api/portable/${job.id}`, { method: 'DELETE' }).catch(() => {});
        throw new DOMException('Cancelled', 'AbortError');
      }
      jobId = job.id;
      while (job.state !== 'ready') {
        if (job.state === 'error') throw new Error(job.error ?? 'Could not render GIF.');
        status.textContent = job.state === 'queued' ? 'Queued…' : `Rendering GIF… ${job.progress}%`;
        progress.value = job.progress;
        await new Promise<void>((resolve, reject) => {
          const done = () => { abort.signal.removeEventListener('abort', interrupted); resolve(); };
          const timer = window.setTimeout(done, 600);
          const interrupted = () => { window.clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
          abort.signal.addEventListener('abort', interrupted, { once: true });
          if (abort.signal.aborted) interrupted();
        });
        job = await (await request(`/api/portable/${job.id}`, { signal: abort.signal })).json() as ExportJob;
      }
      const result = await (await request(`/api/portable/${job.id}/gif`, { signal: abort.signal })).blob();
      if (version !== generation) throw new DOMException('Cancelled', 'AbortError');
      return result;
    } finally {
      if (version === generation) {
        controller = undefined;
        releaseJob();
        cancel.hidden = true;
        progress.hidden = true;
      }
    }
  };
  const showLivePreview = () => {
    const events = getEvents();
    eventSnapshot = JSON.stringify(events);
    live.play(events, [...selected]);
  };
  root.querySelectorAll<HTMLInputElement>('input').forEach((input) => input.addEventListener('change', () => {
    selected = new Set(Array.from(root.querySelectorAll<HTMLInputElement>('input:checked'), ({ value }) => value as PortableSceneId));
    stop();
    clearPreview();
    status.textContent = '';
    element('[data-selection-count]').textContent = `${selected.size} selected`;
    submit.disabled = !selected.size || saving;
    showLivePreview();
  }));
  cancel.addEventListener('click', () => { stop(); status.textContent = 'Cancelled'; });
  submit.addEventListener('click', async () => {
    if (!selected.size || saving) return;
    // Call the picker directly inside the click handler, before any other async work.
    const version = generation;
    saving = true;
    submit.disabled = true;
    saveStatus.textContent = '';
    try {
      let filename = 'agentopia.gif';
      const picker = (window as SaveWindow).showSaveFilePicker;
      const handle = picker ? await picker.call(window, {
        suggestedName: filename, types: [{ description: 'Animated GIF', accept: { 'image/gif': ['.gif'] } }],
      }) : undefined;
      if (version !== generation) return;
      // Selection only plays the live renderer. Encoding begins here, after Submit.
      const currentBlob = blob ?? await generate(version);
      if (version !== generation) return;
      if (!blob) {
        objectUrl = URL.createObjectURL(currentBlob);
        preview.src = objectUrl;
        try { await preview.decode(); }
        catch (error) {
          if (version === generation) clearPreview();
          throw error;
        }
        if (version !== generation) return;
        blob = currentBlob;
        preview.hidden = false;
        live.stop();
      }
      if (handle) {
        const writable = await handle.createWritable();
        try { await writable.write(currentBlob); await writable.close(); }
        catch (error) { await writable.abort().catch(() => {}); throw error; }
        filename = handle.name;
      } else {
        const link = document.createElement('a');
        link.href = objectUrl!;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
      }
      if (version !== generation) return;
      status.textContent = '';
      code = embedCodes(filename);
      element('[data-code="markdown"]').textContent = code.markdown;
      element('[data-code="html"]').textContent = code.html;
      codes.hidden = false;
    } catch (error) {
      if (version === generation && !(error instanceof DOMException && error.name === 'AbortError')) {
        status.textContent = error instanceof Error ? `${error.message} Try Submit again.` : 'Could not save GIF. Try Submit again.';
      }
    } finally { saving = false; submit.disabled = !selected.size; }
  });
  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code[button.dataset.copy as keyof typeof code]);
      button.textContent = 'Copied';
      window.setTimeout(() => { button.textContent = 'Copy'; }, 1600);
    } catch { saveStatus.textContent = 'Select and copy the code below.'; }
  }));
  element('[data-portable-back]').addEventListener('click', () => { root.hidden = true; stop(); live.stop(); onReturn(); });
  window.addEventListener('pagehide', () => { stop(); live.dispose(); if (objectUrl) URL.revokeObjectURL(objectUrl); });
  return {
    show() {
      root.hidden = false;
      const events = getEvents();
      root.querySelectorAll<HTMLInputElement>('input').forEach((input) => {
        input.disabled = input.value !== 'intro' && sceneEventIndex(events, input.value as PortableSceneId) < 0;
      });
      if (eventSnapshot && eventSnapshot !== JSON.stringify(events)) clearPreview();
      if (selected.size && !blob) showLivePreview();
      submit.disabled = !selected.size || saving;
      element<HTMLButtonElement>('[data-portable-back]').focus({ preventScroll: true });
      window.scrollTo(0, 0);
    },
  };
}
