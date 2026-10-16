import './styles.css';
import { agents, type Agent } from './agents.ts';
import registrySearchMock from './data/registry-search.mock.json';
import endpointDiscoverySnapshot from './data/scenario-1-endpoint-discovery.snapshot.json';
import { projectArdDiscoveryPath, type ArdNodeSemantic } from './endpoint-discovery-visual.ts';
import {
  eventsAtCursor,
  projectDiscovery,
  projectMochi,
  projectSkynet,
  type Candidate,
  type ActivityEvent,
  type RegistryId,
} from './activity.ts';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Studio root was not found.');
}

type ServiceVariant = 1 | 2 | 3 | 4 | 5 | 6 | 7;
const INTENT_DERIVATION_DELAY = 4800;
const UNDERSTOOD_HOLD_DELAY = 2000;
const REGISTRY_SEARCH_DELAY = INTENT_DERIVATION_DELAY + UNDERSTOOD_HOLD_DELAY;
const CONSOLIDATION_START_DELAY = 27000;
const STEP_REPLAY_LEAD_DELAY = 700;

const mochiArtwork = () => `
  <path class="squid-body" d="M48 205V140C48 65 91 25 132 25s84 40 84 115v65c0 21-15 37-34 37s-34-16-34-37c0 21-15 37-34 37s-34-16-34-37c0 21-14 37-32 37s-32-16-32-37z" />
  <path class="squid-line" d="M85 130q47-28 95 0" />
  <circle class="squid-eye" cx="108" cy="153" r="7" />
  <circle class="squid-eye" cx="155" cy="153" r="7" />
  <ellipse class="squid-blush" cx="88" cy="176" rx="15" ry="9" />
  <ellipse class="squid-blush" cx="176" cy="176" rx="15" ry="9" />
  <path class="squid-mark" d="M126 177l7 7 7-7-7-7z" />
`;

const serviceAgentArtwork = (variant: ServiceVariant) => {
  const artwork: Record<ServiceVariant, string> = {
    1: `<path class="squid-body" d="M38 196V149C38 71 87 31 138 31s100 40 100 118v47c0 25-18 43-40 43-18 0-32-11-38-28-6 17-20 28-38 28s-32-11-38-28c-6 17-20 28-38 28-22 0-40-18-40-43z" />
        <path class="squid-line" d="M61 126h154" /><circle class="squid-eye" cx="111" cy="153" r="7" /><circle class="squid-eye" cx="166" cy="153" r="7" /><path class="squid-line" d="M126 181q12 9 24 0" /><path class="squid-mark squid-mark--line" d="M118 86h40l11 20h-62z" />`,
    2: `<path class="squid-body" d="M54 210V133C54 65 88 35 138 35s84 30 84 98v77c0 20-14 35-31 35-18 0-31-15-31-35 0 20-10 35-22 35s-22-15-22-35c0 20-13 35-31 35-17 0-31-15-31-35z" />
        <path class="squid-line" d="M138 29V10M121 16l17 13 18-13M91 137h94M106 159h18M152 159h18" /><circle class="squid-mark squid-mark--line" cx="138" cy="190" r="13" /><circle class="squid-eye" cx="138" cy="190" r="4" />`,
    3: `<path class="squid-body" d="M45 188V139C45 73 83 38 138 38s93 35 93 101v49c0 20-13 35-30 35-18 0-30-15-30-35 0 20-15 35-33 35s-33-15-33-35c0 20-12 35-30 35-17 0-30-15-30-35z" />
        <path class="squid-line" d="M45 151l-19 19M231 151l19 19M92 132l22 13-22 13M184 132l-22 13 22 13" /><path class="squid-mark squid-mark--line" d="M119 171h38v24h-38z" />`,
    4: `<path class="squid-body" d="M19 198V142C19 72 64 35 126 35s107 37 107 107v56c0 24-17 42-38 42-20 0-35-14-39-33-4 19-18 33-38 33s-35-14-39-33c-4 19-18 33-39 33-21 0-38-18-38-42z" />
        <path class="squid-line" d="M49 112q77-66 154 0M66 91q60-44 120 0" /><circle class="squid-eye" cx="95" cy="146" r="9" /><circle class="squid-eye" cx="157" cy="146" r="9" /><path class="squid-line" d="M105 178q21 14 42 0" />`,
    5: `<path class="squid-body" d="M48 210V132C48 68 84 32 138 32s90 36 90 100v78c0 21-15 37-34 37-18 0-32-13-36-30-4 17-17 30-36 30s-32-13-36-30c-4 17-18 30-36 30-19 0-34-16-34-37z" />
        <path class="squid-line" d="M69 63Q48 41 34 65M207 63q21-22 35 2M88 126q22-18 44 0M144 126q22-18 44 0M97 151l17 10-17 10M179 151l-17 10 17 10M126 190q12 7 24 0" />`,
    6: `<path class="squid-body" d="M66 216V116C66 55 96 23 140 23s74 32 74 93v100c0 19-13 34-30 34-16 0-28-12-30-29-2 17-7 29-14 29s-12-12-14-29c-2 17-14 29-30 29-17 0-30-15-30-34z" />
        <path class="squid-line" d="M89 121q51-28 102 0M106 145h17M157 145h17M127 181q13 9 26 0M109 69h62" />`,
    7: `<path class="squid-body" d="M23 204V147C23 78 69 42 132 42s109 36 109 105v57c0 23-17 40-38 40-19 0-34-13-39-31-5 18-17 31-32 31s-27-13-32-31c-5 18-20 31-39 31-21 0-38-17-38-40z" />
        <path class="squid-line" d="M44 124q88-82 176 0M67 89q65-55 130 0M23 166H5M241 166h18" /><circle class="squid-eye" cx="101" cy="151" r="8" /><circle class="squid-eye" cx="163" cy="151" r="8" /><path class="squid-line" d="M113 181q19 16 38 0" />`,
  };
  return artwork[variant];
};

const avatar = (agent: Agent) => {
  const isMochi = agent.id === 'personal-assistant';

  return `
    <svg class="avatar avatar--${agent.accent}" viewBox="0 0 276 270" aria-hidden="true">
      ${isMochi ? mochiArtwork() : serviceAgentArtwork(1)}
    </svg>
  `;
};

const serviceScout = (variant: ServiceVariant, accent: string) => `
  <span class="service-scout service-scout--${accent}" aria-hidden="true">
    <svg viewBox="0 0 276 270">${serviceAgentArtwork(variant)}</svg>
  </span>
`;

const agentButton = (agent: Agent, placement: string) => `
  <button
    class="world-agent world-agent--${placement}"
    type="button"
    data-agent-id="${agent.id}"
    aria-label="Select ${agent.name}, ${agent.role}"
    aria-pressed="false"
  >
    <span class="world-agent__status" aria-hidden="true"></span>
    <span class="world-agent__beam-frame" aria-hidden="true"></span>
    <span class="agent-bubble" data-${agent.id === 'personal-assistant' ? 'mochi' : 'luca'}-bubble hidden></span>
    ${avatar(agent)}
    ${agent.id === 'personal-assistant' ? `<span class="mochi-inspection-magnifier" aria-hidden="true">
      <svg viewBox="0 0 120 90">
        <path class="mochi-inspection-magnifier__arm" d="M41 42C48 42 52 40 58 38"/>
        <path class="mochi-inspection-magnifier__handle" d="M70 41 79 45"/>
        <path class="mochi-inspection-magnifier__hand" d="M54 29c5-5 13-5 18-1 5 3 7 10 3 15-4 6-14 9-21 4-6-4-6-12 0-18Z"/>
        <path class="mochi-inspection-magnifier__finger" d="M58 34c4 2 7 5 9 9M65 31c4 2 7 5 8 8"/>
        <circle class="mochi-inspection-magnifier__glass" cx="98" cy="27" r="27"/>
        <path class="mochi-inspection-magnifier__glint" d="M84 20c5-7 14-10 22-7"/>
      </svg>
    </span>` : ''}
    <span class="world-agent__label">
      <strong>${agent.name}</strong>
      <small>${agent.shortRole}</small>
    </span>
  </button>
`;

const registryPrintout = (registry: (typeof registrySearchMock.registries)[number]) => `
  <article class="registry-printout registry-printout--${registry.id === 'agentcensus' ? 'census' : 'a2a'}" data-registry-printout="${registry.id}">
    <header>
      <strong>${registry.name}</strong>
      <span><i></i> <span data-registry-printout-status="${registry.id}">Streaming</span></span>
    </header>
    <div class="registry-printout__columns"><span>Agent</span><span>Domain</span><span>Relevance</span></div>
    ${registry.records.map((record, index) => `
      <div class="registry-printout__row" style="animation-delay: ${(0.65 + index * 0.55).toFixed(2)}s">
        <strong>${record.agentName}</strong><span>${record.domain}</span><b>${record.relevanceScore}%</b>
      </div>
    `).join('')}
    <footer><span class="registry-printout__prompt">›</span> ${registry.records.length} raw records · compatibility pending</footer>
  </article>
`;

const consolidatedSearchRecords = registrySearchMock.registries
  .flatMap((registry) => registry.records.map((record) => ({ ...record, registryId: registry.id })))
  .sort((left, right) => right.relevanceScore - left.relevanceScore);
const CONSOLIDATION_FIRST_ROW_DELAY = 300;
const CONSOLIDATION_ROW_STAGGER = 220;
const CONSOLIDATION_ROW_DURATION = 520;
const STEP_4_TO_5_GAP = 4000;
const SEARCH_COMPLETE_DELAY = CONSOLIDATION_START_DELAY
  + CONSOLIDATION_FIRST_ROW_DELAY
  + (consolidatedSearchRecords.length - 1) * CONSOLIDATION_ROW_STAGGER
  + CONSOLIDATION_ROW_DURATION
  + STEP_4_TO_5_GAP;
const ENDPOINT_DISCOVERY_DELAY = SEARCH_COMPLETE_DELAY + 3500;

type DiscoveryMechanismId = (typeof endpointDiscoverySnapshot.mechanisms)[number]['id'];

const discoveryMechanismName: Record<DiscoveryMechanismId, string> = {
  ard: 'ARD',
  'dns-aid': 'DNS-AID',
  ans: 'ANS',
};

const discoveryMechanismMark = (id: DiscoveryMechanismId, className = '') => {
  const artwork: Record<DiscoveryMechanismId, string> = {
    ard: `
      <path class="mechanism-mark__shell" d="M0-66L58-34V34L0 66-58 34V-34Z"/>
      <path class="mechanism-mark__thin" d="M-33-20H10M-33-4H10M-33 12H-2M-42-39H12M-42-31V22"/>
      <path class="mechanism-mark__line" d="M-34-31H20V24M2 24H42M30 12l12 12-12 12"/>
      <circle class="mechanism-mark__dot" cx="-33" cy="-20" r="3.5"/><circle class="mechanism-mark__dot" cx="-33" cy="-4" r="3.5"/><circle class="mechanism-mark__dot" cx="-33" cy="12" r="3.5"/>`,
    'dns-aid': `
      <path class="mechanism-mark__shell" d="M0-70L62 0 0 70-62 0Z"/>
      <rect class="mechanism-mark__line" x="-40" y="-34" width="54" height="68" rx="7"/>
      <circle class="mechanism-mark__dot" cx="-29" cy="-20" r="3.5"/><circle class="mechanism-mark__dot" cx="-29" cy="0" r="3.5"/><circle class="mechanism-mark__dot" cx="-29" cy="20" r="3.5"/>
      <path class="mechanism-mark__thin" d="M-20-20H3M-20 0H3M-20 20H3"/><path class="mechanism-mark__line" d="M14 0H41M30-11L43 0 30 11"/><circle class="mechanism-mark__dot" cx="48" cy="0" r="5"/>`,
    ans: `
      <circle class="mechanism-mark__shell" r="65"/><path class="mechanism-mark__line" d="M-43-25H5L23 0 5 25H-43Z"/><circle class="mechanism-mark__dot" cx="-31" cy="-13" r="4"/>
      <path class="mechanism-mark__thin" d="M-20-13H2M-31 0H7M-31 13H2"/><path class="mechanism-mark__line" d="M23 0H43"/><path class="mechanism-mark__thin" d="M33-8L43 0 33 8"/><circle class="mechanism-mark__dot" cx="50" cy="0" r="6"/>`,
  };

  return `<svg class="mechanism-mark mechanism-mark--${id} ${className}" viewBox="-90 -90 180 180" aria-hidden="true">${artwork[id]}</svg>`;
};

type EndpointMechanism = (typeof endpointDiscoverySnapshot.mechanisms)[number];
type DiscoveryPathNode = {
  id: string;
  kind: string;
  label: string;
  role: string;
  outcome: string;
  artifact?: string;
};

const escapeMarkup = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character] ?? character));

const discoveryNode = (node: DiscoveryPathNode, modifier = '') => {
  const artifact = 'artifact' in node ? node.artifact : '';
  const role = node.role === 'required' ? '' : ` · ${node.role}`;
  const outcome = node.outcome === 'pass' ? 'Observed' : node.outcome === 'absent' ? `Not published${role}` : 'Could not check';
  return `<div class="discovery-path-node discovery-path-node--${node.kind} discovery-path-node--${node.outcome} ${modifier}">
    <span class="discovery-path-node__status" aria-hidden="true"></span>
    <div><strong>${escapeMarkup(node.label)}</strong><small>${escapeMarkup(outcome)}</small>${artifact ? `<code>${escapeMarkup(artifact)}</code>` : ''}</div>
  </div>`;
};

const endpointClaimNode = (claim: EndpointMechanism['claims'][number]) => `
  <div class="discovery-endpoint-claim"><span>${escapeMarkup(claim.protocol)}</span><code>${escapeMarkup(claim.endpoint)}</code></div>`;

const ardDiscoveryMark = (semantic: ArdNodeSemantic) => {
  const artwork: Partial<Record<ArdNodeSemantic, { viewBox: string; content: string }>> = {
    'catalog-pointer': {
      viewBox: '-90 -90 180 180',
      content: `
        <circle class="ard-stage-mark__shell" cx="37" r="47"/><circle class="ard-stage-mark__thin" cx="37" r="27"/><circle class="ard-stage-mark__fill" cx="37" r="5"/>
        <path class="ard-stage-mark__dash" d="M-73-46 37 0-73 46-50 0Z"/><path class="ard-stage-mark__thin" d="M-57-29-50 0-57 29"/>
        <text class="ard-stage-mark__word" x="-23" y="6">ARD</text>`,
    },
    'catalog-hint': {
      viewBox: '-90 -90 270 180',
      content: `
        <path class="ard-stage-mark__shell" d="M-38-12c0-34 16-55 38-55s38 21 38 55c0 18-7 31-19 42-7 6-10 12-10 20H-9c0-8-3-14-10-20-12-11-19-24-19-42Z"/>
        <path class="ard-stage-mark__line" d="M-13 61h26M-9 72H9M-4 82h8M0-76v-11M-54-56l-9-9M54-56l9-9M-61-14h-13M61-14h13M-51 37l-11 8M51 37l11 8"/>
        <path class="ard-stage-mark__thin" d="M-15 50h30"/><circle class="ard-stage-mark__fill" cy="-76" r="3.5"/>
        <circle class="ard-stage-mark__fill" cx="-61" cy="-14" r="3.5"/><circle class="ard-stage-mark__fill" cx="61" cy="-14" r="3.5"/>
        <text class="ard-stage-mark__label" x="82" y="8">DNS Hint</text>`,
    },
    catalog: {
      viewBox: '-90 -90 180 180',
      content: `
        <path class="ard-stage-mark__thin" d="M-48-62v-14h27v14M-13-62v-20h27v20M22-62v-14h27v14"/>
        <rect class="ard-stage-mark__shell" x="-62" y="-62" width="124" height="130" rx="11"/><path class="ard-stage-mark__thin" d="M-62-29H62"/>
        <text class="ard-stage-mark__word" y="-40">ARD</text>
        <rect class="ard-stage-mark__line" x="-45" y="-18" width="90" height="20" rx="4"/><rect class="ard-stage-mark__line" x="-45" y="10" width="90" height="20" rx="4"/><rect class="ard-stage-mark__line" x="-45" y="38" width="90" height="20" rx="4"/>
        <path class="ard-stage-mark__thin" d="M-29-8H0M-29 20H0M-29 48H0"/><circle class="ard-stage-mark__fill" cx="28" cy="-8" r="3.5"/><circle class="ard-stage-mark__fill" cx="28" cy="20" r="3.5"/><circle class="ard-stage-mark__fill" cx="28" cy="48" r="3.5"/>`,
    },
  };
  const mark = artwork[semantic];
  return mark
    ? `<svg class="ard-stage-mark ard-stage-mark--${semantic}" viewBox="${mark.viewBox}" aria-hidden="true">${mark.content}</svg>`
    : '';
};

const ardDiscoveryNode = (node: DiscoveryPathNode & { semantic?: string }, modifier = '') => {
  const semantic = node.semantic as ArdNodeSemantic;
  const outcome = node.outcome === 'pass' ? 'Observed' : node.outcome === 'absent' ? 'Not published' : 'Could not check';
  const status = node.outcome === 'pass' ? '✓' : node.outcome === 'absent' ? '×' : '!';
  return `<div class="ard-discovery-symbol ard-discovery-symbol--${semantic} discovery-path-node--${node.outcome} ${modifier}"
    role="img" aria-label="${escapeMarkup(node.label)}: ${outcome}">
    ${ardDiscoveryMark(semantic)}<span aria-hidden="true">${status}</span>
  </div>`;
};

const endpointPathPanel = (mechanism: EndpointMechanism) => {
  const [startNode, ...remainingNodes] = mechanism.path.nodes;

  if (mechanism.id === 'ard') {
    const projection = projectArdDiscoveryPath(mechanism.path);
    const catalogs = projection.catalogs;
    const documentNodes = catalogs.flatMap(({ documents }) => documents);
    return `<article class="discovery-path-panel discovery-path-panel--ard" data-discovery-path-panel="ard">
      <div class="discovery-path-map">
        ${discoveryNode(projection.domain)}<i class="discovery-path-connector"></i>
        <div class="ard-path-route-layout">
          <div class="ard-path-primary-route">
            <div class="ard-path-primary-locators${projection.primaryRoutes.length === 1 ? ' ard-path-primary-locators--single' : ''}">
              ${projection.primaryRoutes.map(({ locator, state }) => ardDiscoveryNode(locator, `discovery-path-node--route-${state}`)).join('')}
            </div>
            ${catalogs.length ? `<i class="discovery-path-connector"></i>
              <div class="discovery-path-catalogs${catalogs.length === 1 ? ' discovery-path-catalogs--single' : ''}">
                ${catalogs.map(({ catalog }) => ardDiscoveryNode(catalog, projection.hasConflict ? 'discovery-path-node--conflict' : '')).join('')}
              </div>` : ''}
          </div>
        </div>
        ${documentNodes.length ? '<i class="discovery-path-connector"></i>' : ''}
        <div class="discovery-path-branches">${documentNodes.map((node) => {
          const claim = mechanism.claims.find(({ sourceNodeId }) => sourceNodeId === node.id);
          return `<div class="discovery-path-branch">${discoveryNode(node)}${claim ? endpointClaimNode(claim) : ''}</div>`;
        }).join('')}</div>
      </div>
    </article>`;
  }

  return `<article class="discovery-path-panel discovery-path-panel--${mechanism.id}" data-discovery-path-panel="${mechanism.id}">
    <div class="discovery-path-map discovery-path-map--dns">
      ${discoveryNode(startNode)}<i class="discovery-path-connector"></i>
      <div class="discovery-path-fork">${remainingNodes.map((node) => discoveryNode(node)).join('')}</div>
      <i class="discovery-path-connector"></i>${mechanism.claims.map(endpointClaimNode).join('')}
    </div>
  </article>`;
};

const endpointDiscoveryPathStage = () => `
  <div class="endpoint-path-explorer">
    <nav class="endpoint-path-tabs" data-endpoint-path-tabs aria-label="Explore discovery paths" hidden>
      <div>
        ${endpointDiscoverySnapshot.mechanisms.map(({ id }) => `
          <button type="button" data-endpoint-path-select="${id}" aria-pressed="false" hidden>
            ${discoveryMechanismMark(id)}<strong>${discoveryMechanismName[id]}</strong>
          </button>`).join('')}
      </div>
    </nav>
    <section class="endpoint-path-stage" data-endpoint-path-stage hidden aria-live="polite">
      <div class="endpoint-path-stage__waiting">
        <div>${endpointDiscoverySnapshot.mechanisms.map(({ id }) => discoveryMechanismMark(id)).join('')}</div>
        <strong>Mapping three discovery mechanisms</strong>
        <span>The first path will open after the discovery beams stabilize.</span>
      </div>
      ${endpointDiscoverySnapshot.mechanisms.map(endpointPathPanel).join('')}
    </section>
  </div>`;

const consolidatedResultRows = () => consolidatedSearchRecords.map((record, index) => `
  <div
    class="consolidated-result consolidated-result--${record.registryId === 'agentcensus' ? 'census' : 'a2a'}"
    style="animation-delay: ${(CONSOLIDATION_FIRST_ROW_DELAY + index * CONSOLIDATION_ROW_STAGGER) / 1000}s"
  >
    <b>${String(index + 1).padStart(2, '0')}</b>
    <strong>${record.agentName}</strong>
    <span>${record.domain}</span>
    <em>${record.registryId === 'agentcensus' ? 'AgentCensus' : 'A2A Registry'}</em>
    <i>${record.relevanceScore}%</i>
  </div>
`).join('');

app.innerHTML = `
  <section
    class="world-intro"
    data-world-intro
    aria-label="Agentopia introduction. Agents come online, publish information through AgentCensus, A2A Registry, and MCP Registry, then Mochi connects with other agents on your behalf."
  >
    <button class="world-intro__skip" type="button" data-intro-skip>Skip intro</button>

    <div class="world-intro__logo" aria-hidden="true" data-text="AGENTOPIA">AGENTOPIA</div>

    <div class="intro-world" aria-hidden="true">
      <svg class="intro-map" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="intro-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#31523a" stroke-width="1" opacity=".32" />
          </pattern>
          <symbol id="intro-mochi" viewBox="0 0 276 270">${mochiArtwork()}</symbol>
          ${([1, 2, 3, 4, 5, 6, 7] as ServiceVariant[])
            .map((variant) => `<symbol id="intro-service-${variant}" viewBox="0 0 276 270">${serviceAgentArtwork(variant)}</symbol>`)
            .join('')}
          <filter id="intro-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="1200" height="680" fill="#06100a" />
        <rect width="1200" height="680" fill="url(#intro-grid)" />
        <circle cx="220" cy="520" r="280" fill="#45ff8a" opacity=".035" />
        <circle cx="980" cy="120" r="320" fill="#aa8cff" opacity=".035" />

        <g class="intro-routes">
          <path id="route-census" d="M105 540C125 430 155 355 230 300" />
          <path id="route-a2a" d="M475 565C505 430 545 325 600 250" />
          <path id="route-mcp" d="M1090 535C1062 435 1025 360 970 310" />
          <path class="intro-route-extra intro-route-extra--census" d="M326 558C310 450 275 360 235 305" />
          <path class="intro-route-extra intro-route-extra--census" d="M167 590C175 470 200 380 230 305" />
          <path class="intro-route-extra intro-route-extra--a2a" d="M544 530C560 430 575 330 600 255" />
          <path class="intro-route-extra intro-route-extra--a2a" d="M723 560C695 450 650 340 605 255" />
          <path class="intro-route-extra intro-route-extra--mcp" d="M845 565C890 470 935 390 968 315" />
          <path class="intro-route-extra intro-route-extra--mcp" d="M978 575C985 480 982 390 972 315" />
        </g>

        <g class="intro-packets">
          <circle class="intro-packet intro-packet--green" r="5"><animateMotion begin="2.1s" dur="2s" fill="freeze"><mpath href="#route-census" /></animateMotion></circle>
          <circle class="intro-packet intro-packet--violet" r="5"><animateMotion begin="4.1s" dur="2s" fill="freeze"><mpath href="#route-a2a" /></animateMotion></circle>
          <circle class="intro-packet intro-packet--orange" r="5"><animateMotion begin="6.1s" dur="2s" fill="freeze"><mpath href="#route-mcp" /></animateMotion></circle>
        </g>

        <g class="intro-agents intro-agents--early">
          <g class="intro-agent intro-agent--orange" transform="translate(72 505)"><use href="#intro-service-1" width="76" height="76" /></g>
          <g class="intro-agent intro-agent--violet" transform="translate(435 525)"><use href="#intro-service-2" width="76" height="76" /></g>
          <g class="intro-agent intro-agent--lime" transform="translate(1045 500)"><use href="#intro-service-3" width="76" height="76" /></g>
          <g class="intro-agent intro-agent--cyan" transform="translate(810 525)"><use href="#intro-service-4" width="66" height="66" /></g>
          <g class="intro-agent intro-agent--pink" transform="translate(290 520)"><use href="#intro-service-5" width="64" height="64" /></g>
          <g class="intro-agent intro-agent--blue" transform="translate(140 555)"><use href="#intro-service-6" width="54" height="54" /></g>
          <g class="intro-agent intro-agent--gold" transform="translate(510 495)"><use href="#intro-service-7" width="60" height="60" /></g>
          <g class="intro-agent intro-agent--orange" transform="translate(690 525)"><use href="#intro-service-1" width="58" height="58" /></g>
          <g class="intro-agent intro-agent--violet" transform="translate(945 540)"><use href="#intro-service-2" width="58" height="58" /></g>
        </g>

        <g class="intro-outposts">
          <g class="intro-outpost intro-outpost--census" transform="translate(230 260)">
            <circle class="intro-outpost__halo" r="73" />
            <circle class="intro-outpost__shell" r="48" />
            <path class="intro-outpost__icon" d="M-24 7A25 25 0 0124 7M-15 7a16 16 0 0130 0M0-28V23M-12 26h24" />
            <circle class="intro-outpost__signal" cy="-4" r="4" />
            <text class="intro-outpost__name" y="88">AGENTCENSUS</text>
            <text class="intro-outpost__type" y="106">OBSERVATION POINT</text>
          </g>
          <g class="intro-outpost intro-outpost--a2a" transform="translate(600 210)">
            <circle class="intro-outpost__halo" r="73" />
            <rect class="intro-outpost__shell" x="-48" y="-48" width="96" height="96" rx="18" />
            <path class="intro-outpost__icon" d="M-24 24V-22H24V24M-10 24V4H10V24M-13-8h26" />
            <text class="intro-outpost__name" y="88">A2A REGISTRY</text>
            <text class="intro-outpost__type" y="106">AGENT CARD DIRECTORY</text>
          </g>
          <g class="intro-outpost intro-outpost--mcp" transform="translate(970 270)">
            <circle class="intro-outpost__halo" r="73" />
            <path class="intro-outpost__shell" d="M0-52L45-26V26L0 52-45 26V-26Z" />
            <path class="intro-outpost__icon" d="M-20 0H20M-10-15V15M10-15V15M-26-20V20M26-20V20" />
            <text class="intro-outpost__name" y="88">MCP REGISTRY</text>
            <text class="intro-outpost__type" y="106">SERVER DIRECTORY</text>
          </g>
        </g>

        <g class="intro-field-tags">
          <text class="intro-field-tag--identity" x="150" y="405">IDENTITY</text>
          <text class="intro-field-tag--endpoint" x="517" y="405">ENDPOINT</text>
          <text class="intro-field-tag--capabilities" x="972" y="423">CAPABILITIES</text>
          <text class="intro-field-tag--missing" x="730" y="310">PERMISSIONS —</text>
        </g>

        <g class="intro-mochi-stage">
          <path class="intro-possible-route intro-possible-route--four" d="M600 370C550 315 520 290 460 270" />
          <path class="intro-possible-route intro-possible-route--five" d="M600 370C650 315 690 290 740 265" />
          <path class="intro-possible-route intro-possible-route--one" d="M600 370C485 340 390 338 288 385" />
          <path class="intro-possible-route intro-possible-route--two" d="M600 370C715 330 820 340 920 395" />
          <path class="intro-possible-route intro-possible-route--three" d="M600 370C705 438 770 485 835 530" />

          <g class="intro-you" transform="translate(600 550)">
            <circle r="31" />
            <text y="4">YOU</text>
          </g>
          <path class="intro-you-link" d="M600 518V462" />
          <g class="intro-mochi" transform="translate(545 320)">
            <use href="#intro-mochi" width="110" height="110" />
            <text x="55" y="129">MOCHI</text>
            <text class="intro-mochi__role" x="55" y="148">YOUR PERSONAL AGENT</text>
          </g>

          <g class="intro-peer intro-peer--cyan" transform="translate(420 205)"><use href="#intro-service-4" width="80" height="80" /><text x="40" y="97">RESEARCH</text></g>
          <g class="intro-peer intro-peer--pink" transform="translate(700 200)"><use href="#intro-service-5" width="80" height="80" /><text x="40" y="97">SECURITY</text></g>
          <g class="intro-peer intro-peer--orange" transform="translate(240 345)"><use href="#intro-service-1" width="80" height="80" /><text x="40" y="97">COMMERCE</text></g>
          <g class="intro-peer intro-peer--violet" transform="translate(880 350)"><use href="#intro-service-2" width="80" height="80" /><text x="40" y="97">SCHEDULING</text></g>
          <g class="intro-peer intro-peer--lime" transform="translate(795 500)"><use href="#intro-service-3" width="70" height="70" /><text x="35" y="87">TRAVEL</text></g>
        </g>
      </svg>
    </div>

    <div class="world-intro__captions" aria-hidden="true">
      <p class="intro-caption intro-caption--online">Agents are coming online…</p>
      <p class="intro-caption intro-caption--pieces">Each network sees a different piece.</p>
      <p class="intro-caption intro-caption--mochi">Meet Mochi — your personal agent.</p>
      <p class="intro-caption intro-caption--connect">Mochi can discover and work with agents across the network.</p>
    </div>
  </section>

  <div class="app-shell is-intro-pending" data-app-shell inert aria-hidden="true">
    <main class="studio" aria-label="Agentopia Studio preview">
      <section class="world-panel" aria-label="Agentopia world">
        <div class="panel-heading">
          <h2 data-text="AGENTOPIA">AGENTOPIA</h2>
          <span class="world-state"><i></i> ONLINE</span>
        </div>

        <div class="world-frame">
          <div class="world-scene" role="group" aria-label="Mochi searching AgentCensus and A2A Registry for service agents">
            <div class="world-coordinates" aria-hidden="true"><span>01</span><span>02</span><span>03</span><span>04</span></div>
            <svg class="world-network" viewBox="0 0 600 620" preserveAspectRatio="none" aria-hidden="true">
              <path id="user-flow-path" class="network-line network-line--user" data-user-link d="M76 328 C86 328 93 306 103 306" />
              <polygon class="network-arrow network-arrow--user" data-user-arrow points="-7,-4 7,0 -7,4" hidden>
                <animateMotion dur="1.7s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#user-flow-path" />
                </animateMotion>
              </polygon>
              <path id="census-flow-path" class="network-line network-line--registry" data-registry-link="agentcensus" d="M250 330 C292 310 318 268 356 230" />
              <polygon class="network-arrow network-arrow--registry" data-registry-packet="agentcensus" points="-7,-4 7,0 -7,4" hidden>
                <animateMotion dur="1.25s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#census-flow-path" />
                </animateMotion>
              </polygon>
              <g class="network-result-batch network-result-batch--census" data-registry-result-batch="agentcensus" hidden>
                <circle r="13" /><text y="4">5</text>
                <animateMotion data-registry-result-animation="agentcensus" begin="indefinite" dur="1.35s" repeatCount="1" fill="freeze" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                  <mpath href="#census-flow-path" />
                </animateMotion>
              </g>
              <path id="a2a-flow-path" class="network-line network-line--registry network-line--a2a" data-registry-link="a2a-registry" d="M250 350 C292 370 318 402 356 420" />
              <polygon class="network-arrow network-arrow--registry network-arrow--a2a" data-registry-packet="a2a-registry" points="-7,-4 7,0 -7,4" hidden>
                <animateMotion dur="1.35s" repeatCount="indefinite" rotate="auto"><mpath href="#a2a-flow-path" /></animateMotion>
              </polygon>
              <g class="network-result-batch network-result-batch--a2a" data-registry-result-batch="a2a-registry" hidden>
                <circle r="13" /><text y="4">3</text>
                <animateMotion data-registry-result-animation="a2a-registry" begin="indefinite" dur="1.35s" repeatCount="1" fill="freeze" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
                  <mpath href="#a2a-flow-path" />
                </animateMotion>
              </g>
              <path id="result-flow-path" class="network-line network-line--result" data-result-link d="M390 230 C447 230 478 275 526 318" />
              <polygon class="network-arrow network-arrow--result" data-result-packet points="-7,-4 7,0 -7,4" hidden>
                <animateMotion dur="1.45s" repeatCount="indefinite" rotate="auto"><mpath href="#result-flow-path" /></animateMotion>
              </polygon>
            </svg>

            <div class="world-zone world-zone--local"></div>
            <div class="world-zone world-zone--service"></div>

            <div class="service-agent-field" aria-hidden="true">
              ${serviceScout(1, 'orange')}
              ${serviceScout(2, 'violet')}
              ${serviceScout(3, 'lime')}
              ${serviceScout(4, 'cyan')}
              ${serviceScout(5, 'pink')}
              ${serviceScout(6, 'blue')}
              ${serviceScout(7, 'gold')}
            </div>

            <div class="world-onboarding" data-world-onboarding>
              <strong>Search for service agents</strong>
            </div>

            <div class="world-phase" data-world-phase hidden aria-live="polite">
              <span data-world-step>STEP 1</span>
              <strong data-world-phase-title>Request Received</strong>
            </div>

            <div class="registry-node registry-node--census" data-registry-node="agentcensus" data-status="waiting">
              <svg viewBox="-70 -70 140 140" aria-hidden="true">
                <circle class="registry-node__halo" r="57" />
                <circle class="registry-node__shell" r="38" />
                <path class="registry-node__icon" d="M-20 6A21 21 0 0120 6M-13 6a13 13 0 0126 0M0-23V19M-10 22h20" />
                <circle class="registry-node__signal" cy="-3" r="3.5" />
              </svg>
              <strong>AgentCensus</strong>
              <small data-registry-world-status="agentcensus">Waiting</small>
            </div>
            <div class="registry-node registry-node--a2a" data-registry-node="a2a-registry" data-status="waiting">
              <svg viewBox="-70 -70 140 140" aria-hidden="true">
                <circle class="registry-node__halo" r="57" />
                <rect class="registry-node__shell" x="-38" y="-38" width="76" height="76" rx="14" />
                <path class="registry-node__icon" d="M-19 20V-18H19V20M-8 20V4H8V20M-10-7h20" />
              </svg>
              <strong>A2A Registry</strong>
              <small data-registry-world-status="a2a-registry">Waiting</small>
            </div>

            <div class="intent-chip" data-intent-chip hidden>
              <span>Intent</span><strong data-world-intent>Meeting scheduling</strong>
            </div>

            <div class="user-node" aria-label="You, task requester">
              <span class="user-node__pulse"></span>
              <span class="user-node__core">YOU</span>
            </div>

            <div class="endpoint-discovery-visual" data-endpoint-discovery-visual aria-hidden="true">
              <svg class="endpoint-discovery-visual__beams" viewBox="0 0 600 620" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="inspection-beam" x1="0" x2="1">
                    <stop offset="0" stop-color="#eefcff" stop-opacity=".88"/>
                    <stop offset="1" stop-color="#ffd79a" stop-opacity=".18"/>
                  </linearGradient>
                </defs>
                <path class="inspection-beam__cone" d="M214 301L305 286L305 346L214 331Z"/>
                <g class="inspection-magnifier">
                  <path d="M137 378L175 335"/>
                  <circle cx="190" cy="316" r="29"/>
                  <circle class="inspection-magnifier__glint" cx="182" cy="307" r="14"/>
                </g>
                <g class="mechanism-beams">
                  <circle class="mechanism-beam-origin mechanism-beam-origin--ard" data-mechanism-beam-origin="ard" cx="354" cy="282" r="4"/>
                  <circle class="mechanism-beam-origin mechanism-beam-origin--dns-aid" data-mechanism-beam-origin="dns-aid" cx="354" cy="316" r="4"/>
                  <circle class="mechanism-beam-origin mechanism-beam-origin--ans" data-mechanism-beam-origin="ans" cx="354" cy="340" r="4"/>
                  <path class="mechanism-beam mechanism-beam--ard" data-mechanism-beam="ard" d="M354 282C394 266 430 230 466 207"/>
                  <path class="mechanism-beam mechanism-beam--dns-aid" data-mechanism-beam="dns-aid" d="M354 316C398 316 428 316 466 316"/>
                  <path class="mechanism-beam mechanism-beam--ans" data-mechanism-beam="ans" d="M354 340C394 358 430 390 466 409"/>
                </g>
              </svg>
              <span class="mechanism-orbit mechanism-orbit--ard">${discoveryMechanismMark('ard')}<b>ARD</b></span>
              <span class="mechanism-orbit mechanism-orbit--dns-aid">${discoveryMechanismMark('dns-aid')}<b>DNS-AID</b></span>
              <span class="mechanism-orbit mechanism-orbit--ans">${discoveryMechanismMark('ans')}<b>ANS</b></span>
            </div>

            <div class="discovery-domain-target" data-discovery-domain-target aria-label="Selected domain bookings.darknetian.com">
              <span class="discovery-domain-target__beam-frame" aria-hidden="true"></span>
              <small>SELECTED DOMAIN</small>
              <strong>bookings.<br/>darknetian.com</strong>
            </div>

            ${agentButton(agents['personal-assistant'], 'assistant')}
            ${agentButton(agents['bookings-service'], 'bookings')}

          </div>
        </div>

        <form class="chat-composer" data-chat-form>
          <div class="composer-agent">${avatar(agents['personal-assistant'])}</div>
          <label class="chat-composer__field" data-chat-field>
            <input
              name="message"
              type="text"
              maxlength="240"
              autocomplete="off"
              value="Search for "
              aria-label="Message Mochi"
              data-chat-input
            />
          </label>
          <div class="chat-composer__paused" data-chat-paused role="status" aria-live="polite" hidden>
            <span class="chat-composer__pause-icon" aria-hidden="true"><i></i><i></i></span>
            <strong>Waiting for Mochi's Response</strong>
          </div>
          <button type="submit" data-chat-send disabled>
            <span>Chat</span><i aria-hidden="true">↗</i>
          </button>
        </form>
      </section>

      <aside class="inspector-panel" aria-labelledby="skynet-title">
        <div class="inspector-heading">
          <div>
            <h2 id="skynet-title" data-text="SKYNET">SKYNET</h2>
          </div>
        </div>

        <div class="empty-inspector" data-empty-inspector>
          <div class="empty-trace" aria-hidden="true">
            <span class="empty-trace__node">01</span>
            <i></i>
            <span class="empty-trace__node">02</span>
            <i></i>
            <span class="empty-trace__node">03</span>
          </div>
          <h3>Send Mochi a task.</h3>
          <div class="empty-inspector__promise">
            <span>What happened</span>
            <span>Why it happened</span>
            <span>What proves it</span>
          </div>
        </div>

        <div class="discovery-inspector" data-agent-inspector hidden>
          <section
            class="request-flight"
            data-intake-evidence
            hidden
            role="img"
            aria-label="Your request is traveling to Mochi"
          >
            <svg class="request-flight__journey" viewBox="0 0 600 300" aria-hidden="true">
              <path
                id="request-flight-path"
                class="request-flight__route"
                d="M108 160 C175 66 248 70 290 137 C331 203 391 184 379 127 C367 72 304 79 290 128 C272 191 385 226 505 150"
              />
              <g class="request-flight__moving-plane">
                <path class="request-flight__plane-body" d="M-21-14 22 0-21 14-10 0-21-14Z" />
                <path class="request-flight__plane-fold" d="M-10 0 22 0" />
                <animateMotion data-request-flight-animation begin="indefinite" dur="${INTENT_DERIVATION_DELAY / 1000}s" repeatCount="1" fill="freeze" rotate="auto">
                  <mpath href="#request-flight-path" />
                </animateMotion>
              </g>
              <g class="request-flight__static-plane" transform="translate(290 128) rotate(-88)">
                <path class="request-flight__plane-body" d="M-21-14 22 0-21 14-10 0-21-14Z" />
                <path class="request-flight__plane-fold" d="M-10 0 22 0" />
              </g>
            </svg>
            <div class="request-flight__user" aria-hidden="true">
              <i></i><span>YOU</span>
            </div>
            <div class="request-flight__mochi" aria-hidden="true">
              <svg viewBox="0 0 276 270">${mochiArtwork()}</svg>
              <strong>Mochi</strong>
            </div>
            <span class="request-flight__idea" aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <path d="M21 39c-5-4-8-10-8-17C13 11 21 3 32 3s19 8 19 19c0 7-3 13-8 17-3 2-4 5-4 8H25c0-3-1-6-4-8Z" />
                <path d="M25 52h14M28 59h8M7 22H1M63 22h-6M11 8 6 3M53 8l5-5" />
              </svg>
            </span>
          </section>

          <div data-discovery-analysis hidden>
            <section class="sync-phase" aria-live="polite">
              <span data-skynet-step>STEP 2</span>
              <div><h3 data-activity-title>Searching Agent Registries</h3><p data-activity-detail></p></div>
            </section>

            <div class="search-evidence-grid">
              <section class="event-history timeline-card" data-event-history-section hidden>
                <div class="event-history__heading">
                  <div><span>Timeline</span><small data-event-count>Step 2</small></div>
                  <button type="button" data-return-live hidden>Return to live</button>
                </div>
                <div class="event-history__list" data-event-history-list></div>
              </section>

              <section class="registry-ledger">
                <div class="section-heading"><p>Registry activity</p><span>2 sources</span></div>
                <article class="registry-row" data-skynet-registry="agentcensus" data-status="waiting">
                  <svg class="registry-row__mark" viewBox="-55 -55 110 110" aria-hidden="true">
                    <circle class="registry-row__halo" r="45" /><circle class="registry-row__shell" r="30" />
                    <path class="registry-row__icon" d="M-16 5A17 17 0 0116 5M-10 5a10 10 0 0120 0M0-18V15M-8 18h16" /><circle class="registry-row__signal" cy="-2" r="3" />
                  </svg>
                  <div><strong>AgentCensus</strong><small>Agent observation network</small></div><span data-registry-skynet-status="agentcensus">Waiting</span>
                </article>
                <article class="registry-row" data-skynet-registry="a2a-registry" data-status="waiting">
                  <svg class="registry-row__mark" viewBox="-55 -55 110 110" aria-hidden="true">
                    <circle class="registry-row__halo" r="45" /><rect class="registry-row__shell" x="-30" y="-30" width="60" height="60" rx="11" />
                    <path class="registry-row__icon" d="M-15 16V-14H15V16M-6 16V3H6V16M-8-6h16" />
                  </svg>
                  <div><strong>A2A Registry</strong><small>Agent card directory</small></div><span data-registry-skynet-status="a2a-registry">Waiting</span>
                </article>
              </section>
            </div>

            <section class="result-board">
              <div class="section-heading"><p>Behind the Scene</p></div>
              ${endpointDiscoveryPathStage()}
              <div class="registry-printouts" data-search-printouts hidden>
                ${registrySearchMock.registries.map(registryPrintout).join('')}
              </div>
              <div class="consolidation-board" data-consolidation-board hidden>
                <div class="consolidation-board__flow" aria-hidden="true">
                  <span class="consolidation-board__source consolidation-board__source--census">5</span>
                  <i>→</i>
                  <div class="consolidation-reader">
                    <svg viewBox="0 0 276 270">
                      <defs>
                        <mask id="consolidation-mochi-paper-mask">
                          <rect width="276" height="270" fill="white" />
                          <path d="M78 177h107l19 19v58H78z" fill="black" />
                        </mask>
                      </defs>
                      <g mask="url(#consolidation-mochi-paper-mask)">${mochiArtwork()}</g>
                      <g class="consolidation-reader__paper">
                        <path class="consolidation-reader__arm" d="M57 219q8-16 21-15M211 219q-4-10-7-12" />
                        <path class="consolidation-reader__sheet" d="M78 177h107l19 19v58H78zM185 177v19h19" />
                        <path class="consolidation-reader__line consolidation-reader__line--1" d="M97 200h61" />
                        <path class="consolidation-reader__line consolidation-reader__line--2" d="M97 217h85" />
                        <path class="consolidation-reader__line consolidation-reader__line--3" d="M97 234h72" />
                        <path class="consolidation-reader__line consolidation-reader__line--4" d="M97 247h50" />
                      </g>
                    </svg>
                  </div>
                  <i>←</i>
                  <span class="consolidation-board__source consolidation-board__source--a2a">3</span>
                </div>
                <div class="consolidation-board__columns"><span>Rank</span><span>Agent</span><span>Domain</span><span>Source</span><span>Relevance</span></div>
                <div class="consolidation-board__results">${consolidatedResultRows()}</div>
              </div>
              <div class="behind-scene-current" data-behind-current>
                <span>Current operation</span>
                <strong data-behind-title>Interpreting request</strong>
                <p data-behind-detail>Mochi is deriving a search intent.</p>
              </div>
              <div class="candidate-results" data-candidate-results></div>
            </section>
          </div>
        </div>
      </aside>
    </main>
  </div>
`;

const worldIntro = document.querySelector<HTMLElement>('[data-world-intro]');
const appShell = document.querySelector<HTMLElement>('[data-app-shell]');
const introSkip = document.querySelector<HTMLButtonElement>('[data-intro-skip]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let introFinished = false;

const finishIntro = () => {
  if (introFinished) return;
  introFinished = true;
  worldIntro?.classList.add('is-finished');
  appShell?.classList.remove('is-intro-pending');
  appShell?.removeAttribute('inert');
  appShell?.removeAttribute('aria-hidden');
  window.setTimeout(() => worldIntro?.remove(), prefersReducedMotion ? 20 : 420);
  window.setTimeout(() => {
    chatInput?.focus();
    const end = chatInput?.value.length ?? 0;
    chatInput?.setSelectionRange(end, end);
  }, prefersReducedMotion ? 30 : 450);
};

const introTimer = window.setTimeout(finishIntro, prefersReducedMotion ? 80 : 17300);
introSkip?.addEventListener('click', () => {
  window.clearTimeout(introTimer);
  finishIntro();
});
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || introFinished) return;
  window.clearTimeout(introTimer);
  finishIntro();
});

const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-agent-id]'));
buttons.forEach((button) => {
  button.tabIndex = -1;
  button.setAttribute('aria-disabled', 'true');
});
const emptyInspector = document.querySelector<HTMLElement>('[data-empty-inspector]');
const agentInspector = document.querySelector<HTMLElement>('[data-agent-inspector]');
const chatForm = document.querySelector<HTMLFormElement>('[data-chat-form]');
const chatInput = document.querySelector<HTMLInputElement>('[data-chat-input]');
const chatSend = document.querySelector<HTMLButtonElement>('[data-chat-send]');
const chatField = document.querySelector<HTMLElement>('[data-chat-field]');
const chatPaused = document.querySelector<HTMLElement>('[data-chat-paused]');
const worldScene = document.querySelector<HTMLElement>('.world-scene');
const mochiBubble = document.querySelector<HTMLElement>('[data-mochi-bubble]');
const userLink = document.querySelector<SVGPathElement>('[data-user-link]');
const userArrow = document.querySelector<SVGPolygonElement>('[data-user-arrow]');
const eventHistorySection = document.querySelector<HTMLElement>('[data-event-history-section]');
const eventHistoryList = document.querySelector<HTMLElement>('[data-event-history-list]');
const eventCount = document.querySelector<HTMLElement>('[data-event-count]');
const returnLiveButton = document.querySelector<HTMLButtonElement>('[data-return-live]');
const candidateResults = document.querySelector<HTMLElement>('[data-candidate-results]');
const intakeEvidence = document.querySelector<HTMLElement>('[data-intake-evidence]');
const discoveryAnalysis = document.querySelector<HTMLElement>('[data-discovery-analysis]');
const requestFlightAnimation = document.querySelector<SVGAnimationElement>('[data-request-flight-animation]');
const searchPrintouts = document.querySelector<HTMLElement>('[data-search-printouts]');
const consolidationBoard = document.querySelector<HTMLElement>('[data-consolidation-board]');
const behindCurrent = document.querySelector<HTMLElement>('[data-behind-current]');
const endpointPathStage = document.querySelector<HTMLElement>('[data-endpoint-path-stage]');
const endpointPathTabs = document.querySelector<HTMLElement>('[data-endpoint-path-tabs]');
const endpointPathButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-endpoint-path-select]'));
const registryResultAnimations = new Map<RegistryId, SVGAnimationElement | null>([
  ['agentcensus', document.querySelector<SVGAnimationElement>('[data-registry-result-animation="agentcensus"]')],
  ['a2a-registry', document.querySelector<SVGAnimationElement>('[data-registry-result-animation="a2a-registry"]')],
]);

const activityEvents: ActivityEvent[] = [];
let runId = 'run-c3-1';
let runSequence = 1;
let eventSequence = 0;
let eventCursor: number | null = null;
let scheduledTimers: number[] = [];
let timelineReplayTimers: number[] = [];
let renderedStep = 0;
let endpointBeamAlignmentTimer: number | null = null;
let userFlowAlignmentTimer: number | null = null;
let endpointInspectionTimers: number[] = [];

const bookingCandidate: Candidate = {
  id: 'bookings-service',
  name: 'Bookings',
  domain: 'bookings.darknetian.com',
  capability: 'Meeting scheduling',
  sources: ['agentcensus'],
  matchReason: 'Its reported scheduling capability directly matches the requested intent.',
};

const fabioTravelCandidate: Candidate = {
  id: 'fabio-travel-service',
  name: 'Agent Bench Travel Merchant',
  domain: 'travel.agenthaven.dev',
  capability: 'Booking workflow with callable A2A and MCP interfaces',
  sources: ['agentcensus'],
  matchReason: 'The next-highest reported match provides a comparable booking flow and DNS-AID path.',
};

const mockCandidatesFor = (registryId: RegistryId): Candidate[] => {
  const registry = registrySearchMock.registries.find(({ id }) => id === registryId);
  if (!registry) return [];
  return registry.records.map((record, index) => {
    if (record.domain === bookingCandidate.domain) return bookingCandidate;
    if (record.domain === fabioTravelCandidate.domain) return fabioTravelCandidate;
    return {
      id: `${registryId}-mock-${index + 1}`,
      name: record.agentName,
      domain: record.domain,
      capability: 'Meeting scheduling (mock search record)',
      sources: [registryId],
      matchReason: `Temporary mock relevance: ${record.relevanceScore}%.`,
    };
  });
};

const agentCensusSearchCandidates = mockCandidatesFor('agentcensus');
const a2aSearchCandidates = mockCandidatesFor('a2a-registry');

const alignUserFlow = () => {
  if (!worldScene || !userLink) return;
  const userCore = document.querySelector<HTMLElement>('.user-node__core');
  const mochiFrame = document.querySelector<HTMLElement>('[data-agent-id="personal-assistant"] .world-agent__beam-frame');
  if (!userCore || !mochiFrame) return;

  const worldBounds = worldScene.getBoundingClientRect();
  const userBounds = userCore.getBoundingClientRect();
  const mochiBounds = mochiFrame.getBoundingClientRect();
  if (worldBounds.width === 0 || worldBounds.height === 0) return;

  const toSceneX = (value: number) => ((value - worldBounds.left) / worldBounds.width) * 600;
  const toSceneY = (value: number) => ((value - worldBounds.top) / worldBounds.height) * 620;
  const startX = toSceneX(userBounds.right);
  const startY = toSceneY(userBounds.top + userBounds.height / 2);
  const endX = toSceneX(mochiBounds.left);
  const endY = toSceneY(mochiBounds.top + mochiBounds.height / 2);
  const direction = endX >= startX ? 1 : -1;
  const curve = Math.max(12, Math.abs(endX - startX) * .45);

  userLink.setAttribute(
    'd',
    `M${startX.toFixed(1)} ${startY.toFixed(1)} C${(startX + direction * curve).toFixed(1)} ${startY.toFixed(1)} ${(endX - direction * curve).toFixed(1)} ${endY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
  );
};

const alignEndpointDiscoveryBeams = () => {
  if (!worldScene) return;
  const domainFrame = document.querySelector<HTMLElement>('[data-discovery-domain-target] .discovery-domain-target__beam-frame');
  if (!domainFrame) return;
  const worldBounds = worldScene.getBoundingClientRect();
  const frameBounds = domainFrame.getBoundingClientRect();
  if (worldBounds.width === 0 || worldBounds.height === 0 || frameBounds.width === 0) return;

  const originX = ((frameBounds.right - worldBounds.left) / worldBounds.width) * 600;
  const originY = (ratio: number) => (
    ((frameBounds.top + frameBounds.height * ratio - worldBounds.top) / worldBounds.height) * 620
  );
  const beamGeometry: Record<DiscoveryMechanismId, { y: number; path: string }> = {
    ard: {
      y: originY(.28),
      path: `M${originX} ${originY(.28)}C${originX + 38} ${originY(.28) - 16} 430 230 466 207`,
    },
    'dns-aid': {
      y: originY(.5),
      path: `M${originX} ${originY(.5)}C${originX + 42} ${originY(.5)} 428 316 466 316`,
    },
    ans: {
      y: originY(.72),
      path: `M${originX} ${originY(.72)}C${originX + 38} ${originY(.72) + 16} 430 390 466 409`,
    },
  };

  Object.entries(beamGeometry).forEach(([mechanism, geometry]) => {
    document.querySelector<SVGCircleElement>(`[data-mechanism-beam-origin="${mechanism}"]`)?.setAttribute('cx', String(originX));
    document.querySelector<SVGCircleElement>(`[data-mechanism-beam-origin="${mechanism}"]`)?.setAttribute('cy', String(geometry.y));
    document.querySelector<SVGPathElement>(`[data-mechanism-beam="${mechanism}"]`)?.setAttribute('d', geometry.path);
  });
};

const setText = (selector: string, value: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
};

const clearEndpointInspection = () => {
  endpointInspectionTimers.forEach((timer) => window.clearTimeout(timer));
  endpointInspectionTimers = [];
  worldScene?.removeAttribute('data-inspection-phase');
  endpointPathStage?.removeAttribute('data-active-mechanism');
  endpointPathStage?.removeAttribute('data-explorable');
  endpointPathStage?.removeAttribute('data-has-path-tabs');
  if (endpointPathTabs) endpointPathTabs.hidden = true;
  endpointPathButtons.forEach((button) => {
    button.disabled = true;
    button.hidden = true;
    button.setAttribute('aria-pressed', 'false');
  });
};

const selectEndpointPath = (mechanism: DiscoveryMechanismId) => {
  if (!endpointPathStage) return;
  endpointPathStage.dataset.activeMechanism = mechanism;
  endpointPathStage.setAttribute('aria-label', `${discoveryMechanismName[mechanism]} discovery path`);
  endpointPathStage.querySelector<HTMLElement>('.endpoint-path-stage__waiting')?.setAttribute('aria-hidden', 'true');
  endpointPathStage.querySelectorAll<HTMLElement>('[data-discovery-path-panel]').forEach((panel) => {
    panel.setAttribute('aria-hidden', String(panel.dataset.discoveryPathPanel !== mechanism));
  });
  endpointPathButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.endpointPathSelect === mechanism));
  });
};

const enableEndpointPathExploration = () => {
  if (!endpointPathStage || !endpointPathTabs) return;
  endpointPathStage.dataset.explorable = 'true';
  endpointPathButtons.forEach((button) => { button.disabled = false; });
};

const revealEndpointPathButton = (mechanism: DiscoveryMechanismId) => {
  if (!endpointPathStage || !endpointPathTabs) return;
  endpointPathStage.dataset.hasPathTabs = 'true';
  endpointPathTabs.hidden = false;
  const button = endpointPathButtons.find(({ dataset }) => dataset.endpointPathSelect === mechanism);
  if (button) button.hidden = false;
};

const setEndpointInspectionPhase = (phase: 'beams' | DiscoveryMechanismId) => {
  if (!worldScene || !endpointPathStage) return;
  worldScene.dataset.inspectionPhase = phase;
  if (phase === 'beams') {
    endpointPathStage.dataset.activeMechanism = phase;
    endpointPathStage.querySelector<HTMLElement>('.endpoint-path-stage__waiting')?.setAttribute('aria-hidden', 'false');
    endpointPathStage.querySelectorAll<HTMLElement>('[data-discovery-path-panel]').forEach((panel) => {
      panel.setAttribute('aria-hidden', 'true');
    });
    endpointPathStage.setAttribute('aria-label', 'Mapping ARD, DNS-AID, and ANS discovery mechanisms');
    setText('[data-activity-title]', 'Discovering Agent Endpoints');
    setText('[data-activity-detail]', `Mochi is mapping ARD, DNS-AID, and ANS for ${bookingCandidate.domain}.`);
    if (mochiBubble) mochiBubble.textContent = 'Checking every discovery path…';
    return;
  }
  revealEndpointPathButton(phase);
  selectEndpointPath(phase);
  const mechanism = endpointDiscoverySnapshot.mechanisms.find(({ id }) => id === phase);
  setText('[data-activity-title]', `Inspecting ${discoveryMechanismName[phase]}`);
  setText('[data-activity-detail]', mechanism?.summary ?? 'Following the published discovery path.');
  if (mochiBubble) mochiBubble.textContent = `Inspecting ${discoveryMechanismName[phase]}…`;
};

const startEndpointInspection = () => {
  clearEndpointInspection();
  setEndpointInspectionPhase('beams');
  const phases: Array<{ delay: number; mechanism: DiscoveryMechanismId }> = prefersReducedMotion
    ? [
      { delay: 250, mechanism: 'ard' },
      { delay: 900, mechanism: 'dns-aid' },
      { delay: 1550, mechanism: 'ans' },
    ]
    : [
      { delay: 5800, mechanism: 'ard' },
      { delay: 11000, mechanism: 'dns-aid' },
      { delay: 16200, mechanism: 'ans' },
    ];
  endpointInspectionTimers = phases.map(({ delay, mechanism }) => window.setTimeout(
    () => setEndpointInspectionPhase(mechanism), delay,
  ));
  const completionDelay = phases.at(-1)!.delay + (prefersReducedMotion ? 300 : 1200);
  endpointInspectionTimers.push(window.setTimeout(enableEndpointPathExploration, completionDelay));
};

endpointPathButtons.forEach((button) => {
  button.disabled = true;
  button.addEventListener('click', () => {
    if (endpointPathStage?.dataset.explorable !== 'true') return;
    selectEndpointPath(button.dataset.endpointPathSelect as DiscoveryMechanismId);
  });
});

const displayStepNumber = (step: ReturnType<typeof projectDiscovery>['step']) => (
  step <= 1 ? step
    : step === 2 ? 1
      : step <= 4 ? step - 1
        : step === 5 ? 3
          : step === 8 ? 6 : step - 2
);

const clearTimelineReplay = () => {
  timelineReplayTimers.forEach((timer) => window.clearTimeout(timer));
  timelineReplayTimers = [];
};

const replayDelay = (delay: number) => prefersReducedMotion ? Math.min(delay, 350) : delay;

const queueTimelineReplay = (delay: number, callback: () => void) => {
  timelineReplayTimers.push(window.setTimeout(callback, replayDelay(delay)));
};

const restartRegistryPrintouts = () => {
  searchPrintouts?.querySelectorAll<HTMLElement>('.registry-printout__row').forEach((row) => {
    row.style.animationName = 'none';
    void row.offsetWidth;
    row.style.animationName = '';
  });
};

const registryStatusLabel = (status: ReturnType<typeof projectDiscovery>['registries'][RegistryId]) => {
  if (status.status === 'searching') return 'Searching…';
  if (status.status === 'results') return `${status.resultCount ?? 0} result`;
  if (status.status === 'no-results') return '0 results';
  if (status.status === 'failed') return 'Failed';
  return 'Waiting';
};

const renderCandidates = (projection: ReturnType<typeof projectDiscovery>) => {
  if (!candidateResults) return;
  candidateResults.replaceChildren();
  const visibleCandidates = projection.step === 7 ? projection.candidates : [];
  const resultEmpty = document.querySelector<HTMLElement>('[data-result-empty]');
  if (resultEmpty) resultEmpty.hidden = visibleCandidates.length > 0;
  setText('[data-result-count]', `${visibleCandidates.length} ${visibleCandidates.length === 1 ? 'candidate' : 'candidates'}`);

  visibleCandidates.forEach((candidate, index) => {
    const relevanceScore = consolidatedSearchRecords.find((record) => record.domain === candidate.domain)?.relevanceScore;
    const card = document.createElement('article');
    card.className = 'candidate-card';
    card.classList.toggle('is-ranked', projection.step === 7);
    card.innerHTML = `
      <span class="candidate-card__rank"></span>
      <div class="candidate-card__avatar"><svg viewBox="0 0 276 270" aria-hidden="true">${serviceAgentArtwork(1)}</svg></div>
      <div class="candidate-card__body">
        <div class="candidate-card__title"><strong></strong><small></small></div>
        <p class="candidate-card__capability"></p>
      </div>
      <span class="candidate-card__relevance"><small>Relevance</small><strong>${relevanceScore ?? '—'}${relevanceScore === undefined ? '' : '%'}</strong></span>`;
    card.querySelector<HTMLElement>('.candidate-card__rank')!.textContent = projection.step === 7 ? `#${index + 1}` : 'NEW';
    card.querySelector<HTMLElement>('.candidate-card__title strong')!.textContent = candidate.name;
    card.querySelector<HTMLElement>('.candidate-card__title small')!.textContent = `Domain: ${candidate.domain}`;
    card.querySelector<HTMLElement>('.candidate-card__capability')!.textContent = `Capability Match: ${candidate.capability}`;
    candidateResults.append(card);
  });
};

const renderActivity = () => {
  const displayedEvents = eventsAtCursor(activityEvents, eventCursor);
  const projection = projectDiscovery(displayedEvents);
  const liveProjection = projectDiscovery(activityEvents);
  const isComposerPaused = liveProjection.step > 0 && liveProjection.step < 7;
  const displayStep = displayStepNumber(projection.step);
  const hasSelectedCandidate = projection.step >= 7 && projection.candidates.length > 0;
  const mochiProjection = projectMochi(displayedEvents);
  const mochiButton = buttons.find((button) => button.dataset.agentId === 'personal-assistant');
  const bookingsButton = buttons.find((button) => button.dataset.agentId === 'bookings-service');

  worldScene?.classList.toggle('is-searching', projection.step > 0);
  worldScene?.classList.toggle('has-candidate', hasSelectedCandidate);
  if (worldScene) worldScene.dataset.step = String(projection.step);
  if (userFlowAlignmentTimer !== null) window.clearTimeout(userFlowAlignmentTimer);
  window.requestAnimationFrame(alignUserFlow);
  userFlowAlignmentTimer = window.setTimeout(alignUserFlow, 450);
  if (endpointBeamAlignmentTimer !== null) window.clearTimeout(endpointBeamAlignmentTimer);
  if (projection.step === 8) {
    window.requestAnimationFrame(alignEndpointDiscoveryBeams);
    endpointBeamAlignmentTimer = window.setTimeout(alignEndpointDiscoveryBeams, 650);
  }
  chatForm?.classList.toggle('is-paused', isComposerPaused);
  chatForm?.setAttribute('aria-busy', String(isComposerPaused));
  if (chatInput) chatInput.disabled = isComposerPaused;
  if (chatField) chatField.hidden = isComposerPaused;
  if (chatPaused) chatPaused.hidden = !isComposerPaused;
  if (chatSend) chatSend.hidden = isComposerPaused;

  const worldPhase = document.querySelector<HTMLElement>('[data-world-phase]');
  if (worldPhase) worldPhase.hidden = projection.step === 0;
  setText('[data-world-step]', `STEP ${displayStep}`);
  setText('[data-world-phase-title]', projection.title);
  setText('[data-skynet-step]', `STEP ${displayStep}`);
  setText('[data-activity-title]', projection.title);
  setText('[data-activity-detail]', projection.detail);
  setText('[data-behind-title]', projection.title);
  setText('[data-behind-detail]', projection.detail);
  if (intakeEvidence) {
    intakeEvidence.hidden = projection.step !== 1 && projection.step !== 2;
    intakeEvidence.dataset.state = projection.step === 2 ? 'understood' : 'delivering';
    intakeEvidence.setAttribute('aria-label', projection.step === 2 ? 'Mochi understood your request' : 'Your request is traveling to Mochi');
  }
  if (discoveryAnalysis) {
    discoveryAnalysis.hidden = projection.step < 3;
    discoveryAnalysis.dataset.step = String(projection.step);
  }
  const isRegistryWork = projection.step >= 3 && projection.step <= 5;
  const isConsolidating = projection.step === 6;
  const isDiscoveringEndpoints = projection.step === 8;
  if (searchPrintouts) searchPrintouts.hidden = !isRegistryWork;
  if (searchPrintouts) searchPrintouts.dataset.state = projection.step === 5 ? 'results' : 'searching';
  if (consolidationBoard) consolidationBoard.hidden = !isConsolidating;
  if (endpointPathStage) endpointPathStage.hidden = !isDiscoveringEndpoints;
  if (isDiscoveringEndpoints && renderedStep !== 8) startEndpointInspection();
  if (!isDiscoveringEndpoints && renderedStep === 8) clearEndpointInspection();
  if (behindCurrent) behindCurrent.hidden = isRegistryWork || isConsolidating || projection.step >= 7;
  if (projection.step === 1 && renderedStep !== 1) requestFlightAnimation?.beginElement();
  const syncPhase = document.querySelector<HTMLElement>('.sync-phase');
  if (syncPhase) syncPhase.dataset.step = String(displayStep);

  const intentChip = document.querySelector<HTMLElement>('[data-intent-chip]');
  if (intentChip) intentChip.hidden = projection.step < 2 || projection.step >= 7;
  setText('[data-world-intent]', projection.intent ?? 'Meeting scheduling');

  if (mochiButton) {
    mochiButton.dataset.activityState = mochiProjection.state;
    mochiButton.setAttribute('aria-label', `Mochi, Personal Agent. ${mochiProjection.status}`);
  }
  if (bookingsButton) bookingsButton.setAttribute('aria-hidden', String(!hasSelectedCandidate));
  if (mochiBubble) {
    mochiBubble.textContent = mochiProjection.bubble ?? '';
    mochiBubble.hidden = mochiProjection.bubble === null;
  }

  userLink?.classList.toggle('is-active', projection.step === 1);
  userArrow?.toggleAttribute('hidden', projection.step !== 1);
  const resultLink = document.querySelector<SVGPathElement>('[data-result-link]');
  const resultPacket = document.querySelector<SVGPolygonElement>('[data-result-packet]');
  resultLink?.classList.toggle('is-visible', hasSelectedCandidate);
  resultLink?.classList.toggle('is-active', projection.step === 7);
  resultPacket?.toggleAttribute('hidden', projection.step !== 7);

  (['agentcensus', 'a2a-registry'] as RegistryId[]).forEach((registry) => {
    const state = projection.registries[registry];
    const node = document.querySelector<HTMLElement>(`[data-registry-node="${registry}"]`);
    const row = document.querySelector<HTMLElement>(`[data-skynet-registry="${registry}"]`);
    const link = document.querySelector<SVGPathElement>(`[data-registry-link="${registry}"]`);
    const packet = document.querySelector<SVGPolygonElement>(`[data-registry-packet="${registry}"]`);
    const resultBatch = document.querySelector<SVGGElement>(`[data-registry-result-batch="${registry}"]`);
    if (node) {
      node.hidden = projection.step < 3;
      node.dataset.status = state.status;
    }
    if (row) row.dataset.status = state.status;
    link?.toggleAttribute('hidden', projection.step < 3);
    if (link) link.classList.toggle('is-active', state.status === 'searching');
    packet?.toggleAttribute('hidden', state.status !== 'searching');
    resultBatch?.toggleAttribute('hidden', state.status !== 'results' || projection.step > 6);
    setText(`[data-registry-world-status="${registry}"]`, registryStatusLabel(state));
    setText(`[data-registry-skynet-status="${registry}"]`, registryStatusLabel(state));
    setText(`[data-registry-printout-status="${registry}"]`, state.status === 'results' ? `${state.resultCount} found` : 'Streaming');
  });

  if (projection.step === 4 && renderedStep !== 4) {
    registryResultAnimations.get('agentcensus')?.beginElement();
  } else if (projection.step === 5 && renderedStep === 4) {
    registryResultAnimations.get('a2a-registry')?.beginElement();
  } else if (projection.step === 5 && renderedStep !== 5) {
    registryResultAnimations.get('agentcensus')?.beginElement();
    registryResultAnimations.get('a2a-registry')?.beginElement();
  }

  if (projection.step > 0) {
    if (emptyInspector) emptyInspector.hidden = true;
    if (agentInspector) agentInspector.hidden = false;
  }

  renderCandidates(projection);

  if (eventHistorySection) eventHistorySection.hidden = activityEvents.length === 0;
  if (eventCount) eventCount.textContent = `Step ${displayStep}`;
  if (eventHistoryList) {
    eventHistoryList.replaceChildren();
    activityEvents.forEach((event, index) => {
      const nextEvent = activityEvents[index + 1];
      const previousEvent = activityEvents[index - 1];
      if (event.type === 'task.requested' && nextEvent?.type === 'search.intent-derived') return;
      if (event.type === 'registry.results-returned'
        && event.payload.registry === 'agentcensus'
        && nextEvent?.type === 'registry.results-returned'
        && nextEvent.payload.registry === 'a2a-registry') return;

      const eventProjection = projectSkynet(activityEvents.slice(0, index + 1));
      if (!eventProjection) return;
      const isMergedHandoff = event.type === 'search.intent-derived' && previousEvent?.type === 'task.requested';
      const isMergedRegistryResponse = event.type === 'registry.results-returned'
        && event.payload.registry === 'a2a-registry'
        && previousEvent?.type === 'registry.results-returned'
        && previousEvent.payload.registry === 'agentcensus';
      const timelineStep = displayStepNumber(eventProjection.step);
      const title = isMergedHandoff
        ? 'Request Delivered & Understood'
        : isMergedRegistryResponse ? 'Registry Results Received' : eventProjection.title;
      const currentIndex = eventCursor ?? activityEvents.length - 1;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'event-history__item';
      button.classList.toggle('is-current', isMergedHandoff || isMergedRegistryResponse
        ? currentIndex === index || currentIndex === index - 1
        : currentIndex === index);
      button.innerHTML = '<span class="event-history__sequence"></span><span class="event-history__copy"><strong></strong><small></small></span><i></i>';
      button.querySelector<HTMLElement>('.event-history__sequence')!.textContent = String(timelineStep).padStart(2, '0');
      button.querySelector('strong')!.textContent = title;
      button.querySelector('small')!.textContent = isMergedHandoff
        ? 'observed + derived · request handoff'
        : isMergedRegistryResponse
          ? 'reported · 5 AgentCensus + 3 A2A Registry'
          : `${event.source} · ${event.type}`;
      button.setAttribute('aria-label', `Review synchronized step ${timelineStep}: ${title}`);
      button.addEventListener('click', () => {
        clearTimelineReplay();
        if (isMergedHandoff) {
          eventCursor = index - 1;
          renderActivity();
          queueTimelineReplay(INTENT_DERIVATION_DELAY, () => {
            eventCursor = index;
            renderActivity();
            queueTimelineReplay(UNDERSTOOD_HOLD_DELAY, () => {
              if (activityEvents[index + 1]?.type !== 'registries.search-started') return;
              eventCursor = index + 1;
              renderActivity();
              restartRegistryPrintouts();
            });
          });
          return;
        }

        if (isMergedRegistryResponse) {
          eventCursor = index;
          renderActivity();
          registryResultAnimations.get('agentcensus')?.beginElement();
          registryResultAnimations.get('a2a-registry')?.beginElement();
          return;
        }

        if (event.type === 'registries.search-started') {
          eventCursor = index;
          renderActivity();
          restartRegistryPrintouts();
          return;
        }

        if (event.type === 'endpoints.discovery-started') {
          eventCursor = Math.max(0, index - 1);
          renderActivity();
          queueTimelineReplay(STEP_REPLAY_LEAD_DELAY, () => {
            eventCursor = index;
            renderActivity();
          });
          return;
        }

        eventCursor = Math.max(0, index - 1);
        renderActivity();
        queueTimelineReplay(STEP_REPLAY_LEAD_DELAY, () => {
          eventCursor = index;
          renderActivity();
        });
      });
      eventHistoryList.append(button);
    });
    eventHistoryList.querySelector<HTMLElement>('.is-current')?.scrollIntoView({ block: 'nearest' });
  }

  const newerEventCount = eventCursor === null ? 0 : activityEvents.length - eventCursor - 1;
  if (returnLiveButton) {
    returnLiveButton.hidden = eventCursor === null;
    returnLiveButton.textContent = newerEventCount > 0 ? `Return to current · ${newerEventCount} new` : 'Return to current';
  }
  renderedStep = projection.step;
};

const nextEnvelope = () => {
  eventSequence += 1;
  return { schemaVersion: '1.0' as const, eventId: `${runId}-event-${eventSequence}`, runId, sequence: eventSequence, logicalTime: eventSequence, visibility: 'studio' as const };
};

const appendActivityEvent = (event: ActivityEvent) => {
  activityEvents.push(event);
  renderActivity();
};

const schedule = (delay: number, callback: () => void) => {
  scheduledTimers.push(window.setTimeout(callback, prefersReducedMotion ? Math.min(delay, 350) : delay));
};

const sendTaskToMochi = (message: string) => {
  clearTimelineReplay();
  scheduledTimers.forEach((timer) => window.clearTimeout(timer));
  scheduledTimers = [];
  activityEvents.splice(0);
  eventCursor = null;
  eventSequence = 0;
  runSequence += 1;
  runId = `run-c3-${runSequence}`;

  const taskEvent: ActivityEvent = { ...nextEnvelope(), type: 'task.requested', source: 'observed', actorId: 'user', subjectId: 'personal-assistant', payload: { message } };
  appendActivityEvent(taskEvent);
  let parentEventId = taskEvent.eventId;

  const addStep = (delay: number, makeEvent: () => ActivityEvent) => schedule(delay, () => {
    const nextEvent = makeEvent();
    parentEventId = nextEvent.eventId;
    appendActivityEvent(nextEvent);
  });

  addStep(INTENT_DERIVATION_DELAY, () => ({ ...nextEnvelope(), type: 'search.intent-derived', source: 'derived', actorId: 'personal-assistant', subjectId: 'personal-assistant', causalParentId: parentEventId, payload: { intent: 'meeting scheduling', candidateType: 'service agent' } }));
  addStep(REGISTRY_SEARCH_DELAY, () => ({ ...nextEnvelope(), type: 'registries.search-started', source: 'simulated', actorId: 'personal-assistant', subjectId: 'personal-assistant', causalParentId: parentEventId, payload: { query: 'meeting scheduling', registries: ['agentcensus', 'a2a-registry'] } }));
  schedule(19500, () => {
    const censusEvent: ActivityEvent = { ...nextEnvelope(), type: 'registry.results-returned', source: 'reported', actorId: 'agentcensus', subjectId: 'personal-assistant', causalParentId: parentEventId, payload: { registry: 'agentcensus', candidates: agentCensusSearchCandidates, resultCount: agentCensusSearchCandidates.length } };
    const a2aEvent: ActivityEvent = { ...nextEnvelope(), type: 'registry.results-returned', source: 'reported', actorId: 'a2a-registry', subjectId: 'personal-assistant', causalParentId: censusEvent.eventId, payload: { registry: 'a2a-registry', candidates: a2aSearchCandidates, resultCount: a2aSearchCandidates.length } };
    parentEventId = a2aEvent.eventId;
    activityEvents.push(censusEvent, a2aEvent);
    renderActivity();
  });
  addStep(CONSOLIDATION_START_DELAY, () => ({ ...nextEnvelope(), type: 'candidates.normalized', source: 'derived', actorId: 'personal-assistant', subjectId: 'personal-assistant', causalParentId: parentEventId, payload: { reportedCount: 8, uniqueCount: 8 } }));
  addStep(SEARCH_COMPLETE_DELAY, () => ({ ...nextEnvelope(), type: 'search.completed', source: 'derived', actorId: 'personal-assistant', subjectId: 'personal-assistant', causalParentId: parentEventId, payload: { candidates: [bookingCandidate], rankingMethod: 'Relevance to the derived intent using reported registry metadata' } }));
  addStep(ENDPOINT_DISCOVERY_DELAY, () => ({ ...nextEnvelope(), type: 'endpoints.discovery-started', source: 'reported', actorId: 'personal-assistant', subjectId: 'bookings-service', causalParentId: parentEventId, payload: { domain: bookingCandidate.domain, mechanisms: ['ard', 'dns-aid', 'ans'] } }));
};

returnLiveButton?.addEventListener('click', () => {
  clearTimelineReplay();
  eventCursor = null;
  renderActivity();
});

const syncSearchComposer = () => {
  const liveProjection = projectDiscovery(activityEvents);
  const isComposerPaused = liveProjection.step > 0 && liveProjection.step < 7;
  const query = chatInput?.value.trim() ?? '';
  const hasSearchSubject = query.length > 0 && query.toLowerCase() !== 'search for';
  if (chatSend) chatSend.disabled = isComposerPaused || !hasSearchSubject;
  chatForm?.classList.toggle('is-ready', !isComposerPaused && hasSearchSubject);
};

chatInput?.addEventListener('input', syncSearchComposer);
window.addEventListener('resize', () => {
  alignUserFlow();
  if (worldScene?.dataset.step === '8') alignEndpointDiscoveryBeams();
});
chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const liveProjection = projectDiscovery(activityEvents);
  if (liveProjection.step > 0 && liveProjection.step < 7) return;
  const message = chatInput?.value.trim() ?? '';
  if (!message || message.toLowerCase() === 'search for') return chatInput?.focus();
  sendTaskToMochi(message);
  if (chatInput) {
    chatInput.value = '';
    chatInput.placeholder = 'Message';
  }
  syncSearchComposer();
});

syncSearchComposer();
renderActivity();
