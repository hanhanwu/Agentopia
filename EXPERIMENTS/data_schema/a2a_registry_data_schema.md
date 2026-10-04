# A2A Registry data schema

This catalog covers every field currently present in `trust_model_comparison_a2a_registry_search.json` under `EXPERIMENTS/output/`.

When a new A2A Registry output introduces a field, add one row here with its canonical name, description, and an observed example. Define each field once.

For categorical or boolean fields with fewer than five distinct values in the current output, the description lists those values as **observed**, not necessarily exhaustive registry enums.

API endpoint used below:

- `GET /public/agents`

## Response envelope

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `ok` | Whether the HTTP request completed with a successful status. Values: `true`, `false`. | `true` | `GET /public/agents` |
| `status` | HTTP response status. | `200` | `GET /public/agents` |
| `url` | Fully resolved request URL. | `https://api.a2a-registry.org/`<br>`public/agents?q=Find+an+A2A+agent...` | `GET /public/agents` |
| `elapsedMs` | Client-observed request duration in milliseconds. | `612.6` | `GET /public/agents` |
| `headers.content-type` | Response media type retained by the experiment helper. | `application/json` | `GET /public/agents` |

## Search body

These fields occur under `data` in the response envelope.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `search.success` | Registry body-level success indicator. Values: `true`, `false`. | `true` | `GET /public/agents` |
| `search.total` | Total registry results reported for the query. | `47` | `GET /public/agents` |

## Registry agent record

These fields occur at `data.agents[]`.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `registryAgent.id` | Registry record UUID. | `d875ed2b-acbf-4d83-`<br>`ad3f-47543336c0fc` | `GET /public/agents` |
| `registryAgent.orgId` | Registry organization identifier associated with the record. | `HWEFZBB4UVzDhkGB`<br>`ZIjtGdIlihvEf9JP` | `GET /public/agents` |
| `registryAgent.packageName` | Registry package identifier. | `market.a2a402.`<br>`a2a402_agent_origin_market` | `GET /public/agents` |
| `registryAgent.displayName` | Registry-reported display name. | `A2A402 Agent Marketplace` | `GET /public/agents` |
| `registryAgent.description` | Registry-reported agent description. | `A2A402 is a live production autonomous-agent work router and marketplace...` | `GET /public/agents` |
| `registryAgent.targetAudience` | Intended audience category. Observed values: `General`, `Business`. | `General` | `GET /public/agents` |
| `registryAgent.category` | Registry category. | `General` | `GET /public/agents` |
| `registryAgent.manifestUrl` | Agent Card or manifest URL recorded by the registry. | `https://a2a402.market/`<br>`.well-known/agent-card.json` | `GET /public/agents` |
| `registryAgent.openapiUrl` | OpenAPI document URL when supplied; null when absent. | `null` | `GET /public/agents` |
| `registryAgent.protocolStd` | Protocol standard declared for the record. Observed value: `a2a`. | `a2a` | `GET /public/agents` |
| `registryAgent.visibility` | Registry visibility classification. Observed value: `public`. | `public` | `GET /public/agents` |
| `registryAgent.tags` | Registry tags attached to the record. | `[]` | `GET /public/agents` |
| `registryAgent.isVerified` | Registry boolean indicating whether its verification requirements were met. Values: `true`, `false`. | `true` | `GET /public/agents` |
| `registryAgent.verification_level` | Registry-reported categorical verification level. Observed values: `verified`, `unclaimed`, `unverified`, `github_verified`. | `verified` | `GET /public/agents` |
| `registryAgent.score` | Search relevance score returned for this query; not a trust score. | `0.63` | `GET /public/agents` |
| `registryAgent.isTopMatch` | Whether the registry marked this record as a top query match. Values: `true`, `false`. | `true` | `GET /public/agents` |
| `registryAgent.lastCheckStatus` | Latest registry health/check status string. Observed values: `changed`, `error`, `ok`, `null`. | `changed` | `GET /public/agents` |
| `registryAgent.consecutiveFailures` | Consecutive registry check failures. | `0` | `GET /public/agents` |
| `registryAgent.suggestionCount` | Number of times the registry recorded this agent as suggested. | `3182` | `GET /public/agents` |
| `registryAgent.lastSuggestedAt` | Registry timestamp for the most recent suggestion, represented as epoch seconds. | `1791064410` | `GET /public/agents` |
| `registryAgent.createdAt` | Registry record creation time, represented as epoch seconds. | `1787453909` | `GET /public/agents` |
| `registryAgent.ratingAvg` | Average user rating recorded by the registry. | `0` | `GET /public/agents` |
| `registryAgent.ratingCount` | Number of ratings contributing to the average. | `0` | `GET /public/agents` |
| `registryAgent.payment` | Payment metadata when supplied; null when absent. | `null` | `GET /public/agents` |
