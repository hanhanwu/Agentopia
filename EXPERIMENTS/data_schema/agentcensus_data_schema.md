# AgentCensus data schema

This catalog covers every field currently present in the AgentCensus JSON files under `EXPERIMENTS/output/`.

When a new AgentCensus output introduces a field, add one row here with its canonical name, description, and an observed example. Reusable structures are defined once and their locations are listed together; do not create duplicate definitions for search and detail responses.

For finite categorical or boolean fields with fewer than five possible values, the description includes the complete API-defined value set.

## Response envelope

| Name | Description | Example value |
|---|---|---|
| `ok` | Whether the HTTP request completed with a successful status. Values: `true`, `false`. | `true` |
| `status` | HTTP response status; may be null for a transport failure. | `200` |
| `url` | Fully resolved request URL. | `https://agentcensus.io/api/v1/agents/ag_0257be5ab061` |
| `elapsedMs` | Client-observed request duration in milliseconds. | `131.8` |
| `headers.content-type` | Response media type retained by the experiment helper. | `application/json` |
| `headers.x-request-id` | AgentCensus request identifier for tracing one call. | `rM5gURXmv3fyvQTncYL3nJhWn_JS1uztQ2LjFOmNrkgGn1uG9_GNgg==` |
| `headers.x-ratelimit-limit` | Request allowance reported for the current rate-limit window. | `50000` |
| `headers.x-ratelimit-remaining` | Requests remaining in the current window. | `49892` |
| `headers.x-ratelimit-reset` | UTC timestamp when the current rate-limit window resets. | `2026-10-04T00:00:00Z` |

## Search response

These fields occur under `data` in `trust_model_comparison_agentcensus_search.json`.

| Name | Description | Example value |
|---|---|---|
| `search.query` | Natural-language query AgentCensus processed. | `Find an A2A agent that measures AI systems` |
| `search.mode` | Retrieval mode used by the search service. Values: `hybrid`, `lexical`. | `hybrid` |
| `search.semanticAvailable` | Whether semantic retrieval was available for this query and corpus. Values: `true`, `false`. | `true` |
| `search.semanticCoverage.embeddedAgents` | Agents in the searched corpus with a stored embedding. | `509857` |
| `search.semanticCoverage.totalAgents` | Total agents in the semantic search corpus. | `556361` |
| `search.total` | Number of matching agents, subject to `totalIsExact`. | `7` |
| `search.totalIsExact` | Whether `total` is exact rather than a lower bound. Values: `true`, `false`. | `false` |
| `search.probedDomains` | Domain population searched by AgentCensus. | `148940` |
| `search.limit` | Page size applied to the request. | `20` |
| `search.offset` | Starting result offset. | `0` |
| `search.relaxation.query` | Broadened query used when the strict query returned too few results. | `Find or an or A2A or agent or that or measures or AI or systems` |
| `search.relaxation.matchedAllWords` | Results matching all original query terms. | `1` |
| `search.relaxation.matchedSomeWords` | Additional results contributed by the broadened query. | `3` |
| `search.relaxation.threshold` | Strict-match count below which broadening is attempted. | `10` |
| `search.facets[].field` | Faceted field name. | `mechanism` |
| `search.facets[].value` | One value within the faceted field. | `a2a` |
| `search.facets[].count` | Matching result count for the facet value. | `7` |

## Agent record

This reusable structure occurs at `data.results[].agent` in search output and at `data` in an agent-detail output.

| Name | Description | Example value |
|---|---|---|
| `agent.agentKey` | Stable AgentCensus identifier for the normalized agent record. | `ag_0257be5ab061` |
| `agent.displayName` | Published or resolved display name. | `Council of AI — Measurement Agent` |
| `agent.description` | Published description; an empty string means no description was retained. | `Independent AI-governance MEASUREMENT body...` |
| `agent.domain` | Specific hostname associated with the agent. | `councilof.ai` |
| `agent.registrableDomain` | Public-suffix-aware registrable domain boundary. | `councilof.ai` |
| `agent.type` | Search classification. Values: `agent`, `mcp_server`. | `agent` |
| `agent.capabilities` | Published capability identifiers. | `["extensions", "gspc-board"]` |
| `agent.mechanisms` | Discovery surfaces that contributed to the normalized record. | `["a2a", "a2a_alt"]` |
| `agent.protocols` | Published protocol tokens; may be empty. | `["a2a"]` |
| `agent.activeVerification` | Active-verification summary when available; null means none is attached. | `null` |
| `agent.gate` | Gating or disclosure information when present. | `null` |
| `agent.selfReported` | Owner-supplied metadata separate from crawled evidence. | `null` |

## Search match

These fields occur at `data.results[].match`.

| Name | Description | Example value |
|---|---|---|
| `match.kind` | Retrieval arm or combination that produced the match. | `both` |
| `match.lexicalRank` | Rank from lexical retrieval; null if that arm did not match. | `1` |
| `match.semanticRank` | Rank from semantic retrieval; null if that arm did not match. | `31` |
| `match.nameRank` | Rank from approximate display-name matching. | `null` |
| `match.domainRank` | Rank from domain matching. | `null` |
| `match.rrfScore` | Reciprocal-rank-fusion relevance score; not a trust score. | `0.02738245390355587` |
| `match.relaxed` | Whether the result came from the broadened query. Values: `true`, `false`. | `false` |

## Search observation

These fields occur at `data.results[].observed`.

| Name | Description | Example value |
|---|---|---|
| `searchObserved.firstSeen` | First date AgentCensus observed the result. | `2026-09-23` |
| `searchObserved.lastSeen` | Most recent date AgentCensus observed the result. | `2026-09-25` |
| `searchObserved.primarySource` | Strongest discovery source selected by AgentCensus. | `a2a` |
| `searchObserved.status` | Current observed lifecycle/status classification. Values: `ACTIVE`, `UNVERIFIED`, `INACTIVE`. | `ACTIVE` |
| `searchObserved.similarity` | Semantic cosine similarity; null without a semantic match. | `0.4746238589286804` |
| `searchObserved.nameSimilarity` | Trigram display-name similarity; null without a name match. | `null` |
| `searchObserved.trust` | Compact latest trust snapshot; null when no snapshot is available. | `null` |
| `searchObserved.trust.score` | Coverage-aware composite score from the recorded ATD evaluation. | `37` |
| `searchObserved.trust.measured` | Number of dimensions actually measured. | `2` |
| `searchObserved.trust.of` | Total possible dimensions in the Trust Vector. | `5` |
| `searchObserved.trust.atdVersion` | ATD scoring-engine version. | `6ec1034` |
| `searchObserved.trust.evaluatedAt` | UTC evaluation timestamp. | `2026-09-28T12:46:37Z` |
| `searchObserved.trust.recommendedProfile` | AgentCensus-exposed recommended operating profile. Values: `UNTRUSTED`, `READ_ONLY`, `TRANSACTIONAL`, `FIDUCIARY`. | `READ_ONLY` |
| `searchObserved.trust.atdRecommendedProfile` | Recommended profile reported by ATD. Values observed under the same profile model: `UNTRUSTED`, `READ_ONLY`, `TRANSACTIONAL`, `FIDUCIARY`. | `READ_ONLY` |
| `searchObserved.trust.riskFactors` | Risk-factor identifiers emitted by the evaluation. | `["IDENTITY_CERT_DV_ONLY"]` |
| `searchObserved.overlay` | Compact behavior/safety overlay; null when neither half has publishable evidence. | `null` |
| `searchObserved.overlay.behavior` | Latest publishable active-verification observation; null when unavailable. | `null` |
| `searchObserved.overlay.safety.source` | Source of the compact safety scan. Value: `dnsaid_conformance`. | `dnsaid_conformance` |
| `searchObserved.overlay.safety.flaggedCount` | DNS-AID heuristic families that raised a finding. | `0` |
| `searchObserved.overlay.safety.familiesTotal` | Total heuristic families evaluated by this scanner version. | `8` |
| `searchObserved.overlay.safety.lastObservedAt` | Timestamp of the safety observation. | `2026-09-19T01:32:11Z` |

## Agent-detail observation and posture

These fields occur under the agent-detail `data.observed` and `data.posture`. Fields already defined in the reusable search observation retain the same meaning and are not duplicated here.

| Name | Description | Example value |
|---|---|---|
| `agentObserved.endpointSameOrigin` | Whether the declared endpoint was observed on the card's own host. Values: `true`, `false`. | `true` |
| `agentObserved.transport` | Negotiated transport at fetch time. | `h2` |
| `agentObserved.tlsVersion` | Negotiated TLS version at fetch time. | `TLS 1.3` |
| `agentObserved.history[].at` | Timestamp of a recorded history event. | `2026-09-19T01:32:33Z` |
| `agentObserved.history[].kind` | History event category. | `first_seen` |
| `agentObserved.history[].summary` | Human-readable description of the history event. | `First seen via ARD catalog entry.` |
| `agentObserved.provenance[].source` | Discovery source contributing to the normalized record. | `a2a_alt` |
| `agentObserved.provenance[].sourceIdentifier` | Source-specific identifier for the discovered representation. | `a2a://https://selnoviktech.com` |
| `agentObserved.provenance[].sourceUrl` | URL from which the source representation was obtained. | `https://selnoviktech.com/.well-known/agent-card.json` |
| `agentObserved.provenance[].firstSeen` | First date this provenance source contributed. | `2026-09-19` |
| `agentObserved.provenance[].lastSeen` | Most recent date this provenance source contributed. | `2026-09-19` |
| `agentObserved.provenance[].resolutionConfidence` | Confidence assigned to the record-resolution merge. | `0.949999988079071` |
| `agentObserved.provenance[].resolutionRule` | Rule used to merge this source into the agent record. | `identical normalized endpoint URL` |
| `posture.authDeclared` | Whether the published metadata declares authentication. Values: `true`, `false`. | `false` |
| `posture.authSchemes` | Published authentication-scheme identifiers. | `[]` |
| `posture.deprecated` | Whether the agent is marked deprecated. Values: `true`, `false`. | `false` |
| `posture.endpointHost` | Hostname of the observed declared endpoint. | `selnoviktech.com` |

## Domain record

These fields occur under `data` in domain-detail outputs.

| Name | Description | Example value |
|---|---|---|
| `domain.agentCount` | Number of normalized agents currently associated with the domain. | `6` |
| `domain.registrableDomain` | Public-suffix-aware domain claim boundary. | `selnoviktech.com` |
| `domain.optOut` | Whether the domain is in the crawl opt-out register. Values: `true`, `false`. | `false` |
| `domain.gate` | Domain disclosure/gating information when present. | `null` |
| `domainObserved.firstSeen` | Timestamp when AgentCensus first observed the domain. | `2026-09-13T23:19:42Z` |
| `domainObserved.lastProbed` | Timestamp of the most recent domain probe. | `2026-09-19T01:32:46Z` |
| `domainObserved.spans` | Observation spans for published discovery mechanisms. | `[]` |
| `domainObserved.dnsAidCheckedAt` | Timestamp of the most recent DNS-AID conformance check. | `2026-09-19T01:32:27Z` |
| `domainObserved.dnsAidChecks` | DNS-AID conformance findings; may be empty. | `[]` |
| `dnsAidCheck.check` | DNS-AID check identifier. | `alias_mode` |
| `dnsAidCheck.status` | Outcome classification for one check. | `info` |
| `dnsAidCheck.detail` | Evidence-backed explanation of the check result. | `entry point publishes no AliasMode record...` |
| `dnsAidCheck.draftVersion` | DNS-AID draft version used for the check. | `draft-mozleywilliams-dnsop-dnsaid-02` |
| `dnsAidCheck.observedAt` | Timestamp when the check was observed. | `2026-09-19T01:32:11Z` |
| `dnsAidCheck.recordName` | DNS record name inspected by the check. | `_index._agents.selnoviktech.com` |

## Error body

These fields occur under `data` when an AgentCensus endpoint returns an error.

| Name | Description | Example value |
|---|---|---|
| `error.code` | Machine-readable error identifier. | `not_found` |
| `error.message` | Human-readable error explanation. | `No record for that domain. It may never have been probed, or it may have been removed at its owner's request.` |
