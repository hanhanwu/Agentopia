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
});
