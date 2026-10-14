import { describe, expect, it } from 'vitest';
import endpointDiscoverySnapshot from './data/scenario-1-endpoint-discovery.snapshot.json';

describe('Scenario 1 endpoint discovery snapshot', () => {
  it('contains the real public output needed by the three Step 6 panels', () => {
    expect(endpointDiscoverySnapshot.schemaVersion).toBe(2);
    expect(endpointDiscoverySnapshot.agent.domain).toBe('bookings.darknetian.com');
    expect(endpointDiscoverySnapshot.mechanisms.map(({ id }) => id)).toEqual(['ard', 'dns-aid', 'ans']);
    expect(endpointDiscoverySnapshot.mechanisms.map(({ claims }) => claims.length)).toEqual([3, 1, 1]);

    endpointDiscoverySnapshot.mechanisms.forEach((mechanism) => {
      expect(mechanism.status).toBe('found');
      const nodeIds = new Set(mechanism.path.nodes.map(({ id }) => id));
      mechanism.path.edges.forEach((edge) => {
        expect(nodeIds.has(edge.from)).toBe(true);
        expect(nodeIds.has(edge.to)).toBe(true);
      });
      mechanism.claims.forEach((claim) => {
        expect(claim.protocol).toBeTruthy();
        expect(claim.endpoint).toMatch(/^https:\/\/bookings\.darknetian\.com/);
        expect(nodeIds.has(claim.sourceNodeId)).toBe(true);
        expect(claim.sourceField).toBeTruthy();
        expect(claim.evidenceDigest).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    expect(endpointDiscoverySnapshot.doors).toHaveLength(4);
    expect(endpointDiscoverySnapshot.decision.selectedDoorId).toBe('door-4');
  });
});
