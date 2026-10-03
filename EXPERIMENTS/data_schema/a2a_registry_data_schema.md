# A2A Registry data schema

This catalog covers every field currently present in `trust_model_comparison_a2a_registry_search.json` under `EXPERIMENTS/output/`.

When a new A2A Registry output introduces a field, add one row here with its canonical name, description, and an observed example. Define each field once.

## Response envelope

| Name | Description | Example value |
|---|---|---|
| `ok` | Whether the HTTP request completed with a successful status. | `true` |
| `status` | HTTP response status. | `200` |
| `url` | Fully resolved request URL. | `https://api.a2a-registry.org/public/agents?q=Find+an+A2A+agent+that+measures+AI+systems&page=1` |
| `elapsedMs` | Client-observed request duration in milliseconds. | `612.6` |
| `headers.content-type` | Response media type retained by the experiment helper. | `application/json` |

## Search body

These fields occur under `data` in the response envelope.

| Name | Description | Example value |
|---|---|---|
| `search.success` | Registry body-level success indicator. | `true` |
| `search.total` | Total registry results reported for the query. | `47` |

## Registry agent record

These fields occur at `data.agents[]`.

| Name | Description | Example value |
|---|---|---|
| `registryAgent.id` | Registry record UUID. | `d875ed2b-acbf-4d83-ad3f-47543336c0fc` |
| `registryAgent.orgId` | Registry organization identifier associated with the record. | `HWEFZBB4UVzDhkGBZIjtGdIlihvEf9JP` |
| `registryAgent.packageName` | Registry package identifier. | `market.a2a402.a2a402_agent_origin_market` |
| `registryAgent.displayName` | Registry-reported display name. | `A2A402 Agent Marketplace` |
| `registryAgent.description` | Registry-reported agent description. | `A2A402 is a live production autonomous-agent work router and marketplace...` |
| `registryAgent.targetAudience` | Intended audience category. | `General` |
| `registryAgent.category` | Registry category. | `General` |
| `registryAgent.manifestUrl` | Agent Card or manifest URL recorded by the registry. | `https://a2a402.market/.well-known/agent-card.json` |
| `registryAgent.openapiUrl` | OpenAPI document URL when supplied; null when absent. | `null` |
| `registryAgent.protocolStd` | Protocol standard declared for the record. | `a2a` |
| `registryAgent.visibility` | Registry visibility classification. | `public` |
| `registryAgent.tags` | Registry tags attached to the record. | `[]` |
| `registryAgent.isVerified` | Registry boolean indicating whether its verification requirements were met. | `true` |
| `registryAgent.verification_level` | Registry-reported categorical verification level. | `verified` |
| `registryAgent.score` | Search relevance score returned for this query; not a trust score. | `0.63` |
| `registryAgent.isTopMatch` | Whether the registry marked this record as a top query match. | `true` |
| `registryAgent.lastCheckStatus` | Latest registry health/check status string. | `changed` |
| `registryAgent.consecutiveFailures` | Consecutive registry check failures. | `0` |
| `registryAgent.suggestionCount` | Number of times the registry recorded this agent as suggested. | `3182` |
| `registryAgent.lastSuggestedAt` | Registry timestamp for the most recent suggestion, represented as epoch seconds. | `1791064410` |
| `registryAgent.createdAt` | Registry record creation time, represented as epoch seconds. | `1787453909` |
| `registryAgent.ratingAvg` | Average user rating recorded by the registry. | `0` |
| `registryAgent.ratingCount` | Number of ratings contributing to the average. | `0` |
| `registryAgent.payment` | Payment metadata when supplied; null when absent. | `null` |
