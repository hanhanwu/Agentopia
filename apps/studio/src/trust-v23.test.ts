import {describe, expect, it} from 'vitest';
import {parseTrustResponse} from './trust-score.ts';
import {parseV23Display} from './trust-v23.ts';
import {parseChatRequest} from './mochi-contract.ts';
import {displayResponse} from './trust-display.fixture.ts';

const display = (score: number | null) => ({score, ratio: (score ?? 0) / 100, maximum:100, rating:score === null ? null : 'Good', color:'#ffd166'});
function fixture() {
  const mode = (score: number) => ({score_display:display(score), dimensions:Object.fromEntries(['connection','interaction','security'].map(d => [d, {
    score_display:display(score), positive_reasons:['The server connected successfully.'], negative_reasons:[], tips:['Repeat eligible checks after changes.'], dynamic_status:'partial', blocked:true,
  }]))});
  return {version:'2.3', modes:{static:mode(73.3), combined:mode(71.8)}};
}
describe('V2.3 display boundary', () => {
  it('retains both independent server-calculated modes and dimension blockers', () => {
    const payload = {...displayResponse(), report:{...displayResponse().report, v23:fixture()}};
    const parsed = parseTrustResponse(payload).v23!;
    expect(parsed.modes.static.score_display.score).toBe(73.3);
    expect(parsed.modes.combined.score_display.score).toBe(71.8);
    expect(parsed.modes.combined.dimensions.security.blocked).toBe(true);
  });
  it('rejects corrupt nested displays and strips private fields', () => {
    const value = fixture();
    Object.assign(value.modes.combined.dimensions.security, {raw_evidence:'PRIVATE_SENTINEL'});
    expect(JSON.stringify(parseV23Display(value))).not.toContain('PRIVATE_SENTINEL');
    value.modes.combined.dimensions.security.score_display.color = 'url(unsafe)';
    expect(() => parseV23Display(value)).toThrow();
    const bad = fixture();bad.modes.combined.score_display.ratio = NaN;
    expect(() => parseV23Display(bad)).toThrow();
  });
  it('keeps a missing dimension distinct from a measured zero', () => {
    const value = fixture();
    value.modes.combined.dimensions.security.score_display = display(null);
    value.modes.combined.dimensions.interaction.score_display = display(0);
    const parsed = parseV23Display(value);
    expect(parsed.modes.combined.dimensions.security.score_display.score).toBeNull();
    expect(parsed.modes.combined.dimensions.interaction.score_display.score).toBe(0);
  });
  it('passes only an enumerated score mode to a new Mochi session', () => {
    expect(parseChatRequest({export_id:'synthetic-export-reference', mode:'combined', score:99})).toEqual({export_id:'synthetic-export-reference', mode:'combined'});
    expect(() => parseChatRequest({export_id:'synthetic-export-reference', mode:'invented'})).toThrow();
  });
  it('validates gain alignment, unknown gains, totals and remaining overall headroom', () => {
    const value=fixture();
    Object.assign(value.modes.static.dimensions.connection,{tip_estimated_gains:[5],tips_gain:5});
    expect(parseV23Display(value).modes.static.dimensions.connection.tip_estimated_gains).toEqual([5]);
    for(const changes of [
      {tip_estimated_gains:[]}, {tip_estimated_gains:[-1]}, {tip_estimated_gains:[NaN]},
      {tip_estimated_gains:[50]}, {tip_estimated_gains:[null],tips_gain:5}, {tip_estimated_gains:[5],tips_gain:10},
    ]) {
      const invalid=fixture();Object.assign(invalid.modes.static.dimensions.connection,changes);
      expect(()=>parseV23Display(invalid)).toThrow();
    }
    const unavailable=fixture();unavailable.modes.static.score_display=display(null);
    Object.assign(unavailable.modes.static.dimensions.connection,{tip_estimated_gains:[5]});
    expect(()=>parseV23Display(unavailable)).toThrow();
  });

});
