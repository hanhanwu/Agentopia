import { isOpaqueReference } from './mochi-contract.ts';
import {
  TRUST_API, TRUST_RESPONSE_SCHEMA, OUTCOME_GROUPS,
  type TrustReport, type TrustPresentation, type PresentationItem, type ImprovementTip,
} from './trust-contract.ts';
export { OUTCOME_GROUPS } from './trust-contract.ts';
export type { TrustReport, OutcomeGroup } from './trust-contract.ts';
export { resolveTrustInput } from './trust-input.ts';
export type { SubjectType } from './trust-input.ts';

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const nonnegative = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const invalid = (): never => { throw new Error('The assessment service returned an invalid response.'); };

/** Validate and allowlist display fields; never retain opaque upstream metadata. */
export function parseTrustResponse(payload: unknown): TrustReport {
  if (!record(payload) || payload.schema_version !== TRUST_RESPONSE_SCHEMA || !record(payload.report)) return invalid();
  const report = payload.report;
  if (!record(report.subject) || typeof report.subject.endpoint !== 'string'
      || !isOpaqueReference(report.export_id)
      || !['complete', 'partial', 'unavailable'].includes(String(report.status))
      || !record(report.summary) || !record(report.presentation)) return invalid();
  const summary = {} as TrustReport['summary'];
  for (const group of OUTCOME_GROUPS) {
    const count = report.summary[`${group}_rules`];
    if (!nonnegative(count) || !Number.isSafeInteger(count)) return invalid();
    summary[`${group}_rules`] = count;
  }
  const p = report.presentation, display = p.score_display;
  if (!record(display) || !nonnegative(display.ratio) || display.ratio > 1 || display.maximum !== 100
      || (display.score !== null && (!nonnegative(display.score) || display.maximum <= 0 || display.score > display.maximum
          || Math.abs(display.score - 100 * display.ratio) > 0.05 + 1e-8))
      || (display.score === null && (display.ratio !== 0 || display.rating !== null))
      || (report.status === 'unavailable' && display.score !== null)
      || (display.rating !== null && (typeof display.rating !== 'string' || !display.rating.trim() || display.rating.length > 80))
      || p.tips_version !== '1.0' || !nonnegative(p.tips_gain)
      || typeof display.color !== 'string' || !/^#[0-9a-f]{6}$/iu.test(display.color)) return invalid();
  const presentation: TrustPresentation = {
    score_display: { ratio: display.ratio, maximum: display.maximum, score: display.score as number | null,
      rating: display.rating as string | null, color: display.color },
    tips_version: '1.0', tips_gain: p.tips_gain,
    passed: [], failed: [], tips: [], passed_empty: '', failed_empty: '', tips_empty: '',
  };
  for (const group of ['passed', 'failed', 'tips'] as const) {
    const items = p[group], empty = p[`${group}_empty`];
    if (!Array.isArray(items) || items.length > 5 || typeof empty !== 'string' || empty.length > 4096) return invalid();
    presentation[`${group}_empty`] = empty;
    const clean: Array<PresentationItem | ImprovementTip> = items.map(item => {
      if (!record(item) || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 4096) return invalid();
      if (group !== 'tips') return { text: item.text };
      if (item.estimated_gain !== null && !nonnegative(item.estimated_gain)) return invalid();
      return { text: item.text, estimated_gain: item.estimated_gain as number | null };
    });
    if (group === 'tips') presentation.tips = clean as ImprovementTip[];
    else presentation[group] = clean;
  }
  const totalGain = presentation.tips.reduce((sum, tip) => sum + (tip.estimated_gain ?? 0), 0);
  if (presentation.passed.length + presentation.failed.length > 5
      || !Number.isFinite(totalGain) || Math.abs(totalGain - presentation.tips_gain) > 0.05 * (presentation.tips.length + 1) + 1e-8) return invalid();
  return { export_id: report.export_id, subject: { endpoint: report.subject.endpoint },
    status: report.status as TrustReport['status'], summary, presentation };
}

export async function fetchTrustReport(endpoint: string, signal: AbortSignal): Promise<TrustReport> {
  const response = await fetch(TRUST_API.assessment, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'mcp', identifier: endpoint }), signal,
  });
  let body: unknown;
  try { body = await response.json(); } catch { throw new Error('The assessment service did not return JSON.'); }
  if (!response.ok) throw new Error(record(body) && typeof body.error === 'string' ? body.error : 'The assessment could not be completed.');
  return parseTrustResponse(body);
}
