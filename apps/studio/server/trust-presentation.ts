import type { TrustReport, TrustRule } from '../src/trust-score.ts';
import type { PresentationItem, TrustPresentation } from '../src/trust-projection.ts';

const remediation: Record<string, (rule: TrustRule) => string> = {
  'protocol.invalid_request_code': rule => /accepted codes \[-32600\]/.test(rule.reason)
    ? 'Return -32600 for the observed invalid-request case; do not apply this code to every error.'
    : `Review the invalid-request diagnostic against the applicable rule expectation: ${rule.reason}`,
  'security.error_leaks': () => 'Review and redact exposed error-response details; the pattern check does not establish which specific fields leaked.',
  'security.origin_validation': rule => /403 required/.test(rule.reason)
    ? 'Reject foreign Origins with HTTP 403 for the assessed modern revision; preserve successful same-Origin requests.'
    : `Review Origin rejection for the assessed protocol revision: ${rule.reason}`,
  'readiness.server_discover': () => 'Return usable discovery capabilities and supportedVersions including the assessed target revision.',
  'readiness.stateless_request': () => 'Make stateless listing return a usable catalog without initialization or session headers.',
};
const item = (text: string, rules: TrustRule[]): PresentationItem => ({ text,
  rule_ids: rules.map(rule => rule.id), evidence_ids: [...new Set(rules.flatMap(rule => rule.evidence_ids))].sort() });

/** Deterministic, evidence-linked prose. Never promotes skipped/unknown checks to passes or failures. */
export function buildTrustPresentation(report: TrustReport): TrustPresentation {
  const passed: PresentationItem[] = [];
  const failed: PresentationItem[] = [];
  const core = report.rules.passed.filter(rule => ['security.tls', 'protocol.streamable_http', 'primitives.tools_input_schema_valid'].includes(rule.id));
  if (core.length) {
    const names: Record<string,string> = { 'security.tls':'TLS', 'protocol.streamable_http':'transport', 'primitives.tools_input_schema_valid':'tool schemas' };
    passed.push(item(`${core.map(rule => names[rule.id]).join(', ')} passed. Structural checks do not establish successful tool execution.`, core));
  }
  const catalog = report.rules.passed.filter(rule => ['protocol.tools_consistency', 'primitives.tools_name_present_in_all', 'primitives.tools_description_present_in_all'].includes(rule.id));
  if (catalog.length) {
    const listing = catalog.find(rule => rule.id === 'protocol.tools_consistency');
    const count = listing?.reason.match(/complete tools\/list returned (\d+) entries/);
    const names = catalog.some(rule => rule.id === 'primitives.tools_name_present_in_all');
    const descriptions = catalog.some(rule => rule.id === 'primitives.tools_description_present_in_all');
    passed.push(item(`${count ? `${count[1]} tools listed` : 'Tool catalog checks passed'}${names && descriptions ? ' with names and descriptions' : names ? ' with names' : descriptions ? ' with descriptions' : ''}. Content accuracy and quality are untested.`, catalog));
  }
  const covered = new Set([...core, ...catalog].map(rule => rule.id));
  const categories = new Map<string, TrustRule[]>();
  for (const rule of [...report.rules.passed].filter(rule => !covered.has(rule.id)).sort((a,b) => a.id.localeCompare(b.id))) {
    const rules = categories.get(rule.category) ?? []; rules.push(rule); categories.set(rule.category, rules);
  }
  for (const [category, rules] of categories) passed.push(item(`${category}: ${rules.length} additional checks passed (${rules.map(rule => rule.name).join('; ')}). These results apply only to collected evidence.`, rules));
  for (const rule of [...report.rules.failed].sort((a,b) => a.id.localeCompare(b.id))) {
    failed.push(item(`${rule.name} failed. ${rule.reason}`, [rule]));
  }
  const tips: PresentationItem[] = [];
  for (const rule of [...report.rules.failed].sort((a, b) => b.configured_weight - a.configured_weight || a.id.localeCompare(b.id))) {
    const text = remediation[rule.id]?.(rule) ?? `Review “${rule.name}” against its recorded expectation and specification basis. Observed result: ${rule.reason}`;
    const existing = tips.find(tip => tip.text === text);
    if (existing) { existing.rule_ids.push(rule.id); existing.evidence_ids = [...new Set([...existing.evidence_ids, ...rule.evidence_ids])].sort(); }
    else tips.push(item(text, [rule]));
  }
  const unavailable = report.status === 'unavailable';
  return { version: '1.0', passed, failed, tips,
    passed_empty: unavailable ? 'Assessment unavailable; no passing checks established.' : 'No passing checks were established.',
    failed_empty: unavailable ? 'Assessment unavailable; absence of failures is not a passing result.' : 'No failures observed. Skipped and unknown checks remain unassessed.',
    tips_empty: unavailable ? 'Retry the assessment when the endpoint is available.' : 'No failure-specific improvements identified. Skipped and unknown checks may need further assessment.' };
}
