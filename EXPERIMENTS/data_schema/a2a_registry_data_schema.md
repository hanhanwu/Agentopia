# A2A Registry data schema

This catalog covers every field currently present in `trust_model_comparison_a2a_registry_search.json` under `EXPERIMENTS/output/`.

When a new A2A Registry output introduces a field, add one row here with its canonical name, description, and an observed example. Define each field once.

For categorical or boolean fields with fewer than five distinct values in the current output, the description lists those values as **observed**, not necessarily exhaustive registry enums.

API function label used below:

- **Public-agent search:** `a2a_registry_request_json("public/agents", ...)`

## Response envelope

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `ok` | Whether the HTTP request completed with a successful status. Values: `true`, `false`. | `true` | Public-agent search |
| `status` | HTTP response status. | `200` | Public-agent search |
| `url` | Fully resolved request URL. | `https://api.a2a-registry.org/public/agents?q=Find+an+A2A+agent+that+measures+AI+systems&page=1` | Public-agent search |
| `elapsedMs` | Client-observed request duration in milliseconds. | `612.6` | Public-agent search |
| `headers.content-type` | Response media type retained by the experiment helper. | `application/json` | Public-agent search |

## Search body

These fields occur under `data` in the response envelope.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `search.success` | Registry body-level success indicator. Values: `true`, `false`. | `true` | Public-agent search |
| `search.total` | Total registry results reported for the query. | `47` | Public-agent search |

## Registry agent record

These fields occur at `data.agents[]`.

| Name | Description | Example value | Found in API function(s) |
|---|---|---|---|
| `registryAgent.id` | Registry record UUID. | `d875ed2b-acbf-4d83-ad3f-47543336c0fc` | Public-agent search |
| `registryAgent.orgId` | Registry organization identifier associated with the record. | `HWEFZBB4UVzDhkGBZIjtGdIlihvEf9JP` | Public-agent search |
| `registryAgent.packageName` | Registry package identifier. | `market.a2a402.a2a402_agent_origin_market` | Public-agent search |
| `registryAgent.displayName` | Registry-reported display name. | `A2A402 Agent Marketplace` | Public-agent search |
| `registryAgent.description` | Registry-reported agent description. | `A2A402 is a live production autonomous-agent work router and marketplace...` | Public-agent search |
| `registryAgent.targetAudience` | Intended audience category. Observed values: `General`, `Business`. | `General` | Public-agent search |
| `registryAgent.category` | Registry category. | `General` | Public-agent search |
| `registryAgent.manifestUrl` | Agent Card or manifest URL recorded by the registry. | `https://a2a402.market/.well-known/agent-card.json` | Public-agent search |
| `registryAgent.openapiUrl` | OpenAPI document URL when supplied; null when absent. | `null` | Public-agent search |
| `registryAgent.protocolStd` | Protocol standard declared for the record. Observed value: `a2a`. | `a2a` | Public-agent search |
| `registryAgent.visibility` | Registry visibility classification. Observed value: `public`. | `public` | Public-agent search |
| `registryAgent.tags` | Registry tags attached to the record. | `[]` | Public-agent search |
| `registryAgent.isVerified` | Registry boolean indicating whether its verification requirements were met. Values: `true`, `false`. | `true` | Public-agent search |
| `registryAgent.verification_level` | Registry-reported categorical verification level. Observed values: `verified`, `unclaimed`, `unverified`, `github_verified`. | `verified` | Public-agent search |
| `registryAgent.score` | Search relevance score returned for this query; not a trust score. | `0.63` | Public-agent search |
| `registryAgent.isTopMatch` | Whether the registry marked this record as a top query match. Values: `true`, `false`. | `true` | Public-agent search |
| `registryAgent.lastCheckStatus` | Latest registry health/check status string. Observed values: `changed`, `error`, `ok`, `null`. | `changed` | Public-agent search |
| `registryAgent.consecutiveFailures` | Consecutive registry check failures. | `0` | Public-agent search |
| `registryAgent.suggestionCount` | Number of times the registry recorded this agent as suggested. | `3182` | Public-agent search |
| `registryAgent.lastSuggestedAt` | Registry timestamp for the most recent suggestion, represented as epoch seconds. | `1791064410` | Public-agent search |
| `registryAgent.createdAt` | Registry record creation time, represented as epoch seconds. | `1787453909` | Public-agent search |
| `registryAgent.ratingAvg` | Average user rating recorded by the registry. | `0` | Public-agent search |
| `registryAgent.ratingCount` | Number of ratings contributing to the average. | `0` | Public-agent search |
| `registryAgent.payment` | Payment metadata when supplied; null when absent. | `null` | Public-agent search |
