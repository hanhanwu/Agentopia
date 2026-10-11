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
| C3 | Synchronized registry search and relevance results | `main.ts`: search for `[data-world-phase]`, `.registry-node`, `.sync-phase`, `.registry-ledger`, `.result-board`, and `sendTaskToMochi()`; `activity.ts`: search for `projectDiscovery()` | One shared seven-event projection drives both panels: request, intent, parallel AgentCensus/A2A search, each response, normalization, and completion. Timeline review rewinds Agentopia and Skynet together. |


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

5. **The endpoints become doors**  
   Each distinct endpoint appears as a door into the same agent. The ARD paths
   offer A2A, MCP, or HTTPS interaction, while the site-root endpoint advertised
   by DNS-AID and ANS produces no usable MCP interaction.

6. **Mochi represents the user to interact with the agent**  


* Mochi interact with the agent, making jusdement then send satisfying response to the suer
* We can show how does Mochi interact, make decisions behind the scene

<details>
<summary><strong>C3 design — Search registries and rank results</strong></summary>

After the user submits a request such as `search for meeting schedule
assistant`:

- **Agentopia (left):** The request travels to Mochi. Mochi identifies the
  meeting-scheduling intent, sends parallel search signals to AgentCensus and
  A2A Registry, and receives candidate agents back. Each registry visibly ends
  as `results returned`, `no results`, or `failed`.
- **Skynet (right):** Show the synchronized timeline, live status for both
  registries, and a persistent **Behind the Scene** panel containing the current
  operation and returned candidate data. Merge duplicate agents reported by
  both sources before ordering the results.
- **Each result:** Show agent name, domain, matching reported capability,
  source badge(s), and a short reason for its position.
- **Ranking boundary:** Label the order **Search relevance**, based only on
  reported registry metadata. Do not present it as quality, trust, or proven
  capability, and do not use an unexplained numeric score.
- **End state:** Show the completed shortlist without selecting an agent. The
  Bookings selection begins in C4 / Scenario Step 3.

Suggested event flow:
`task requested → intent derived → both registries searched → results normalized → duplicates merged → results ordered → search complete`.

</details>
