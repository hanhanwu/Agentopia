import { describe, expect, it, vi } from 'vitest';
import policy from './policies/improvement-rule-families-v1.json';
import snapshot from '../src/data/mcp-trust-score-v1.snapshot.json';
import type { TrustReport } from '../src/trust-score.ts';
import { parseTrustResponse } from '../src/trust-score.ts';
import type { ImprovementTip, TrustPresentation } from '../src/trust-projection.ts';
import { buildTrustPresentation } from './trust-presentation.ts';
import { selectImprovementTips, parseTipGuidance } from './trust-tips.ts';
import { summarizeTrustPresentation } from './trust-tips-llm.ts';
import { trustPDFHTML } from './trust-pdf.ts';
const fresh = (): TrustReport => structuredClone(snapshot);
const envelope = (report: TrustReport) => ({ schema_version: '1.0', source: 'live', report });
const completion = (body: unknown) => new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(body)}}]}));
const config = { model: 'test/model', apiKey: 'test-secret' };

function provider(report: TrustReport, failTips = false) {
  return vi.fn().mockImplementation(async (_url, options: RequestInit) => {
    const request = JSON.parse(String(options.body));
    const evidence = JSON.parse(request.messages[1].content);
    if (evidence.families) return failTips ? new Response('provider secret', {status:503}) : completion({tips: [...evidence.families].reverse().map((family: {family_id:string}) => ({family_id:family.family_id,text:'Check the recorded response and correct its handling, then run the assessment again.'}))});
    return completion({bullets: ['passed','failed'].flatMap(group => report.rules[group as 'passed' | 'failed'].length ? [{outcome:group,text:group === 'passed' ? 'Connection checks passed.' : 'Some request checks failed.',rule_ids:[report.rules[group as 'passed' | 'failed'][0].id]}] : [])});
  });
}

describe('ranked improvement families', () => {
  it('bundles complete, unique rule membership and valid effort/confidence estimates', () => {
    const ids=policy.families.flatMap(family=>family.rules.map(rule=>rule.rule_id));
    expect(ids).toHaveLength(policy.rule_count);expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.values(fresh().rules).flat().map(rule=>rule.id).sort());
    expect(policy.ranking.confidence_used).toBe(true);expect(policy.confidence_scale.used_in_priority).toBe(true);
    for(const family of policy.families) {
      expect(family.easy_score).toBeGreaterThanOrEqual(1);expect(family.easy_score).toBeLessThanOrEqual(5);
      expect(family.confidence).toBeGreaterThan(0);expect(family.confidence).toBeLessThanOrEqual(1);
    }
  });
  it('ranks using live weights, family ease and confidence; selects five deterministically without modifying scores', () => {
    const r = fresh(); const original = structuredClone(r); const selected = selectImprovementTips(r);
    expect(selected).toHaveLength(5);
    expect(selected.every((tip,i) => !i || tip.priority <= selected[i-1].priority)).toBe(true);
    expect(new Set(selected.flatMap(tip=>tip.rule_ids)).size).toBe(selected.flatMap(tip=>tip.rule_ids).length);
    const errorTip = selected.find(tip=>tip.rule_ids.includes('protocol.invalid_request_code'))!;
    expect(errorTip.priority).toBeCloseTo(1 * 3 * .8);
    r.rules.failed.find(rule=>rule.id==='protocol.invalid_request_code')!.configured_weight=20;
    expect(selectImprovementTips(r)[0].rule_ids).toContain('protocol.invalid_request_code');
    original.rules.failed.reverse(); expect(selectImprovementTips(original)).toEqual(selected);
  });
  it('excludes optional, zero-weight, unevidenced and unsupported rules; excludes unknown checks and retains applicable skipped verification', () => {
    const r=fresh(); r.rules.failed=[]; r.rules.unknown=[];
    const source=structuredClone(snapshot.rules.failed[0]);
    r.rules.skipped=[{...source,outcome:'skipped',possible:0,weight:0,applicability:'applicable'}];
    let tips=selectImprovementTips(r);
    expect(tips).toHaveLength(1); expect(tips[0]).toMatchObject({estimated_gain:null,verification_required:true});
    r.rules.skipped[0].applicability='not_applicable';expect(selectImprovementTips(r)).toEqual([]);
    r.rules.skipped=[];
    r.rules.unknown=[{...source,outcome:'unknown',possible:0,weight:0,applicability:'unknown'}];
    expect(selectImprovementTips(r)).toEqual([]);
    r.rules.unknown[0].evidence_ids=[];expect(selectImprovementTips(r)).toEqual([]);
    r.rules.unknown=[{...source,outcome:'unknown',configured_weight:0}];expect(selectImprovementTips(r)).toEqual([]);
    r.rules.failed=[{...source,id:'unsupported.rule'}];expect(selectImprovementTips(r)).toEqual([]);
    r.rules.failed=[source];r.status='unavailable';expect(selectImprovementTips(r)).toEqual([]);
  });
  it('restores deterministic order and rejects omitted, duplicate, invented or overlong model guidance', () => {
    const candidates=selectImprovementTips(fresh());
    const tips=candidates.map(tip=>({family_id:tip.family_id,text:'Correct the response and assess it again.'}));
    expect(parseTipGuidance(JSON.stringify({tips:[...tips].reverse()}),candidates).map(tip=>tip.family_id)).toEqual(candidates.map(tip=>tip.family_id));
    for(const values of [tips.slice(1), tips.map(()=>tips[0]), tips.map(tip=>({...tip,family_id:'invented'})), tips.map(tip=>({...tip,text:Array(36).fill('word').join(' ')})), tips.map(tip=>({...tip,text:'Fix protocol.server_name now.'}))]) {
      expect(()=>parseTipGuidance(JSON.stringify({tips:values}),candidates)).toThrow();
    }
  });
  it('generates concise guidance with server-only credentials and keeps scores, order and estimates outside the LLM', async () => {
    const r=fresh(); const before=structuredClone(r);const fetcher=provider(r);
    const log=vi.spyOn(console,'info').mockImplementation(()=>{});
    try { r.presentation=await summarizeTrustPresentation(r,config,new AbortController().signal,fetcher); }
    finally { log.mockRestore(); }
    expect(fetcher).toHaveBeenCalledTimes(2);
    const request=fetcher.mock.calls.map(call=>JSON.parse(call[1].body)).find(body=>JSON.parse(body.messages[1].content).families);
    expect(request.model).toBe(config.model);
    expect(JSON.stringify(request)).not.toMatch(/test-secret|estimated_gain|configured_weight/);
    expect(r.summary).toEqual(before.summary);expect(r.rules).toEqual(before.rules);
    expect(parseTrustResponse(envelope(r)).presentation).toEqual(r.presentation);
    expect(r.presentation!.tips_source).toBe('deepinfra');
    expect(trustPDFHTML(r)).toContain('Total potential gain');
    for(const mutate of [
      (p: TrustPresentation)=>{p.tips_gain!+=1;},
      (p: TrustPresentation)=>{(p.tips[0] as ImprovementTip).estimated_gain=99;},
      (p: TrustPresentation)=>{p.tips.reverse();},
      (p: TrustPresentation)=>{p.tips[0].rule_ids=['security.tls'];},
      (p: TrustPresentation)=>{p.tips.push(p.tips[0]);},
      (p: TrustPresentation)=>{const tip=p.tips[0] as ImprovementTip;tip.verification_required=!tip.verification_required;},
    ]) {const bad=structuredClone(r);mutate(bad.presentation!);expect(()=>parseTrustResponse(envelope(bad))).toThrow();}
  });
  it('does not call the model when only unknown and inapplicable skipped checks remain', async () => {
    const r=fresh();r.rules.passed=[];r.rules.failed=[];
    const fetcher=provider(r);
    const p=await summarizeTrustPresentation(r,config,new AbortController().signal,fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(p).toMatchObject({reason_source:'none',tips_source:'none',tips_gain:0,tips:[]});
  });
  it('excludes unknown members from mixed families, ranking weights and model context', () => {
    const r=fresh();const original=selectImprovementTips(r);
    r.rules.unknown.push({...r.rules.failed[0],id:'protocol.invalid_request_rejected',outcome:'unknown',configured_weight:100,possible:0,weight:0});
    const selected=selectImprovementTips(r);
    expect(selected).toEqual(original);
    expect(selected.flatMap(tip=>tip.context.rules).every(rule=>rule.outcome!=='unknown')).toBe(true);
  });
  it('preserves Reason and score when the tips provider fails, with no invented fallback or gain', async () => {
    const r=fresh();const log=vi.spyOn(console,'info').mockImplementation(()=>{});
    try {r.presentation=await summarizeTrustPresentation(r,config,new AbortController().signal,provider(r,true));}
    finally {log.mockRestore();}
    expect(r.presentation).toMatchObject({tips:[],tips_gain:0,tips_source:'unavailable'});
    expect(r.presentation!.passed.length).toBeGreaterThan(0);
    expect(parseTrustResponse(envelope(r)).summary.total_score).toBe(44);
  });
  it('validates diagnostic-only tips with null gain and no asserted failure', () => {
    const r=fresh(); const source=r.rules.failed.splice(0,1)[0];r.rules.skipped.push({...source,outcome:'skipped',possible:0,weight:0});
    r.summary.failed_rules--;r.summary.skipped_rules++;r.summary.assessed_maximum-=source.possible;
    const candidate=selectImprovementTips(r).find(tip=>tip.rule_ids.includes(source.id))!;
    const tips=parseTipGuidance(JSON.stringify({tips:[{family_id:candidate.family_id,text:'Repeat the check once its prerequisites are available.'}]}),[candidate]);
    r.presentation={...buildTrustPresentation(r),tips_version:'1.0',tips_source:'deepinfra',tips_model:'test',tips_gain:0,tips};
    expect(parseTrustResponse(envelope(r)).presentation!.tips).toHaveLength(1);
    // Even an explicitly applicable unknown cannot be smuggled into a tip or PDF.
    r.rules.skipped=r.rules.skipped.filter(rule=>rule.id!==source.id);
    r.rules.unknown.push({...source,outcome:'unknown',possible:0,weight:0});
    r.summary.skipped_rules--;r.summary.unknown_rules++;
    expect(()=>parseTrustResponse(envelope(r))).toThrow('invalid report');
  });
});
