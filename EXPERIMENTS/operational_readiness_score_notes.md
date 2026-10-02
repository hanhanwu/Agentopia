# Operational readiness score notes

## Proposed operational readiness model

Operational readiness asks whether a particular caller can find, read, and
connect to an agent now. It does not measure whether the operator is genuine,
the agent is safe, its claims are accurate, or its results are reliable over
time.

All AgentCensus paths below are relative to `/api/v1`. A2A Registry coverage
is limited to the two public operations already used in
`a2a_registry_api_explorer.ipynb`: `GET /public/agents` and
`POST /public/tools/validate-url`. APIs marked **write** require an owned
agent/domain and explicit approval before use.

| Dimension | Definition | AgentCensus APIs to explore | A2A Registry APIs to explore |
|---|---|---|---|
| **Schema conformance** | Does the published Agent Card validate against its claimed specification version? | | `POST /public/tools/validate-url`: retain Tier 1 schema findings and `isValid`. Use the individual findings rather than the registry's readiness score, grade, or error count. |
| **Discoverability** | Can the agent be found through a specific discovery source and query at the observation time? | `GET /search`: retain whether the agent was returned, its match kind, query relaxation, and search coverage. For an owned agent, `GET /orgs/{slug}/agents/{agentKey}/search-check` explains a hit or miss, and `GET /orgs/{slug}/agents/{agentKey}/index-status` shows whether its searchable representation is current. | `GET /public/agents`: retain the query, filters, result presence, and result position. Search relevance may explain a result but must not be treated as readiness or trust. |
| **Protocol compatibility** | Can the caller and agent agree on a supported protocol binding and version? | `GET /agents/{agentKey}`: retain declared `protocols` and, when the owner published it, the latest `activeVerification` outcome, `negotiatedVersion`, and `versionMismatch`. `PUT /orgs/{slug}/domains/{domain}/active-verification` (**write**) can enable scheduled read-only MCP/A2A negotiation for an owned domain. | `POST /public/tools/validate-url`: retain `specVersionDetected` and the fetched card's `supportedInterfaces`, `protocolBinding`, and `protocolVersion`. These are declarations; this operation does not prove that the interaction endpoint can complete a handshake. |
| **Current reachability** | Did the required discovery or interaction endpoint answer within the defined timeout during the latest check? | `GET /agents/{agentKey}`: retain account-visible `observed.status` and `observed.lastSeen`, plus a published latest `activeVerification` outcome and `lastCheckedAt` when available. For an owned agent, `GET /orgs/{slug}/agents/{agentKey}/index-status` adds `crawl.lastProbed`. Record which endpoint was checked; a reachable discovery document does not prove that the interaction endpoint is reachable. | `POST /public/tools/validate-url`: retain `isOffline`, HTTP status, response time, and target URL as one timestamped Agent Card reachability observation. `GET /public/agents`: retain `lastCheckStatus` as registry-reported context. Neither operation establishes historical uptime. |

## Boundary with the trust score

Assign every atomic signal to one calculation only:

- Operational readiness owns schema validity, source-and-query
  discoverability, runtime protocol negotiation, and the latest reachability
  result.
- Trust owns identity and control, signatures and provenance, transport
  security, authentication and authorization enforcement, capability and
  result correctness, safety, claim accuracy, and behavioral reliability over
  a defined time window.
- A current successful response can raise readiness, but it cannot establish
  historical reliability. Repeated observations belong to the trust model's
  behavioral-reliability calculation.
- A malformed, undiscoverable, incompatible, or offline agent may be unusable
  for the current caller without being dishonest or unsafe.
- Preserve `missing`, `not applicable`, `not checked`, and an observed failure
  as different states. Never turn unavailable evidence into a zero.

The A2A Registry's aggregate `readinessScore` and `grade` should remain source
outputs for comparison only. Our calculation should use the underlying
observations above so its evidence, coverage, and rule version remain explicit.
