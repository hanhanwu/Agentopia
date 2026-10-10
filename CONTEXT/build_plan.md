# Agentopia + Skynet Build Plan

## Goal

Build an open-source, observable world of AI agents that makes the emerging
agent ecosystem visible, explorable, and easier to improve.

- **Skynet** is the evidence and observability layer. It collects data across
  agent **discovery, identity, permissions, behavior, safety, and security**;
  connects claims to observed interactions; and reveals where agent-to-agent
  infrastructure is incomplete, inconsistent, or breaking.
- **Agentopia** turns that evidence into a lively game-like world. Agents,
  relationships, interactions, and failures should feel active and fun to
  explore while remaining grounded in inspectable data. It later provides
  controlled agents for reproducing important behaviors that cannot be tested
  safely or reliably on public agents.
- **The community** should be able to investigate the data, discover patterns,
  contribute experiments, and turn missing evidence into concrete research and
  engineering questions.

Success means more than cataloging agents. A builder should be able to see what
an agent claims, what the evidence actually shows, how agents interact, and
where reliability or trust breaks down—then follow that finding back to the raw
artifact and help close the gap.

The working loop is:

```text
discover → collect evidence → analyze patterns → visualize gaps → reproduce
```

Keep the experience playful, but the conclusions rigorous. Do not design scores
or visualizations before the evidence supports them.

## What the current sources provide

AgentCensus, A2A Registry, and ANS primarily provide **static discovery data**:

- Agent identity and published metadata
- Endpoints, protocols, versions, and authentication declarations
- Capability claims
- Registry, DNS, TLS, signature, and provenance artifacts
- Retained observations and validation findings

This data can support discovery coverage, cross-source comparison, provenance,
and source-specific consistency analysis. It does not directly show whether an
agent completes tasks correctly, enforces authorization, behaves safely, or
works reliably.

Those questions require **dynamic data** collected through safe user-agent or
agent-agent interactions after discovery.

---

# Stage 1 — Static discovery data

## Collect

- [x] Complete the initial static-source exploration and retain raw responses,
  Agent Cards, validation results, identity evidence, optional ANS artifacts,
  capture times, and provenance.
- [ ] Prepare the minimum normalized dataset needed by the first static views,
  including a successful replacement for the current AgentCensus HTTP 500
  search artifact when the API permits it.

Keep collection states distinct: `not attempted`, `missing`, `fetch failed`,
`not checked`, `not applicable`, and an observed value are not equivalent.

## Analyze

- [ ] Decide which static comparisons produce useful insights for agent
  discovery, selection, or understanding.

Analyze discovery coverage, cross-source fields, missing or conflicting
metadata, staleness, and source-specific drift. Keep useful findings and
discard comparisons that do not improve a user decision.

Cross-source agreement shows consistency, not capability correctness. Keep
static discovery evidence out of behavioral, safety, and general trust scores.

## Visualize

- [ ] Build the valuable static-data views identified by analysis, starting
  with **Discovery Evidence Coverage** and **Cross-Source Agent Evidence**;
  add **Drift and Consistency** only where the retained data supports it.

Start with the smallest view that produces a useful insight. Do not wait for
interaction data before building these static-data views.

---

# Stage 2 — Dynamic interaction data

Begin this stage gradually after discovering public agents with safe,
non-state-changing interaction paths.

## Collect

- [ ] Build a small dynamic dataset from safe interactions with eligible
  discovered agents.

For each attempt, retain the discovery claim, endpoint, protocol, request,
response, timestamps, expected and observed results, outcome, and any visible
delegation or tool use. Preserve blocked and inconclusive attempts too.

Do not use credentials, payments, personal data, or state-changing actions in
the initial experiments.

## Analyze

- [ ] Decide which interaction observations and recurring patterns provide
  useful insights without generalizing beyond the tested tasks.

Compare claims with outcomes and advertised protocol or authentication with
actual connection behavior. Consider reliability, authorization, safety, and
behavior only when they were directly exercised.

An agent without a completed capability attempt remains **behavior not
observed**. Metadata fetches and endpoint reachability are not behavior tests.

## Visualize

- [ ] Build the valuable dynamic-data views identified by analysis:
  **Discovery to Interaction** and, when multi-actor evidence exists,
  **Interaction Trace**.

Every displayed observation should link to its retained request, response, or
artifact.

---

# Stage 3 — Controlled reproduction

After static and dynamic observations reveal recurring, important gaps:

- [ ] Build controlled Agentopia scenarios only for valuable behaviors that
  cannot be tested safely or reliably on public agents, then use the results
  to improve Skynet's analysis and visualizations.

Do not build controlled scenarios for hypothetical problems that have not yet
produced a valuable research question.

---

## Evidence rules

- Preserve raw evidence before deriving findings or visualizations.
- Label information as **reported**, **observed**, or **derived**.
- Keep observations from different capture times visibly separate.
- Do not count the same underlying fact multiple times because several APIs
  repeat it.
- Do not label something a security or trust failure unless the evidence
  supports that conclusion.
- Prefer categorical findings and visible evidence gaps over unsupported
  numeric scores.

## Immediate focus

1. Choose the minimum normalized data needed for the first static views.
2. Build Discovery Evidence Coverage and Cross-Source Agent Evidence.
3. Use those views to decide which static comparisons are genuinely useful.
4. Begin a small safe-interaction dataset for the first dynamic view.

Detailed experiment history and scoring rules belong in `EXPERIMENTS/`, not in
this build plan.

## Reminders — priority TBD

- [ ] Check the MCP Registry and compare it with other registry data points.
- [ ] Try the [Personal Agent Protocol (PAP)](https://personalagentprotocol.org/docs/spec)
  to understand how to use it and what data, capabilities, or insights it can
  provide.

The priority and timing of these items are still to be determined.
