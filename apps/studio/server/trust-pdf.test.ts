import { Readable, Writable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import snapshot from '../src/data/mcp-trust-score-v1.snapshot.json';
import type { ImprovementTip } from '../src/trust-projection.ts';
import { projectTrustScore } from '../src/trust-projection.ts';
import { legacyTrustPresentation } from './trust-test-fixtures.ts';
import { selectImprovementTips, parseTipGuidance } from './trust-tips.ts';
import { parseTrustResponse, type TrustReport } from '../src/trust-score.ts';
import { createTrustPDFHandler, trustPDFHTML } from './trust-pdf.ts';
const payload = () => ({ schema_version: '1.0', source: 'live', report: structuredClone(snapshot) as TrustReport });
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
  it('escapes content, preserves the overview, and omits technical appendices', () => {
    const report=structuredClone(snapshot); report.subject.endpoint='<img src="https://bad.example" onerror="alert(1)">';
    const html=trustPDFHTML(report);
    expect(html).not.toContain('<img');expect(html).toContain('&lt;img');
    for(const text of ['Score: 44 / 184','Rule pass percentage: 22%','Actions for improvement'])expect(html).toContain(text);
    for(const text of ['Complete rule evidence','Observations','Provenance','<pre','data-outcome=','Recorded result','Reason —','Assessed maximum','Assessment:','Collection:','This report reuses','Conditional on successful','passing checks do not establish'])expect(html).not.toContain(text);
    expect(html).toContain("default-src 'none'");
  });
  it('shows only the selected families and cached actions/estimates without changing report data', () => {
    const report=payload().report;
    const candidates=selectImprovementTips(report);
    const tips=parseTipGuidance(JSON.stringify({tips:candidates.map(tip=>({family_id:tip.family_id,text:'Correct the recorded behavior and repeat the check.'}))}),candidates);
    report.presentation={...legacyTrustPresentation(report),score_display:projectTrustScore(report.summary.total_score,report.summary.configured_maximum,report.status),
      tips_version:'1.0',tips_source:'deepinfra',tips_model:'test',tips_gain:16,tips};
    const original=structuredClone(report);
    const html=trustPDFHTML(report);
    expect(report).toEqual(original);
    expect(html.match(/data-tip=/g)).toHaveLength(5);
    expect(html).toContain('Actions for improvement');
    for(const tip of tips) {
      expect(html).toContain(`data-tip="${tip.family_id}"`);
      expect(html).toContain(tip.family_name!);
      expect(html).toContain(tip.text);
    }
    for(const text of ['data-rule=','data-outcome=','Reason —','Weight','Applicability:','Evidence:','<pre'])expect(html).not.toContain(text);
    expect(html).toContain('Total potential gain');
    expect(html).toContain('Up to +16 pts');
    const tip=tips.find(tip=>tip.rule_ids.includes('protocol.invalid_request_code'))!;
    expect(html).toContain(tip.rule_details![0].action);
    expect(html).toContain('Up to +1 pts');
    expect(html).toContain('stroke-dasharray="23.91304347826087 100"');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('src="http');
    for(const mutate of [
      (tip:ImprovementTip)=>{tip.rule_details![0].rule_id='invented';},
      (tip:ImprovementTip)=>{tip.rule_details![0].action='';},
    ]) {
      const invalid=structuredClone(report);mutate(invalid.presentation!.tips[0] as ImprovementTip);
      expect(()=>parseTrustResponse({schema_version:'1.0',source:'live',report:invalid})).toThrow('invalid report');
    }
  });
  it('caps historical guidance at five families without adding more suggestions', () => {
    const report=payload().report;
    report.presentation={...legacyTrustPresentation(report)};
    const tip=report.presentation.tips[0];
    report.presentation.tips=Array.from({length:7},(_,index)=>({...tip,text:`Action ${index + 1}`}));
    const html=trustPDFHTML(report);
    expect(html.match(/data-tip=/g)).toHaveLength(5);
    expect(html).not.toContain('Action 6');expect(html).not.toContain('Action 7');
  });
  it('shows an explicit empty action state without reasons or technical tables', () => {
    const report=payload().report;
    report.rules.passed=[];report.rules.failed=[];report.rules.skipped=[];report.rules.unknown=[];
    const html=trustPDFHTML(report);
    expect(html).toContain('No UI improvement guidance was supplied');
    expect(html).not.toContain('No UI reason summary');
    expect(html).not.toContain('No unknown rules recorded.');
    expect(html).not.toContain('data-rule=');
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
