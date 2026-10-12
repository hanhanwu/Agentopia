import { describe, expect, it } from 'vitest';
import registrySearchMock from './data/registry-search.mock.json';

describe('temporary registry search records', () => {
  it('provides multiple scored records for both registry consoles', () => {
    expect(registrySearchMock.registries.map((registry) => registry.id)).toEqual([
      'agentcensus',
      'a2a-registry',
    ]);
    expect(registrySearchMock.registries.map((registry) => registry.records.length)).toEqual([5, 3]);

    registrySearchMock.registries.forEach((registry) => {
      expect(registry.records.length).toBeGreaterThan(1);
      registry.records.forEach((record) => {
        expect(record.agentName).toBeTruthy();
        expect(record.domain).toBeTruthy();
        expect(record.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(record.relevanceScore).toBeLessThanOrEqual(100);
      });
    });
  });
});
