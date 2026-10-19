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

  it('waits for both registries regardless of response order', () => {
    const searchEvent: ActivityEvent = {
      ...taskEvent, eventId: 'event-2', sequence: 2, logicalTime: 2, source: 'simulated',
      type: 'registries.search-started', actorId: 'personal-assistant', subjectId: 'personal-assistant',
      payload: { query: 'meeting scheduling', registries: ['agentcensus', 'a2a-registry'] },
    };
    const a2aEvent: ActivityEvent = {
      ...taskEvent, eventId: 'event-3', sequence: 3, logicalTime: 3, source: 'reported',
      type: 'registry.no-results', actorId: 'a2a-registry', subjectId: 'personal-assistant',
      payload: { registry: 'a2a-registry', resultCount: 0 },
    };
    const censusEvent: ActivityEvent = {
      ...taskEvent, eventId: 'event-4', sequence: 4, logicalTime: 4, source: 'reported',
      type: 'registry.results-returned', actorId: 'agentcensus', subjectId: 'personal-assistant',
      payload: { registry: 'agentcensus', candidates: [candidate], resultCount: 1 },
    };

    const waiting = projectDiscovery([taskEvent, searchEvent, a2aEvent]);
    expect(waiting).toMatchObject({
      step: 4,
      title: 'A2A Registry Replied',
      mochiStatus: 'Collecting registry responses',
    });
    expect(waiting.registries.agentcensus.status).toBe('searching');

    const settled = projectDiscovery([taskEvent, searchEvent, a2aEvent, censusEvent]);
    expect(settled).toMatchObject({
      step: 5,
      title: 'Registry Results Received',
      mochiStatus: 'Registry search finished',
    });
    expect(settled.detail).toContain('AgentCensus returned 1 record');
    expect(settled.detail).toContain('A2A Registry returned 0 records');
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

  it('moves from the selected Bookings agent into endpoint discovery', () => {
    const endpointDiscoveryEvent = next({
      schemaVersion: '1.0', eventId: 'event-8', runId: 'run-1', sequence: 8, logicalTime: 8,
      source: 'reported', visibility: 'studio', type: 'endpoints.discovery-started',
      actorId: 'personal-assistant', subjectId: 'bookings-service',
      payload: { domain: candidate.domain, mechanisms: ['ard', 'dns-aid', 'ans'] },
    });

    expect(projectDiscovery([taskEvent, endpointDiscoveryEvent])).toMatchObject({
      step: 8,
      title: 'Discovering Agent Endpoints',
      mochiState: 'discovering-endpoints',
      mochiBubble: 'Checking every discovery path…',
    });
  });

  it('records endpoint interaction outcomes as the seventh visible step', () => {
    const endpointInteractionEvent = next({
      schemaVersion: '1.0', eventId: 'event-9', runId: 'run-1', sequence: 9, logicalTime: 9,
      source: 'observed', visibility: 'studio', type: 'endpoints.interaction-completed',
      actorId: 'personal-assistant', subjectId: 'bookings-service',
      payload: {
        domain: candidate.domain,
        interactions: [{
          mechanism: 'ard', endpoint: `https://${candidate.domain}/mcp`, attempts: ['MCP initialize'],
          outcome: 'success', status: 'HTTP 200',
        }],
      },
    });

    expect(projectDiscovery([taskEvent, endpointInteractionEvent])).toMatchObject({
      step: 9,
      title: 'Endpoint Interaction',
      mochiState: 'interacting-endpoints',
      mochiStatus: 'Endpoint interaction complete',
      mochiBubble: null,
    });
    expect(projectSkynet([taskEvent, endpointInteractionEvent])).toMatchObject({
      step: 9,
      title: 'Endpoint Interaction',
      source: 'observed',
    });
  });

  it('keeps the selected service agent and query phase in Step 8 history', () => {
    const ready = next({
      schemaVersion: '1.0', eventId: 'event-10', runId: 'run-1', sequence: 10, logicalTime: 10,
      source: 'observed', visibility: 'studio', type: 'agent.query-ready',
      actorId: 'personal-assistant', subjectId: 'bookings-service',
      payload: { choice: 'fabio', agentName: "Fabio's Travel Agent" },
    });
    const submitted = next({
      schemaVersion: '1.0', eventId: 'event-11', runId: 'run-1', sequence: 11, logicalTime: 11,
      source: 'observed', visibility: 'studio', type: 'agent.query-submitted',
      actorId: 'user', subjectId: 'personal-assistant',
      payload: { choice: 'fabio', query: 'Search for flights from San Francisco to Tokyo.' },
    });
    const completed = next({
      schemaVersion: '1.0', eventId: 'event-12', runId: 'run-1', sequence: 12, logicalTime: 12,
      source: 'reported', visibility: 'studio', type: 'agent.query-completed',
      actorId: 'bookings-service', subjectId: 'personal-assistant',
      payload: { choice: 'fabio', query: 'Search for flights from San Francisco to Tokyo.', responseCount: 2 },
    });

    expect(projectDiscovery([taskEvent, ready])).toMatchObject({
      step: 10, title: 'Agent Query', agentQueryChoice: 'fabio', agentQueryPhase: 'ready',
      mochiBubble: 'What flight should I search for?',
    });
    expect(projectDiscovery([taskEvent, ready, submitted, completed])).toMatchObject({
      step: 10, agentQueryChoice: 'fabio', agentQueryPhase: 'answered',
      agentQuery: 'Search for flights from San Francisco to Tokyo.',
      mochiBubble: null,
    });

    const suggestion = next({
      schemaVersion: '1.0', eventId: 'event-13', runId: 'run-1', sequence: 13, logicalTime: 13,
      source: 'derived', visibility: 'studio', type: 'publication.tip-shown',
      actorId: 'personal-assistant', subjectId: 'bookings-service', payload: {},
    });
    expect(projectDiscovery([taskEvent, ready, submitted, completed, suggestion])).toMatchObject({
      step: 10, title: 'Agent Publication Tip', agentQueryChoice: 'fabio', agentQueryPhase: 'suggestion',
      mochiState: 'publication-tip', mochiBubble: null,
    });
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
