import type { ActivityEvent } from './activity.ts';

export const INTRO_DURATION_MS = 17300;

export const portableScenes = [
  { id: 'intro', label: 'Intro', duration: INTRO_DURATION_MS, event: null },
  { id: 'step-1', label: 'Step 1 · Request & intent', duration: 6800, event: 'task.requested' },
  { id: 'step-2', label: 'Step 2 · Registry search', duration: 8000, event: 'registries.search-started' },
  { id: 'step-3', label: 'Step 3 · Registry results', duration: 3500, event: 'registry.results-returned' },
  { id: 'step-4', label: 'Step 4 · Consolidation', duration: 4500, event: 'candidates.normalized' },
  { id: 'step-5', label: 'Step 5 · Decision made', duration: 3500, event: 'search.completed' },
  { id: 'step-6', label: 'Step 6 · Endpoint discovery', duration: 19000, event: 'endpoints.discovery-started' },
  { id: 'step-7', label: 'Step 7 · Endpoint interaction', duration: 11900, event: 'endpoints.interaction-completed' },
  { id: 'step-8', label: 'Step 8 · Agent query', duration: 6500, event: 'agent.query-ready' },
  { id: 'suggestion', label: 'Suggestion page', duration: 4500, event: 'publication.tip-shown' },
] as const;
export type PortableSceneId = typeof portableScenes[number]['id'];

export function orderScenes(ids: unknown): PortableSceneId[] {
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > portableScenes.length
    || new Set(ids).size !== ids.length || ids.some((id) => !portableScenes.some((scene) => scene.id === id))) {
    throw new Error('Select one or more valid, distinct scenes.');
  }
  return portableScenes.filter(({ id }) => ids.includes(id)).map(({ id }) => id);
}

export function sceneEventIndex(events: ActivityEvent[], id: PortableSceneId): number {
  const scene = portableScenes.find((candidate) => candidate.id === id)!;
  // Both registry responses belong to displayed Step 3.
  if (scene.event === 'registry.results-returned') {
    for (let index = events.length - 1; index >= 0; index--) {
      if (events[index].type === scene.event) return index;
    }
    return -1;
  }
  return events.findIndex(({ type }) => type === scene.event);
}

export function embedCodes(filename: string) {
  // Encode the filename as a relative URL, so spaces, brackets and quotes stay valid in both formats.
  const src = `./${encodeURIComponent(filename).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`;
  return { markdown: `![Agentopia](${src})`, html: `<img src="${src}"\n  alt="Agentopia scenario" />` };
}
