import { Readable, Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createTrustScoreHandler, TrustScoreError, validateTrustScoreRequest } from './trust-score-api.ts';

function request(body: unknown = { type: 'mcp', identifier: 'https://example.com/mcp' }, overrides: Record<string, unknown> = {}) {
  return Object.assign(Readable.from([JSON.stringify(body)]), {
    socket: { remoteAddress: '127.0.0.1' }, method: 'POST', url: '/api/trust-score/v1',
    headers: { host: '127.0.0.1:8678', origin: 'http://127.0.0.1:8678', 'content-type': 'application/json' },
    ...overrides,
  }) as unknown as IncomingMessage;
}
class ResponseBuffer extends Writable {
  status = 0;
  chunks: Buffer[] = [];
  writeHead(status: number) { this.status = status; return this; }
  _write(chunk: Buffer, _encoding: string, callback: () => void) { this.chunks.push(chunk); callback(); }
  json() { return JSON.parse(Buffer.concat(this.chunks).toString('utf8')); }
}
const asResponse = (response: ResponseBuffer) => response as unknown as ServerResponse;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

describe('local trust-score HTTP bridge', () => {
  it('validates typed endpoints without treating a known endpoint as a saved result', () => {
    expect(validateTrustScoreRequest({ type: 'mcp', identifier: ' https://example.com/mcp ' })).toBe('https://example.com/mcp');
    for (const identifier of ['file:///tmp/file', 'https://user@example.com/mcp', 'https://example.com:0/mcp']) {
      expect(() => validateTrustScoreRequest({ type: 'mcp', identifier })).toThrow();
    }
  });

  it('returns the worker result unchanged for a valid local request', async () => {
    const result = { schema_version: '1.0', source: 'live', report: { subject: { endpoint: 'https://example.com/mcp' } } };
    const run = vi.fn().mockResolvedValue(result);
    const response = new ResponseBuffer();
    await createTrustScoreHandler('/project', run).handle(request(), asResponse(response));
    expect(response.status).toBe(200); expect(response.json()).toEqual(result);
    expect(run).toHaveBeenCalledWith('/project', 'https://example.com/mcp', expect.any(AbortSignal));
  });

  it('rejects cross-site, remote, wrong-origin and oversized requests before spawning a worker', async () => {
    const run = vi.fn(); const handler = createTrustScoreHandler('/project', run);
    for (const [overrides, status] of [
      [{ socket: { remoteAddress: '8.8.8.8' } }, 403],
      [{ headers: { host: 'evil.example', 'content-type': 'application/json' } }, 403],
      [{ headers: { host: 'localhost:8678', origin: 'https://evil.example', 'content-type': 'application/json' } }, 403],
      [{ headers: { host: 'localhost:8678', 'sec-fetch-site': 'cross-site' } }, 403],
      [{ method: 'GET' }, 405],
    ] as const) {
      const response = new ResponseBuffer(); await handler.handle(request(undefined, overrides), asResponse(response));
      expect(response.status).toBe(status);
    }
    const response = new ResponseBuffer(); await handler.handle(request({ identifier: 'x'.repeat(9000) }), asResponse(response));
    expect(response.status).toBe(413); expect(run).not.toHaveBeenCalled();
  });

  it('keeps agent scoring unavailable and reports worker failures without a snapshot fallback', async () => {
    const run = vi.fn().mockRejectedValue(new TrustScoreError(504, 'Assessment timed out.'));
    const handler = createTrustScoreHandler('/project', run);
    const agent = new ResponseBuffer(); await handler.handle(request({ type: 'agent', identifier: 'agent.example' }), asResponse(agent));
    expect(agent.status).toBe(422); expect(run).not.toHaveBeenCalled();
    const failure = new ResponseBuffer(); await handler.handle(request(), asResponse(failure));
    expect(failure.status).toBe(504); expect(failure.json()).toEqual({ error: 'Assessment timed out.' });
  });

  it('limits concurrent workers and frees slots when jobs complete', async () => {
    const release: Array<() => void> = [];
    const run = vi.fn().mockImplementation(() => new Promise(resolve => release.push(() => resolve({ source: 'live' }))));
    const handler = createTrustScoreHandler('/project', run);
    const jobs = [new ResponseBuffer(), new ResponseBuffer()].map(res => handler.handle(request(), asResponse(res)));
    await tick();
    const busy = new ResponseBuffer(); await handler.handle(request(), asResponse(busy)); expect(busy.status).toBe(429);
    release.forEach(resolve => resolve()); await Promise.all(jobs);
    run.mockResolvedValue({ source: 'live' }); const next = new ResponseBuffer();
    await handler.handle(request(), asResponse(next)); expect(next.status).toBe(200);
  });

  it('cancels in-flight work when the browser disconnects', async () => {
    let signal: AbortSignal | undefined;
    const run = vi.fn().mockImplementation((_root, _endpoint, supplied: AbortSignal) => {
      signal = supplied;
      return new Promise((_resolve, reject) => supplied.addEventListener('abort', () => reject(new TrustScoreError(499, 'Cancelled'))));
    });
    const handler = createTrustScoreHandler('/project', run); const response = new ResponseBuffer();
    const job = handler.handle(request(), asResponse(response)); await tick(); response.destroy(); await job;
    expect(signal?.aborted).toBe(true);
  });
});
