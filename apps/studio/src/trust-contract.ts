/** Public wire/display contract. API versions are independent of scoring releases. */
const API_PATH = '/api/trust-score/v1';
export const TRUST_API = { assessment: API_PATH, pdf: `${API_PATH}/pdf`, chat: `${API_PATH}/chat` } as const;
export const TRUST_RESPONSE_SCHEMA = '2.0';
export const OUTCOME_GROUPS = ['failed', 'passed', 'skipped', 'unknown'] as const;
export type OutcomeGroup = typeof OUTCOME_GROUPS[number];
export type TrustReport = {
  export_id: string;
  subject: { endpoint: string };
  status: 'complete' | 'partial' | 'unavailable';
  summary: Record<`${OutcomeGroup}_rules`, number>;
  presentation: TrustPresentation;
};
export type TrustScoreDisplay = {
  ratio: number; score: number | null; maximum: number; rating: string | null; color: string;
};
export type PresentationItem = { text: string };
export type ImprovementTip = PresentationItem & { estimated_gain: number | null };
export type TrustPresentation = {
  score_display: TrustScoreDisplay;
  tips_version: '1.0'; tips_gain: number;
  passed: PresentationItem[]; failed: PresentationItem[]; tips: ImprovementTip[];
  passed_empty: string; failed_empty: string; tips_empty: string;
};
