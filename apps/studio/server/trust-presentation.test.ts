import { describe, expect, it } from 'vitest';
import snapshot from '../src/data/mcp-trust-score-v1.snapshot.json';
import { parseTrustResponse, type TrustReport } from '../src/trust-score.ts';
import { projectTrustScore, quarter } from '../src/trust-projection.ts';
import { buildTrustPresentation } from './trust-presentation.ts';
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
  it('covers both outcome groups and every failing rule with traceable tips', () => {
    const report = fresh(); const p = buildTrustPresentation(report); report.presentation = p;
    expect(parseTrustResponse(envelope(report)).presentation).toEqual(p);
    for (const group of ['passed', 'failed'] as const) {
      expect(p[group].flatMap(item => item.rule_ids).sort()).toEqual(report.rules[group].map(rule => rule.id).sort());
    }
    expect(p.tips.flatMap(item => item.rule_ids).sort()).toEqual(report.rules.failed.map(rule => rule.id).sort());
    expect(p.tips.map(item => item.text).join(' ')).toContain('-32600');
    expect(p.tips.map(item => item.text).join(' ')).not.toContain('-32700');
    expect(p.passed.map(item => item.text).join(' ')).toContain('do not establish successful tool execution');
    expect(report.summary.total_score).toBe(44);
  });
  it('does not invent failures or successes in unknown-only, skipped-only, empty or unavailable reports', () => {
    for (const status of ['partial', 'unavailable']) {
      const report = fresh(); report.status = status; report.rules.passed = []; report.rules.failed = [];
      const p = buildTrustPresentation(report);
      expect(p.passed).toEqual([]); expect(p.failed).toEqual([]); expect(p.tips).toEqual([]);
      expect(p.failed_empty).toMatch(/unassessed|unavailable/);
      report.rules.skipped = []; report.rules.unknown = [];
      expect(buildTrustPresentation(report).tips).toEqual([]);
    }
  });
  it('falls back to the recorded expectation for unmapped failures and remains deterministic', () => {
    const report = fresh(); report.rules.failed[0].id = 'new.rule';
    const p = buildTrustPresentation(report);
    expect(p.tips.find(item => item.rule_ids.includes('new.rule'))?.text).toContain('recorded expectation');
    report.rules.failed.reverse(); expect(buildTrustPresentation(report)).toEqual(p);
  });
  it('rejects malformed, incomplete, mismatched and unsupported presentations', () => {
    for (const mutate of [
      (p: Record<string, unknown>) => { p.version = '9'; },
      (p: Record<string, unknown>) => { p.tips = [{text:'fix',rule_ids:['security.tls'],evidence_ids:[]}]; },
      (p: Record<string, unknown>) => { p.passed = []; },
      (p: Record<string, unknown>) => { p.tips_empty = null; },
      (p: Record<string, unknown>) => { p.tips = [{text:'fix',rule_ids:['security.error_leaks'],evidence_ids:['invented']}]; },
    ]) {
      const report = fresh(); report.presentation = buildTrustPresentation(report);
      mutate(report.presentation as unknown as Record<string, unknown>);
      expect(() => parseTrustResponse(envelope(report))).toThrow('invalid report');
    }
  });
});
