import type { TrustReport } from '../src/trust-score.ts';
import type { TrustPresentation } from '../src/trust-projection.ts';

/** Empty states only. Reason and improvement prose are supplied by their generators. */
export function emptyTrustPresentation(report: TrustReport): TrustPresentation {
  const unavailable = report.status === 'unavailable';
  return { version: '1.0', passed: [], failed: [], tips: [],
    passed_empty: unavailable ? 'Assessment unavailable; no passing checks established.' : 'No passing checks were established.',
    failed_empty: unavailable ? 'Assessment unavailable; absence of failures is not a passing result.' : 'No failures observed. Skipped and unknown checks remain unassessed.',
    tips_empty: unavailable ? 'Retry the assessment when the endpoint is available.' : 'No actionable improvement opportunities were established from the available evidence.' };
}
