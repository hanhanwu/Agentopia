import { describe, expect, it } from 'vitest';
import {
  projectArdDiscoveryPath,
  type ArdEvidenceNode,
  type ArdEvidencePath,
} from './endpoint-discovery-visual.ts';

const node = (
  id: string,
  semantic: ArdEvidenceNode['semantic'],
  outcome: ArdEvidenceNode['outcome'] = 'pass',
): ArdEvidenceNode => ({ id, semantic, outcome, label: id, kind: 'test', role: 'required' });

const path = (
  nodes: ArdEvidenceNode[],
  edges: Array<{ from: string; to: string }>,
): ArdEvidencePath => ({ nodes, edges });

describe('ARD discovery visual projection', () => {
  it('projects a successful hint and keeps an absent pointer as secondary evidence', () => {
    const projection = projectArdDiscoveryPath(path(
      [node('domain', 'domain'), node('pointer', 'catalog-pointer', 'absent'), node('hint', 'catalog-hint'), node('catalog', 'catalog')],
      [{ from: 'domain', to: 'pointer' }, { from: 'domain', to: 'hint' }, { from: 'hint', to: 'catalog' }],
    ));

    expect(projection.primaryRoutes.map(({ locator }) => locator.id)).toEqual(['hint']);
    expect(projection.secondaryRoutes.map(({ locator, state }) => [locator.id, state])).toEqual([['pointer', 'absent']]);
    expect(projection.hasConflict).toBe(false);
  });

  it('projects a successful dedicated pointer without requiring a hint', () => {
    const projection = projectArdDiscoveryPath(path(
      [node('catalog', 'catalog'), node('domain', 'domain'), node('pointer', 'catalog-pointer')],
      [{ from: 'domain', to: 'pointer' }, { from: 'pointer', to: 'catalog' }],
    ));

    expect(projection.primaryRoutes[0]?.locator.semantic).toBe('catalog-pointer');
    expect(projection.primaryRoutes[0]?.catalogs[0]?.id).toBe('catalog');
  });

  it('converges pointer and hint routes that resolve to the same catalog', () => {
    const projection = projectArdDiscoveryPath(path(
      [node('domain', 'domain'), node('hint', 'catalog-hint'), node('catalog', 'catalog'), node('pointer', 'catalog-pointer')],
      [{ from: 'pointer', to: 'catalog' }, { from: 'hint', to: 'catalog' }],
    ));

    expect(projection.primaryRoutes).toHaveLength(2);
    expect(projection.catalogs).toHaveLength(1);
    expect(projection.hasConflict).toBe(false);
  });

  it('flags successful routes that resolve to different catalogs', () => {
    const projection = projectArdDiscoveryPath(path(
      [
        node('domain', 'domain'), node('pointer', 'catalog-pointer'), node('hint', 'catalog-hint'),
        node('catalog-a', 'catalog'), node('catalog-b', 'catalog'),
      ],
      [{ from: 'pointer', to: 'catalog-a' }, { from: 'hint', to: 'catalog-b' }],
    ));

    expect(projection.hasConflict).toBe(true);
  });

  it('shows both failed lookup alternatives when no catalog can be located', () => {
    const projection = projectArdDiscoveryPath(path(
      [node('domain', 'domain'), node('pointer', 'catalog-pointer', 'absent'), node('hint', 'catalog-hint', 'error')],
      [],
    ));

    expect(projection.primaryRoutes).toHaveLength(0);
    expect(projection.secondaryRoutes.map(({ state }) => state)).toEqual(['absent', 'error']);
  });

  it('rejects untagged evidence instead of guessing from array position or labels', () => {
    expect(() => projectArdDiscoveryPath(path([node('domain', undefined)], []))).toThrow(/recognized semantic role/);
  });

  it('rejects duplicate node IDs instead of silently resolving edges to the last node', () => {
    expect(() => projectArdDiscoveryPath(path([
      node('domain', 'domain'),
      node('domain', 'catalog'),
    ], []))).toThrow(/node IDs must be unique/);
  });
});
