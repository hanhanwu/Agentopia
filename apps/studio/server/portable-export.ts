import { randomUUID } from 'node:crypto';
import { LocalAPIError, readJSON, requireLocalRequest, sendJSON as send } from './local-api.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Browser } from 'playwright';
import { launchCaptureBrowser } from './capture-browser.ts';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { PNG } from 'pngjs';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import type { ActivityEvent } from '../src/activity.ts';
import { orderScenes, portableScenes, sceneEventIndex, type PortableSceneId } from '../src/portable-scenes.ts';
import type {} from '../src/portable-capture.ts';

type Job = {
  id: string;
  state: 'queued' | 'rendering' | 'ready' | 'error';
  progress: number;
  error?: string;
  bytes?: Buffer;
  abort: AbortController;
  created: number;
};
const FRAME_MS = 100;
const MAX_BODY = 512 * 1024;
const MAX_GIF = 100 * 1024 * 1024;

export function validateExport(body: unknown): { scenes: PortableSceneId[]; events: ActivityEvent[] } {
  if (!body || typeof body !== 'object') throw new Error('Invalid export request.');
  const { scenes: requested, events } = body as Record<string, unknown>;
  const scenes = orderScenes(requested);
  if (!Array.isArray(events) || events.length > 100 || events.some((event) => (
    !event || typeof event !== 'object' || event.schemaVersion !== '1.0'
    || typeof event.type !== 'string' || !event.payload || typeof event.payload !== 'object'
  ))) throw new Error('Invalid scenario events.');
  for (const id of scenes) {
    if (id !== 'intro' && sceneEventIndex(events, id) < 0) throw new Error(`Scene ${id} is not available in this scenario run.`);
  }
  return { scenes, events };
}

async function renderGif(job: Job, origin: string, scenes: PortableSceneId[], events: ActivityEvent[]) {
  let browser: Browser | undefined;
  const interrupt = () => { void browser?.close().catch(() => {}); };
  const assertActive = () => job.abort.signal.throwIfAborted();
  job.abort.signal.addEventListener('abort', interrupt);
  try {
    assertActive();
    job.state = 'rendering';
    browser = await launchCaptureBrowser(job.abort.signal);
    assertActive();
    const gif = GIFEncoder();
    const selectedScenes = portableScenes.filter(({ id }) => scenes.includes(id));
    const total = selectedScenes.reduce((sum, { duration }) => sum + Math.ceil(duration / FRAME_MS), 0);
    let completed = 0;
    for (const { id, duration } of selectedScenes) {
      assertActive();
      // Fresh context isolates clocks, SMIL timelines, timers and session restoration.
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.7, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      // Capture uses bundled snapshot evidence only; never fetch live external services.
      await page.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(1);
      await page.goto(`${origin}/?portable-capture=1`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async ({ events, id }) => {
        if (!window.agentopiaCapture) throw new Error('Capture renderer did not initialize.');
        window.agentopiaCapture.frame(0);
        window.agentopiaCapture.load(events, id);
        await Promise.all(Array.from(document.images, (image) => image.decode().catch(() => {})));
        window.agentopiaCapture.frame(0);
      }, { events, id });
      let previousPixels: Uint8Array | undefined;
      for (let time = 0; time < duration; time += FRAME_MS) {
        assertActive();
        if (time > 0) await page.clock.runFor(FRAME_MS);
        await page.evaluate((time) => window.agentopiaCapture!.frame(time), time);
        const frame = PNG.sync.read(await page.screenshot({ type: 'png', scale: 'device' }));
        // Quantize every frame so newly revealed colors are not lost to an intro palette.
        const pixels = new Uint8Array(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
        const palette = quantize(pixels, previousPixels ? 255 : 256);
        const indices = applyPalette(pixels, palette);
        const transparentIndex = palette.length;
        if (previousPixels) {
          // Keep unchanged pixels from the previous displayed frame. Long stretches of
          // transparent indices compress well, without dropping animation frames.
          for (let offset = 0; offset < pixels.length; offset += 4) {
            if (pixels[offset] === previousPixels[offset]
              && pixels[offset + 1] === previousPixels[offset + 1]
              && pixels[offset + 2] === previousPixels[offset + 2]
              && pixels[offset + 3] === previousPixels[offset + 3]) indices[offset / 4] = transparentIndex;
          }
          palette.push([0, 0, 0]);
        }
        gif.writeFrame(indices, frame.width, frame.height, {
          palette, delay: Math.min(FRAME_MS, duration - time), repeat: 0, dispose: 1,
          transparent: Boolean(previousPixels), transparentIndex,
        });
        previousPixels = pixels;
        if (gif.bytesView().byteLength > MAX_GIF) throw new Error('GIF exceeds 100 MB. Export fewer scenes.');
        completed++;
        job.progress = Math.floor(completed / total * 100);
        // Let cancellation and progress requests run between CPU-bound frame encodes.
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
      await context.close();
    }
    assertActive();
    gif.finish();
    job.bytes = Buffer.from(gif.bytesView());
    job.progress = 100;
    job.state = 'ready';
  } catch (error) {
    if (!job.abort.signal.aborted) {
      job.error = error instanceof Error ? error.message : 'GIF rendering failed.';
      job.state = 'error';
    }
  } finally {
    job.abort.signal.removeEventListener('abort', interrupt);
    await browser?.close().catch(() => {});
  }
}

export function portableExportPlugin(): Plugin {
  const jobs = new Map<string, Job>();
  let queue: Promise<void> = Promise.resolve();
  const install = (server: ViteDevServer | PreviewServer) => {
    const cleanup = setInterval(() => {
      for (const [id, job] of jobs) if (Date.now() - job.created > 10 * 60 * 1000) {
        job.abort.abort(); jobs.delete(id);
      }
    }, 30000);
    cleanup.unref();
    server.httpServer?.once('close', () => {
      clearInterval(cleanup);
      for (const job of jobs.values()) job.abort.abort();
      jobs.clear();
    });
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/api/portable')) { next(); return; }
      const address = server.httpServer?.address() as AddressInfo | null;
      if (!address) { res.writeHead(503).end(); return; }
      const origin = `http://127.0.0.1:${address.port}`;
      void handle(req, res, origin).catch(error => {
        if (!res.headersSent) send(res, error instanceof LocalAPIError ? error.status : 500, { error: error instanceof LocalAPIError ? error.message : 'GIF export request failed.' });
      });
    });
  };
  const handle = async (req: IncomingMessage, res: ServerResponse, origin: string) => {
    requireLocalRequest(req);
    const path = req.url!.split('?')[0];
    if (path === '/api/portable' && req.method === 'POST') {
      if (jobs.size >= 8) { send(res, 429, { error: 'Export queue is full. Retry shortly.' }); return; }
      const body = await readJSON(req, MAX_BODY);
      let input: ReturnType<typeof validateExport>;
      try { input = validateExport(body); }
      catch (error) { send(res, 400, { error: error instanceof Error ? error.message : 'Invalid export request.' }); return; }
      const job: Job = { id: randomUUID(), state: 'queued', progress: 0, created: Date.now(), abort: new AbortController() };
      jobs.set(job.id, job);
      queue = queue.then(() => renderGif(job, origin, input.scenes, input.events));
      send(res, 202, { id: job.id, state: job.state, progress: job.progress });
      return;
    }
    const match = /^\/api\/portable\/([0-9a-f-]{36})(\/gif)?$/.exec(path);
    const job = match ? jobs.get(match[1]) : undefined;
    if (!job) { send(res, 404, { error: 'Export expired. Retry to generate it again.' }); return; }
    if (req.method === 'DELETE' && !match![2]) {
      job.abort.abort(); jobs.delete(job.id); res.writeHead(204).end(); return;
    }
    if (req.method !== 'GET') { send(res, 405, { error: 'Method not allowed.' }); return; }
    if (match![2]) {
      if (!job.bytes) { send(res, 409, { error: 'GIF is not ready.' }); return; }
      res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': job.bytes.length, 'Content-Disposition': 'attachment; filename="agentopia.gif"', 'Cache-Control': 'no-store' });
      res.end(job.bytes);
    } else send(res, 200, { id: job.id, state: job.state, progress: job.progress, error: job.error });
  };
  return { name: 'agentopia-portable-export', configureServer: install, configurePreviewServer: install };
}
