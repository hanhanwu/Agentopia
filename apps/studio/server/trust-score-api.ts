import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import type { Plugin, PreviewServer, ViteDevServer } from 'vite';
import { resolveTrustInput } from '../src/trust-input.ts';
import { LocalAPIError as TrustScoreError, readJSON, requireLocalRequest, sendJSON } from './local-api.ts';
export { LocalAPIError as TrustScoreError } from './local-api.ts';

const API_PATH = '/api/trust-score/v1';
const MAX_BODY = 8192;
const MAX_REPORT = 4 * 1024 * 1024;

export function validateTrustScoreRequest(body: unknown): string {
  if (!body || typeof body !== 'object') throw new TrustScoreError(400, 'Enter an MCP endpoint.');
  const { type, identifier } = body as Record<string, unknown>;
  if (type !== 'agent' && type !== 'mcp') throw new TrustScoreError(400, 'Choose Agent or MCP Server.');
  if (type === 'mcp' && typeof identifier !== 'string') throw new TrustScoreError(400, 'Enter an MCP endpoint.');
  const result = resolveTrustInput(type, typeof identifier === 'string' ? identifier : '');
  if (result.status !== 'ready') throw new TrustScoreError(result.status === 'unavailable' ? 422 : 400, result.message);
  return result.endpoint;
}

export function runScoreWorker(root: string, endpoint: string, signal: AbortSignal): Promise<unknown> {
  return new Promise((resolveJob, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const localPython = resolve(root, '.venv/bin/python');
    const python = process.env.AGENTOPIA_SCORER_PYTHON || (existsSync(localPython) ? localPython : 'python3');
    const worker = spawn(python, [resolve(root, 'apps/studio/server/score_worker.py')], {
      cwd: root, stdio: ['pipe', 'pipe', 'pipe'], shell: false,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    let settled = false;
    let size = 0;
    const chunks: Buffer[] = [];
    const finish = (error?: Error, result?: unknown) => {
      if (settled) return;
      settled = true; clearTimeout(deadline); signal.removeEventListener('abort', abort);
      if (error) { worker.kill('SIGKILL'); reject(error); } else resolveJob(result);
    };
    const abort = () => finish(new TrustScoreError(499, 'Assessment cancelled.'));
    // Collector category budgets do not establish an overall deadline; the worker does.
    const deadline = setTimeout(() => finish(new TrustScoreError(504, 'The assessment timed out. Try again.')), 90000);
    signal.addEventListener('abort', abort, { once: true });
    worker.on('error', () => finish(new TrustScoreError(503, 'The MCP scorer could not start. Check the Python scorer installation.')));
    worker.stdin.on('error', () => { /* The exit handler reports unavailable workers. */ });
    worker.stdout.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_REPORT) { finish(new TrustScoreError(502, 'The assessment exceeded the report size limit.')); return; }
      chunks.push(chunk);
    });
    // Drain diagnostics without returning traces, filesystem paths or target secrets.
    worker.stderr.resume();
    worker.on('close', code => {
      if (settled) return;
      if (code !== 0) { finish(new TrustScoreError(503, 'The MCP scorer is unavailable. Check the Python scorer installation.')); return; }
      try {
        const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (result.error) {
          const status = [400, 422, 502, 503, 504].includes(result.error.status) ? result.error.status : 502;
          finish(new TrustScoreError(status, typeof result.error.message === 'string' ? result.error.message : 'Assessment failed.'));
        } else if (result.schema_version === '1.0' && result.source === 'live' && result.report) finish(undefined, result);
        else finish(new TrustScoreError(502, 'The scorer returned an invalid report.'));
      } catch { finish(new TrustScoreError(502, 'The scorer returned an invalid report.')); }
    });
    worker.stdin.end(JSON.stringify({ endpoint }));
  });
}

export function createTrustScoreHandler(root: string, run = runScoreWorker) {
  let active = 0;
  const controllers = new Set<AbortController>();
  return {
    close() { for (const controller of controllers) controller.abort(); },
    async handle(req: IncomingMessage, res: ServerResponse) {
      try {
        requireLocalRequest(req);
        if (req.method !== 'POST') throw new TrustScoreError(405, 'Use POST to assess an MCP endpoint.');
        if (active >= 2) throw new TrustScoreError(429, 'Two assessments are already running. Try again shortly.');
        const endpoint = validateTrustScoreRequest(await readJSON(req, MAX_BODY));
        // Recheck after the asynchronous body read before claiming a worker slot.
        if (active >= 2) throw new TrustScoreError(429, 'Two assessments are already running. Try again shortly.');
        const controller = new AbortController();
        const cancel = () => { if (!res.writableEnded) controller.abort(); };
        controllers.add(controller); active++; res.once('close', cancel);
        try { sendJSON(res, 200, await run(root, endpoint, controller.signal)); }
        finally { active--; controllers.delete(controller); res.removeListener('close', cancel); }
      } catch (error) {
        const failure = error instanceof TrustScoreError ? error : new TrustScoreError(500, 'The assessment could not be completed.');
        sendJSON(res, failure.status, { error: failure.message });
      }
    },
  };
}

export function trustScorePlugin(): Plugin {
  const install = (server: ViteDevServer | PreviewServer) => {
    const handler = createTrustScoreHandler(server.config.root);
    server.httpServer?.once('close', () => handler.close());
    server.middlewares.use((req, res, next) => {
      if (req.url?.split('?')[0] !== API_PATH) { next(); return; }
      void handler.handle(req, res);
    });
  };
  return { name: 'agentopia-trust-score', configureServer: install, configurePreviewServer: install };
}
