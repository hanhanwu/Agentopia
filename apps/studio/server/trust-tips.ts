import policy from './policies/improvement-rule-families-v1.json';
import type { TrustReport, TrustRule } from '../src/trust-score.ts';
import type { ImprovementTip } from '../src/trust-projection.ts';

export type TipCandidate = ImprovementTip & { context: {
  action: string; prerequisites: string; rules: { id: string; outcome: string; reason: string; basis: string; action: 'repair' | 'verify' }[];
} };

/** Policy snapshots supply effort estimates; the live assessment supplies weights and eligibility. */
export function selectImprovementTips(report: TrustReport): TipCandidate[] {
  if (report.status === 'unavailable') return [];
  const candidates = new Map<string, TrustRule>();
  for (const rule of [...report.rules.failed, ...report.rules.skipped]) {
    if (rule.applicability === 'not_applicable' || rule.configured_weight <= 0 || !rule.reason.trim() || !rule.evidence_ids.length) continue;
    if (rule.applicability !== 'applicable') continue;
    candidates.set(rule.id, rule);
  }
  return policy.families.flatMap(family => {
    const rules = family.rules.flatMap(member => candidates.has(member.rule_id) ? [candidates.get(member.rule_id)!] : []);
    if (!rules.length) return [];
    const repair = rules.filter(rule => rule.outcome === 'fail');
    const gain = repair.reduce((sum, rule) => sum + rule.configured_weight, 0);
    return [{ family_id: family.id, text: '', rule_ids: rules.map(rule => rule.id),
      evidence_ids: [...new Set(rules.flatMap(rule => rule.evidence_ids))].sort(),
      priority: rules.reduce((sum, rule) => sum + rule.configured_weight, 0) * family.easy_score * family.confidence,
      estimated_gain: gain || null, verification_required: repair.length !== rules.length,
      context: { action: family.shared_work, prerequisites: family.eligibility_note,
        rules: rules.map(rule => ({ id: rule.id, outcome: rule.outcome, reason: rule.reason, basis: rule.basis,
          action: rule.outcome === 'fail' ? 'repair' as const : 'verify' as const })) } }];
  }).sort((a, b) => b.priority - a.priority || a.family_id.localeCompare(b.family_id)).slice(0, policy.ranking.maximum_tips);
}

export function parseTipGuidance(content: string, candidates: TipCandidate[]): ImprovementTip[] {
  const trimmed = content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
  const parsed = JSON.parse(trimmed) as { tips?: { family_id: string; text: string }[] };
  if (!Array.isArray(parsed?.tips) || parsed.tips.length !== candidates.length) throw new Error('Return one guidance per selected family.');
  const byId = new Map<string, string>();
  for (const tip of parsed.tips) {
    if (!tip || typeof tip.family_id !== 'string' || typeof tip.text !== 'string' || byId.has(tip.family_id)
        || !candidates.some(candidate => candidate.family_id === tip.family_id)) throw new Error('Invalid guidance family.');
    const text = tip.text.replace(/\s+/gu, ' ').trim();
    if (!text || text.split(/\s+/u).length > 35 || /[<>`]|https?:\/\/|\b(?:protocol|primitives|security|readiness)\.[a-z_]+/iu.test(text)
        || /^[-*•]\s/u.test(text)) throw new Error('Guidance must be plain text of at most 35 words, without rule IDs or markup.');
    byId.set(tip.family_id, text);
  }
  return candidates.map(({ context: _context, ...candidate }) => ({ ...candidate, text: byId.get(candidate.family_id)! }));
}
