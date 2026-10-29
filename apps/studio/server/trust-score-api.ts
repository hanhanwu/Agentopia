import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin, type PreviewServer, type ViteDevServer } from 'vite';
import { parseTrustResponse } from '../src/trust-score.ts';
import { resolveTrustInput } from '../src/trust-input.ts';
import { LocalAPIError, readJSON, requireLocalRequest, sendJSON } from './local-api.ts';

const API_PATH = '/api/trust-score/v1';
export type TrustServiceConfig = { url: string; token?: string };

export function createTrustScoreHandler(config: TrustServiceConfig, fetcher: typeof fetch = fetch) {
  const jobs = new Set<AbortController>();
  return {
    close() { for (const job of jobs) job.abort(); },
    async handle(req: IncomingMessage, res: ServerResponse) {
      let controller: AbortController | undefined;
      let deadline: ReturnType<typeof setTimeout> | undefined;
      const cancel = () => controller?.abort();
      try {
        requireLocalRequest(req);
        if (req.method !== 'POST') throw new LocalAPIError(405, 'Use POST.');
        const body = await readJSON(req, 8192);
        if (!body || typeof body !== 'object') throw new LocalAPIError(400, 'Invalid request.');
        const input = body as Record<string, unknown>;
        const pdf = req.url?.split('?')[0] === `${API_PATH}/pdf`;
        let request: Record<string, string>;
        if (pdf) {
          if (typeof input.export_id !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/u.test(input.export_id)) throw new LocalAPIError(400, 'Invalid report reference.');
          request = { export_id: input.export_id };
        } else {
          if (input.type !== 'mcp' && input.type !== 'agent') throw new LocalAPIError(400, 'Choose Agent or MCP Server.');
          const result = resolveTrustInput(input.type, typeof input.identifier === 'string' ? input.identifier : '');
          if (result.status !== 'ready') throw new LocalAPIError(result.status === 'unavailable' ? 422 : 400, result.message);
          request = { type: 'mcp', identifier: result.endpoint };
        }
        if (!config.url) throw new LocalAPIError(503, 'The assessment service is not configured.');
        const target = new URL(config.url);
        if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.search || target.hash) throw new LocalAPIError(503, 'The assessment service is not configured.');
        target.pathname = `${target.pathname.replace(/\/$/u, '')}${API_PATH}${pdf ? '/pdf' : ''}`;
        if (jobs.size >= 2) throw new LocalAPIError(429, 'Two requests are running. Try again shortly.');
        controller = new AbortController(); jobs.add(controller); res.once('close', cancel);
        deadline = setTimeout(cancel, pdf ? 40000 : 125000);
        const upstream = await fetcher(target, { method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}) },
          body: JSON.stringify(request) });
        if (!upstream.ok) {
          await upstream.body?.cancel();
          throw new LocalAPIError([400,404,410,422,429,503,504].includes(upstream.status) ? upstream.status : 502,
            pdf ? 'The PDF could not be exported. Reassess and try again.' : 'The assessment could not be completed. Try again.');
        }
        // Bound responses and never pass through upstream headers or diagnostic messages.
        const chunks: Uint8Array[] = []; let size = 0;
        if (!upstream.body) throw new Error('Empty response');
        const reader = upstream.body.getReader();
        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            size += value.length;
            if (size > (pdf ? 10 * 1024 * 1024 : 512 * 1024)) { controller.abort(); throw new Error('Oversized response'); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const bytes = Buffer.concat(chunks);
        if (res.destroyed) return;
        if (pdf) {
          if (!upstream.headers.get('content-type')?.startsWith('application/pdf') || bytes.subarray(0,5).toString() !== '%PDF-') throw new Error('Invalid PDF');
          res.writeHead(200, { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Content-Disposition': 'attachment; filename="agentopia-mcp-trust-score.pdf"' });
          res.end(bytes);
        } else {
          const report = parseTrustResponse(JSON.parse(bytes.toString('utf8')));
          sendJSON(res, 200, { schema_version: '2.0', report });
        }
      } catch (error) {
        const failure = error instanceof LocalAPIError ? error : new LocalAPIError(502, 'The assessment service is unavailable. Try again.');
        sendJSON(res, failure.status, { error: failure.message });
      } finally {
        if (deadline) clearTimeout(deadline);
        if (controller) { controller.abort(); jobs.delete(controller); }
        res.removeListener('close', cancel);
      }
    },
  };
}

export function trustScorePlugin(): Plugin {
  const install = (server: ViteDevServer | PreviewServer) => {
    const env = loadEnv(server.config.mode, server.config.envDir, '');
    const handler = createTrustScoreHandler({ url: env.AGENTOPIA_TRUST_SERVICE_URL ?? '', token: env.AGENTOPIA_TRUST_SERVICE_TOKEN });
    server.httpServer?.once('close', () => handler.close());
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0];
      if (path === API_PATH || path === `${API_PATH}/pdf`) void handler.handle(req, res);
      else next();
    });
  };
  return { name: 'agentopia-assessment-api', configureServer: install, configurePreviewServer: install };
}
