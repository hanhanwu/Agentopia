# Data knowledge

## AgentCensus: provenance and resolution

AgentCensus can merge several discovered representations into one normalized agent record. Each `observed.provenance[]` entry records:

- `source`: where or how AgentCensus discovered the representation, such as an A2A Agent Card, registry entry, or OAuth metadata.
- `resolutionRule`: why AgentCensus considered it the same agent, such as an identical endpoint URL or matching registrable domain and normalized name.

Different sources can therefore have different resolution rules and confidence values. 
Each resolution rule has a predetermined confidence value. AgentCensus appears to assign `resolutionConfidence` from the strength of the matching rule:

- `0.95`: identical normalized endpoint URL—a strong signal that two representations describe the same agent.
- `0.80`: same registrable domain and normalized agent name—a weaker, indirect match.
- `0`: rule `new`—the source created a new record, so no merge decision was made.

Higher confidence means AgentCensus has stronger evidence that two discovered representations belong to the same normalized agent, reducing the likelihood of an incorrect merge. It does **not** mean the agent is more trustworthy, verified, secure, or accurately described. The API responses do not expose the exact scoring formula or prove that these values are calibrated probabilities, so interpret them together with `resolutionRule`.

Multiple provenance entries also do not necessarily provide independent confirmation because they may originate from the same operator or website.

## A2A Registry: Agent Card scope and publisher extensions

The A2A Registry search result and the Agent Card fetched from its `manifestUrl`
describe one registered agent endpoint. A platform or marketplace can publish a
gateway or broker as that agent. For example, the retained **A2A402 Agent
Marketplace** record describes one marketplace-level broker endpoint; it is not
a record for every agent participating in A2A402.

Agent Cards in the retained evidence do not share one uniform shape. The
validator identified the Council of AI card as A2A v1.0 and the A2A402 card as
A2A v0.3; the latter also includes a v1.0-style `supportedInterfaces` entry.
Compare shared fields only after accounting for the detected specification
version, and keep the agent release version separate from protocol versions.

Content under `validator.cardData.extensions.<publisher>` is scoped to the card
that published it. In particular, `extensions.a2a402` contains A2A402's
platform-wide marketplace and economic claims. Preserve that content as raw,
self-reported evidence, but do not normalize it into the common Agent Card
model, apply it to marketplace member agents, or interpret it as an A2A
Registry finding or independently verified fact.
