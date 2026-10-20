import type { ActivityEvent } from './activity.ts';
import type { CaptureController } from './portable-capture.ts';
import { orderScenes, portableScenes, type PortableSceneId } from './portable-scenes.ts';

// Reuse the export renderer at its real desktop dimensions, without encoding frames.
// A spare frame loads ahead so changing scenes does not wait for the app to boot.
export function createLivePreview(container: HTMLElement, onError: () => void) {
  type WarmFrame = { frame: HTMLIFrameElement; ready: Promise<CaptureController>; dispose(): void };
  let active: WarmFrame | undefined;
  let spare: WarmFrame | undefined;
  let pending: WarmFrame | undefined;
  let timer: number | undefined;
  let version = 0;
  let disposed = false;
  const size = () => {
    const { width, height } = container.getBoundingClientRect();
    const scale = Math.min(width / 1920, height / 1080);
    container.querySelectorAll('iframe').forEach((frame) => {
      frame.style.transform = `scale(${scale})`;
      frame.style.left = `${(width - 1920 * scale) / 2}px`;
      frame.style.top = `${(height - 1080 * scale) / 2}px`;
    });
  };
  const observer = new ResizeObserver(size);
  observer.observe(container);
  const warm = (): WarmFrame => {
    const frame = document.createElement('iframe');
    frame.title = 'Selected Agentopia scenes';
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.hidden = true;
    let rejectReady: (error: Error) => void;
    let timeout: number;
    const ready = new Promise<CaptureController>((resolve, reject) => {
      rejectReady = reject;
      timeout = window.setTimeout(() => reject(new Error('Preview did not load.')), 10000);
      frame.addEventListener('load', () => {
        window.clearTimeout(timeout);
        const controller = frame.contentWindow?.agentopiaCapture;
        if (!controller) { reject(new Error('Preview renderer unavailable.')); return; }
        controller.frame(0);
        resolve(controller);
      }, { once: true });
      frame.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('Preview did not load.'));
      }, { once: true });
    });
    // The spare may be disposed without ever being selected.
    void ready.catch(() => {});
    frame.src = '/?portable-capture=1';
    container.append(frame);
    size();
    return { frame, ready, dispose() { window.clearTimeout(timeout); rejectReady(new Error('Preview stopped.')); frame.remove(); } };
  };
  const stop = () => {
    version++;
    window.clearTimeout(timer);
    active?.dispose();
    spare?.dispose();
    pending?.dispose();
    active = spare = pending = undefined;
    container.hidden = true;
  };
  return {
    play(events: ActivityEvent[], selection: PortableSceneId[]) {
      stop();
      if (!selection.length || disposed) return;
      const ids = orderScenes(selection);
      const currentVersion = version;
      container.hidden = false;
      const show = async (index: number) => {
        const next = spare ?? warm();
        spare = undefined;
        pending = next;
        try {
          const controller = await next.ready;
          if (currentVersion !== version) { next.dispose(); return; }
          pending = undefined;
          active?.dispose();
          active = next;
          next.frame.hidden = false;
          size();
          controller.load(events, ids[index]);
          const child = next.frame.contentWindow!;
          child.document.querySelectorAll<SVGSVGElement>('svg').forEach((svg) => {
            svg.setCurrentTime(0);
            svg.unpauseAnimations();
          });
          child.document.getAnimations().forEach((animation) => { animation.currentTime = 0; animation.play(); });
          spare = warm();
          timer = window.setTimeout(() => void show((index + 1) % ids.length), portableScenes.find(({ id }) => id === ids[index])!.duration);
        } catch {
          next.dispose();
          if (currentVersion === version) { stop(); onError(); }
        }
      };
      void show(0);
    },
    stop,
    dispose() { stop(); disposed = true; observer.disconnect(); },
  };
}
