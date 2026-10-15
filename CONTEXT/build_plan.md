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
- **Skynet-powered visuals should eventually travel beyond Agentopia.** Bloggers,
  researchers, and other creators should be able to export animations, embed
  interactive visualizations, and reuse visual subcomponents in their own media.
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

## Repository roles

- **Agentopia_Lab (private):** research workspace for data collection,
  exploration, analysis, schemas, evidence, and experiments.
- **Agentopia (public):** product workspace for presenting proven insights as
  understandable, playful visualizations.

## Visual design workflow

Before creating or editing a visual concept, reviewing one, or integrating an
approved design into the UI, read and follow
[`UI_elements_design/visual_design_principles.md`](../UI_elements_design/visual_design_principles.md).
Keep approval-stage visual artifacts in `UI_elements_design` as SVG files and
do not integrate them into the application before user approval.

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

## Long-term: portable visualizations

Keep this future possible without building a component platform too early:

1. Build each scenario as a reusable scene, separate from page layout, controls,
   data fetching, and Skynet's internal storage.
2. Define a stable, versioned visualization schema between Skynet evidence and
   Agentopia's renderer. Include evidence references so every claim remains
   inspectable.
3. After several scenarios reveal which visual elements are genuinely shared,
   extract reusable pieces such as agents, interaction trails, protocol doors,
   trust boundaries, failures, and evidence badges.
4. Offer distribution in stages: downloadable images or video first, interactive
   embeds second, and an open-source component library or SDK later.

Portable outputs should support pinned evidence snapshots, responsive layouts,
reduced motion, and privacy-conscious embeds. For now, Scenario 1 should prove
the reusable-scene approach; do not build the full SDK yet.

### Current action plan

- [ ] Finish [Scenario 1 — One Agent, Different Doors](game_scenarios.md#game-scenario-1--one-agent-different-doors)
  in Agentopia using mock data first.
- [ ] In Agentopia_Lab, explore MCP Registry versus AgentCensus MCP server data,
  and PAP's `poppy.json` versus MCP/A2A's `ai-catalog.json`.
- [ ] Add evidence-backed visualizations to Agentopia when the exploration
  produces useful insights.
- [ ] Implement initial portable visualization.
- [ ] Replace Scenario 1's mock data with real collected data.

### Discovery visualization contract

Preserve the complete discovery evidence graph, but derive simplified visual
routes from explicit node semantics, graph edges, and observed outcomes. Never
infer a route from JSON array position, display labels, or scenario-specific
node IDs. The presentation may emphasize the successful route, but it must not
hide absent, failed, unresolved, or conflicting evidence.

Keep this contract executable as well as documented:

- Give discovery nodes stable semantic roles in evidence snapshots.
- Use a pure projection function to convert evidence into visual routes.
- Cover each supported route shape and failure state with unit tests.
- Keep the raw evidence unchanged when simplifying its presentation.
- Treat two successful locators that resolve to different artifacts as a
  conflict; never merge them into one apparent route.
