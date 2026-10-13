import { describe, expect, it } from 'vitest';
import endpointDiscoverySnapshot from './data/scenario-1-endpoint-discovery.snapshot.json';

describe('Scenario 1 endpoint discovery snapshot', () => {
  it('contains the real public output needed by the three Step 6 panels', () => {
    expect(endpointDiscoverySnapshot.agent.domain).toBe('bookings.darknetian.com');
    expect(endpointDiscoverySnapshot.mechanisms.map(({ id }) => id)).toEqual(['ard', 'dns-aid', 'ans']);
    expect(endpointDiscoverySnapshot.mechanisms.map(({ claims }) => claims.length)).toEqual([3, 1, 1]);

    endpointDiscoverySnapshot.mechanisms.forEach((mechanism) => {
      expect(mechanism.status).toBe('found');
      mechanism.claims.forEach((claim) => {
        expect(claim.protocol).toBeTruthy();
        expect(claim.endpoint).toMatch(/^https:\/\/bookings\.darknetian\.com/);
      });
    });
  });
});
