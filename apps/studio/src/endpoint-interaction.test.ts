import { describe, expect, it } from 'vitest';
import bookingsSnapshot from './data/scenario-1-endpoint-discovery.snapshot.json';
import fabioSnapshot from './data/scenario-1-fabio-endpoint-discovery.snapshot.json';
import { projectEndpointInteractions, transitionEndpointInteractionPhase } from './endpoint-interaction.ts';

describe('Step 7 endpoint interaction projection', () => {
  it('keeps Nic’s original Bookings outcomes with one usable MCP endpoint', () => {
    const interactions = projectEndpointInteractions(bookingsSnapshot);

    expect(interactions).toHaveLength(5);
    expect(interactions.map(({ outcome, status }) => [outcome, status])).toEqual([
      ['failed', 'HTTP 429'],
      ['success', 'HTTP 200'],
      ['failed', 'HTTP 429'],
      ['failed', 'HTTP 404'],
      ['failed', 'HTTP 404'],
    ]);
  });

  it('projects Fabio’s five successful claims with their interface logos', () => {
    const interactions = projectEndpointInteractions(fabioSnapshot);

    expect(interactions).toHaveLength(5);
    expect(interactions.every(({ outcome, status }) => outcome === 'success' && status === 'HTTP 200')).toBe(true);
    expect(interactions.map(({ mechanism, interfaceId }) => [mechanism, interfaceId])).toEqual([
      ['ard', 'a2a'],
      ['ard', 'mcp'],
      ['dns-aid', 'a2a'],
      ['dns-aid', 'mcp'],
      ['ans', 'a2a'],
    ]);
  });

  it('keeps NO unchanged, accepts YES, and resets a replay to Bookings', () => {
    expect(transitionEndpointInteractionPhase('offering', 'decline')).toBe('offering');
    expect(transitionEndpointInteractionPhase('offering', 'accept')).toBe('connected');
    expect(transitionEndpointInteractionPhase('connected', 'reset')).toBe('testing');
  });

  it('preserves an explicit zero status instead of reporting no response', () => {
    const snapshot = structuredClone(bookingsSnapshot);
    snapshot.doors[0].validation.attempts.at(-1)!.httpStatus = 0;

    expect(projectEndpointInteractions(snapshot)[0]?.status).toBe('HTTP 0');
  });
});
