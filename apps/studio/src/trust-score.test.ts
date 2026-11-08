import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseTrustResponse, fetchTrustReport, resolveTrustInput } from './trust-score.ts';

import { displayResponse } from './trust-display.fixture.ts';
afterEach(()=>vi.unstubAllGlobals());

describe('assessment display contract',()=>{
  it('copies only allowed display fields at every level',()=>{
    const payload=displayResponse();
    for (const item of [payload,payload.report,payload.report.subject,payload.report.summary,payload.report.presentation,
      payload.report.presentation.score_display,...payload.report.presentation.passed,...payload.report.presentation.failed,...payload.report.presentation.tips]) {
      Object.assign(item,{internal_metadata:'PRIVATE_SENTINEL'});
    }
    expect(JSON.stringify(parseTrustResponse(payload))).not.toContain('PRIVATE_SENTINEL');
    expect(parseTrustResponse(payload).presentation.score_display).toEqual(displayResponse().report.presentation.score_display);
  });
  it('rejects missing displays, invalid counts, unsafe colors and invalid export references',()=>{
    for (const mutate of [
      (p:ReturnType<typeof displayResponse>)=>{p.report.summary.failed_rules=-1;},
      (p:ReturnType<typeof displayResponse>)=>{p.report.export_id='../invalid';},
      (p:ReturnType<typeof displayResponse>)=>{p.report.presentation.score_display.color='url(example)';},
      (p:ReturnType<typeof displayResponse>)=>{p.report.presentation.score_display.ratio=NaN;},
    ]) {const payload=displayResponse();mutate(payload);expect(()=>parseTrustResponse(payload)).toThrow();}
    expect(()=>parseTrustResponse({schema_version:'2.0',report:{}})).toThrow();
  });
  it('preserves V2-sized outcomes, server-provided display values and effective tip gains', () => {
    const payload = displayResponse();
    payload.report.summary = {failed_rules:8, passed_rules:40, skipped_rules:4, unknown_rules:50};
    payload.report.presentation.score_display = {score:75, maximum:186, ratio:0.4032258064516129, rating:'Fair', color:'#ffad5c'};
    payload.report.presentation.tips[0].estimated_gain = 1;
    payload.report.presentation.tips_gain = 1;
    const report = parseTrustResponse(payload);
    expect(Object.values(report.summary).reduce((sum, count) => sum + count, 0)).toBe(102);
    expect(report.presentation.score_display).toEqual(payload.report.presentation.score_display);
    expect(report.presentation.tips_gain).toBe(1);
    // Custom deployments can return different maxima and counts without a UI policy update.
    payload.report.presentation.score_display.maximum = 250;
    payload.report.presentation.score_display.ratio = 0.3;
    expect(parseTrustResponse(payload).presentation.score_display.maximum).toBe(250);
  });
  it('rejects stale presentation versions, inconsistent gains and overflowing displays', () => {
    for (const mutate of [
      (p: ReturnType<typeof displayResponse>) => { delete (p.report.presentation as Partial<typeof p.report.presentation>).tips_version; },
      (p: ReturnType<typeof displayResponse>) => { p.report.presentation.tips_gain = 5; },
      (p: ReturnType<typeof displayResponse>) => { p.report.presentation.score_display.score = 21; },
      (p: ReturnType<typeof displayResponse>) => { p.report.presentation.score_display.maximum = 0; },
      (p: ReturnType<typeof displayResponse>) => { p.report.summary.passed_rules = 1.5; },
      (p: ReturnType<typeof displayResponse>) => { p.report.presentation.passed = Array.from({length:5}, () => ({text:'Finding.'})); },
      (p: ReturnType<typeof displayResponse>) => { p.report.presentation.tips = Array.from({length:6}, () => ({text:'Action.', estimated_gain:0})); },
    ]) { const payload = displayResponse(); mutate(payload); expect(() => parseTrustResponse(payload)).toThrow('invalid response'); }
  });
  it('retains verification-only guidance and unavailable displays without inventing points', () => {
    const payload = displayResponse();
    Object.assign(payload.report.presentation.tips[0], {estimated_gain:null});
    payload.report.presentation.tips_gain = 0;
    Object.assign(payload.report.presentation.score_display, {score:null, ratio:0, rating:null});
    payload.report.status = 'unavailable';
    expect(parseTrustResponse(payload).presentation.tips[0].estimated_gain).toBeNull();
    expect(parseTrustResponse(payload).presentation.score_display.score).toBeNull();
    payload.report.presentation.score_display.ratio = 0.6;
    expect(() => parseTrustResponse(payload)).toThrow();
  });
  it('accepts endpoint input and keeps agent assessment unavailable',()=>{
    expect(resolveTrustInput('mcp',' https://example.com/mcp ')).toEqual({status:'ready',endpoint:'https://example.com/mcp'});
    for(const endpoint of ['file:///tmp/input','https://user@example.com/mcp','https://example.com/mcp#fragment']) expect(resolveTrustInput('mcp',endpoint).status).toBe('invalid');
    expect(resolveTrustInput('agent','example.com').status).toBe('unavailable');
  });
  it('requests a display response without a local fallback',async()=>{
    const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify(displayResponse()),{status:200}));vi.stubGlobal('fetch',mock);
    expect((await fetchTrustReport('https://example.com/mcp',new AbortController().signal)).export_id).toBe('synthetic-export-reference');
    mock.mockResolvedValue(new Response(JSON.stringify({error:'Service unavailable.'}),{status:503}));
    await expect(fetchTrustReport('https://example.com/mcp',new AbortController().signal)).rejects.toThrow('Service unavailable.');
  });
});
