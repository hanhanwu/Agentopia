# AgentCensus data schema

This catalog covers every field currently present in the AgentCensus JSON files under `EXPERIMENTS/output/`.

When a new AgentCensus output introduces a field, add one row here with its canonical name, description, and an observed example. Reusable structures are defined once and their locations are listed together; do not create duplicate definitions for search and detail responses.

For finite categorical or boolean fields with fewer than five possible values, the description includes the complete API-defined value set.

API endpoints used below:

- `GET /api/v1/search`
- `GET /api/v1/agents/{agentKey}`
- `GET /api/v1/agents/{agentKey}/documents/{source}`
- `GET /api/v1/domains/{domain}`

## Response envelope

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `ok` | Whether the HTTP request completed with a successful status. Values: `true`, `false`. | `true` | All endpoints listed above. |
| `status` | HTTP response status; may be null for a transport failure. | `200` | All endpoints listed above. |
| `url` | Fully resolved request URL. | `https://agentcensus.io/`<br>`api/v1/agents/ag_0257be5ab061` | All endpoints listed above. |
| `elapsedMs` | Client-observed request duration in milliseconds. | `131.8` | All endpoints listed above. |
| `headers.content-type` | Response media type retained by the experiment helper. | `application/json` | All endpoints listed above. |
| `headers.x-request-id` | AgentCensus request identifier for tracing one call. | `rM5gURX...GNgg==` | All endpoints listed above. |
| `headers.x-ratelimit-limit` | Request allowance reported for the current rate-limit window. | `50000` | All endpoints listed above. |
| `headers.x-ratelimit-remaining` | Requests remaining in the current window. | `49892` | All endpoints listed above. |
| `headers.x-ratelimit-reset` | UTC timestamp when the current rate-limit window resets. | `2026-10-04T00:00:00Z` | All endpoints listed above. |

## Search response

These fields occur under `data` in `trust_model_comparison_agentcensus_search.json`.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `search.query` | Natural-language query AgentCensus processed. | `Find an A2A agent`<br>`that measures AI systems` | `GET /api/v1/search` |
| `search.mode` | Retrieval mode used by the search service. Values: `hybrid`, `lexical`. | `hybrid` | `GET /api/v1/search` |
| `search.semanticAvailable` | Whether semantic retrieval was available for this query and corpus. Values: `true`, `false`. | `true` | `GET /api/v1/search` |
| `search.semanticCoverage.embeddedAgents` | Agents in the searched corpus with a stored embedding. | `509857` | `GET /api/v1/search` |
| `search.semanticCoverage.totalAgents` | Total agents in the semantic search corpus. | `556361` | `GET /api/v1/search` |
| `search.total` | Number of matching agents, subject to `totalIsExact`. | `7` | `GET /api/v1/search` |
| `search.totalIsExact` | Whether `total` is exact rather than a lower bound. Values: `true`, `false`. | `false` | `GET /api/v1/search` |
| `search.probedDomains` | Domain population searched by AgentCensus. | `148940` | `GET /api/v1/search` |
| `search.limit` | Page size applied to the request. | `20` | `GET /api/v1/search` |
| `search.offset` | Starting result offset. | `0` | `GET /api/v1/search` |
| `search.relaxation.query` | Broadened query used when the strict query returned too few results. | `Find or an or A2A or agent`<br>`or that or measures or AI or systems` | `GET /api/v1/search` |
| `search.relaxation.matchedAllWords` | Results matching all original query terms. | `1` | `GET /api/v1/search` |
| `search.relaxation.matchedSomeWords` | Additional results contributed by the broadened query. | `3` | `GET /api/v1/search` |
| `search.relaxation.threshold` | Strict-match count below which broadening is attempted. | `10` | `GET /api/v1/search` |
| `search.facets[].field` | Faceted field name. | `mechanism` | `GET /api/v1/search` |
| `search.facets[].value` | One value within the faceted field. | `a2a` | `GET /api/v1/search` |
| `search.facets[].count` | Matching result count for the facet value. | `7` | `GET /api/v1/search` |

## Agent record

This reusable structure occurs at `data.results[].agent` in search output and at `data` in an agent-detail output.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `agent.agentKey` | Stable AgentCensus identifier for the normalized agent record. | `ag_0257be5ab061` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.displayName` | Published or resolved display name. | `Council of AI — Measurement Agent` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.description` | Published description; an empty string means no description was retained. | `Independent AI-governance MEASUREMENT body...` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.domain` | Specific hostname associated with the agent. | `councilof.ai` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.registrableDomain` | Public-suffix-aware registrable domain boundary. | `councilof.ai` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.type` | Search classification. Values: `agent`, `mcp_server`. | `agent` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.capabilities` | Published capability identifiers. | `["extensions", "gspc-board"]` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.mechanisms` | Discovery surfaces that contributed to the normalized record. | `["a2a", "a2a_alt"]` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.protocols` | Published protocol tokens; may be empty. | `["a2a"]` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.activeVerification` | Active-verification summary when available; null means none is attached. | `null` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `agent.gate` | Gating or disclosure information when present. | `null` | `GET /api/v1/agents/{agentKey}` |
| `agent.selfReported` | Owner-supplied metadata separate from crawled evidence. | `null` | `GET /api/v1/agents/{agentKey}` |

## Search match

These fields occur at `data.results[].match`.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `match.kind` | Retrieval arm or combination that produced the match. | `both` | `GET /api/v1/search` |
| `match.lexicalRank` | Rank from lexical retrieval; null if that arm did not match. | `1` | `GET /api/v1/search` |
| `match.semanticRank` | Rank from semantic retrieval; null if that arm did not match. | `31` | `GET /api/v1/search` |
| `match.nameRank` | Rank from approximate display-name matching. | `null` | `GET /api/v1/search` |
| `match.domainRank` | Rank from domain matching. | `null` | `GET /api/v1/search` |
| `match.rrfScore` | Reciprocal-rank-fusion relevance score; not a trust score. | `0.02738245390355587` | `GET /api/v1/search` |
| `match.relaxed` | Whether the result came from the broadened query. Values: `true`, `false`. | `false` | `GET /api/v1/search` |

## Search observation

These fields occur at `data.results[].observed`.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `searchObserved.firstSeen` | First date AgentCensus observed the result. | `2026-09-23` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `searchObserved.lastSeen` | Most recent date AgentCensus observed the result. | `2026-09-25` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `searchObserved.primarySource` | Strongest discovery source selected by AgentCensus. | `a2a` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `searchObserved.status` | Current observed lifecycle/status classification. Values: `ACTIVE`, `UNVERIFIED`, `INACTIVE`. | `ACTIVE` | <ul><li><code>GET /api/v1/search</code></li><li><code>GET /api/v1/agents/{agentKey}</code></li></ul> |
| `searchObserved.similarity` | Semantic cosine similarity; null without a semantic match. | `0.4746238589286804` | `GET /api/v1/search` |
| `searchObserved.nameSimilarity` | Trigram display-name similarity; null without a name match. | `null` | `GET /api/v1/search` |
| `searchObserved.trust` | Compact latest trust snapshot; null when no snapshot is available. | `null` | `GET /api/v1/search` |
| `searchObserved.trust.score` | Coverage-aware composite score from the recorded ATD evaluation. | `37` | `GET /api/v1/search` |
| `searchObserved.trust.measured` | Number of dimensions actually measured. | `2` | `GET /api/v1/search` |
| `searchObserved.trust.of` | Total possible dimensions in the Trust Vector. | `5` | `GET /api/v1/search` |
| `searchObserved.trust.atdVersion` | ATD scoring-engine version. | `6ec1034` | `GET /api/v1/search` |
| `searchObserved.trust.evaluatedAt` | UTC evaluation timestamp. | `2026-09-28T12:46:37Z` | `GET /api/v1/search` |
| `searchObserved.trust.recommendedProfile` | AgentCensus-exposed recommended operating profile. Values: `UNTRUSTED`, `READ_ONLY`, `TRANSACTIONAL`, `FIDUCIARY`. | `READ_ONLY` | `GET /api/v1/search` |
| `searchObserved.trust.atdRecommendedProfile` | Recommended profile reported by ATD. Values observed under the same profile model: `UNTRUSTED`, `READ_ONLY`, `TRANSACTIONAL`, `FIDUCIARY`. | `READ_ONLY` | `GET /api/v1/search` |
| `searchObserved.trust.riskFactors` | Risk-factor identifiers emitted by the evaluation. | `["IDENTITY_CERT_DV_ONLY"]` | `GET /api/v1/search` |
| `searchObserved.overlay` | Compact behavior/safety overlay; null when neither half has publishable evidence. | `null` | `GET /api/v1/search` |
| `searchObserved.overlay.behavior` | Latest publishable active-verification observation; null when unavailable. | `null` | `GET /api/v1/search` |
| `searchObserved.overlay.safety.source` | Source of the compact safety scan. Value: `dnsaid_conformance`. | `dnsaid_conformance` | `GET /api/v1/search` |
| `searchObserved.overlay.safety.flaggedCount` | DNS-AID heuristic families that raised a finding. | `0` | `GET /api/v1/search` |
| `searchObserved.overlay.safety.familiesTotal` | Total heuristic families evaluated by this scanner version. | `8` | `GET /api/v1/search` |
| `searchObserved.overlay.safety.lastObservedAt` | Timestamp of the safety observation. | `2026-09-19T01:32:11Z` | `GET /api/v1/search` |

## Agent-detail observation and posture

These fields occur under the agent-detail `data.observed` and `data.posture`. Fields already defined in the reusable search observation retain the same meaning and are not duplicated here.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `agentObserved.endpointSameOrigin` | Whether the declared endpoint was observed on the card's own host. Values: `true`, `false`. | `true` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.transport` | Negotiated transport at fetch time. | `h2` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.tlsVersion` | Negotiated TLS version at fetch time. | `TLS 1.3` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.history[].at` | Timestamp of a recorded history event. | `2026-09-19T01:32:33Z` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.history[].kind` | History event category. | `first_seen` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.history[].summary` | Human-readable description of the history event. | `First seen via ARD catalog entry.` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.provenance[].source` | Discovery source contributing to the normalized record. | `a2a_alt` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.provenance[].sourceIdentifier` | Source-specific identifier for the discovered representation. | `a2a://https://selnoviktech.com` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.provenance[].sourceUrl` | URL from which the source representation was obtained. | `https://selnoviktech.com/`<br>`.well-known/agent-card.json` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.provenance[].firstSeen` | First date this provenance source contributed. | `2026-09-19` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.provenance[].lastSeen` | Most recent date this provenance source contributed. | `2026-09-19` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.provenance[].resolutionConfidence` | Confidence assigned to the record-resolution merge. | `0.949999988079071` | `GET /api/v1/agents/{agentKey}` |
| `agentObserved.provenance[].resolutionRule` | Rule used to merge this source into the agent record. | `identical normalized endpoint URL` | `GET /api/v1/agents/{agentKey}` |
| `agent.activeVerification.unauthenticated.detail` | Evidence detail for an unauthenticated active-verification attempt. | `matched usage 2 selector 1...` | `GET /api/v1/agents/{agentKey}` |
| `agent.activeVerification.unauthenticated.lastCheckedAt` | Date of the latest unauthenticated active-verification attempt. | `2026-10-05` | `GET /api/v1/agents/{agentKey}` |
| `agent.activeVerification.unauthenticated.method` | Active-verification method. | `tls/dane` | `GET /api/v1/agents/{agentKey}` |
| `agent.activeVerification.unauthenticated.outcome` | Active-verification outcome. | `ok` | `GET /api/v1/agents/{agentKey}` |
| `posture.authDeclared` | Whether the published metadata declares authentication. Values: `true`, `false`. | `false` | `GET /api/v1/agents/{agentKey}` |
| `posture.authSchemes` | Published authentication-scheme identifiers. | `[]` | `GET /api/v1/agents/{agentKey}` |
| `posture.deprecated` | Whether the agent is marked deprecated. Values: `true`, `false`. | `false` | `GET /api/v1/agents/{agentKey}` |
| `posture.endpointHost` | Hostname of the observed declared endpoint. | `selnoviktech.com` | `GET /api/v1/agents/{agentKey}` |

## Discovery-document record

These fields occur under `data` in successful document-snapshot outputs. `snapshot` is the complete normalized parsed record returned by AgentCensus, not the original fetched bytes.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `document.agentKey` | Stable AgentCensus identifier for the agent associated with the snapshot. | `ag_0257be5ab061` | `GET /api/v1/agents/{agentKey}/documents/{source}` |
| `document.source` | Discovery mechanism whose parsed snapshot was requested. | `a2a` | `GET /api/v1/agents/{agentKey}/documents/{source}` |
| `document.observedAt` | Timestamp when this specific discovery mechanism last answered. | `2026-09-25T11:42:10Z` | `GET /api/v1/agents/{agentKey}/documents/{source}` |
| `document.contentHash` | Content digest retained for this parsed discovery record. | `4534a687...532648` | `GET /api/v1/agents/{agentKey}/documents/{source}` |
| `document.sourceUrl` | URL from which AgentCensus obtained the source representation. | `https://pack.councilof.ai/`<br>`.well-known/agent.json` | `GET /api/v1/agents/{agentKey}/documents/{source}` |
| `document.snapshot` | Formatted JSON string containing the complete normalized parsed snapshot. | `{"event_id": "01a0d85e...", ...}` | `GET /api/v1/agents/{agentKey}/documents/{source}` |
| `document.snapshotType` | Kind of stored snapshot. Value: `parsed`. | `parsed` | `GET /api/v1/agents/{agentKey}/documents/{source}` |

## Domain record

These fields occur under `data` in domain-detail outputs.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `domain.agentCount` | Number of normalized agents currently associated with the domain. | `6` | `GET /api/v1/domains/{domain}` |
| `domain.registrableDomain` | Public-suffix-aware domain claim boundary. | `selnoviktech.com` | `GET /api/v1/domains/{domain}` |
| `domain.optOut` | Whether the domain is in the crawl opt-out register. Values: `true`, `false`. | `false` | `GET /api/v1/domains/{domain}` |
| `domain.gate` | Domain disclosure/gating information when present. | `null` | `GET /api/v1/domains/{domain}` |
| `domainObserved.firstSeen` | Timestamp when AgentCensus first observed the domain. | `2026-09-13T23:19:42Z` | `GET /api/v1/domains/{domain}` |
| `domainObserved.lastProbed` | Timestamp of the most recent domain probe. | `2026-09-19T01:32:46Z` | `GET /api/v1/domains/{domain}` |
| `domainObserved.spans` | Observation spans for published discovery mechanisms. | `[]` | `GET /api/v1/domains/{domain}` |
| `domainObserved.dnsAidCheckedAt` | Timestamp of the most recent DNS-AID conformance check. | `2026-09-19T01:32:27Z` | `GET /api/v1/domains/{domain}` |
| `domainObserved.dnsAidChecks` | DNS-AID conformance findings; may be empty. | `[]` | `GET /api/v1/domains/{domain}` |
| `dnsAidCheck.check` | DNS-AID check identifier. | `alias_mode` | `GET /api/v1/domains/{domain}` |
| `dnsAidCheck.status` | Outcome classification for one check. | `info` | `GET /api/v1/domains/{domain}` |
| `dnsAidCheck.detail` | Evidence-backed explanation of the check result. | `entry point publishes no AliasMode record...` | `GET /api/v1/domains/{domain}` |
| `dnsAidCheck.draftVersion` | DNS-AID draft version used for the check. | `draft-mozleywilliams-dnsop-dnsaid-02` | `GET /api/v1/domains/{domain}` |
| `dnsAidCheck.observedAt` | Timestamp when the check was observed. | `2026-09-19T01:32:11Z` | `GET /api/v1/domains/{domain}` |
| `dnsAidCheck.recordName` | DNS record name inspected by the check. | `_index._agents.selnoviktech.com` | `GET /api/v1/domains/{domain}` |

## Error body

These fields occur under `data` when an AgentCensus endpoint returns an error.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `error.code` | Machine-readable error identifier. | `not_found` | <ul><li><code>GET /api/v1/domains/{domain}</code></li><li><code>GET /api/v1/agents/{agentKey}/documents/{source}</code></li></ul> |
| `error.message` | Human-readable error explanation. | `No snapshot found for that source.` | <ul><li><code>GET /api/v1/domains/{domain}</code></li><li><code>GET /api/v1/agents/{agentKey}/documents/{source}</code></li></ul> |
