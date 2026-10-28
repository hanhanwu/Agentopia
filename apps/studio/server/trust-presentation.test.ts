import { describe, expect, it } from 'vitest';
import snapshot from '../src/data/mcp-trust-score-v1.snapshot.json';
import { parseTrustResponse, type TrustReport } from '../src/trust-score.ts';
import { projectTrustScore, quarter } from '../src/trust-projection.ts';
import { emptyTrustPresentation } from './trust-presentation.ts';
import { legacyTrustPresentation } from './trust-test-fixtures.ts';
const fresh = (): TrustReport => structuredClone(snapshot);
const envelope = (report: TrustReport) => ({ schema_version: '1.0', source: 'live', report });

describe('score projection and evidence-based presentation', () => {
  it('uses configured maximum, exact boundaries and real zero, and leaves unavailable neutral', () => {
    expect(projectTrustScore(44, 184, 'partial')).toMatchObject({ rating: 'Poor', color: '#ff657a', ratio: 44 / 184 });
    for (const [score, rating] of [[0,'Poor'], [24.999,'Poor'], [25,'Fair'], [50,'Good'], [75,'Very Good'], [100,'Very Good']] as const) {
      expect(projectTrustScore(score, 100, 'partial').rating).toBe(rating);
    }
    for (const [score, maximum, status] of [[0,0,'partial'], [1,0,'partial'], [101,100,'partial'], [-1,100,'partial'], [44,184,'unavailable'], [NaN,100,'partial']] as const) {
      expect(projectTrustScore(score, maximum, status)).toMatchObject({ score: null, rating: null, ratio: 0 });
    }
    expect([0,.24999,.25,.5,.75,1].map(quarter)).toEqual([0,0,1,2,3,3]);
  });
  it('does not invent failures or successes in unknown-only, skipped-only, empty or unavailable reports', () => {
    for (const status of ['partial', 'unavailable']) {
      const report = fresh(); report.status = status; report.rules.passed = []; report.rules.failed = [];
      const p = emptyTrustPresentation(report);
      expect(p.passed).toEqual([]); expect(p.failed).toEqual([]); expect(p.tips).toEqual([]);
      expect(p.failed_empty).toMatch(/unassessed|unavailable/);
      report.rules.skipped = []; report.rules.unknown = [];
      expect(emptyTrustPresentation(report).tips).toEqual([]);
    }
  });
  it('rejects malformed, incomplete, mismatched and unsupported presentations', () => {
    for (const mutate of [
      (p: Record<string, unknown>) => { p.version = '9'; },
      (p: Record<string, unknown>) => { p.tips = [{text:'fix',rule_ids:['security.tls'],evidence_ids:[]}]; },
      (p: Record<string, unknown>) => { p.passed = []; },
      (p: Record<string, unknown>) => { p.tips_empty = null; },
      (p: Record<string, unknown>) => { p.tips = [{text:'fix',rule_ids:['security.error_leaks'],evidence_ids:['invented']}]; },
    ]) {
      const report = fresh(); report.presentation = legacyTrustPresentation(report);
      mutate(report.presentation as unknown as Record<string, unknown>);
      expect(() => parseTrustResponse(envelope(report))).toThrow('invalid report');
    }
  });
});
