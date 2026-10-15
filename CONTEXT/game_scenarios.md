# Game Scenarios

## Studio UI Locator

Use this map when changing the opening animation or the interactive Studio UI.
The UI is written as markup in `apps/studio/src/main.ts` and animated in
`apps/studio/src/styles.css`; the CSS animation delays are seconds from the
page's initial render. Search by the selectors below rather than relying on
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
| C1 | Opening intro animation (full sequence, `0–20s`) | `main.ts`: search for `[data-world-intro]` to find the full intro markup (`.world-intro` through `.world-intro__captions`); `[data-intro-skip]` is the skip button | `styles.css`: search for `introLogo` / `.intro-world` / `.intro-caption--*`; timeline: logo `0–1.3s`, ecosystem `1–8s`, YOU + Mochi `8–11s`, peer network `12–15.3s`, exit starts `19.2s`. `main.ts`: search for `introTimer`; it calls `finishIntro` at `20s` (`80ms` with reduced motion), while Skip or `Escape` ends it immediately. |
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
   Mochi selects the Bookings agent. The game shows its domain, claimed
   scheduling capabilities, and the sources that reported it. The rest of the
   scenario follows only this agent.

4. **Mochi discovers its endpoints**  
4.1 Mochi investigates the selected domain independently through ARD, DNS-AID,
   and ANS. Skynet shows the endpoint claimed by each mechanism without hiding
   missing or conflicting results.

    4.2.  Mochi select the valid and most voted door to enter.

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

Retain the unsuccessful alternative as secondary evidence:

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

6. **Mochi represents the user to interact with the agent**  


* Mochi interact with the agent, making jusdement then send satisfying response to the suer
* We can show how does Mochi interact, make decisions behind the scene


