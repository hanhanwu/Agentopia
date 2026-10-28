import type { TrustReport } from '../src/trust-score.ts';
import { type ImprovementTip, projectTrustScore } from '../src/trust-projection.ts';
import { escapeMarkup } from '../src/markup.ts';
import policy from './policies/improvement-rule-families-v1.json';

const esc = (value: unknown) => escapeMarkup(String(value));
const familyNameByRule = new Map(policy.families.flatMap(family => family.rules.map(rule => [rule.rule_id, family.name] as const)));
const labels = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped', unknown: 'Unknown' };
const colors = { passed: '#45ff8a', failed: '#ff657a', skipped: '#8aa5b8', unknown: '#ffd166' };
const gain = (value: number | null | undefined) => value == null ? 'Pending verification' : `Up to +${esc(value)} pts`;

function scoreGraphic(report: TrustReport) {
  // Current UI exports carry the exact display projection; only historical reports need a fallback.
  const view = report.presentation?.score_display ?? projectTrustScore(report.summary.total_score, report.summary.configured_maximum, report.status);
  return `<div class="score-overview"><svg viewBox="0 0 500 314" role="img" aria-label="Score ${esc(view.score ?? 'unavailable')} of ${esc(view.maximum)}. ${esc(view.rating ?? '')}">
    <path d="M64 272 A186 186 0 0 1 436 272 A14 14 0 0 1 408 272 A158 158 0 0 0 92 272 A14 14 0 0 1 64 272 Z" fill="none" stroke="#7d9cae" stroke-opacity=".55" stroke-width="1.5"/>
    ${view.ratio > 0 ? `<path d="M78 272 A172 172 0 0 1 422 272" pathLength="100" fill="none" stroke="${esc(view.color)}" stroke-width="28" stroke-linecap="round" stroke-dasharray="${view.ratio * 100} 100"/>
    <path d="M78 267 A172 172 0 0 1 422 267" pathLength="100" fill="none" stroke="white" stroke-opacity=".23" stroke-width="3" stroke-linecap="round" stroke-dasharray="${view.ratio * 100} 100"/>` : ''}
    <path d="M138.2771 160.2771 L118.4781 140.4781 M250 114 L250 86 M361.7229 160.2771 L381.5219 140.4781" fill="none" stroke="#8aa5b8" stroke-opacity=".8" stroke-width="1.5"/>
    <g fill="#8aa5b8" font-size="14" font-weight="600" text-anchor="middle"><text x="48.5943" y="180.575">Poor</text><text x="166.575" y="62.5943">Fair</text><text x="333.425" y="62.5943">Good</text><text x="451.4057" y="180.575">Very Good</text></g>
    <text x="250" y="238" text-anchor="middle" fill="#c9efff" font-size="68" font-weight="750">${esc(view.score ?? '—')}</text>
    <text x="250" y="286" text-anchor="middle" fill="#61c7ff" font-size="36" font-weight="600">${esc(view.rating ?? '')}</text>
    <g fill="#8aa5b8" font-size="18" font-weight="600" text-anchor="middle"><text x="78" y="312">0</text><text x="422" y="312">${esc(view.maximum)}</text></g>
    </svg><div class="outcomes">${(['failed','passed','skipped','unknown'] as const).map(group => `<div class="outcome ${group}" style="--outcome:${colors[group]}"><strong>${esc(report.summary[`${group}_rules`])}</strong><span>${labels[group]}</span></div>`).join('')}</div></div>`;
}

function actionsTable(report: TrustReport) {
  const presentation = report.presentation;
  const ranked = presentation?.tips_version === '1.0';
  // Keep the UI's selected order and estimates; do not rank or generate anything at export.
  const tips = presentation?.tips.slice(0, 5) ?? [];
  return `<section class="actions-section"><h2>Actions for improvement</h2>
    ${tips.length ? `<table class="actions-table"><colgroup><col style="width:25%"/><col style="width:57%"/><col style="width:18%"/></colgroup>
      <thead><tr><th>Family</th><th>Actions to take</th><th class="numeric">Potential gain</th></tr></thead>
      <tbody>${tips.map((item,index) => {
        const tip = item as ImprovementTip;
        const familyName = tip.family_name ?? familyNameByRule.get(item.rule_ids[0]) ?? 'Improvement guidance';
        const details = [...new Set(tip.rule_details?.map(detail => detail.action) ?? [])].filter(action => action !== item.text);
        return `<tr data-tip="${esc(tip.family_id ?? index)}"><td><strong>${index + 1}. ${esc(familyName)}</strong></td>
          <td><p>${esc(item.text)}</p>${details.length ? `<ul>${details.map(action => `<li>${esc(action)}</li>`).join('')}</ul>` : ''}</td>
          <td class="numeric">${ranked ? gain(tip.estimated_gain) : 'Not estimated'}</td></tr>`;
      }).join('')}</tbody></table>
      ${ranked ? `<p class="gain-total">Total potential gain <strong>${gain(presentation?.tips_gain)}</strong></p>` : ''}`
      : `<p>${esc(presentation?.tips_empty ?? 'No UI improvement guidance was supplied with this assessment.')}</p>`}
    </section>`;
}

/** Formats existing report/presentation data only: no ranking, generation, collection or scoring. */
export function trustPDFHTML(report: TrustReport) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Agentopia MCP Trust Assessment</title><style>
    @page { size:A4; margin:26mm 13mm 17mm; background:#030b12; }
    * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    html,body { margin:0; background:#030b12; color:#a7cadf; font:10pt/1.5 Arial,Helvetica,sans-serif; }
    h1 { color:#61c7ff; font-size:23pt; line-height:1.2; margin:0 0 10px; } h2 { color:#61c7ff; font-size:17pt; margin:0 0 16px; }
    h1,h2 { break-after:avoid; } p { margin:0 0 12px; } p,li,td,th { overflow-wrap:anywhere; }
    .endpoint { color:#61c7ff; font:10pt/1.5 monospace; }
    .score-overview { width:500px; margin:0 auto 26px; break-inside:avoid; } svg { display:block; width:500px; height:314px; font-family:Arial,Helvetica,sans-serif; }
    .outcomes { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:20px; } .outcome { height:86px; border:1px solid #29445b; border-radius:10px; background:#07111a; color:var(--outcome); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; }
    .outcome strong { font-size:30px; line-height:36px; } .outcome span { font-size:16px; font-weight:600; } .outcome.failed { border-color:#ff657a66; background:#ff657a1a; }
    .summary { border-top:1px solid #1c2e3f; padding-top:18px; font-size:11pt; }
    .summary__score { font-size:14pt; color:#c9efff; font-weight:700; }
    .overview { break-after:page; }
    table { border-collapse:collapse; table-layout:fixed; width:100%; font-size:9pt; line-height:1.5; margin:0 0 20px; }
    thead { display:table-header-group; } th,td { padding:10px; text-align:left; vertical-align:top; border:1px solid #29445b; }
    th { font-weight:600; color:#c9efff; background:#0b1a26; } td { background:#07111a; } tr { break-inside:avoid; }
    .numeric { text-align:right; font-variant-numeric:tabular-nums; }
    .actions-table th { color:#61c7ff; } .actions-table td:first-child { color:#61c7ff; } .actions-table td.numeric { color:#8ae2c0; font-weight:600; }
    .actions-table p { margin:0; } .actions-table ul { margin:10px 0 0; padding-left:17px; color:#8aa5b8; } .actions-table li+li { margin-top:6px; }
    .gain-total { display:flex; justify-content:space-between; gap:20px; border-top:1px solid #29445b; padding-top:16px; font-size:15pt; font-weight:600; color:#61c7ff; break-inside:avoid; }
    .gain-total strong { font-weight:700; white-space:nowrap; }
    </style></head><body><section class="overview"><h1>Trust assessment</h1><p class="endpoint">${esc(report.subject.endpoint)}</p>
    ${scoreGraphic(report)}
    <div class="summary"><p class="summary__score">Score: ${esc(report.summary.total_score)} / ${esc(report.summary.configured_maximum)}</p>
    <p>Rule pass percentage: ${esc(report.summary.pass_percentage ?? '—')}%</p></div>
    </section>${actionsTable(report)}</body></html>`;
}
