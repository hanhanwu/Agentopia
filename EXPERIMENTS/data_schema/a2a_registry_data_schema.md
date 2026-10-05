# A2A Registry data schema

This catalog covers every field currently present in the A2A Registry JSON files under `EXPERIMENTS/output/`.

When a new A2A Registry output introduces a field, add one row here with its canonical name, description, and an observed example. Define each field once.

For categorical or boolean fields with fewer than five distinct values in the current output, the description lists those values as **observed**, not necessarily exhaustive registry enums.

API endpoints used below:

- `GET /public/agents`
- `POST /public/tools/validate-url`

## Response envelope

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `ok` | Whether the HTTP request completed with a successful status. Values: `true`, `false`. | `true` | All endpoints listed above. |
| `status` | HTTP response status. | `200` | All endpoints listed above. |
| `url` | Fully resolved request URL. | `https://api.a2a-registry.org/`<br>`public/agents?q=Find+an+A2A+agent...` | All endpoints listed above. |
| `elapsedMs` | Client-observed request duration in milliseconds. | `612.6` | All endpoints listed above. |
| `headers.content-type` | Response media type retained by the experiment helper. | `application/json` | All endpoints listed above. |

## Search body

These fields occur under `data` in the response envelope.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `search.success` | Registry body-level success indicator. Values: `true`, `false`. | `true` | `GET /public/agents` |
| `search.total` | Total registry results reported for the query. | `47` | `GET /public/agents` |

## Validator response

These fields occur under `data` in the raw validator response. The complete fetched Agent Card is retained in `validator.cardData`, including source-defined extension fields, but only `signatures` and signature-related findings are interpreted for Integrity.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `validator.success` | Registry body-level success indicator. Values observed: `true`. | `true` | `POST /public/tools/validate-url` |
| `validator.isValid` | Whether the fetched card passed the validator's complete schema/readiness rules; not an Integrity result. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.readinessScore` | Registry readiness score retained in the raw response but excluded from Integrity. | `40` | `POST /public/tools/validate-url` |
| `validator.grade` | Registry readiness grade retained in the raw response but excluded from Integrity. | `Needs Work` | `POST /public/tools/validate-url` |
| `validator.specVersionDetected` | Protocol specification version inferred by the validator; excluded from Integrity. | `v1.0` | `POST /public/tools/validate-url` |
| `validator.cardData` | Complete fetched Agent Card, including its standard fields and publisher-defined nested extensions. | `{"name": "Council of AI — Measurement Agent", ...}` | `POST /public/tools/validate-url` |
| `validator.cardData.signatures[].protected` | JWS protected header encoded with base64url. | `eyJhbGciOiJFZERTQSIs...` | `POST /public/tools/validate-url` |
| `validator.cardData.signatures[].signature` | JWS signature value encoded with base64url. | `EEmnLz2PbJppVHOB...` | `POST /public/tools/validate-url` |
| `validator.targetUrl` | Agent Card URL fetched by the validator. | `https://councilof.ai/`<br>`.well-known/agent.json` | `POST /public/tools/validate-url` |
| `validator.isOffline` | Validator reachability classification retained raw but excluded from Integrity. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.findings` | Complete ordered validator findings, including schema, network, discovery, and trust findings. | `[{"code": "HTTP_200_OK", ...}]` | `POST /public/tools/validate-url` |
| `validator.findings[].tier` | Validator tier associated with one finding. | `tier4_trust` | `POST /public/tools/validate-url` |
| `validator.findings[].severity` | Finding outcome classification. Values observed: `pass`, `warning`, `error`. | `warning` | `POST /public/tools/validate-url` |
| `validator.findings[].code` | Stable validator finding identifier. | `JWS_PUBLIC_KEY_UNRESOLVED` | `POST /public/tools/validate-url` |
| `validator.findings[].title` | Short finding title. | `Signature [0] Key Unresolved` | `POST /public/tools/validate-url` |
| `validator.findings[].message` | Finding explanation. | `Could not resolve public key...` | `POST /public/tools/validate-url` |
| `validator.findings[].field` | Agent Card field associated with a finding when supplied. | `preferredTransport` | `POST /public/tools/validate-url` |
| `validator.findings[].suggestion` | Suggested remediation when supplied. | `Remove preferredTransport...` | `POST /public/tools/validate-url` |
| `validator.summary.tier1Status` | Aggregate Tier 1 readiness status; excluded from Integrity. | `fail` | `POST /public/tools/validate-url` |
| `validator.summary.tier2Status` | Aggregate Tier 2 readiness status; excluded from Integrity. | `warn` | `POST /public/tools/validate-url` |
| `validator.summary.tier3Status` | Aggregate Tier 3 readiness status; excluded from Integrity. | `pass` | `POST /public/tools/validate-url` |
| `validator.summary.tier4Status` | Aggregate Tier 4 status; the underlying signature findings, not this aggregate, are retained for Integrity. | `warning` | `POST /public/tools/validate-url` |
| `validator.summary.totalErrors` | Complete-validator error count; excluded from Integrity. | `3` | `POST /public/tools/validate-url` |
| `validator.summary.totalWarnings` | Complete-validator warning count; excluded from Integrity. | `2` | `POST /public/tools/validate-url` |
| `validator.summary.totalPasses` | Complete-validator pass count; excluded from Integrity. | `4` | `POST /public/tools/validate-url` |
| `validator.metadata.targetUrl` | Target URL repeated in validator request metadata. | `https://a2a402.market/`<br>`.well-known/agent-card.json` | `POST /public/tools/validate-url` |
| `validator.metadata.responseTimeMs` | Registry-observed fetch duration; excluded from Integrity. | `168` | `POST /public/tools/validate-url` |
| `validator.metadata.contentType` | Fetched response media type; excluded from Integrity. | `application/json` | `POST /public/tools/validate-url` |
| `validator.metadata.contentLengthBytes` | Fetched body length; excluded from Integrity. | `7139` | `POST /public/tools/validate-url` |
| `validator.metadata.isOffline` | Reachability classification repeated in validator metadata; excluded from Integrity. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.metadata.dnsTxtFound` | Whether the validator found its expected DNS TXT discovery evidence; excluded from Integrity. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.metadata.godaddyAnsFound` | Whether the validator found its GoDaddy ANS integration evidence; excluded from Integrity. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |

## Registry agent record

These fields occur at `data.agents[]` in the search response and at the root of the selected identity-record outputs.

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
