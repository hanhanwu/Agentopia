import { Readable, Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import snapshot from '../src/data/mcp-trust-score-v1.snapshot.json';
import { createTrustPDFHandler, trustPDFHTML } from './trust-pdf.ts';
const payload = () => ({ schema_version: '1.0', source: 'live', report: structuredClone(snapshot) });
function request(body: unknown, overrides = {}) {
  return Object.assign(Readable.from([JSON.stringify(body)]), { socket: {remoteAddress:'127.0.0.1'}, method:'POST',
    headers: {host:'127.0.0.1:8678','content-type':'application/json'}, ...overrides }) as unknown as IncomingMessage;
}
class ResponseBuffer extends Writable {
  status = 0; headers: Record<string,string> = {}; chunks: Buffer[] = [];
  writeHead(status: number, headers: Record<string,string>) { this.status = status; this.headers = headers; return this; }
  _write(chunk: Buffer, _encoding: string, cb: () => void) {this.chunks.push(chunk);cb();}
  body() { return Buffer.concat(this.chunks).toString(); }
}
const asResponse = (res: ResponseBuffer) => res as unknown as ServerResponse;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

describe('bounded report PDF export', () => {
  it('exports a validated existing assessment as PDF without rescoring', async () => {
    const render = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.7\nexample'));
    const res = new ResponseBuffer(); await createTrustPDFHandler(render).handle(request(payload()),asResponse(res));
    expect(res.status).toBe(200); expect(res.headers['Content-Type']).toBe('application/pdf');
    expect(res.headers['Content-Disposition']).toContain('.pdf'); expect(res.body()).toMatch(/^%PDF-/);
    expect(render).toHaveBeenCalledWith(expect.objectContaining({summary:snapshot.summary}),expect.any(AbortSignal));
  });
  it('rejects malformed, remote, oversized and wrong-method requests before rendering', async () => {
    const render=vi.fn(); const handler=createTrustPDFHandler(render);
    for(const [body,overrides,status] of [
      [{}, {},400], [payload(),{socket:{remoteAddress:'8.8.8.8'}},403],
      [payload(),{method:'GET'},405], [{padding:'x'.repeat(6*1024*1024)},{},413],
    ] as const) {
      const res=new ResponseBuffer();await handler.handle(request(body,overrides),asResponse(res));expect(res.status).toBe(status);
    }
    expect(render).not.toHaveBeenCalled();
  });
  it('escapes content and includes limitations, original rule data and configured/assessed maxima', () => {
    const report=structuredClone(snapshot); report.subject.endpoint='<img src="https://bad.example" onerror="alert(1)">';
    const html=trustPDFHTML(report);
    expect(html).not.toContain('<img');expect(html).toContain('&lt;img');
    for(const text of ['44 / 184','Assessed maximum: 60','partial','Complete rule evidence','Observations','policy','configured_weight','protocol.invalid_request_code'])expect(html).toContain(text);
    expect(html).toContain("default-src 'none'");
  });
  it('uses generic renderer errors, permits retry, and rejects fake PDF bytes', async () => {
    const render=vi.fn().mockRejectedValueOnce(new Error('/secret/path')).mockResolvedValueOnce(Buffer.from('JSON')).mockResolvedValueOnce(Buffer.from('%PDF-1.7'));
    const handler=createTrustPDFHandler(render);
    for(const status of [500,500,200]) {
      const res=new ResponseBuffer();await handler.handle(request(payload()),asResponse(res));expect(res.status).toBe(status);expect(res.body()).not.toContain('/secret');
    }
  });
  it('limits concurrency, cancels on disconnect and releases slots', async () => {
    const signals: AbortSignal[]=[];
    const render=vi.fn().mockImplementation((_r,signal: AbortSignal)=>{ signals.push(signal); return new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('cancelled')))); });
    const handler=createTrustPDFHandler(render); const responses=[new ResponseBuffer(),new ResponseBuffer()];
    const jobs=responses.map(res=>handler.handle(request(payload()),asResponse(res)));await tick();
    const busy=new ResponseBuffer();await handler.handle(request(payload()),asResponse(busy));expect(busy.status).toBe(429);
    responses[0].destroy();handler.close();await Promise.all(jobs);expect(signals.every(signal=>signal.aborted)).toBe(true);
    render.mockResolvedValue(Buffer.from('%PDF-1.7'));const retry=new ResponseBuffer();await handler.handle(request(payload()),asResponse(retry));expect(retry.status).toBe(200);
  });
});
