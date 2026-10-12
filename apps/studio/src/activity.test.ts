import { describe, expect, it } from 'vitest';
import {
  eventsAtCursor,
  projectDiscovery,
  projectMochi,
  projectSkynet,
  type ActivityEvent,
  type Candidate,
} from './activity.ts';

const taskEvent: ActivityEvent = {
  schemaVersion: '1.0', eventId: 'event-1', runId: 'run-1', sequence: 1, logicalTime: 1,
  source: 'observed', visibility: 'studio', type: 'task.requested', actorId: 'user',
  subjectId: 'personal-assistant', payload: { message: 'search for meeting schedule assistant' },
};

const candidate: Candidate = {
  id: 'bookings-service', name: 'Bookings', domain: 'bookings.darknetian.com',
  capability: 'Meeting scheduling', sources: ['agentcensus'], matchReason: 'Direct capability match.',
};

const next = (event: Omit<ActivityEvent, keyof typeof taskEvent>): ActivityEvent => event as ActivityEvent;

describe('synchronized C3 discovery projection', () => {
  it('keeps Agentopia and Skynet on the same numbered step', () => {
    const intentEvent: ActivityEvent = {
      ...taskEvent, eventId: 'event-2', sequence: 2, logicalTime: 2, source: 'derived',
      type: 'search.intent-derived', actorId: 'personal-assistant', subjectId: 'personal-assistant',
      causalParentId: 'event-1', payload: { intent: 'meeting scheduling', candidateType: 'service agent' },
    };

    const events = [taskEvent, intentEvent];
    expect(projectDiscovery(events)).toMatchObject({ step: 2, title: 'Intent Understood' });
    expect(projectSkynet(events)).toMatchObject({ step: 2, title: 'Intent Understood' });
    expect(projectMochi(events)).toMatchObject({ state: 'intent-derived', status: 'Intent understood', bubble: 'Understood!' });
  });

  it('tracks the two registry outcomes independently', () => {
    const searchEvent: ActivityEvent = {
      ...taskEvent, eventId: 'event-2', sequence: 2, logicalTime: 2, source: 'simulated',
      type: 'registries.search-started', actorId: 'personal-assistant', subjectId: 'personal-assistant',
      payload: { query: 'meeting scheduling', registries: ['agentcensus', 'a2a-registry'] },
    };
    const censusEvent: ActivityEvent = {
      ...taskEvent, eventId: 'event-3', sequence: 3, logicalTime: 3, source: 'reported',
      type: 'registry.results-returned', actorId: 'agentcensus', subjectId: 'personal-assistant',
      payload: { registry: 'agentcensus', candidates: [candidate], resultCount: 1 },
    };
    const a2aEvent: ActivityEvent = {
      ...taskEvent, eventId: 'event-4', sequence: 4, logicalTime: 4, source: 'reported',
      type: 'registry.results-returned', actorId: 'a2a-registry', subjectId: 'personal-assistant',
      payload: {
        registry: 'a2a-registry',
        candidates: [1, 2, 3].map((number) => ({ ...candidate, id: `a2a-result-${number}`, sources: ['a2a-registry'] })),
        resultCount: 3,
      },
    };

    expect(projectDiscovery([taskEvent, searchEvent])).toMatchObject({
      step: 3,
      title: 'Searching Agent Registries',
      mochiStatus: 'Searching agent registries',
    });

    const whileWaiting = projectDiscovery([taskEvent, searchEvent, censusEvent]);
    expect(whileWaiting.registries.agentcensus).toEqual({ status: 'results', resultCount: 1 });
    expect(whileWaiting.registries['a2a-registry']).toEqual({ status: 'searching', resultCount: null });

    const settled = projectDiscovery([taskEvent, searchEvent, censusEvent, a2aEvent]);
    expect(settled.step).toBe(5);
    expect(settled.title).toBe('Registry Results Received');
    expect(settled.registries['a2a-registry']).toEqual({ status: 'results', resultCount: 3 });
    expect(settled.candidates).toHaveLength(4);
    expect(settled.mochiBubble).toContain('A2A Registry');
  });

  it('labels the final order as derived search relevance', () => {
    const completeEvent = next({
      schemaVersion: '1.0', eventId: 'event-7', runId: 'run-1', sequence: 7, logicalTime: 7,
      source: 'derived', visibility: 'studio', type: 'search.completed', actorId: 'personal-assistant',
      subjectId: 'personal-assistant', payload: { candidates: [candidate], rankingMethod: 'Reported metadata relevance' },
    });
    const projection = projectDiscovery([taskEvent, completeEvent]);
    expect(projection).toMatchObject({
      step: 7,
      title: 'Decision Made',
      rankingMethod: 'Reported metadata relevance',
      mochiBubble: 'Recommend the most relevant candidate',
    });
    expect(projection.candidates).toEqual([candidate]);
  });

  it('rewinds the shared state without mutating canonical history', () => {
    const events = [taskEvent, { ...taskEvent, eventId: 'event-2', sequence: 2, logicalTime: 2 }];
    expect(eventsAtCursor(events, 0)).toEqual([taskEvent]);
    expect(eventsAtCursor(events, null)).toBe(events);
    expect(events).toHaveLength(2);
  });

  it('keeps Skynet empty until a task occurs', () => {
    expect(projectSkynet([])).toBeNull();
  });
});
