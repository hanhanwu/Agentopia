import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import snapshot from '../src/data/mcp-trust-score-v1.snapshot.json';
import { parseTrustResponse, type TrustReport } from '../src/trust-score.ts';
import { summarizeTrustReason } from './trust-reason-llm.ts';
import { trustPDFHTML } from './trust-pdf.ts';
const config = { model: 'test/model', apiKey: 'test-secret' };
const retryConfig = { ...config, maxAttempts: 2 as const };
const report = (): TrustReport => structuredClone(snapshot);
function bullets(r = report()) {
  return { bullets: [
    { outcome: 'passed', text: 'Transport, TLS, and structural tool checks passed.', rule_ids: r.rules.passed.map(rule => rule.id) },
    { outcome: 'failed', text: 'Error handling, Origin validation, discovery, and stateless listing checks failed.', rule_ids: r.rules.failed.map(rule => rule.id) },
  ].filter(item => item.rule_ids.length) };
}
const response = (body: unknown) => new Response(JSON.stringify({ choices: [{finish_reason:'stop',message:{content:JSON.stringify(body)}}] }));
const signal = () => new AbortController().signal;

describe('DeepInfra Reason generation', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());
  it('uses configured model and server key, sends actual rule evidence without scores, and preserves tips', async () => {
    const fetcher = vi.fn().mockResolvedValue(response(bullets()));
    const r = report(); const original = structuredClone(r);
    r.presentation = await summarizeTrustReason(r,config,signal(),fetcher);
    expect(parseTrustResponse({schema_version:'1.0',source:'live',report:r}).presentation).toEqual(r.presentation);
    expect(r.presentation).toMatchObject({version:'1.1',reason_source:'deepinfra',reason_model:config.model});
    expect(r.summary).toEqual(original.summary);expect(r.rules).toEqual(original.rules);
    const [url,options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.deepinfra.com/v1/openai/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-secret');
    const body = JSON.parse(options.body);expect(body.model).toBe(config.model);
    const evidence = JSON.parse(body.messages[1].content);
    expect(evidence.rules).toHaveLength(27);
    expect(evidence.rules.find((rule: {id:string}) => rule.id === 'protocol.invalid_request_code').reason).toContain('-32700');
    expect(options.body).not.toContain('configured_weight');expect(options.body).not.toContain('test-secret');
    expect(r.presentation.tips).toHaveLength(5);
    const html = trustPDFHTML(r);expect(html).toContain(r.presentation.passed[0].text);
    expect(html).not.toContain('additional checks passed');
  });
  it('accepts a concise selection of supporting IDs without requiring every raw rule in Reason', async () => {
    const r = report(); const selected = { bullets: [
      { outcome: 'passed', text: 'TLS verification passed.', rule_ids: ['security.tls'] },
      { outcome: 'failed', text: 'Origin validation failed.', rule_ids: ['security.origin_validation'] },
    ] };
    const fetcher = vi.fn().mockResolvedValue(response(selected));
    r.presentation = await summarizeTrustReason(r,config,signal(),fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r.presentation.passed).toHaveLength(1); expect(r.presentation.failed).toHaveLength(1);
    expect(r.presentation.passed[0].evidence_ids).toEqual([...r.rules.passed.find(rule => rule.id === 'security.tls')!.evidence_ids].sort());
    expect(parseTrustResponse({schema_version:'1.0',source:'live',report:r}).presentation).toEqual(r.presentation);
    expect(r.presentation.tips.flatMap(item => item.rule_ids).sort()).toEqual(r.rules.failed.map(rule => rule.id).sort());
    expect(r.rules.passed).toHaveLength(22); expect(r.rules.failed).toHaveLength(5);
  });
  it('rejects overlong bullets and repairs once without silently returning the old summary', async () => {
    const bad = bullets(); bad.bullets[0].text = Array(21).fill('word').join(' ');
    const fetcher = vi.fn().mockResolvedValueOnce(response(bad)).mockResolvedValueOnce(response(bullets()));
    expect((await summarizeTrustReason(report(),retryConfig,signal(),fetcher)).passed[0].text).toContain('Transport');
    expect(fetcher).toHaveBeenCalledTimes(2);
    const retry = JSON.parse(fetcher.mock.calls[1][1].body);
    expect(retry.messages).toHaveLength(4);
    expect(retry.messages[2]).toEqual({role:'assistant',content:JSON.stringify(bad)});
    expect(JSON.parse(retry.messages[3].content).validation_error).toBe('Bullet 1 has 21 words; use 1 to 20 words.');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).messages).toHaveLength(2);
  });
  it('logs provider responses and validation failures in the terminal with the configured key redacted', async () => {
    const invalid = bullets(); invalid.bullets[0].text = 'test-secret'; invalid.bullets[0].rule_ids = ['invented'];
    const fetcher = vi.fn().mockImplementation(async () => response(invalid));
    await expect(summarizeTrustReason(report(),retryConfig,signal(),fetcher)).rejects.toThrow('invalid Reason summary');
    expect(console.info).toHaveBeenCalledTimes(2);
    expect(console.warn).toHaveBeenCalledTimes(2);
    const logs = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(logs).toContain('invented'); expect(logs).toContain('[REDACTED]'); expect(logs).not.toContain(config.apiKey);
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).toContain('Unknown or mismatched rule');
  });
  it('rejects too many distinct bullets, missing outcomes and invented or mismatched IDs without a paid retry', async () => {
    for (const mutate of [
      (b: ReturnType<typeof bullets>) => { b.bullets = Array.from({length:6}, (_,i) => ({...b.bullets[0],text:`Check ${i} passed.`})); },
      (b: ReturnType<typeof bullets>) => { b.bullets.pop(); },
      (b: ReturnType<typeof bullets>) => { b.bullets[0].rule_ids = ['invented']; },
      (b: ReturnType<typeof bullets>) => { b.bullets[0].rule_ids = [snapshot.rules.failed[0].id]; },
    ]) {
      const invalid = bullets(); mutate(invalid);
      const fetcher = vi.fn().mockImplementation(async () => response(invalid));
      await expect(summarizeTrustReason(report(),config,signal(),fetcher)).rejects.toThrow('invalid Reason summary');
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it('normalizes harmless formatting, duplicate references and JSON fences without another paid request', async () => {
    const r = report(); const formatted = { bullets: [
      {outcome:' Passed ',text:'• TLS verification\n passed; negotiated version >= 1.2.',rule_ids:[' security.tls ', 'security.tls']},
      {outcome:'failed',text:'- Invalid-request error code -32700 differs from -32600.',rule_ids:['protocol.invalid_request_code']},
    ] };
    const content = '```json\n' + JSON.stringify(formatted) + '\n```';
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content}}]})));
    r.presentation = await summarizeTrustReason(r,config,signal(),fetcher);
    expect(r.presentation.passed[0].text).toBe('TLS verification passed; negotiated version >= 1.2.');
    expect(r.presentation.passed[0].rule_ids).toEqual(['security.tls']);
    expect(r.presentation.failed[0].text).toBe('Invalid-request error code -32700 differs from -32600.');
    expect(parseTrustResponse({schema_version:'1.0',source:'live',report:r}).presentation).toEqual(r.presentation);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('removes identical repeated bullets without dropping distinct findings', async () => {
    const original = bullets();const repeated = {bullets:Array(3).fill(original.bullets).flat()};
    const fetcher=vi.fn().mockResolvedValue(response(repeated));
    const result=await summarizeTrustReason(report(),config,signal(),fetcher);
    expect(result.passed).toHaveLength(1);expect(result.failed).toHaveLength(1);expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('does not pay for a second generation by default when a bullet exceeds the word limit', async () => {
    const bad=bullets();bad.bullets[0].text=Array(21).fill('word').join(' ');
    const fetcher=vi.fn().mockResolvedValue(response(bad));
    await expect(summarizeTrustReason(report(),config,signal(),fetcher)).rejects.toThrow('invalid Reason summary');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('skips external calls when there are no assessed passes or failures', async () => {
    const r = report();r.rules.passed=[];r.rules.failed=[];
    const fetcher=vi.fn();const result=await summarizeTrustReason(r,{model:'',apiKey:''},signal(),fetcher);
    expect(result).toMatchObject({reason_source:'none',reason_model:null,passed:[],failed:[]});expect(fetcher).not.toHaveBeenCalled();
  });
  it('fails clearly for missing settings or provider errors without revealing provider bodies or credentials', async () => {
    const fetcher=vi.fn().mockResolvedValue(new Response('test-secret provider diagnostics',{status:401}));
    await expect(summarizeTrustReason(report(),config,signal(),fetcher)).rejects.toThrow('DeepInfra could not generate');
    const missing=vi.fn();await expect(summarizeTrustReason(report(),{model:'',apiKey:''},signal(),missing)).rejects.toThrow('Configure LLM_MODEL');expect(missing).not.toHaveBeenCalled();
  });
  it('cancels an in-flight provider request and hides network diagnostics', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockImplementation((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new Error('test-secret diagnostic')));
    }));
    const job = summarizeTrustReason(report(),config,controller.signal,fetcher);
    controller.abort();
    await expect(job).rejects.toThrow('Assessment cancelled.');
    await expect(summarizeTrustReason(report(),config,signal(),vi.fn().mockRejectedValue(new Error('test-secret diagnostic')))).rejects.toThrow('could not be generated');
  });
  it('bounds provider response size and forwards cancellation', async () => {
    await expect(summarizeTrustReason(report(),config,signal(),vi.fn().mockResolvedValue(new Response('x'.repeat(65537))))).rejects.toThrow('could not be generated');
    const controller=new AbortController();controller.abort();const fetcher=vi.fn();
    await expect(summarizeTrustReason(report(),config,controller.signal,fetcher)).rejects.toThrow('cancelled');expect(fetcher).not.toHaveBeenCalled();
  });
});
