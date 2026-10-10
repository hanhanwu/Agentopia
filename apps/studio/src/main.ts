import './styles.css';
import { agents, isAgentId, type Agent, type AgentId } from './agents.ts';
import {
  eventsAtCursor,
  isCafeTask,
  projectLuca,
  projectMochi,
  projectSkynet,
  type ActivityEvent,
} from './activity.ts';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('Studio root was not found.');
}

const avatar = (agent: Agent) => {
  const isMochi = agent.id === 'personal-assistant';
  const body = isMochi
    ? 'M48 205V140C48 65 91 25 132 25s84 40 84 115v65c0 21-15 37-34 37s-34-16-34-37c0 21-15 37-34 37s-34-16-34-37c0 21-14 37-32 37s-32-16-32-37z'
    : 'M38 196V149C38 71 87 31 138 31s100 40 100 118v47c0 25-18 43-40 43-18 0-32-11-38-28-6 17-20 28-38 28s-32-11-38-28c-6 17-20 28-38 28-22 0-40-18-40-43z';

  return `
    <svg class="avatar avatar--${agent.accent}" viewBox="0 0 276 270" aria-hidden="true">
      <path class="avatar__glow" d="${body}" />
      <path class="avatar__body" d="${body}" />
      ${isMochi
        ? `<path class="avatar__visor" d="M85 130q47-28 95 0" />
           <circle class="avatar__eye" cx="108" cy="153" r="7" />
           <circle class="avatar__eye" cx="155" cy="153" r="7" />
           <ellipse class="avatar__blush" cx="88" cy="176" rx="15" ry="9" />
           <ellipse class="avatar__blush" cx="176" cy="176" rx="15" ry="9" />
           <path class="avatar__mark" d="M126 177l7 7 7-7-7-7z" />`
        : `<path class="avatar__visor" d="M61 126h154" />
           <circle class="avatar__eye" cx="111" cy="153" r="7" />
           <circle class="avatar__eye" cx="166" cy="153" r="7" />
           <path class="avatar__smile" d="M126 181q12 9 24 0" />
           <path class="avatar__mark" d="M118 86h40l11 20h-62z" />`}
    </svg>
  `;
};

const agentButton = (agent: Agent, placement: string) => `
  <button
    class="world-agent world-agent--${placement}"
    type="button"
    data-agent-id="${agent.id}"
    aria-label="Select ${agent.name}, ${agent.role}"
    aria-pressed="false"
  >
    <span class="world-agent__status" aria-hidden="true"></span>
    <span class="agent-bubble" data-${agent.id === 'personal-assistant' ? 'mochi' : 'luca'}-bubble hidden></span>
    ${avatar(agent)}
    <span class="world-agent__label">
      <strong>${agent.name}</strong>
      <small>${agent.shortRole}</small>
    </span>
  </button>
`;

app.innerHTML = `
  <section
    class="world-intro"
    data-world-intro
    aria-label="Agentopia introduction. Agents come online, publish information through AgentCensus, A2A Registry, and MCP Registry, then Mochi connects with other agents on your behalf."
  >
    <button class="world-intro__skip" type="button" data-intro-skip>Skip intro</button>
    <span class="world-intro__mode" aria-hidden="true">Conceptual ecosystem map</span>

    <div class="world-intro__logo" aria-hidden="true" data-text="AGENTOPIA">AGENTOPIA</div>

    <div class="intro-world" aria-hidden="true">
      <svg class="intro-map" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="intro-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#31523a" stroke-width="1" opacity=".32" />
          </pattern>
          <symbol id="intro-agent" viewBox="0 0 60 60">
            <path d="M8 49V28C8 13 18 5 30 5s22 8 22 23v21c0 5-4 8-8 8-5 0-7-3-8-7-1 4-3 7-7 7s-7-3-8-7c-1 4-3 7-7 7-4 0-6-3-6-8z" />
            <path d="M18 30h24" fill="none" />
            <circle cx="24" cy="37" r="2" />
            <circle cx="36" cy="37" r="2" />
          </symbol>
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
          <g class="intro-agent intro-agent--green" transform="translate(72 517)"><use href="#intro-agent" width="66" height="66" /></g>
          <g class="intro-agent intro-agent--violet" transform="translate(440 540)"><use href="#intro-agent" width="66" height="66" /></g>
          <g class="intro-agent intro-agent--orange" transform="translate(1053 510)"><use href="#intro-agent" width="66" height="66" /></g>
          <g class="intro-agent intro-agent--cyan" transform="translate(820 540)"><use href="#intro-agent" width="54" height="54" /></g>
          <g class="intro-agent intro-agent--lime" transform="translate(300 530)"><use href="#intro-agent" width="52" height="52" /></g>
          <g class="intro-agent intro-agent--cyan" transform="translate(145 565)"><use href="#intro-agent" width="44" height="44" /></g>
          <g class="intro-agent intro-agent--orange" transform="translate(520 505)"><use href="#intro-agent" width="48" height="48" /></g>
          <g class="intro-agent intro-agent--green" transform="translate(700 535)"><use href="#intro-agent" width="46" height="46" /></g>
          <g class="intro-agent intro-agent--violet" transform="translate(955 550)"><use href="#intro-agent" width="46" height="46" /></g>
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
          <path class="intro-possible-route intro-possible-route--one" d="M600 370C485 340 390 338 288 385" />
          <path class="intro-possible-route intro-possible-route--two" d="M600 370C715 330 820 340 920 395" />
          <path class="intro-possible-route intro-possible-route--three" d="M600 370C705 438 770 485 835 530" />

          <g class="intro-you" transform="translate(600 550)">
            <circle r="31" />
            <text y="4">YOU</text>
          </g>
          <path class="intro-you-link" d="M600 518V462" />
          <g class="intro-mochi" transform="translate(545 320)">
            <use href="#intro-agent" width="110" height="110" />
            <text x="55" y="129">MOCHI</text>
            <text class="intro-mochi__role" x="55" y="148">YOUR PERSONAL AGENT</text>
          </g>

          <g class="intro-peer intro-peer--orange" transform="translate(240 345)"><use href="#intro-agent" width="80" height="80" /><text x="40" y="97">SERVICE</text></g>
          <g class="intro-peer intro-peer--violet" transform="translate(880 350)"><use href="#intro-agent" width="80" height="80" /><text x="40" y="97">SPECIALIST</text></g>
          <g class="intro-peer intro-peer--lime" transform="translate(795 500)"><use href="#intro-agent" width="70" height="70" /><text x="35" y="87">NETWORK</text></g>
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
          <div class="world-scene" role="group" aria-label="Interaction field with the user, Mochi, and Luca">
            <div class="world-coordinates" aria-hidden="true"><span>01</span><span>02</span><span>03</span><span>04</span></div>
            <svg class="world-network" viewBox="0 0 600 620" preserveAspectRatio="none" aria-hidden="true">
              <path id="user-flow-path" class="network-line network-line--user" data-user-link d="M72 530 C145 490 176 420 245 342" />
              <polygon class="network-arrow network-arrow--user" data-user-arrow points="-7,-4 7,0 -7,4" hidden>
                <animateMotion dur="1.7s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#user-flow-path" />
                </animateMotion>
              </polygon>
              <path id="agent-flow-path" class="network-line network-line--agent" data-agent-link hidden d="M275 310 C355 238 403 202 510 160" />
              <polygon class="network-arrow network-arrow--agent" data-agent-arrow points="-7,-4 7,0 -7,4" hidden>
                <animateMotion dur="1.35s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#agent-flow-path" />
                </animateMotion>
              </polygon>
            </svg>

            <div class="world-zone world-zone--local"></div>
            <div class="world-zone world-zone--service"></div>

            <div class="user-node" aria-label="You, task requester">
              <span class="user-node__pulse"></span>
              <span class="user-node__core">YOU</span>
            </div>

            ${agentButton(agents['personal-assistant'], 'assistant')}
            ${agentButton(agents['cafe-service'], 'cafe')}

          </div>
        </div>

        <form class="chat-composer" data-chat-form>
          <div class="composer-agent">${avatar(agents['personal-assistant'])}</div>
          <label class="chat-composer__field">
            <input
              name="message"
              type="text"
              maxlength="240"
              autocomplete="off"
              placeholder="Message Mochi…"
              aria-label="Message Mochi"
              data-chat-input
            />
          </label>
          <button type="submit" data-chat-send>
            <span>Send</span><i aria-hidden="true">↗</i>
          </button>
        </form>
      </section>

      <aside class="inspector-panel" aria-labelledby="skynet-title">
        <div class="inspector-heading">
          <div>
            <h2 id="skynet-title" data-text="SKYNET">SKYNET</h2>
            <p class="inspector-context" data-inspector-context hidden></p>
          </div>
          <div class="inspector-controls">
            <span class="inspector-badge"><i></i> <span data-skynet-mode>Live</span></span>
          </div>
        </div>

        <div class="provenance-key" aria-label="Provenance key">
          <span><i class="legend-dot legend-dot--observed"></i>Observed</span>
          <span><i class="legend-dot legend-dot--reported"></i>Reported</span>
          <span><i class="legend-dot legend-dot--derived"></i>Derived</span>
          <span><i class="legend-dot legend-dot--simulated"></i>Simulated</span>
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

        <div class="agent-inspector" data-agent-inspector hidden>
          <div class="inspector-overview">
            <div class="agent-card__top">
              <div class="agent-card__avatar" data-agent-avatar></div>
              <div>
                <p class="agent-card__role" data-agent-role></p>
                <h3 data-agent-name></h3>
              </div>
            </div>
            <div class="status-row"><span></span><strong data-agent-status></strong></div>
          </div>

          <div class="analysis-grid">
            <section class="live-activity" data-live-activity hidden aria-live="polite">
              <p>Current finding</p>
              <h4 data-activity-title></h4>
              <div class="live-activity__detail" data-activity-detail></div>
              <div class="evidence">
                <p>Evidence envelope</p>
                <dl>
                  <div><dt>Provenance</dt><dd data-activity-source></dd></div>
                  <div><dt>Event ID</dt><dd data-activity-event></dd></div>
                  <div><dt>Causal parent</dt><dd data-activity-parent></dd></div>
                </dl>
              </div>
            </section>
            <section class="event-history" data-event-history-section hidden>
              <div class="event-history__heading">
                <div>
                  <span>Causal event trail</span>
                  <small data-event-count>0 events</small>
                </div>
                <button type="button" data-return-live hidden>Return to live</button>
              </div>
              <div class="event-history__list" data-event-history-list></div>
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
};

const introTimer = window.setTimeout(finishIntro, prefersReducedMotion ? 80 : 20000);
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
const inspectorContext = document.querySelector<HTMLElement>('[data-inspector-context]');
const emptyInspector = document.querySelector<HTMLElement>('[data-empty-inspector]');
const agentInspector = document.querySelector<HTMLElement>('[data-agent-inspector]');
const chatForm = document.querySelector<HTMLFormElement>('[data-chat-form]');
const chatInput = document.querySelector<HTMLInputElement>('[data-chat-input]');
const mochiBubble = document.querySelector<HTMLElement>('[data-mochi-bubble]');
const lucaBubble = document.querySelector<HTMLElement>('[data-luca-bubble]');
const userLink = document.querySelector<SVGPathElement>('[data-user-link]');
const agentLink = document.querySelector<SVGPathElement>('[data-agent-link]');
const userArrow = document.querySelector<SVGPolygonElement>('[data-user-arrow]');
const agentArrow = document.querySelector<SVGPolygonElement>('[data-agent-arrow]');
const liveActivity = document.querySelector<HTMLElement>('[data-live-activity]');
const eventHistorySection = document.querySelector<HTMLElement>('[data-event-history-section]');
const eventHistoryList = document.querySelector<HTMLElement>('[data-event-history-list]');
const eventCount = document.querySelector<HTMLElement>('[data-event-count]');
const returnLiveButton = document.querySelector<HTMLButtonElement>('[data-return-live]');
const skynetMode = document.querySelector<HTMLElement>('[data-skynet-mode]');

const activityEvents: ActivityEvent[] = [];
const runId = 'run-studio-preview';
let eventSequence = 0;
let selectedAgentId: AgentId | null = null;
let eventCursor: number | null = null;
let scheduledTimers: number[] = [];

const field = (name: string) => document.querySelector<HTMLElement>(`[data-agent-${name}]`);

const selectAgent = (id: AgentId) => {
  const agent = agents[id];
  selectedAgentId = id;

  buttons.forEach((button) => {
    const isSelected = button.dataset.agentId === id;
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });

  if (inspectorContext) inspectorContext.textContent = `${agent.name} · ${agent.shortRole}`;
  if (emptyInspector) emptyInspector.hidden = true;
  if (agentInspector) agentInspector.hidden = false;

  const avatarSlot = field('avatar');
  if (avatarSlot) avatarSlot.innerHTML = avatar(agent);
  const values: Record<string, string> = {
    role: agent.role,
    name: agent.name,
    status: agent.status,
  };
  Object.entries(values).forEach(([key, value]) => {
    const element = field(key);
    if (element) element.textContent = value;
  });

  renderActivity();
};

const renderActivity = () => {
  const displayedEvents = eventsAtCursor(activityEvents, eventCursor);
  const mochiProjection = projectMochi(displayedEvents);
  const lucaProjection = projectLuca(displayedEvents);
  const skynetProjection = projectSkynet(displayedEvents);
  const mochiButton = buttons.find((button) => button.dataset.agentId === 'personal-assistant');
  const lucaButton = buttons.find((button) => button.dataset.agentId === 'cafe-service');

  if (mochiButton) {
    mochiButton.dataset.activityState = mochiProjection.state;
    mochiButton.setAttribute('aria-label', `Select Mochi, Personal Agent. ${mochiProjection.status}`);
  }
  if (lucaButton) {
    lucaButton.dataset.activityState = lucaProjection.state;
    lucaButton.setAttribute('aria-label', `Select Luca, Service Agent. ${lucaProjection.status}`);
  }

  if (mochiBubble) {
    mochiBubble.textContent = mochiProjection.bubble ?? '';
    mochiBubble.hidden = mochiProjection.bubble === null;
  }
  if (lucaBubble) {
    lucaBubble.textContent = lucaProjection.bubble ?? '';
    lucaBubble.hidden = lucaProjection.bubble === null;
  }
  const latestTaskIndex = displayedEvents.map((event) => event.type).lastIndexOf('task.requested');
  const currentInteractionEvents = latestTaskIndex >= 0 ? displayedEvents.slice(latestTaskIndex) : [];
  const latestEvent = currentInteractionEvents.at(-1);
  const hasUserInteraction = latestEvent?.type === 'task.requested';
  const hasDiscoveredLuca = currentInteractionEvents.some((event) =>
    event.type === 'discovery.candidate-found'
    || event.type === 'discovery.candidate-validated'
    || event.type === 'discovery.agent-selected'
    || event.type === 'message.sent'
    || event.type === 'message.received');
  const hasAgentInteraction = latestEvent?.type === 'message.sent' || latestEvent?.type === 'message.received';
  agentLink?.toggleAttribute('hidden', !hasDiscoveredLuca);
  agentLink?.classList.toggle('is-active', hasAgentInteraction);
  agentArrow?.toggleAttribute('hidden', !hasAgentInteraction);
  if (userLink) {
    userLink.classList.toggle('is-active', hasUserInteraction);
  }
  userArrow?.toggleAttribute('hidden', !hasUserInteraction);

  if (selectedAgentId === 'personal-assistant') {
    const status = field('status');
    if (status) status.textContent = mochiProjection.status;
  }
  if (selectedAgentId === 'cafe-service') {
    const status = field('status');
    if (status) status.textContent = lucaProjection.status;
  }

  if (skynetProjection && liveActivity) {
    liveActivity.hidden = false;
    const activityValues: Record<string, string> = {
      title: skynetProjection.title,
      detail: skynetProjection.detail,
      source: skynetProjection.source,
      event: skynetProjection.eventId,
      parent: skynetProjection.causalParentId ?? 'Root event',
    };
    Object.entries(activityValues).forEach(([key, value]) => {
      const element = document.querySelector<HTMLElement>(`[data-activity-${key}]`);
      if (element) element.textContent = value;
    });
  }

  if (eventHistorySection) eventHistorySection.hidden = activityEvents.length === 0;
  if (eventCount) eventCount.textContent = activityEvents.length === 1 ? '1 event' : `${activityEvents.length} events`;
  if (eventHistoryList) {
    eventHistoryList.replaceChildren();
    activityEvents.forEach((event, index) => {
      const eventProjection = projectSkynet(activityEvents.slice(0, index + 1));
      if (!eventProjection) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'event-history__item';
      button.classList.toggle('is-current', index === (eventCursor ?? activityEvents.length - 1));
      button.innerHTML = `<span class="event-history__sequence">${String(event.sequence).padStart(2, '0')}</span><span class="event-history__copy"><strong></strong><small></small></span><i></i>`;
      button.querySelector('strong')!.textContent = eventProjection.title;
      button.querySelector('small')!.textContent = `${event.source} · ${event.type}`;
      button.setAttribute('aria-label', `Review event ${event.sequence}: ${eventProjection.title}`);
      button.addEventListener('click', () => showHistoricalEvent(index));
      eventHistoryList.append(button);
    });
    const currentItem = eventHistoryList.querySelector<HTMLElement>('.is-current');
    currentItem?.scrollIntoView({ block: 'nearest' });
  }

  const newerEventCount = eventCursor === null ? 0 : activityEvents.length - eventCursor - 1;
  if (returnLiveButton) {
    returnLiveButton.hidden = eventCursor === null;
    returnLiveButton.textContent = newerEventCount > 0 ? `Return to live · ${newerEventCount} new` : 'Return to live';
  }
  if (skynetMode) skynetMode.textContent = eventCursor === null ? 'Live' : 'Reviewing';
};

const showHistoricalEvent = (index: number) => {
  eventCursor = index;
  const projection = projectSkynet(activityEvents.slice(0, index + 1));
  if (projection) selectAgent(projection.agentId);
};

const returnToLive = () => {
  eventCursor = null;
  const projection = projectSkynet(activityEvents);
  if (projection) selectAgent(projection.agentId);
  else renderActivity();
};

const nextEnvelope = () => {
  eventSequence += 1;
  return {
    schemaVersion: '1.0' as const,
    eventId: `event-${eventSequence}`,
    runId,
    sequence: eventSequence,
    logicalTime: eventSequence,
    visibility: 'studio' as const,
  };
};

const appendActivityEvent = (event: ActivityEvent) => {
  activityEvents.push(event);
  const skynetProjection = projectSkynet(activityEvents);
  if (eventCursor === null && skynetProjection) selectAgent(skynetProjection.agentId);
  else renderActivity();
};

const schedule = (delay: number, callback: () => void) => {
  scheduledTimers.push(window.setTimeout(callback, delay));
};

const sendTaskToMochi = (message: string) => {
  scheduledTimers.forEach((timer) => window.clearTimeout(timer));
  scheduledTimers = [];
  eventCursor = null;

  const taskEvent: ActivityEvent = {
    ...nextEnvelope(),
    type: 'task.requested',
    source: 'observed',
    actorId: 'user',
    subjectId: 'personal-assistant',
    payload: { message },
  };
  appendActivityEvent(taskEvent);

  let parentEventId = taskEvent.eventId;
  schedule(2500, () => {
    const discoveryEvent: ActivityEvent = {
      ...nextEnvelope(),
      type: 'discovery.started',
      source: 'simulated',
      actorId: 'personal-assistant',
      subjectId: 'cafe-service',
      causalParentId: parentEventId,
      payload: { query: message },
    };
    parentEventId = discoveryEvent.eventId;
    appendActivityEvent(discoveryEvent);
  });

  if (!isCafeTask(message)) {
    schedule(5000, () => {
      appendActivityEvent({
        ...nextEnvelope(),
        type: 'discovery.no-match',
        source: 'simulated',
        actorId: 'personal-assistant',
        subjectId: 'personal-assistant',
        causalParentId: parentEventId,
        payload: {
          query: message,
          reason: 'The current registry contains no service agent advertising capabilities for this task.',
        },
      });
    });
    return;
  }

  schedule(5000, () => {
    const event: ActivityEvent = {
      ...nextEnvelope(),
      type: 'discovery.candidate-found',
      source: 'simulated',
      actorId: 'personal-assistant',
      subjectId: 'cafe-service',
      causalParentId: parentEventId,
      payload: { candidateName: "Luca's Cafe" },
    };
    parentEventId = event.eventId;
    appendActivityEvent(event);
  });
  schedule(7500, () => {
    const event: ActivityEvent = {
      ...nextEnvelope(),
      type: 'discovery.candidate-validated',
      source: 'simulated',
      actorId: 'personal-assistant',
      subjectId: 'cafe-service',
      causalParentId: parentEventId,
      payload: { capabilities: ['menu lookup', 'price constraints', 'cafe orders'] },
    };
    parentEventId = event.eventId;
    appendActivityEvent(event);
  });
  schedule(10000, () => {
    const event: ActivityEvent = {
      ...nextEnvelope(),
      type: 'discovery.agent-selected',
      source: 'simulated',
      actorId: 'personal-assistant',
      subjectId: 'cafe-service',
      causalParentId: parentEventId,
      payload: { reason: "Luca's Cafe matches the requested café task and exposes the required capabilities." },
    };
    parentEventId = event.eventId;
    appendActivityEvent(event);
  });
  schedule(12500, () => {
    const event: ActivityEvent = {
      ...nextEnvelope(),
      type: 'message.sent',
      source: 'simulated',
      actorId: 'personal-assistant',
      subjectId: 'cafe-service',
      causalParentId: parentEventId,
      payload: { message },
    };
    parentEventId = event.eventId;
    appendActivityEvent(event);
  });
  schedule(15000, () => {
    appendActivityEvent({
      ...nextEnvelope(),
      type: 'message.received',
      source: 'simulated',
      actorId: 'cafe-service',
      subjectId: 'cafe-service',
      causalParentId: parentEventId,
      payload: { message, senderId: 'personal-assistant' },
    });
  });
};

buttons.forEach((button) => {
  button.addEventListener('click', () => {
    if (isAgentId(button.dataset.agentId)) {
      selectAgent(button.dataset.agentId);
    }
  });
});

returnLiveButton?.addEventListener('click', returnToLive);

chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = chatInput?.value.trim() ?? '';
  if (!message) return;

  sendTaskToMochi(message);
  if (chatInput) {
    chatInput.value = '';
    chatInput.focus();
  }
});

renderActivity();
