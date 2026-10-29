/** Display values supplied by the assessment API. */
export type TrustScoreDisplay = {
  ratio: number; score: number | null; maximum: number; rating: string | null; color: string;
};
export type PresentationItem = { text: string };
export type ImprovementTip = PresentationItem & { estimated_gain: number | null };
export type TrustPresentation = {
  score_display: TrustScoreDisplay;
  tips_version?: '1.0'; tips_gain?: number;
  passed: PresentationItem[]; failed: PresentationItem[]; tips: ImprovementTip[];
  passed_empty: string; failed_empty: string; tips_empty: string;
};
