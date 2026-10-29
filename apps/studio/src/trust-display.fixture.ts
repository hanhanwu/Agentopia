/** Synthetic display data; contains no real assessment or policy fixtures. */
export const displayResponse = () => ({ schema_version: '2.0', report: {
  export_id: 'synthetic-export-reference', subject: { endpoint: 'https://example.com/mcp' }, status: 'partial',
  summary: {failed_rules:1,passed_rules:2,skipped_rules:3,unknown_rules:4},
  presentation: {
    score_display: {score:12,maximum:20,ratio:0.6,rating:'Example rating',color:'#61c7ff'},
    tips_version:'1.0',tips_gain:2,
    passed:[{text:'Example passing result.'}],failed:[{text:'Example finding.'}],tips:[{text:'Example action.',estimated_gain:2}],
    passed_empty:'No passing results.',failed_empty:'No findings.',tips_empty:'No actions.',
  },
} });
