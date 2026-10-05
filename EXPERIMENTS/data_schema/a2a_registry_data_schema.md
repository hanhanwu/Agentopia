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

## Fetched Agent Card fields

These fields occur inside `validator.cardData`. They are publisher-supplied claims returned by the validator. Except for the JWS fields cataloged above, they are preserved as raw context and are not used in the Integrity interpretation.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `validator.cardData.name` | Published Agent Card name. | `Council of AI — Measurement Agent` | `POST /public/tools/validate-url` |
| `validator.cardData.description` | Published Agent Card description. | `Independent AI-governance MEASUREMENT body...` | `POST /public/tools/validate-url` |
| `validator.cardData.version` | Published agent release version. | `1.4.0` | `POST /public/tools/validate-url` |
| `validator.cardData.protocolVersion` | Published A2A protocol version. | `0.3.0` | `POST /public/tools/validate-url` |
| `validator.cardData.url` | Legacy or preferred interaction URL when published. | `https://a2a402.market/a2a` | `POST /public/tools/validate-url` |
| `validator.cardData.preferredTransport` | Published preferred transport token. | `JSONRPC` | `POST /public/tools/validate-url` |
| `validator.cardData.provider.organization` | Published provider organization. | `CSOAI Ltd` | `POST /public/tools/validate-url` |
| `validator.cardData.provider.url` | Published provider URL. | `https://councilof.ai` | `POST /public/tools/validate-url` |
| `validator.cardData.supportedInterfaces[].url` | Published interaction URL for one supported interface. | `https://councilof.ai/api/a2a` | `POST /public/tools/validate-url` |
| `validator.cardData.supportedInterfaces[].protocolBinding` | Protocol binding for one supported interface. | `JSONRPC` | `POST /public/tools/validate-url` |
| `validator.cardData.supportedInterfaces[].protocolVersion` | Protocol version for one supported interface. | `1.0` | `POST /public/tools/validate-url` |
| `validator.cardData.documentationUrl` | Published documentation URL. | `https://councilof.ai/llms.txt` | `POST /public/tools/validate-url` |
| `validator.cardData.iconUrl` | Published agent icon URL. | `https://councilof.ai/og-image.png` | `POST /public/tools/validate-url` |
| `validator.cardData.catalogUrl` | Published catalog URL. | `https://councilof.ai/interop/surface-catalog.json` | `POST /public/tools/validate-url` |
| `validator.cardData.doi` | Published digital object identifier. | `10.5281/zenodo.21991104` | `POST /public/tools/validate-url` |
| `validator.cardData.explicitly_not[]` | Publisher-declared exclusions or non-claims. | `certification` | `POST /public/tools/validate-url` |
| `validator.cardData.defaultInputModes[]` | Published default input media types. | `text/plain` | `POST /public/tools/validate-url` |
| `validator.cardData.defaultOutputModes[]` | Published default output media types. | `application/json` | `POST /public/tools/validate-url` |
| `validator.cardData.capabilities.streaming` | Whether streaming is declared. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.cardData.capabilities.pushNotifications` | Whether push notifications are declared. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.cardData.capabilities.extendedAgentCard` | Whether an extended Agent Card is declared. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.cardData.capabilities.stateTransitionHistory` | Legacy state-transition-history capability declaration. Values observed: `true`. | `true` | `POST /public/tools/validate-url` |
| `validator.cardData.capabilities.extensions[].uri` | URI identifying a declared capability extension. | `https://councilof.ai/a2a/extensions/signed-receipts/v1/` | `POST /public/tools/validate-url` |
| `validator.cardData.capabilities.extensions[].required` | Whether the capability extension is required. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `validator.cardData.capabilities.extensions[].description` | Publisher description of a capability extension. | `A DRAFT WE PUBLISH AND DO NOT YET EMIT...` | `POST /public/tools/validate-url` |
| `validator.cardData.skills[].id` | Published skill identifier. | `gspc-board` | `POST /public/tools/validate-url` |
| `validator.cardData.skills[].name` | Published skill name. | `Signed GSPC Board` | `POST /public/tools/validate-url` |
| `validator.cardData.skills[].description` | Published skill description. | `SendMessage answers with the live board...` | `POST /public/tools/validate-url` |
| `validator.cardData.skills[].tags[]` | Published skill tag. | `measurement` | `POST /public/tools/validate-url` |
| `validator.cardData.skills[].examples[]` | Published example invocation or usage text. | `SendMessage with Part.data...` | `POST /public/tools/validate-url` |

## Publisher-defined `a2a402` extension fields

These fields occur under `validator.cardData.extensions.a2a402` in the A2A402 Agent Card. The extension describes A2A402's marketplace and economic workflow, including agent registration, job discovery and bidding, contracts, delivery and evaluation, payment settlement, assets and networks, fees, recruitment, and social surfaces. `canonicalLifecycle` publishes the platform's intended sequence from a need through downstream work. This is a publisher-defined extension rather than a standard A2A protocol object or an A2A Registry finding. Its values are retained verbatim as self-reported claims and are not Integrity evidence unless independently tested or cryptographically verified.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `a2a402.platform` | Publisher-declared platform name. | `A2A402` | `POST /public/tools/validate-url` |
| `a2a402.platformType` | Publisher-declared platform classification. | `autonomous-agent platform, protocol, marketplace, and economic network` | `POST /public/tools/validate-url` |
| `a2a402.environment` | Publisher-declared deployment environment. | `production` | `POST /public/tools/validate-url` |
| `a2a402.realMoney` | Whether the publisher says real money is used. Values observed: `true`. | `true` | `POST /public/tools/validate-url` |
| `a2a402.walletRequiredForRegistration` | Whether registration is declared to require a wallet. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `a2a402.walletRequiredForA2ASettlement` | Whether A2A settlement is declared to require a wallet. Values observed: `true`. | `true` | `POST /public/tools/validate-url` |
| `a2a402.canonicalLifecycle[]` | Ordered publisher-defined marketplace lifecycle stage. | `need` | `POST /public/tools/validate-url` |
| `a2a402.openapiUrl` | Published OpenAPI URL. | `https://a2a402.market/openapi.json` | `POST /public/tools/validate-url` |
| `a2a402.llmsUrl` | Published `llms.txt` URL. | `https://a2a402.market/llms.txt` | `POST /public/tools/validate-url` |
| `a2a402.humanDocsUrl` | Human-facing documentation URL. | `https://a2a402.market/docs/` | `POST /public/tools/validate-url` |
| `a2a402.recruitmentUrl` | Machine-facing recruitment URL. | `https://a2a402.market/recruit.json` | `POST /public/tools/validate-url` |
| `a2a402.humanRecruitmentUrl` | Human-facing recruitment URL. | `https://a2a402.market/beta/` | `POST /public/tools/validate-url` |
| `a2a402.needUrl` | Published marketplace need URL. | `https://a2a402.market/need` | `POST /public/tools/validate-url` |
| `a2a402.jobsUrl` | Machine-facing jobs URL. | `https://a2a402.market/jobs` | `POST /public/tools/validate-url` |
| `a2a402.humanJobsUrl` | Human-facing jobs URL. | `https://a2a402.market/jobs-ui/` | `POST /public/tools/validate-url` |
| `a2a402.tokenUrl` | Published token metadata URL. | `https://a2a402.market/token.json` | `POST /public/tools/validate-url` |
| `a2a402.tokenListingUrl` | Published token-listing URL. | `https://a2a402.market/token-listing.json` | `POST /public/tools/validate-url` |
| `a2a402.humanTokenUrl` | Human-facing token URL. | `https://a2a402.market/token/` | `POST /public/tools/validate-url` |
| `a2a402.humanPlatformUrl` | Human-facing platform URL. | `https://a2a402.market/` | `POST /public/tools/validate-url` |
| `a2a402.humanAgentsUrl` | Human-facing agents URL. | `https://a2a402.market/agents/` | `POST /public/tools/validate-url` |
| `a2a402.humanStatsUrl` | Human-facing statistics URL. | `https://a2a402.market/stats/` | `POST /public/tools/validate-url` |
| `a2a402.humanSocialUrl` | Human-facing social URL. | `https://a2a402.market/social/` | `POST /public/tools/validate-url` |
| `a2a402.humanEconomicGraphUrl` | Human-facing economic-graph URL. | `https://a2a402.market/graph/` | `POST /public/tools/validate-url` |
| `a2a402.humanAgentGlobeUrl` | Human-facing agent-globe URL. | `https://a2a402.market/agentglobe/` | `POST /public/tools/validate-url` |
| `a2a402.humanGrowthDashboardUrl` | Human-facing growth-dashboard URL. | `https://a2a402.market/growth/` | `POST /public/tools/validate-url` |
| `a2a402.founderProgramUrl` | Published founder-program URL. | `https://a2a402.market/founders/` | `POST /public/tools/validate-url` |
| `a2a402.socialFeedUrl` | Machine-facing social-feed URL. | `https://a2a402.market/social/feed` | `POST /public/tools/validate-url` |
| `a2a402.socialAgentsUrl` | Machine-facing social-agents URL. | `https://a2a402.market/social/agents` | `POST /public/tools/validate-url` |
| `a2a402.loungeMessagesUrl` | Published lounge-messages URL. | `https://a2a402.market/lounge/messages` | `POST /public/tools/validate-url` |
| `a2a402.acceptedAssets[]` | Publisher-declared accepted settlement asset. | `USDC` | `POST /public/tools/validate-url` |
| `a2a402.primarySettlementAsset` | Publisher-declared primary settlement asset. | `USDC` | `POST /public/tools/validate-url` |
| `a2a402.secondarySettlementAsset` | Publisher-declared secondary settlement asset. | `A2A` | `POST /public/tools/validate-url` |
| `a2a402.supportedUSDCNetworks[]` | Publisher-declared USDC settlement network. | `base` | `POST /public/tools/validate-url` |
| `a2a402.a2aNetwork` | Publisher-declared A2A token network. | `base` | `POST /public/tools/validate-url` |
| `a2a402.caipChainId` | CAIP-formatted chain identifier. | `eip155:8453` | `POST /public/tools/validate-url` |
| `a2a402.chainId` | Numeric chain identifier. | `8453` | `POST /public/tools/validate-url` |
| `a2a402.tokenContract` | Published token contract address. | `0xf9e891696c022f9fe4a143a92255371253c5567a` | `POST /public/tools/validate-url` |
| `a2a402.marketplaceTreasury` | Published marketplace treasury address. | `0xD08eA67ef730fc336a9B6fB89A4B66dF67Fbb69c` | `POST /public/tools/validate-url` |
| `a2a402.marketplaceFeeBps` | Publisher-declared marketplace fee in basis points. | `500` | `POST /public/tools/validate-url` |
| `a2a402.workerShareBps` | Publisher-declared worker share in basis points. | `9500` | `POST /public/tools/validate-url` |
| `a2a402.humanTradingEnabled` | Whether human trading is declared enabled. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `a2a402.custody` | Whether the marketplace declares custody. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `a2a402.nativeToken.name` | Published native-token name. | `A2A` | `POST /public/tools/validate-url` |
| `a2a402.nativeToken.symbol` | Published native-token symbol. | `A2A` | `POST /public/tools/validate-url` |
| `a2a402.nativeToken.network` | Published native-token network. | `base` | `POST /public/tools/validate-url` |
| `a2a402.nativeToken.chainId` | Published native-token chain identifier. | `8453` | `POST /public/tools/validate-url` |
| `a2a402.nativeToken.contract` | Published native-token contract address. | `0xf9e891696c022f9fe4a143a92255371253c5567a` | `POST /public/tools/validate-url` |
| `a2a402.nativeToken.decimals` | Published native-token decimal precision. | `18` | `POST /public/tools/validate-url` |
| `a2a402.nativeToken.role` | Publisher-declared role of the native token. | `secondary` | `POST /public/tools/validate-url` |
| `a2a402.authentication.type` | Publisher-declared authentication type. | `bearer-token` | `POST /public/tools/validate-url` |
| `a2a402.authentication.agentHeader` | HTTP header declared to carry the agent identifier. | `X-Agent-Id` | `POST /public/tools/validate-url` |
| `a2a402.authentication.registrationUrl` | Published registration URL. | `https://a2a402.market/agents/register` | `POST /public/tools/validate-url` |
| `a2a402.authentication.rotationUrlTemplate` | Published token-rotation URL template. | `https://a2a402.market/agents/{agentId}/auth/rotate` | `POST /public/tools/validate-url` |
| `a2a402.authentication.rotationInvalidatesPreviousToken` | Whether rotation is declared to invalidate the prior token. Values observed: `true`. | `true` | `POST /public/tools/validate-url` |
| `a2a402.jobFeed.transport` | Publisher-declared job-feed transport. | `http-polling` | `POST /public/tools/validate-url` |
| `a2a402.jobFeed.recommendedPollingSeconds[]` | Publisher-recommended polling interval in seconds. | `15` | `POST /public/tools/validate-url` |
| `a2a402.jobFeed.structuredRequirementsVersion` | Published structured-requirements version. | `1` | `POST /public/tools/validate-url` |
| `a2a402.jobFeed.defaultScope` | Publisher-declared default job-feed scope. | `public-production` | `POST /public/tools/validate-url` |
| `a2a402.jobFeed.internalHistoryExcluded` | Whether internal history is declared excluded. Values observed: `true`. | `true` | `POST /public/tools/validate-url` |
| `a2a402.jobFeed.promotionalGenesisIncluded` | Whether promotional genesis jobs are declared included. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `a2a402.paymentExecution.protocol` | Publisher-declared payment-execution protocol. | `a2a402-payment-intent-v1` | `POST /public/tools/validate-url` |
| `a2a402.paymentExecution.mode` | Publisher-declared payment-execution mode. | `authenticated-pull` | `POST /public/tools/validate-url` |
| `a2a402.paymentExecution.pendingIntentsUrl` | Published pending payment-intents URL. | `https://a2a402.market/payments/execution/intents` | `POST /public/tools/validate-url` |
| `a2a402.paymentExecution.authenticationRequired` | Whether payment execution declares authentication required. Values observed: `true`. | `true` | `POST /public/tools/validate-url` |
| `a2a402.paymentExecution.signer` | Publisher-declared payment signer. | `payer-agent-controlled` | `POST /public/tools/validate-url` |
| `a2a402.paymentExecution.referenceRunner` | Published reference-runner command. | `npm run payments:watch` | `POST /public/tools/validate-url` |
| `a2a402.paymentExecution.privateKeyRequiredByMarketplace` | Whether the marketplace declares that it requires the payer private key. Values observed: `false`. | `false` | `POST /public/tools/validate-url` |
| `a2a402.openWork.canonicalJobsUrl` | Published canonical open-work jobs URL. | `https://a2a402.market/jobs` | `POST /public/tools/validate-url` |
| `a2a402.openWork.constructionReviewFeed` | Published construction-review feed URL. | `https://a2a402.market/jobs?status=OPEN&capability=construction.project.review` | `POST /public/tools/validate-url` |
| `a2a402.openWork.trustRoomCoordinatorAgentId` | Publisher-declared trust-room coordinator agent identifier. | `agent_trustroom_project_coordinator` | `POST /public/tools/validate-url` |
| `a2a402.openWork.capability` | Publisher-declared open-work capability. | `construction.project.review` | `POST /public/tools/validate-url` |
| `a2a402.openWork.preferredAsset` | Publisher-declared preferred open-work asset. | `USDC` | `POST /public/tools/validate-url` |
| `a2a402.openWork.supportedUSDCNetworks[]` | Publisher-declared open-work USDC network. | `base` | `POST /public/tools/validate-url` |
| `a2a402.openWork.secondaryAsset` | Publisher-declared secondary open-work asset. | `A2A` | `POST /public/tools/validate-url` |
| `a2a402.openWork.marketplaceFeeBps` | Publisher-declared open-work marketplace fee in basis points. | `500` | `POST /public/tools/validate-url` |
| `a2a402.openWork.workerShareBps` | Publisher-declared open-work worker share in basis points. | `9500` | `POST /public/tools/validate-url` |
| `a2a402.openWork.note` | Publisher note about open-work availability. | `Job availability is live and may change...` | `POST /public/tools/validate-url` |

## Registry agent record

These fields occur at `data.agents[]` in the shared search response.

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
