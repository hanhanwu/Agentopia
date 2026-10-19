export type ArdNodeSemantic =
  | 'domain'
  | 'catalog-pointer'
  | 'catalog-hint'
  | 'catalog'
  | 'information-document';

export type ArdEvidenceNode = {
  id: string;
  semantic?: string;
  label: string;
  outcome: string;
  kind: string;
  role: string;
  artifact?: string;
  evidenceDigest?: string;
};

export type ArdEvidenceEdge = {
  from: string;
  to: string;
};

export type ArdEvidencePath = {
  nodes: readonly ArdEvidenceNode[];
  edges: readonly ArdEvidenceEdge[];
};

export type ArdVisualRoute = {
  locator: ArdEvidenceNode;
  catalogs: readonly ArdEvidenceNode[];
  state: 'resolved' | 'absent' | 'error' | 'unresolved' | 'conflict';
};

export type ArdVisualCatalog = {
  catalog: ArdEvidenceNode;
  documents: readonly ArdEvidenceNode[];
};

export type ArdVisualProjection = {
  domain: ArdEvidenceNode;
  primaryRoutes: readonly ArdVisualRoute[];
  secondaryRoutes: readonly ArdVisualRoute[];
  catalogs: readonly ArdVisualCatalog[];
  hasConflict: boolean;
};

const ardSemantics = new Set<ArdNodeSemantic>([
  'domain',
  'catalog-pointer',
  'catalog-hint',
  'catalog',
  'information-document',
]);

const isArdSemantic = (semantic: string | undefined): semantic is ArdNodeSemantic => (
  semantic !== undefined && ardSemantics.has(semantic as ArdNodeSemantic)
);

/**
 * Converts complete ARD evidence into the smallest truthful visual graph.
 * Node order is deliberately irrelevant: roles come from semantic tags and
 * relationships come from edges.
 */
export const projectArdDiscoveryPath = (path: ArdEvidencePath): ArdVisualProjection => {
  const nodesById = new Map(path.nodes.map((node) => [node.id, node]));
  if (nodesById.size !== path.nodes.length) {
    throw new Error('ARD evidence node IDs must be unique.');
  }
  const outgoing = new Map<string, ArdEvidenceNode[]>();

  path.nodes.forEach((node) => {
    if (!isArdSemantic(node.semantic)) {
      throw new Error(`ARD node ${node.id} has no recognized semantic role.`);
    }
  });

  path.edges.forEach(({ from, to }) => {
    const source = nodesById.get(from);
    const target = nodesById.get(to);
    if (!source || !target) throw new Error(`ARD edge ${from} -> ${to} references a missing node.`);
    outgoing.set(source.id, [...(outgoing.get(source.id) ?? []), target]);
  });

  const domains = path.nodes.filter(({ semantic }) => semantic === 'domain');
  if (domains.length !== 1) throw new Error(`ARD evidence requires exactly one domain node; found ${domains.length}.`);

  const locatorNodes = path.nodes.filter(({ semantic }) => (
    semantic === 'catalog-pointer' || semantic === 'catalog-hint'
  ));

  const routes = locatorNodes.map((locator): ArdVisualRoute => {
    const catalogs = (outgoing.get(locator.id) ?? []).filter(({ semantic }) => semantic === 'catalog');
    const state = locator.outcome === 'absent'
      ? 'absent'
      : locator.outcome === 'error'
        ? 'error'
        : catalogs.length > 1
          ? 'conflict'
          : catalogs.length === 1
            ? 'resolved'
            : 'unresolved';
    return { locator, catalogs, state };
  });

  const resolvedDestinations = new Set(
    routes.flatMap(({ state, catalogs }) => (
      state === 'resolved' || state === 'conflict' ? catalogs.map(({ id }) => id) : []
    )),
  );
  const hasConflict = routes.some(({ state }) => state === 'conflict') || resolvedDestinations.size > 1;
  const visibleCatalogs = [...resolvedDestinations]
    .map((id) => nodesById.get(id))
    .filter((catalog): catalog is ArdEvidenceNode => catalog?.semantic === 'catalog');

  return {
    domain: domains[0],
    primaryRoutes: routes.filter(({ state }) => state === 'resolved' || state === 'conflict'),
    secondaryRoutes: routes.filter(({ state }) => state !== 'resolved' && state !== 'conflict'),
    catalogs: visibleCatalogs.map((catalog) => ({
      catalog,
      documents: (outgoing.get(catalog.id) ?? []).filter(({ semantic }) => semantic === 'information-document'),
    })),
    hasConflict,
  };
};
