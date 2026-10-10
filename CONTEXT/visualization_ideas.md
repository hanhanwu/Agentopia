# Skynet Visualization Ideas

Skynet should show **what is claimed, what evidence exists, where sources disagree, and what remains untested**. Do not turn incomplete discovery metadata into an overall trust score.

## Discovery Evidence Coverage

Show how far each source was inspected:

```text
search results → unique agents → fetch attempted → document retained → fields extracted
```

- Compare AgentCensus, A2A Registry, ANS, and future sources.
- Separate `not attempted`, `fetch failed`, `document missing`, and `field absent`.
- Explain the practical impact of missing fields.
- Label this as **experiment collection coverage**, not source quality.

## Cross-Source Agent Evidence

For one agent, show normalized values side by side:

- Identity and domain
- Endpoint, protocol, and version
- Capabilities and skills
- Authentication declarations
- Evidence source, capture time, and raw artifact

Label each item as `reported`, `observed`, or `derived`. Keep `missing`, `not applicable`, `not checked`, and `failed` distinct.

## Drift and Consistency

Use one source-specific panel at a time. Do not combine AgentCensus, A2A Registry, and ANS observations into one drift result.

| Panel | Comparisons shown |
|---|---|
| AgentCensus | Compare retained AgentCensus discovery snapshots, mechanisms, and observation history for the same agent. |
| A2A Registry | Compare the Registry catalog record with `cardData` and findings returned by the Registry validator. |
| ANS | Compare the ANS TL/audit baseline with the live DNS, metadata bytes, and TLS values that the ANS registration seals. |

Within each panel, show:

```text
recorded value → newer/current value → match / drift / partial / not assessed
```

Show the exact API, URL, artifact, and capture time beside every value. Cross-source comparisons belong in the P0 evidence matrix, where values remain visibly attributed to their providers.

Only compare fields with equivalent meanings; source-specific differences are not automatically problems.

## Discovery to Interaction

Add runtime evidence when safe agent interactions are available:

```text
published claim → passive corroboration → connection → capability call → checked outcome
```

- Show metadata claims before interaction and observed behavior afterward.
- Display authentication enforcement as `unknown — not tested` until exercised.
- Keep request, response, expected outcome, timestamps, and review status.
- Show the remaining gap instead of assigning a score when evidence is incomplete.

## Interaction Trace

Visualize agent and tool transitions such as:

```text
user → agent A → agent B → tool → result
```

Show who performed each action, where responsibility becomes unclear, and which evidence supports the final result.

## Protocols

* Show where to use which protocols, and how do they work, show it in a fun way

* Protocols: PAP, A2A, MCP, ANS, ATD
