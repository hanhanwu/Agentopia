# Agentopia + Skynet Build Plan

## Goal

Build toward a small observable world of AI agents.

- **Agentopia** — eventually becomes a controlled agent world for reproducing and testing real behaviors.
- **Skynet** — observes, records, visualizes, and analyzes what happens during agent discovery and interaction.

**Current priority:** learn from real agents already on the Internet before spending time and money building many agents ourselves.

---

# Phase 1 — OBSERVE

## Objective

Observe real published agents and understand what actually happens across:

```text
discover → inspect → connect → interact
```

Skynet should record every observable step and keep the underlying evidence.

Do **not** invent failure scenarios first.

> Observe the ecosystem → identify real gaps → later reproduce the important ones with controlled agents.

## Initial workflow

```text
Personal Agent / User Intent
        ↓
Search
        ↓
Candidate Agents
        ↓
Agent Card / Metadata
        ↓
Identity Verification
        ↓
Capability Selection
        ↓
Protocol / Connection Setup
        ↓
Authentication
        ↓
Interaction
        ↓
Tool / Action / Result
        ↓
Trace + Findings
```

Possible discovery sources include:

- Web search
- A2A registries / directories
- MCP registries / directories
- ARD or other discovery mechanisms
- Known public agent domains/endpoints

---

## Phase 1 To-Dos

Start with small Python experiments under [`EXPERIMENTS/`](EXPERIMENTS/). Each experiment should save the raw evidence before adding interpretation or visualization.

### 1. Search & Discovery

- [ ] Search for agents from the same natural-language request using multiple discovery sources.
- [ ] Compare agent search with MCP service search for the same request: what each returns, which better matches the task, and whether the personal agent should contact another agent or use an MCP service directly.
- [ ] Compare which agents each source returns.
- [ ] Record agents found by one source but missing from another.
- [ ] Record ranking/order differences across sources.
- [ ] Measure duplicate, stale, unreachable, or invalid results.
- [ ] Record what searchable metadata each source exposes.

**Questions to explore**

- Can an agent exist in an A2A registry but remain undiscoverable through web search?

### 2. Agent Metadata / Agent Card Inspection

- [ ] Fetch available Agent Cards, manifests, catalogs, MCP metadata, or equivalent artifacts.
- [ ] Normalize useful fields into one comparison structure.
- [ ] Compare capability claims across registry metadata, Agent Cards, websites, and observed behavior.
- [ ] Detect missing, conflicting, ambiguous, or outdated metadata.
- [ ] Record protocol, endpoint, authentication, ownership, and capability declarations when available.

**Questions to explore**

- Does the discovery source describe the agent consistently with its own metadata?
- Are capability claims specific enough for another agent to make a selection?
- What happens when a registry describes an agent's capability as "travel booking," but its Agent Card describes something different?

### 3. Identity & Ownership

- [ ] Record claimed agent identity, domain, organization, endpoint, and identifiers separately.
- [ ] Check what evidence links an agent endpoint to the organization it claims to represent.
- [ ] Compare identity information exposed across discovery mechanisms.
- [ ] Record cases where ownership can be claimed but not independently verified.
- [ ] Explore whether one agent appears under multiple identifiers or endpoints.

**Trust-model comparison progress**

- [x] Add the AgentCensus identity-and-control section to `EXPERIMENTS/trust_model_comparison.ipynb`.
- [x] Set up both AgentCensus and A2A Registry before the trust dimensions, send the same natural-language query to both, and preserve both raw search responses.
- [x] Retain one shared example, one AgentCensus-only example, and one A2A Registry-only example in a canonical `AGENTS` list reused by later dimensions.
- [x] Write complete API responses to clearly named JSON files in `EXPERIMENTS/output/`; print their locations in the notebook and render the selected-agent comparison directly as a table.
- [x] Maintain exactly two source-specific field catalogs in `EXPERIMENTS/data_schema/`, with one non-duplicated name, description, and observed example for every field currently present in the JSON outputs.
- [x] Preserve complete raw responses from `GET /agents/{agentKey}` and `GET /domains/{domain}` without a derived summary or score.
- [x] Limit the AgentCensus comparison to available public reads; exclude organization-scoped claims, assertions, credentials, recrawls, active verification, and synthetic checks.
- [x] Preserve the selected A2A Registry records from `GET /public/agents` as raw identity-and-control evidence alongside the AgentCensus outputs.

**Questions to explore**

- How does another agent know who it is actually talking to?
- What identity evidence is verifiable versus self-reported?
- After finding an agent endpoint, how can we verify that it belongs to the organization it claims to represent?

### 4. Capability & Trust

- [ ] Record the capabilities an agent claims.
- [ ] Test a small set of safe capabilities where public interaction is allowed.
- [ ] Compare claimed capability with observed behavior/result.
- [ ] Record whether capability claims have any external verification, reputation, certification, or provenance.
- [ ] Record evidence useful for deciding whether an agent should be trusted for a task.

**Questions to explore**

- Who verifies capability claims?
- Can capability claims be meaningfully compared across agents?
- If an Agent Card says the agent can perform capability X, who has verified that claim?

### 5. Protocol & Connectivity

- [ ] Detect which interaction protocols each agent exposes.
- [ ] Attempt safe connection/handshake flows where permitted.
- [ ] Record protocol versions, required fields, errors, redirects, and unsupported flows.
- [ ] Compare agents that advertise similar capabilities but expose incompatible interfaces.
- [ ] Record fallback paths such as A2A → MCP → HTTPS when applicable.

**Questions to explore**

- Can two discovered agents actually communicate?
- Where do protocol incompatibilities appear?

### 6. Authentication

- [ ] Record authentication mechanisms required by each endpoint.
- [ ] Compare advertised authentication requirements with actual connection behavior.
- [ ] Identify incompatible authentication expectations between agents/services.
- [ ] Record when authentication requirements are missing or unclear from metadata.
- [ ] Keep credentials and secrets out of experiment logs.

**Questions to explore**

- Can authentication requirements be discovered before attempting interaction?
- What prevents two otherwise compatible agents from connecting?
- What happens when Agent A wants to communicate with Agent B, but their authentication mechanisms do not match?

### 7. Permissions & Data Requests

- [ ] Record what data, scopes, permissions, or credentials an agent requests.
- [ ] Compare requested access with the task being attempted.
- [ ] Record whether permission requirements are visible before interaction.
- [ ] Record unexpected requests for additional information or broader access.
- [ ] Avoid granting sensitive or state-changing permissions during Phase 1 experiments.

**Questions to explore**

- Does the requested access appear necessary for the task?
- Can another agent or user understand the permission boundary before proceeding?
- What should happen when an agent requests more data than appears necessary for the task?

### 8. Interaction Behavior

- [ ] Record request, response, timing, status, protocol, and endpoint for each observable interaction step.
- [ ] Record redirects, delegation, tool calls, external services, and follow-up agents when visible.
- [ ] Compare expected flow from metadata with the actual flow.
- [ ] Record failures, partial results, retries, and unexpected transitions.
- [ ] Keep observed facts separate from inferred explanations.

**Questions to explore**

- Does the interaction follow the path the user or calling agent expected?
- Are important transitions hidden from the original requester?
- If an agent redirects to another agent or service, can the original user see and understand that transition?

### 9. Traceability & Provenance

- [ ] Create a trace for each experiment from discovery through final observable result.
- [ ] Preserve timestamps, source URLs/endpoints, artifacts, and raw responses where safe.
- [ ] Track agent/service/tool transitions such as `A → B → C → tool`.
- [ ] Record which statements are **reported**, **observed**, or **derived**.
- [ ] Identify where responsibility or provenance becomes unclear.

**Questions to explore**

- Can we reconstruct how the final result was produced?
- When multiple agents/services participate, who performed each action?
- In a chain such as `A → B → C → tool`, who is responsible for the final action?

### 10. Cross-Agent / Cross-Source Analysis

- [ ] Compare multiple agents attempting the same or similar task.
- [ ] Compare the same agent discovered through different sources.
- [ ] Look for repeated failure patterns across agents.
- [ ] Group findings into recurring categories rather than one-off anecdotes.
- [ ] Identify which findings are important enough to reproduce later in Agentopia.

---

## Experiment Output

Each experiment in `EXPERIMENTS/` should produce a small, inspectable record such as:

```text
experiment
├── input / user intent
├── discovery source
├── candidate agents
├── raw metadata / Agent Cards
├── identity evidence
├── protocol + auth observations
├── interaction trace
├── raw responses / artifacts
└── findings
```

Minimum finding format:

```text
Observation:
Evidence:
Why it matters:
Open question:
```

Avoid labeling something a security or trust failure unless the evidence supports that conclusion.

---

## Skynet Phase 1 Requirements

Skynet should gradually make the experiments easier to inspect rather than replacing the experiments too early.

- [ ] Capture structured observations from Python experiments.
- [ ] Preserve raw evidence alongside normalized fields.
- [ ] Visualize the discovery and interaction path.
- [ ] Compare agents, discovery sources, metadata, protocols, and outcomes.
- [ ] Surface inconsistencies, missing information, and observable gaps.
- [ ] Distinguish **reported**, **observed**, and **derived** information.
- [ ] Make every finding traceable back to evidence.

---

# Phase 2 — REPRODUCE

Take important gaps observed in Phase 1 and build controlled Agentopia agents/scenarios that reproduce them.

```text
real observed gap
      ↓
controlled agents + scenarios
      ↓
reproduce / manipulate behavior
      ↓
Agentopia becomes an agent-world testbed
```

This phase enables experiments that cannot safely or reliably be performed on third-party agents, including adversarial and controlled A/B scenarios.

Detailed scope will be defined from Phase 1 findings.

---

# Phase 3 — MONITOR

Use what was learned from observation and controlled reproduction to continuously inspect real agent ecosystems and detect meaningful abnormal, unsafe, or inconsistent behavior.

```text
observe + reproduce knowledge
          ↓
continuous ecosystem observation
          ↓
detection + evidence
          ↓
agent monitoring / security infrastructure
```

Detailed scope will be defined after Phases 1 and 2.

---

## Current Build Principle

**Do not build complexity before the observations justify it.**

For now:

1. Run Python experiments.
2. Collect real evidence.
3. Identify recurring gaps.
4. Build Skynet views that make those gaps understandable.
5. Only then decide which Agentopia agents and controlled scenarios are worth building.
