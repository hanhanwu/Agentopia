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

## High-level plan

1. **Research in Agentopia_Lab.** Collect real-world agent data, explore it, and
   analyze it for useful patterns, gaps, and questions. Agentopia_Lab is private
   for now and holds the raw evidence, experiments, and research notes.
2. **Choose evidence-backed insights.** Keep only findings that are clear,
   useful, and supported by the collected data.
3. **Visualize in Agentopia.** Turn selected insights into simple, engaging,
   and inspectable visualizations in the public Agentopia experience.

```text
Agentopia_Lab: collect → explore → analyze → select insights
                                                   ↓
Agentopia:                                  visualize insights
```

## Repository roles

- **Agentopia_Lab (private):** research workspace for data collection,
  exploration, analysis, schemas, evidence, and experiments.
- **Agentopia (public):** product workspace for presenting proven insights as
  understandable, playful visualizations.

### Current action plan

- [ ] Finish [Scenario 1 — One Agent, Different Doors](game_scenarios.md#game-scenario-1--one-agent-different-doors)
  in Agentopia using mock data first.
- [ ] In Agentopia_Lab, explore MCP Registry versus AgentCensus MCP server data,
  and PAP's `poppy.json` versus MCP/A2A's `ai-catalog.json`.
- [ ] Add evidence-backed visualizations to Agentopia when the exploration
  produces useful insights.
- [ ] Replace Scenario 1's mock data with real collected data.
