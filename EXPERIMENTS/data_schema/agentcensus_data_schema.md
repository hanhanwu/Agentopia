# AgentCensus data schema

This catalog covers every field currently present in the AgentCensus JSON files under `EXPERIMENTS/output/`.

When a new AgentCensus output introduces a field, add one row here with its canonical name, description, and an observed example. Reusable structures are defined once and their locations are listed together; do not create duplicate definitions for search and detail responses.

For finite categorical or boolean fields with fewer than five possible values, the description includes the complete API-defined value set.

API function labels used below:

- **Search:** `agentcensus_get_json("search", ...)`
- **Agent detail:** `agentcensus_get_json(f"agents/{agent_key}")`
- **Domain detail:** `agentcensus_get_json(f"domains/{domain}")`

## Response envelope

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `ok` | Whether the HTTP request completed with a successful status. Values: `true`, `false`. | `true` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `status` | HTTP response status; may be null for a transport failure. | `200` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `url` | Fully resolved request URL. | `https://agentcensus.io/api/v1/agents/ag_0257be5ab061` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `elapsedMs` | Client-observed request duration in milliseconds. | `131.8` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `headers.content-type` | Response media type retained by the experiment helper. | `application/json` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `headers.x-request-id` | AgentCensus request identifier for tracing one call. | `rM5gURXmv3fyvQTncYL3nJhWn_JS1uztQ2LjFOmNrkgGn1uG9_GNgg==` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `headers.x-ratelimit-limit` | Request allowance reported for the current rate-limit window. | `50000` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `headers.x-ratelimit-remaining` | Requests remaining in the current window. | `49892` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |
| `headers.x-ratelimit-reset` | UTC timestamp when the current rate-limit window resets. | `2026-10-04T00:00:00Z` | <ul><li>Search</li><li>Agent detail</li><li>Domain detail</li></ul> |

## Search response

These fields occur under `data` in `trust_model_comparison_agentcensus_search.json`.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `search.query` | Natural-language query AgentCensus processed. | `Find an A2A agent that measures AI systems` | Search |
| `search.mode` | Retrieval mode used by the search service. Values: `hybrid`, `lexical`. | `hybrid` | Search |
| `search.semanticAvailable` | Whether semantic retrieval was available for this query and corpus. Values: `true`, `false`. | `true` | Search |
| `search.semanticCoverage.embeddedAgents` | Agents in the searched corpus with a stored embedding. | `509857` | Search |
| `search.semanticCoverage.totalAgents` | Total agents in the semantic search corpus. | `556361` | Search |
| `search.total` | Number of matching agents, subject to `totalIsExact`. | `7` | Search |
| `search.totalIsExact` | Whether `total` is exact rather than a lower bound. Values: `true`, `false`. | `false` | Search |
| `search.probedDomains` | Domain population searched by AgentCensus. | `148940` | Search |
| `search.limit` | Page size applied to the request. | `20` | Search |
| `search.offset` | Starting result offset. | `0` | Search |
| `search.relaxation.query` | Broadened query used when the strict query returned too few results. | `Find or an or A2A or agent or that or measures or AI or systems` | Search |
| `search.relaxation.matchedAllWords` | Results matching all original query terms. | `1` | Search |
| `search.relaxation.matchedSomeWords` | Additional results contributed by the broadened query. | `3` | Search |
| `search.relaxation.threshold` | Strict-match count below which broadening is attempted. | `10` | Search |
| `search.facets[].field` | Faceted field name. | `mechanism` | Search |
| `search.facets[].value` | One value within the faceted field. | `a2a` | Search |
| `search.facets[].count` | Matching result count for the facet value. | `7` | Search |

## Agent record

This reusable structure occurs at `data.results[].agent` in search output and at `data` in an agent-detail output.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `agent.agentKey` | Stable AgentCensus identifier for the normalized agent record. | `ag_0257be5ab061` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.displayName` | Published or resolved display name. | `Council of AI — Measurement Agent` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.description` | Published description; an empty string means no description was retained. | `Independent AI-governance MEASUREMENT body...` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.domain` | Specific hostname associated with the agent. | `councilof.ai` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.registrableDomain` | Public-suffix-aware registrable domain boundary. | `councilof.ai` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.type` | Search classification. Values: `agent`, `mcp_server`. | `agent` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.capabilities` | Published capability identifiers. | `["extensions", "gspc-board"]` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.mechanisms` | Discovery surfaces that contributed to the normalized record. | `["a2a", "a2a_alt"]` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.protocols` | Published protocol tokens; may be empty. | `["a2a"]` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.activeVerification` | Active-verification summary when available; null means none is attached. | `null` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `agent.gate` | Gating or disclosure information when present. | `null` | Agent detail |
| `agent.selfReported` | Owner-supplied metadata separate from crawled evidence. | `null` | Agent detail |

## Search match

These fields occur at `data.results[].match`.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `match.kind` | Retrieval arm or combination that produced the match. | `both` | Search |
| `match.lexicalRank` | Rank from lexical retrieval; null if that arm did not match. | `1` | Search |
| `match.semanticRank` | Rank from semantic retrieval; null if that arm did not match. | `31` | Search |
| `match.nameRank` | Rank from approximate display-name matching. | `null` | Search |
| `match.domainRank` | Rank from domain matching. | `null` | Search |
| `match.rrfScore` | Reciprocal-rank-fusion relevance score; not a trust score. | `0.02738245390355587` | Search |
| `match.relaxed` | Whether the result came from the broadened query. Values: `true`, `false`. | `false` | Search |

## Search observation

These fields occur at `data.results[].observed`.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `searchObserved.firstSeen` | First date AgentCensus observed the result. | `2026-09-23` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `searchObserved.lastSeen` | Most recent date AgentCensus observed the result. | `2026-09-25` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `searchObserved.primarySource` | Strongest discovery source selected by AgentCensus. | `a2a` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `searchObserved.status` | Current observed lifecycle/status classification. Values: `ACTIVE`, `UNVERIFIED`, `INACTIVE`. | `ACTIVE` | <ul><li>Search</li><li>Agent detail</li></ul> |
| `searchObserved.similarity` | Semantic cosine similarity; null without a semantic match. | `0.4746238589286804` | Search |
| `searchObserved.nameSimilarity` | Trigram display-name similarity; null without a name match. | `null` | Search |
| `searchObserved.trust` | Compact latest trust snapshot; null when no snapshot is available. | `null` | Search |
| `searchObserved.trust.score` | Coverage-aware composite score from the recorded ATD evaluation. | `37` | Search |
| `searchObserved.trust.measured` | Number of dimensions actually measured. | `2` | Search |
| `searchObserved.trust.of` | Total possible dimensions in the Trust Vector. | `5` | Search |
| `searchObserved.trust.atdVersion` | ATD scoring-engine version. | `6ec1034` | Search |
| `searchObserved.trust.evaluatedAt` | UTC evaluation timestamp. | `2026-09-28T12:46:37Z` | Search |
| `searchObserved.trust.recommendedProfile` | AgentCensus-exposed recommended operating profile. Values: `UNTRUSTED`, `READ_ONLY`, `TRANSACTIONAL`, `FIDUCIARY`. | `READ_ONLY` | Search |
| `searchObserved.trust.atdRecommendedProfile` | Recommended profile reported by ATD. Values observed under the same profile model: `UNTRUSTED`, `READ_ONLY`, `TRANSACTIONAL`, `FIDUCIARY`. | `READ_ONLY` | Search |
| `searchObserved.trust.riskFactors` | Risk-factor identifiers emitted by the evaluation. | `["IDENTITY_CERT_DV_ONLY"]` | Search |
| `searchObserved.overlay` | Compact behavior/safety overlay; null when neither half has publishable evidence. | `null` | Search |
| `searchObserved.overlay.behavior` | Latest publishable active-verification observation; null when unavailable. | `null` | Search |
| `searchObserved.overlay.safety.source` | Source of the compact safety scan. Value: `dnsaid_conformance`. | `dnsaid_conformance` | Search |
| `searchObserved.overlay.safety.flaggedCount` | DNS-AID heuristic families that raised a finding. | `0` | Search |
| `searchObserved.overlay.safety.familiesTotal` | Total heuristic families evaluated by this scanner version. | `8` | Search |
| `searchObserved.overlay.safety.lastObservedAt` | Timestamp of the safety observation. | `2026-09-19T01:32:11Z` | Search |

## Agent-detail observation and posture

These fields occur under the agent-detail `data.observed` and `data.posture`. Fields already defined in the reusable search observation retain the same meaning and are not duplicated here.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `agentObserved.endpointSameOrigin` | Whether the declared endpoint was observed on the card's own host. Values: `true`, `false`. | `true` | Agent detail |
| `agentObserved.transport` | Negotiated transport at fetch time. | `h2` | Agent detail |
| `agentObserved.tlsVersion` | Negotiated TLS version at fetch time. | `TLS 1.3` | Agent detail |
| `agentObserved.history[].at` | Timestamp of a recorded history event. | `2026-09-19T01:32:33Z` | Agent detail |
| `agentObserved.history[].kind` | History event category. | `first_seen` | Agent detail |
| `agentObserved.history[].summary` | Human-readable description of the history event. | `First seen via ARD catalog entry.` | Agent detail |
| `agentObserved.provenance[].source` | Discovery source contributing to the normalized record. | `a2a_alt` | Agent detail |
| `agentObserved.provenance[].sourceIdentifier` | Source-specific identifier for the discovered representation. | `a2a://https://selnoviktech.com` | Agent detail |
| `agentObserved.provenance[].sourceUrl` | URL from which the source representation was obtained. | `https://selnoviktech.com/.well-known/agent-card.json` | Agent detail |
| `agentObserved.provenance[].firstSeen` | First date this provenance source contributed. | `2026-09-19` | Agent detail |
| `agentObserved.provenance[].lastSeen` | Most recent date this provenance source contributed. | `2026-09-19` | Agent detail |
| `agentObserved.provenance[].resolutionConfidence` | Confidence assigned to the record-resolution merge. | `0.949999988079071` | Agent detail |
| `agentObserved.provenance[].resolutionRule` | Rule used to merge this source into the agent record. | `identical normalized endpoint URL` | Agent detail |
| `posture.authDeclared` | Whether the published metadata declares authentication. Values: `true`, `false`. | `false` | Agent detail |
| `posture.authSchemes` | Published authentication-scheme identifiers. | `[]` | Agent detail |
| `posture.deprecated` | Whether the agent is marked deprecated. Values: `true`, `false`. | `false` | Agent detail |
| `posture.endpointHost` | Hostname of the observed declared endpoint. | `selnoviktech.com` | Agent detail |

## Domain record

These fields occur under `data` in domain-detail outputs.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `domain.agentCount` | Number of normalized agents currently associated with the domain. | `6` | Domain detail |
| `domain.registrableDomain` | Public-suffix-aware domain claim boundary. | `selnoviktech.com` | Domain detail |
| `domain.optOut` | Whether the domain is in the crawl opt-out register. Values: `true`, `false`. | `false` | Domain detail |
| `domain.gate` | Domain disclosure/gating information when present. | `null` | Domain detail |
| `domainObserved.firstSeen` | Timestamp when AgentCensus first observed the domain. | `2026-09-13T23:19:42Z` | Domain detail |
| `domainObserved.lastProbed` | Timestamp of the most recent domain probe. | `2026-09-19T01:32:46Z` | Domain detail |
| `domainObserved.spans` | Observation spans for published discovery mechanisms. | `[]` | Domain detail |
| `domainObserved.dnsAidCheckedAt` | Timestamp of the most recent DNS-AID conformance check. | `2026-09-19T01:32:27Z` | Domain detail |
| `domainObserved.dnsAidChecks` | DNS-AID conformance findings; may be empty. | `[]` | Domain detail |
| `dnsAidCheck.check` | DNS-AID check identifier. | `alias_mode` | Domain detail |
| `dnsAidCheck.status` | Outcome classification for one check. | `info` | Domain detail |
| `dnsAidCheck.detail` | Evidence-backed explanation of the check result. | `entry point publishes no AliasMode record...` | Domain detail |
| `dnsAidCheck.draftVersion` | DNS-AID draft version used for the check. | `draft-mozleywilliams-dnsop-dnsaid-02` | Domain detail |
| `dnsAidCheck.observedAt` | Timestamp when the check was observed. | `2026-09-19T01:32:11Z` | Domain detail |
| `dnsAidCheck.recordName` | DNS record name inspected by the check. | `_index._agents.selnoviktech.com` | Domain detail |

## Error body

These fields occur under `data` when an AgentCensus endpoint returns an error.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `error.code` | Machine-readable error identifier. | `not_found` | Domain detail |
| `error.message` | Human-readable error explanation. | `No record for that domain. It may never have been probed, or it may have been removed at its owner's request.` | Domain detail |
