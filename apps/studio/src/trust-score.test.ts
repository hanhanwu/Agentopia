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
