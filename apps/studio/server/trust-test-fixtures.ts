import type { TrustReport } from '../src/trust-score.ts';
import type { PresentationItem, TrustPresentation } from '../src/trust-projection.ts';
import { emptyTrustPresentation } from './trust-presentation.ts';

/** A legacy presentation for response-contract tests, not a production prose generator. */
export function legacyTrustPresentation(report: TrustReport): TrustPresentation {
  const items = (group: 'passed' | 'failed'): PresentationItem[] => report.rules[group].map(rule => ({
    text: rule.reason, rule_ids: [rule.id], evidence_ids: [...rule.evidence_ids],
  }));
  return { ...emptyTrustPresentation(report), passed: items('passed'), failed: items('failed'), tips: items('failed') };
}
