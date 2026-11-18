import {describe, expect, it} from 'vitest';
import {renderDimensionCard} from './mochi-chat.ts';
import type {DimensionDisplay} from './trust-v23.ts';
const value = (): DimensionDisplay => ({score_display:{ratio:.5,score:50,maximum:100,rating:'Good',color:'#ffd166'},
  positive_reasons:[],negative_reasons:[],tips:[],dynamic_status:'partial',blocked:false});
describe('dimension card sections', () => {
  it('omits all empty lists and their headings', () => {
    const html=renderDimensionCard('Connection','Static',value());
    expect(html).not.toContain('<ul');expect(html).not.toContain('<h4');
    expect(html).not.toContain('No findings');expect(html).not.toContain('No improvement');
  });
  it('renders only populated positive, negative and tip groups with independent line styles', () => {
    const data=value();data.positive_reasons=['The server listed its tools.'];
    let html=renderDimensionCard('Connection','Static',data);
    expect(html).toContain('mochi-chat__reasons--positive');expect(html).not.toContain('mochi-chat__reasons--negative');expect(html).not.toContain('Improvement tips');
    data.positive_reasons=[];data.negative_reasons=['Some answers could not be confirmed.'];data.tips=['Repeat checks for unclear answers.'];
    html=renderDimensionCard('Capability','Static + Dynamic',data);
    expect(html).not.toContain('mochi-chat__reasons--positive');expect(html).toContain('mochi-chat__reasons--negative');expect(html).toContain('Improvement tips');
  });
  it('escapes model text and headings', () => {
    const data=value();data.negative_reasons=['<script>unsafe</script>'];
    const html=renderDimensionCard('<img>','Static',data);
    expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<img>');
  });
  it('shows low-score and unavailable explanations under Reasons with a red leading line', () => {
    for (const score of [0, null]) {
      const data=value();data.score_display={ratio:0,score,maximum:100,rating:null,color:'#7d9cae'};
      data.assessment_notes=['Sign-in is required before the tools can be checked.'];data.tips=['Provide authorized access and reassess.'];
      const html=renderDimensionCard('Capability','Static',data);
      expect(html).toContain('<h4>Reasons</h4><ul class="mochi-chat__reasons mochi-chat__reasons--negative" aria-label="Assessment availability">');
      expect(html).toContain('Sign-in is required');expect(html).toContain('Improvement tips');
      expect(html).not.toContain('mochi-chat__assessment-notes');expect(html).not.toContain('mochi-chat__reasons--positive');
    }
  });
  it('shows generation failures under Reasons with a red leading line', () => {
    const data=value();data.guidance_status='unavailable';
    const html=renderDimensionCard('Capability','Static',data);
    expect(html).toContain('<h4>Reasons</h4><ul class="mochi-chat__reasons mochi-chat__reasons--negative" aria-label="Explanation availability"><li>Explanations could not be generated. Run a new assessment to retry.</li></ul>');
    expect(html).not.toContain('mochi-chat__guidance-unavailable');
  });

  it('omits a numeric label when the combined gain is unknown', () => {
    const data=value();data.tips=['Repair the observed behavior.','Provide access and reassess.'];data.tip_estimated_gains=[4.2,null];
    const html=renderDimensionCard('Capability','Static + Dynamic',data);
    expect(html).not.toContain('Estimated overall score increase');
    expect(html).not.toContain('Reassess to confirm.');
  });
  it('places the deduplicated total beside Improvement tips without per-tip labels or reassessment text', () => {
    const data=value();data.tips=['Repair one aspect.','Repair the related aspect.'];data.tip_estimated_gains=[20,20];data.tips_gain=20;
    const html=renderDimensionCard('Capability','Static',data);
    expect(html).toContain('<h4 class="mochi-chat__tips-heading">Improvement tips<span class="trust-tips__gain" aria-label="Estimated overall score increase">+20 pts</span></h4>');
    expect(html.match(/trust-tips__gain/g)).toHaveLength(1);
    expect(html).not.toContain('+40');expect(html).not.toContain('Reassess to confirm.');expect(html).not.toContain('Gains may overlap.');
  });

});
