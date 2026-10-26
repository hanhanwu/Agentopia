import { afterEach, describe, expect, it, vi } from 'vitest';
import { categorySummaries, OUTCOME_GROUPS, resolveTrustInput, parseTrustResponse, fetchTrustReport, type TrustReport } from './trust-score.ts';

import snapshot from './data/mcp-trust-score-v1.snapshot.json';
const savedTrustReport: TrustReport = snapshot;
afterEach(() => vi.unstubAllGlobals());

describe('MCP trust report presentation boundary', () => {
  it('accepts any valid HTTP MCP endpoint for live collection, never a saved-score match', () => {
    for (const endpoint of ['https://omnitravel.ai/mcp', 'https://other.example/mcp', 'https://omnitravel.ai/other']) {
      expect(resolveTrustInput('mcp', ` ${endpoint} `)).toEqual({ status: 'ready', endpoint });
    }
    expect(resolveTrustInput('agent', savedTrustReport.subject.endpoint).status).toBe('unavailable');
  });

  it('rejects malformed URLs, non-HTTP transports, credentials and fragments', () => {
    for (const endpoint of ['', 'not a URL', 'javascript:alert(1)', 'file:///etc/passwd',
      'https://token@omnitravel.ai/mcp', 'https://omnitravel.ai/mcp#other']) {
      expect(resolveTrustInput('mcp', endpoint).status).toBe('invalid');
    }
  });

  it('keeps all four outcomes and the retained-rule denominator', () => {
    const report = savedTrustReport;
    expect(OUTCOME_GROUPS.map(group => report.rules[group].length)).toEqual([5, 22, 71, 2]);
    const all = OUTCOME_GROUPS.flatMap(group => report.rules[group]);
    expect(all).toHaveLength(report.summary.total_rules);
    expect(report.summary.pass_percentage).toBe(100 * report.rules.passed.length / all.length);
    expect([...report.rules.skipped, ...report.rules.unknown].every(rule => rule.possible === 0 && rule.earned === 0)).toBe(true);
  });

  it('preserves weighted points separately from the pass percentage', () => {
    const categories = categorySummaries(savedTrustReport);
    expect(categories.reduce((sum, category) => sum + category.earned, 0)).toBe(44);
    expect(categories.reduce((sum, category) => sum + category.possible, 0)).toBe(60);
    expect(categories.reduce((sum, category) => sum + category.configured, 0)).toBe(184);
    expect(savedTrustReport.summary.pass_percentage).toBe(22);
    expect(categories.find(category => category.category === 'Primitives')).toMatchObject({
      earned: 15, possible: 15, passed: 9, total: 50,
    });
  });

  it('resolves every referenced observation without depending on notebook code', () => {
    for (const rule of OUTCOME_GROUPS.flatMap(group => savedTrustReport.rules[group])) {
      for (const key of rule.observation_keys) expect(savedTrustReport.observations).toHaveProperty(key.replaceAll('.', '\\.'));
    }
  });
});


describe('live report response contract', () => {
  const response = () => ({ schema_version: '1.0', source: 'live', report: structuredClone(savedTrustReport) });

  it('maps fresh response data without substituting the bundled snapshot', () => {
    const payload = response();
    payload.report.subject.endpoint = 'https://another.example/mcp';
    const report = parseTrustResponse(payload);
    expect(report.subject.endpoint).toBe('https://another.example/mcp');
    expect(report.source).toBe('live');
    expect(report.rules.unknown).toHaveLength(2);
  });

  it('rejects invalid or contradictory response shapes', () => {
    const wrongCount = response(); wrongCount.report.summary.unknown_rules = 0;
    const wrongScore = response(); wrongScore.report.summary.total_score = 999;
    for (const payload of [{}, { ...response(), source: 'saved' }, wrongCount, wrongScore]) {
      expect(() => parseTrustResponse(payload)).toThrow('invalid report');
    }
  });

  it('posts the entered endpoint to the API and propagates its result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;
    expect((await fetchTrustReport('https://omnitravel.ai/mcp', signal)).source).toBe('live');
    expect(fetchMock).toHaveBeenCalledWith('/api/trust-score/v1', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ type: 'mcp', identifier: 'https://omnitravel.ai/mcp' }), signal,
    }));
  });

  it('surfaces service failures instead of falling back to a saved score', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Timed out' }), { status: 504 })));
    await expect(fetchTrustReport('https://other.example/mcp', new AbortController().signal)).rejects.toThrow('Timed out');
  });
});
