/** Display-only V2.3 contract. Calculation and evidence stay in the private service. */
export const TRUST_DIMENSIONS = ['connection', 'interaction', 'security'] as const;
export type TrustDimension = typeof TRUST_DIMENSIONS[number];
export type TrustMode = 'static' | 'combined';
export const DIMENSION_LABELS: Record<TrustDimension, string> = {connection: 'Connection', interaction: 'Capability', security: 'Security'};
export type ScoreDisplay = {ratio: number; score: number | null; maximum: number; rating: string | null; color: string};
export type DimensionDisplay = {score_display: ScoreDisplay; positive_reasons: string[]; negative_reasons: string[]; tips: string[]; dynamic_status: string; blocked: boolean};
export type V23Display = {version: '2.3'; modes: Record<TrustMode, {score_display: ScoreDisplay; dimensions: Record<TrustDimension, DimensionDisplay>}>};
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const invalid = (): never => {throw new Error('The assessment service returned an invalid V2.3 display.');};
function display(v: unknown): ScoreDisplay {
  if (!record(v) || typeof v.ratio !== 'number' || !Number.isFinite(v.ratio) || v.ratio < 0 || v.ratio > 1 || v.maximum !== 100
    || (v.score === null ? v.ratio !== 0 || v.rating !== null : typeof v.score !== 'number' || !Number.isFinite(v.score)
      || Math.abs(v.score - v.ratio * 100) > .05000001 || v.score < 0 || v.score > 100 || !['Poor', 'Fair', 'Good', 'Very Good'].includes(String(v.rating)))
    || typeof v.color !== 'string' || !/^#[0-9a-f]{6}$/iu.test(v.color)) return invalid();
  return {ratio: v.ratio, score: v.score as number | null, maximum: 100, rating: v.rating as string | null, color: v.color};
}
function strings(v: unknown): string[] {
  if (!Array.isArray(v) || v.length > 100 || v.some(x => typeof x !== 'string' || !x.trim() || x.length > 4096)) return invalid();
  return [...v];
}
export function parseV23Display(value: unknown): V23Display {
  if (!record(value) || value.version !== '2.3' || !record(value.modes)) return invalid();
  const modes = {} as V23Display['modes'];
  for (const mode of ['static', 'combined'] as const) {
    const v = value.modes[mode];
    if (!record(v) || !record(v.dimensions)) return invalid();
    const dimensions = {} as V23Display['modes'][TrustMode]['dimensions'];
    for (const d of TRUST_DIMENSIONS) {
      const item = v.dimensions[d];
      if (!record(item) || typeof item.blocked !== 'boolean'
        || !['not_selected', 'static_only', 'unavailable', 'partial', 'available'].includes(String(item.dynamic_status))) return invalid();
      dimensions[d] = {score_display: display(item.score_display), positive_reasons: strings(item.positive_reasons ?? []), negative_reasons: strings(item.negative_reasons ?? []), tips: strings(item.tips),
        blocked: item.blocked, dynamic_status: String(item.dynamic_status)};
    }
    modes[mode] = {score_display: display(v.score_display), dimensions};
  }
  return {version: '2.3', modes};
}
