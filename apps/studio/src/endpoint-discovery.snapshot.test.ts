import { describe, expect, it } from 'vitest';
import endpointDiscoverySnapshot from './data/scenario-1-endpoint-discovery.snapshot.json';
import fabioEndpointDiscoverySnapshot from './data/scenario-1-fabio-endpoint-discovery.snapshot.json';
import { projectArdDiscoveryPath } from './endpoint-discovery-visual.ts';

describe('Scenario 1 endpoint discovery snapshot', () => {
  it('contains the real public output needed by the three Step 6 panels', () => {
    expect(endpointDiscoverySnapshot.schemaVersion).toBe(2);
    expect(endpointDiscoverySnapshot.agent.domain).toBe('bookings.darknetian.com');
    expect(endpointDiscoverySnapshot.mechanisms.map(({ id }) => id)).toEqual(['ard', 'dns-aid', 'ans']);
    expect(endpointDiscoverySnapshot.mechanisms.map(({ claims }) => claims.length)).toEqual([3, 1, 1]);

    const ard = endpointDiscoverySnapshot.mechanisms.find(({ id }) => id === 'ard');
    const ardSemantics = ard?.path.nodes.map((node) => 'semantic' in node ? node.semantic : undefined) ?? [];
    expect(ardSemantics).toEqual(expect.arrayContaining(['domain', 'catalog-pointer', 'catalog-hint', 'catalog']));
    expect(ardSemantics.filter((semantic) => semantic === 'information-document')).toHaveLength(3);
    if (!ard) throw new Error('ARD mechanism is required by Scenario 1.');
    const ardProjection = projectArdDiscoveryPath(ard.path);
    expect(ardProjection.primaryRoutes.map(({ locator }) => locator.semantic)).toEqual(['catalog-hint']);
    expect(ardProjection.secondaryRoutes.map(({ locator, state }) => [locator.semantic, state])).toEqual([
      ['catalog-pointer', 'absent'],
    ]);
    expect(ardProjection.catalogs[0]?.documents).toHaveLength(3);

    const ans = endpointDiscoverySnapshot.mechanisms.find(({ id }) => id === 'ans');
    expect(ans?.path.nodes.find(({ id }) => id === 'ans-canonical')?.outcome).toBe('pass');
    expect(ans?.path.nodes.find(({ id }) => id === 'ans-compatibility')?.outcome).toBe('absent');
    expect(ans?.claims.map(({ protocol, endpoint, sourceNodeId }) => [protocol, endpoint, sourceNodeId])).toEqual([
      ['mcp', 'https://bookings.darknetian.com/', 'ans-canonical'],
    ]);

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

  it('keeps Fabio’s real DNS-AID path as the usable comparison case', () => {
    const nicDnsAid = endpointDiscoverySnapshot.mechanisms.find(({ id }) => id === 'dns-aid');
    const dnsAid = fabioEndpointDiscoverySnapshot.mechanisms.find(({ id }) => id === 'dns-aid');
    expect(fabioEndpointDiscoverySnapshot.agent.domain).toBe('travel.agenthaven.dev');
    expect(nicDnsAid?.claims.map(({ endpoint }) => endpoint)).toEqual([
      'https://bookings.darknetian.com/',
    ]);
    expect(endpointDiscoverySnapshot.doors.find(({ endpoint }) => (
      endpoint === 'https://bookings.darknetian.com/'
    ))?.validation.status).toBe('unusable');
    expect(dnsAid?.path.nodes.map(({ id }) => id)).toContain('dns-aid-card-1-1');
    expect(dnsAid?.claims.map(({ protocol, endpoint }) => [protocol, endpoint])).toEqual([
      ['a2a', 'https://travel.agenthaven.dev/a2a'],
      ['mcp', 'https://travel.agenthaven.dev/mcp'],
    ]);
    expect(fabioEndpointDiscoverySnapshot.doors.map(({ validation }) => validation.status)).toEqual([
      'usable',
      'usable',
    ]);
  });
});
