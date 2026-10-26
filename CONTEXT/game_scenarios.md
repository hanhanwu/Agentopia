# Game Scenarios

## Studio UI Locator

Use this map when changing the opening animation or the interactive Studio UI.
The walkthrough lives in `apps/studio/src/main.ts` and `styles.css`; entry and
trust screens live in `entry-flow.ts` and `entry-flow.css`. Intro delays start
when the walkthrough intro is mounted, after the user chooses that route. Search by the selectors below rather than relying on
line numbers, which change as the scene is edited.

### Agent visual consistency rule

Treat `UI_elements_design/agents/agent-concepts-v1.svg` as the agent-design
source of truth. Mochi is the only personal agent and must always use the same
white, blushing squid artwork returned by `mochiArtwork()` in `main.ts`. Every
other character is a service agent and must use one of the seven colored,
arched squid variants returned by `serviceAgentArtwork()`; do not substitute
generic robots, geometric tokens, or unrelated silhouettes. Agent color and
silhouette identify the agent, so communicate status with rings, paths, icons,
labels, or motion instead of changing that identity. Reuse or extend the shared
artwork functions whenever an agent appears in C1, C2, the world, composer, or
inspector so Mochi and service agents remain consistent throughout the UI.

| Component ID | UI piece | Markup / content | Animation / behavior |
|---|---|---|---|
| C0 | Home and trust-score entry | `entry-flow.ts`, `entry-flow.css`, `trust-score.ts`; backend `server/trust-score-api.ts` and `score_worker.py` | The 1.3-second logo leads to two routes. The trust screen collects live MCP scores; Skynet stays empty until submission and owns all status messages. |
| C1 | Walkthrough intro before step 1 | `main.ts`: `[data-world-intro]`, `[data-intro-skip]`, `makeHomeButton`; `styles.css`: `.intro-world`, `.intro-caption--*` | Starts after **Understand Agents’ World**. Duration: 17.3s; exit starts at 16.5s. Home cancels and returns to the portal; Skip or Escape enters step 1. Reduced motion finishes after 80ms. Portable capture also includes the logo. |
| C2 | Service-agent search onboarding after the intro | `main.ts`: search for `.world-scene`, `.world-onboarding`, `.service-agent-field`, `serviceScout()`, and `[data-chat-form]`; the composer starts with `search for ` | `styles.css`: search for `.service-scout`, `serviceScoutDrop`, `serviceScoutHop`, and `searchPromptBeacon`. C2 starts with the canonical Mochi artwork and all seven colored squid service variants; submitting a completed search adds `.is-searching`, fades the prompt, and reveals the matched service agent. |
| C3 | Synchronized registry search and relevance results | `main.ts`: search for `[data-world-phase]`, `.registry-node`, `.request-flight`, `.sync-phase`, `.registry-ledger`, `.registry-printouts`, `.consolidation-board`, `.network-result-batch`, `.result-board`, `.chat-composer__paused`, `displayStepNumber`, `queueTimelineReplay`, `INTENT_DERIVATION_DELAY`, `UNDERSTOOD_HOLD_DELAY`, and `sendTaskToMochi()`; `activity.ts`: search for `projectDiscovery()`; temporary registry records live in `apps/studio/src/data/registry-search.mock.json` but are never labeled as mock data in the UI | Seven canonical events drive a five-step visible scenario. The first-use composer begins with “Search for” and has no supplementary hint text; after the first submission it returns with a gray “Message” placeholder that disappears while typing. Its action is labeled “Chat.” During processing it displays a pause symbol with “Waiting for Mochi's Response” and prevents further input until the final result is delivered. Steps 2–3 show the two registry streams and their completed five/three results. Step 4 is `Consolidating Results`: Agentopia keeps the Step 3 result batches while Mochi says “Reviewing...”; Skynet shows Mochi holding and reading a transparent, line-drawn paper and combines all eight records into one animated relevance-sorted list, retaining green AgentCensus and purple A2A Registry source identity. Step 5 is `Decision Made`: Mochi recommends the most relevant candidate, Agentopia emphasizes the selected Bookings agent without the intent or provenance chips, and Skynet presents its highlighted domain, capability match, and registry-backed relevance score. |


## Game Scenario 1 — One Agent, Different Doors

### Story goal

Show how Mochi finds one agent, discovers different endpoint claims for it, and
learns that a published endpoint is not necessarily an interactive endpoint.

### Example

Use the **Bookings** agent at `bookings.darknetian.com`, which can be found
through AgentCensus for meeting scheduling.

Its discovery mechanisms currently advertise different paths:

| Mechanism | Advertised endpoint | Interface |
|---|---|---|
| ARD | `https://bookings.darknetian.com/a2a` | A2A |
| ARD | `https://bookings.darknetian.com/mcp` | MCP |
| ARD | `https://bookings.darknetian.com/ask` | HTTPS |
| DNS-AID | `https://bookings.darknetian.com/` | Claims MCP |
| ANS | `https://bookings.darknetian.com/` | Claims MCP |

### Scenario steps

1. **The user asks for help**  
   The user asks Mochi to find an agent that can schedule a meeting.

2. **Mochi searches agent registries**  
   Agentopia shows Mochi searching AgentCensus and A2A Registry. Skynet shows
   which source returned results or no result.

3. **One agent is selected**  
   Mochi ranks Nic's Bookings agent first and selects it. Fabio's Agent Bench
   Travel Merchant remains second in the search evidence, but is not shown as
   another selected agent.

4. **Mochi discovers its endpoints**  
4.1 Mochi investigates the selected domain independently through ARD, DNS-AID,
   and ANS. Skynet shows the endpoint claimed by each mechanism without hiding
   missing or conflicting results.

    4.2. Mochi tries the best-supported valid door.

#### ARD path projection rules

The ARD evidence snapshot uses explicit semantic roles: `domain`,
`catalog-pointer`, `catalog-hint`, `catalog`, and `information-document`.
Skynet derives the diagram by following graph edges and outcomes; it must not
depend on node order, labels, or IDs.

The dedicated catalog pointer and bare-domain catalog hint are alternative
ways to locate an ARD catalog. They are not three sequential stages. For the
current Bookings evidence, show the successful route prominently:

```text
Domain → DNS catalog hint ✓ → ARD catalog ✓ → information documents
```

Retain the unsuccessful alternative in the evidence snapshot, but do not draw
it as part of the successful discovery path:

```text
Domain → dedicated ARD catalog pointer ✕ absent
```

Future snapshots map as follows:

```text
Hint only:       Domain → catalog hint ✓ → ARD catalog
Pointer only:    Domain → catalog pointer ✓ → ARD catalog
Same catalog:    Domain → { pointer ✓, hint ✓ } → ARD catalog
Neither works:   Domain → { pointer ✕, hint ✕ }
Conflict:        Domain → pointer ✓ → Catalog A
                        → hint ✓    → Catalog B ⚠
```

If the UI depicts a DNS lookup operation separately, the SVCB lookup may
precede the locator result. If a “DNS SVCB” card represents the returned record
itself, that card *is* the catalog hint or pointer and must not be duplicated as
another visual node. Simplification affects only presentation; the complete
lookup evidence remains inspectable.

5. **The endpoints become doors**  
   Each distinct endpoint appears as a door into the same agent. The ARD paths
   offer A2A, MCP, or HTTPS interaction, while the site-root endpoint advertised
   by DNS-AID and ANS produces no usable MCP interaction.

6. **Mochi falls back and compares DNS-AID paths**  
   Nic's DNS-AID path stops at a claimed MCP site root that returns HTTP 404.
   Mochi then checks Fabio's DNS-AID path, follows its agent-card pointer, and
   reaches working A2A and MCP endpoints. Show the paths side by side so the
   missing precise endpoint in Nic's publication is easy to see, then let Mochi
   continue through Fabio's working door.


