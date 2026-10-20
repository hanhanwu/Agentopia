import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from './activity.ts';
import { embedCodes, orderScenes, sceneEventIndex } from './portable-scenes.ts';
import { validateExport } from '../server/portable-export.ts';

const responses: ActivityEvent[] = ['agentcensus', 'a2a-registry'].map((registry, index) => ({
  schemaVersion: '1.0', eventId: `event-${index}`, runId: 'run-1', sequence: index, logicalTime: index,
  source: 'reported', visibility: 'studio', actorId: registry as 'agentcensus' | 'a2a-registry',
  subjectId: 'personal-assistant', type: 'registry.results-returned',
  payload: { registry: registry as 'agentcensus' | 'a2a-registry', candidates: [], resultCount: 0 },
}));

describe('portable scene export contract', () => {
  it('exports arbitrary selections in scenario order and rejects unknown or repeated scenes', () => {
    expect(orderScenes(['suggestion', 'step-5', 'intro', 'step-1'])).toEqual(['intro', 'step-1', 'step-5', 'suggestion']);
    for (const invalid of [[], ['step-9'], ['intro', 'intro'], null]) expect(() => orderScenes(invalid)).toThrow();
  });

  it('includes both registry responses in displayed Step 3', () => {
    expect(sceneEventIndex(responses, 'step-3')).toBe(1);
    expect(validateExport({ scenes: ['step-3'], events: responses }).scenes).toEqual(['step-3']);
  });

  it('requires recorded evidence for selected steps but permits the intro alone', () => {
    expect(() => validateExport({ scenes: ['suggestion'], events: responses })).toThrow('not available');
    expect(validateExport({ scenes: ['intro'], events: [] }).scenes).toEqual(['intro']);
    expect(() => validateExport({ scenes: ['intro'], events: [{ type: 'task.requested' }] })).toThrow('Invalid scenario events');
  });

  it('makes portable relative URLs for renamed downloads without embedding HTML or Markdown syntax', () => {
    const code = embedCodes('flight [demo] "2026".gif');
    expect(code.markdown).toBe('![Agentopia](./flight%20%5Bdemo%5D%20%222026%22.gif)');
    expect(code.html).toContain('src="./flight%20%5Bdemo%5D%20%222026%22.gif"');
    expect(embedCodes('agentopia.gif').html).not.toMatch(/blob:|file:|\/Users\//);
  });
});
