import type { AgentId } from './agents.ts';

export type ActivitySource = 'observed' | 'reported' | 'derived' | 'simulated';
export type RegistryId = 'agentcensus' | 'a2a-registry';
export type RegistryStatus = 'waiting' | 'searching' | 'results' | 'no-results' | 'failed';

export type Candidate = {
  id: string;
  name: string;
  domain: string;
  capability: string;
  sources: RegistryId[];
  matchReason: string;
};

type EventEnvelope = {
  schemaVersion: '1.0';
  eventId: string;
  runId: string;
  sequence: number;
  logicalTime: number;
  source: ActivitySource;
  visibility: 'studio';
  actorId: 'user' | AgentId | RegistryId;
  subjectId: AgentId | RegistryId;
  causalParentId?: string;
};

export type ActivityEvent =
  | (EventEnvelope & { type: 'task.requested'; actorId: 'user'; subjectId: 'personal-assistant'; payload: { message: string } })
  | (EventEnvelope & { type: 'search.intent-derived'; actorId: 'personal-assistant'; subjectId: 'personal-assistant'; payload: { intent: string; candidateType: string } })
  | (EventEnvelope & { type: 'registries.search-started'; actorId: 'personal-assistant'; subjectId: 'personal-assistant'; payload: { query: string; registries: RegistryId[] } })
  | (EventEnvelope & { type: 'registry.results-returned'; actorId: RegistryId; subjectId: 'personal-assistant'; payload: { registry: RegistryId; candidates: Candidate[]; resultCount: number } })
  | (EventEnvelope & { type: 'registry.no-results'; actorId: RegistryId; subjectId: 'personal-assistant'; payload: { registry: RegistryId; resultCount: 0 } })
  | (EventEnvelope & { type: 'candidates.normalized'; actorId: 'personal-assistant'; subjectId: 'personal-assistant'; payload: { reportedCount: number; uniqueCount: number } })
  | (EventEnvelope & { type: 'search.completed'; actorId: 'personal-assistant'; subjectId: 'personal-assistant'; payload: { candidates: Candidate[]; rankingMethod: string } });

export type DiscoveryStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DiscoveryProjection = {
  step: DiscoveryStep;
  title: string;
  detail: string;
  query: string | null;
  intent: string | null;
  candidateType: string | null;
  mochiState: string;
  mochiStatus: string;
  mochiBubble: string | null;
  registries: Record<RegistryId, { status: RegistryStatus; resultCount: number | null }>;
  candidates: Candidate[];
  reportedCount: number | null;
  uniqueCount: number | null;
  rankingMethod: string | null;
  currentEvent: ActivityEvent | null;
};

const initialProjection = (): DiscoveryProjection => ({
  step: 0,
  title: 'Ready to search',
  detail: 'Ask Mochi to find a service agent.',
  query: null,
  intent: null,
  candidateType: null,
  mochiState: 'ready',
  mochiStatus: 'Ready for a task',
  mochiBubble: null,
  registries: {
    agentcensus: { status: 'waiting', resultCount: null },
    'a2a-registry': { status: 'waiting', resultCount: null },
  },
  candidates: [],
  reportedCount: null,
  uniqueCount: null,
  rankingMethod: null,
  currentEvent: null,
});

export const eventsAtCursor = (
  events: readonly ActivityEvent[],
  cursor: number | null,
): readonly ActivityEvent[] => (cursor === null ? events : events.slice(0, cursor + 1));

export const projectDiscovery = (events: readonly ActivityEvent[]): DiscoveryProjection => {
  const projection = initialProjection();

  for (const event of events) {
    projection.currentEvent = event;

    switch (event.type) {
      case 'task.requested':
        Object.assign(projection, {
          step: 1, title: 'Request received', detail: `User asked Mochi: “${event.payload.message}”`,
          query: event.payload.message, mochiState: 'task-received', mochiStatus: 'Understanding the request', mochiBubble: 'I’ve got it!',
        });
        break;
      case 'search.intent-derived':
        Object.assign(projection, {
          step: 2, title: 'Intent understood', detail: `Mochi interpreted the task as ${event.payload.intent}.`,
          intent: event.payload.intent, candidateType: event.payload.candidateType,
          mochiState: 'intent-derived', mochiStatus: 'Intent understood', mochiBubble: 'Understood!',
        });
        break;
      case 'registries.search-started':
        Object.assign(projection, {
          step: 3, title: 'Searching Agent Registries',
          detail: 'Mochi sent the same capability query to AgentCensus and A2A Registry.',
          mochiState: 'searching-registries', mochiStatus: 'Searching agent registries', mochiBubble: 'Checking agent registries…',
        });
        for (const registry of event.payload.registries) projection.registries[registry] = { status: 'searching', resultCount: null };
        break;
      case 'registry.results-returned':
        Object.assign(projection, {
          step: event.payload.registry === 'agentcensus' ? 4 : 5,
          title: event.payload.registry === 'agentcensus' ? 'AgentCensus replied' : 'Registry results received',
          detail: event.payload.registry === 'agentcensus'
            ? `AgentCensus returned ${event.payload.resultCount} search records.`
            : `AgentCensus returned ${projection.registries.agentcensus.resultCount ?? 0} records and A2A Registry returned ${event.payload.resultCount}.`,
          candidates: [...projection.candidates, ...event.payload.candidates], mochiState: 'collecting-results',
          mochiStatus: event.payload.registry === 'agentcensus' ? 'Collecting registry responses' : 'Registry search finished',
          mochiBubble: event.payload.registry === 'agentcensus'
            ? `Received ${event.payload.resultCount} from AgentCensus!`
            : `Received ${projection.registries.agentcensus.resultCount ?? 0} from AgentCensus and ${event.payload.resultCount} from A2A!`,
        });
        projection.registries[event.payload.registry] = { status: 'results', resultCount: event.payload.resultCount };
        break;
      case 'registry.no-results':
        Object.assign(projection, {
          step: 5, title: 'A2A Registry replied', detail: 'A2A Registry returned successfully with no compatible candidates.',
          mochiState: 'collecting-results', mochiStatus: 'Registry search finished', mochiBubble: 'Both sources have replied.',
        });
        projection.registries[event.payload.registry] = { status: 'no-results', resultCount: 0 };
        break;
      case 'candidates.normalized':
        Object.assign(projection, {
          step: 6, title: 'Evidence consolidated',
          detail: `${event.payload.reportedCount} reported results became ${event.payload.uniqueCount} unique candidates after normalization.`,
          reportedCount: event.payload.reportedCount, uniqueCount: event.payload.uniqueCount,
          mochiState: 'normalizing', mochiStatus: 'Comparing reported evidence',
          mochiBubble: 'Comparing names, domains, and capabilities…',
        });
        break;
      case 'search.completed':
        Object.assign(projection, {
          step: 7, title: 'Search complete',
          detail: `${event.payload.candidates.length} unique candidate ranked by search relevance.`,
          candidates: event.payload.candidates, rankingMethod: event.payload.rankingMethod,
          mochiState: 'search-complete', mochiStatus: 'Shortlist ready', mochiBubble: 'I found one relevant candidate.',
        });
        break;
    }
  }

  return projection;
};

export const projectMochi = (events: readonly ActivityEvent[]) => {
  const projection = projectDiscovery(events);
  return { state: projection.mochiState, status: projection.mochiStatus, bubble: projection.mochiBubble, latestTask: projection.query };
};

export type SkynetProjection = {
  agentId: AgentId;
  step: DiscoveryStep;
  title: string;
  detail: string;
  source: ActivitySource;
  eventId: string;
  causalParentId: string | null;
};

export const projectSkynet = (events: readonly ActivityEvent[]): SkynetProjection | null => {
  const projection = projectDiscovery(events);
  const latest = projection.currentEvent;
  if (!latest) return null;
  return {
    agentId: 'personal-assistant', step: projection.step, title: projection.title, detail: projection.detail,
    source: latest.source, eventId: latest.eventId, causalParentId: latest.causalParentId ?? null,
  };
};
