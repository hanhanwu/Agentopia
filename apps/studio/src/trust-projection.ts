/** Display quarters use configured points, independently of assessed coverage. */
export const RATING_COLORS = ['#ff657a', '#ffad5c', '#ffd166', '#45ff8a'] as const;
export function quarter(progress: number) { return Math.min(3, Math.floor(Math.max(0, progress) * 4)); }
export function projectTrustScore(score: number, maximum: number, status: string) {
  const valid = Number.isFinite(score) && Number.isFinite(maximum) && maximum > 0 && score >= 0 && score <= maximum && status !== 'unavailable';
  const ratio = valid ? Math.min(1, Math.max(0, score / maximum)) : 0;
  return { ratio, score: valid ? score : null, maximum, rating: valid ? ['Poor', 'Fair', 'Good', 'Very Good'][quarter(ratio)] : null,
    color: valid ? RATING_COLORS[quarter(ratio)] : '#7d9cae' };
}
export type PresentationItem = { text: string; rule_ids: string[]; evidence_ids: string[] };
export type TrustPresentation = {
  version: '1.0'; passed: PresentationItem[]; failed: PresentationItem[]; tips: PresentationItem[];
  passed_empty: string; failed_empty: string; tips_empty: string;
};
