import type { TrustPresentation } from './trust-projection.ts';
export { resolveTrustInput } from './trust-input.ts';
export type { SubjectType } from './trust-input.ts';

export const OUTCOME_GROUPS = ['failed', 'passed', 'skipped', 'unknown'] as const;
export type OutcomeGroup = typeof OUTCOME_GROUPS[number];
export type TrustRule = {
  id: string; name: string; category: string; outcome: string;
  configured_weight: number; weight: number; earned: number; possible: number;
  applicability: string; reason: string; basis: string;
  definition: unknown; evidence_ids: string[]; observation_keys: string[];
};
export type TrustReport = {
  presentation?: TrustPresentation;
  schema_version?: string; source?: string; collection_status?: string | null; limitations?: string[];
  subject: { name: string; endpoint: string };
  engine_version: string; observed_at: string; scored_at: string; status: string;
  policy: { id: string; version: string; sha256: string };
  summary: {
    total_score: number; assessed_maximum: number; configured_maximum: number;
    pass_percentage: number | null; total_rules: number;
    failed_rules: number; passed_rules: number; skipped_rules: number; unknown_rules: number;
  };
  rules: Record<OutcomeGroup, TrustRule[]>;
  observations: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');

export function parseTrustResponse(payload: unknown): TrustReport {
  const invalid = () => { throw new Error('The scorer returned an invalid report.'); };
  if (!isRecord(payload) || payload.schema_version !== '1.0' || payload.source !== 'live' || !isRecord(payload.report)) return invalid();
  const report = payload.report;
  if (!isRecord(report.subject) || typeof report.subject.name !== 'string' || typeof report.subject.endpoint !== 'string'
      || !isRecord(report.policy) || !['id', 'version', 'sha256'].every(key => typeof (report.policy as Record<string, unknown>)[key] === 'string')
      || !['engine_version', 'observed_at', 'scored_at', 'status'].every(key => typeof report[key] === 'string')
      || !Number.isFinite(Date.parse(String(report.observed_at))) || !Number.isFinite(Date.parse(String(report.scored_at)))
      || !['complete', 'partial', 'unavailable'].includes(String(report.status))
      || !isRecord(report.summary) || !isRecord(report.rules) || !isRecord(report.observations)) return invalid();
  const summary = report.summary;
  const groups = report.rules;
  const outcomes = { failed: 'fail', passed: 'pass', skipped: 'skipped', unknown: 'unknown' };
  for (const group of OUTCOME_GROUPS) {
    const rules = groups[group];
    if (!Array.isArray(rules) || summary[`${group}_rules`] !== rules.length) return invalid();
    for (const rule of rules) {
      if (!isRecord(rule) || rule.outcome !== outcomes[group]
          || !['id', 'name', 'category', 'reason', 'basis', 'applicability'].every(key => typeof rule[key] === 'string')
          || !['configured_weight', 'weight', 'earned', 'possible'].every(key => nonnegative(rule[key]))
          || !strings(rule.evidence_ids) || !strings(rule.observation_keys) || !('definition' in rule)) return invalid();
      if ((group === 'skipped' || group === 'unknown') && (rule.earned !== 0 || rule.possible !== 0)) return invalid();
      if (group === 'failed' && rule.earned !== 0) return invalid();
      if (group === 'passed' && Math.abs((rule.earned as number) - (rule.possible as number)) >= .011) return invalid();
    }
  }
  if (!['total_score', 'assessed_maximum', 'configured_maximum', 'total_rules'].every(key => nonnegative(summary[key]))
      || (summary.pass_percentage !== null && (!nonnegative(summary.pass_percentage) || summary.pass_percentage > 100))) return invalid();
  const rules = OUTCOME_GROUPS.flatMap(group => groups[group] as TrustRule[]);
  const close = (a: unknown, b: number) => typeof a === 'number' && Math.abs(a - b) < .011;
  if (rules.length !== summary.total_rules || !close(summary.total_score, rules.reduce((sum, rule) => sum + rule.earned, 0))
      || !close(summary.assessed_maximum, rules.reduce((sum, rule) => sum + rule.possible, 0))
      || !close(summary.configured_maximum, rules.reduce((sum, rule) => sum + rule.configured_weight, 0))
      || (rules.length ? !close(summary.pass_percentage, 100 * (groups.passed as TrustRule[]).length / rules.length) : summary.pass_percentage !== null)) return invalid();
  if ((summary.total_score as number) > (summary.assessed_maximum as number)
      || (summary.assessed_maximum as number) > (summary.configured_maximum as number)
      || new Set(rules.map(rule => rule.id)).size !== rules.length
      || rules.some(rule => rule.earned > rule.possible || rule.possible > rule.configured_weight)) return invalid();
  if (report.presentation !== undefined) {
    const presentation = report.presentation;
    if (!isRecord(presentation) || !['1.0', '1.1'].includes(String(presentation.version))
        || !['passed_empty', 'failed_empty', 'tips_empty'].every(key => typeof presentation[key] === 'string')) return invalid();
    if (presentation.version === '1.1') {
      if (!Array.isArray(presentation.passed) || !Array.isArray(presentation.failed)
          || presentation.passed.length + presentation.failed.length > 5) return invalid();
      const hasRules = (groups.passed as TrustRule[]).length + (groups.failed as TrustRule[]).length > 0;
      if (hasRules ? presentation.reason_source !== 'deepinfra' || typeof presentation.reason_model !== 'string' || !presentation.reason_model.trim()
          : presentation.reason_source !== 'none' || presentation.reason_model !== null) return invalid();
    }
    if (presentation.score_display !== undefined) {
      const display = presentation.score_display;
      if (!isRecord(display) || !nonnegative(display.ratio) || display.ratio > 1
          || display.maximum !== summary.configured_maximum || typeof display.color !== 'string'
          || !/^#[0-9a-f]{6}$/iu.test(display.color)
          || (display.score !== null && display.score !== summary.total_score)
          || (display.rating !== null && !['Poor', 'Fair', 'Good', 'Very Good'].includes(String(display.rating)))) return invalid();
    }
    const rankedTips = presentation.tips_version === '1.0';
    if (presentation.tips_version !== undefined && !rankedTips) return invalid();
    if (rankedTips) {
      if (!Array.isArray(presentation.tips) || presentation.tips.length > 5 || !nonnegative(presentation.tips_gain)
          || !['deepinfra', 'none', 'unavailable'].includes(String(presentation.tips_source))) return invalid();
      if (presentation.tips_source === 'deepinfra'
          ? !presentation.tips.length || typeof presentation.tips_model !== 'string' || !presentation.tips_model.trim()
          : presentation.tips.length !== 0 || presentation.tips_model !== null) return invalid();
      const seenRules = new Set<string>(); const families = new Set<string>();
      let total = 0; let previousPriority = Infinity;
      for (const tip of presentation.tips) {
        if (!isRecord(tip) || typeof tip.family_id !== 'string' || !tip.family_id || families.has(tip.family_id)
            || !nonnegative(tip.priority) || tip.priority <= 0 || tip.priority > previousPriority
            || !strings(tip.rule_ids) || !tip.rule_ids.length || typeof tip.verification_required !== 'boolean'
            || typeof tip.text !== 'string' || tip.text.trim().split(/\s+/u).length > 35 || /[<>`\r\n]/u.test(tip.text)) return invalid();
        families.add(tip.family_id); previousPriority = tip.priority;
        const contributors = rules.filter(rule => (tip.rule_ids as string[]).includes(rule.id));
        if (contributors.length !== tip.rule_ids.length || contributors.some(rule => seenRules.has(rule.id)
            || !['fail', 'skipped'].includes(rule.outcome) || !rule.evidence_ids.length
            || !rule.reason.trim() || rule.configured_weight <= 0
            || rule.applicability !== 'applicable')) return invalid();
        contributors.forEach(rule => seenRules.add(rule.id));
        const gain = contributors.filter(rule => rule.outcome === 'fail').reduce((sum, rule) => sum + rule.configured_weight, 0);
        if (gain ? !close(tip.estimated_gain, gain) : tip.estimated_gain !== null) return invalid();
        if (tip.verification_required !== contributors.some(rule => rule.outcome !== 'fail')) return invalid();
        if (tip.family_name !== undefined && typeof tip.family_name !== 'string') return invalid();
        if (tip.rule_details !== undefined) {
          if (!Array.isArray(tip.rule_details) || tip.rule_details.length !== contributors.length) return invalid();
          const seenDetails = new Set<string>();
          for (const detail of tip.rule_details) {
            if (!isRecord(detail) || typeof detail.rule_id !== 'string' || seenDetails.has(detail.rule_id)
                || typeof detail.action !== 'string' || !detail.action.trim()) return invalid();
            if (!contributors.some(rule => rule.id === detail.rule_id)) return invalid();
            seenDetails.add(detail.rule_id);
          }
        }
        total += gain;
      }
      if (!close(presentation.tips_gain, total)) return invalid();
    }
    for (const group of ['passed', 'failed', 'tips']) {
      const items = presentation[group];
      const sourceRules = group === 'tips' && rankedTips ? rules.filter(rule => rule.outcome !== 'pass') : groups[group === 'tips' ? 'failed' : group] as TrustRule[];
      const isReasonSummary = presentation.version === '1.1' && group !== 'tips';
      if (!Array.isArray(items) || (!isReasonSummary && items.length > sourceRules.length)) return invalid();
      for (const item of items) {
        if (!isRecord(item) || typeof item.text !== 'string' || !item.text.trim()
            || !strings(item.rule_ids) || !item.rule_ids.length || !strings(item.evidence_ids)) return invalid();
        if (presentation.version === '1.1' && group !== 'tips'
            && (item.text.trim().split(/\s+/u).length > 20 || /[\r\n]/u.test(item.text) || /^\s*[-*•]\s+/u.test(item.text))) return invalid();
        const contributing = sourceRules.filter(rule => (item.rule_ids as string[]).includes(rule.id));
        if (contributing.length !== item.rule_ids.length
            || item.evidence_ids.some(id => !contributing.some(rule => rule.evidence_ids.includes(id)))) return invalid();
      }
      // Reason and ranked tips select representative findings; legacy tips retain full failure coverage.
      if (isReasonSummary) {
        if (Boolean(sourceRules.length) !== Boolean(items.length)) return invalid();
      } else if (!(group === 'tips' && rankedTips) && sourceRules.some(rule => !items.some(item => (item as {rule_ids: string[]}).rule_ids.includes(rule.id)))) return invalid();
    }
  }
  if (report.limitations !== undefined && !strings(report.limitations)) return invalid();
  if (report.collection_status !== undefined && report.collection_status !== null && typeof report.collection_status !== 'string') return invalid();
  return { ...report, source: 'live', schema_version: '1.0' } as TrustReport;
}

export async function fetchTrustReport(endpoint: string, signal: AbortSignal): Promise<TrustReport> {
  const response = await fetch('/api/trust-score/v1', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'mcp', identifier: endpoint }), signal,
  });
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error('The scoring API did not return JSON.'); }
  if (!response.ok) throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'The assessment could not be completed.');
  const report = parseTrustResponse(body);
  if (!report.presentation) throw new Error('The scorer returned no presentation.');
  return report;
}
