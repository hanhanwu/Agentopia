# ANS data schema

This catalog covers the ANS captures stored under `captures.*.payload` in
`EXPERIMENTS/output/trust_model_evidence_bundle.json`.

The bundle contains raw DNS-over-HTTPS responses used to discover ANS
`_ans-badge` and legacy `_ra-badge` TXT records. None of the original three
domains returned a badge. The Integrity demonstration adds two
badge-discoverable examples, their complete Transparency Log badge responses,
and the two live Snitker metadata documents whose byte hashes are compared with
sealed values.

API endpoint used below:

- `GET https://dns.google/resolve`
- `GET https://transparency.ans.godaddy.com/v1/agents/{agentId}`
- The public A2A Agent Card and MCP Server Card URLs named in the Snitker registration

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `discovery[].outputLabel` | Notebook label for the selected comparison case. | `shared_council_of_ai` | `GET https://dns.google/resolve` |
| `discovery[].domain` | Agent domain checked for ANS discovery. | `councilof.ai` | `GET https://dns.google/resolve` |
| `discovery[].recordName` | ANS badge TXT name queried. Observed prefixes: `_ans-badge`, `_ra-badge`. | `_ans-badge.councilof.ai` | `GET https://dns.google/resolve` |
| `discovery[].url` | Fully resolved DNS-over-HTTPS request URL. | `https://dns.google/resolve?`<br>`name=_ans-badge.councilof.ai&type=TXT` | `GET https://dns.google/resolve` |
| `discovery[].httpStatus` | HTTP response status from the DNS-over-HTTPS resolver. Observed value: `200`. | `200` | `GET https://dns.google/resolve` |
| `discovery[].data.Status` | DNS response code. Observed values: `0` (NOERROR), `3` (NXDOMAIN). A `0` without an `Answer` still means no badge TXT record was returned. | `3` | `GET https://dns.google/resolve` |
| `discovery[].data.TC` | Whether the DNS response was truncated. Values: `true`, `false`. | `false` | `GET https://dns.google/resolve` |
| `discovery[].data.RD` | Whether recursion was requested. Values: `true`, `false`. | `true` | `GET https://dns.google/resolve` |
| `discovery[].data.RA` | Whether recursive resolution was available. Values: `true`, `false`. | `true` | `GET https://dns.google/resolve` |
| `discovery[].data.AD` | Whether the resolver marked the answer as DNSSEC-authenticated. Values: `true`, `false`. | `false` | `GET https://dns.google/resolve` |
| `discovery[].data.CD` | Whether DNSSEC checking was disabled for the query. Values: `true`, `false`. | `false` | `GET https://dns.google/resolve` |
| `discovery[].data.Question` | DNS questions echoed by the resolver. | `[{"name": "_ans-badge.councilof.ai.", "type": 16}]` | `GET https://dns.google/resolve` |
| `discovery[].data.Question[].name` | Fully qualified DNS name queried by the resolver. | `_ans-badge.councilof.ai.` | `GET https://dns.google/resolve` |
| `discovery[].data.Question[].type` | Numeric DNS record type requested. Observed value: `16` (TXT). | `16` | `GET https://dns.google/resolve` |
| `discovery[].data.Authority` | Authority records accompanying the negative DNS response. | `[{"name": "councilof.ai.", "type": 6, ...}]` | `GET https://dns.google/resolve` |
| `discovery[].data.Authority[].name` | Authoritative zone associated with the negative response. | `councilof.ai.` | `GET https://dns.google/resolve` |
| `discovery[].data.Authority[].type` | Numeric authority-record type. Observed value: `6` (SOA). | `6` | `GET https://dns.google/resolve` |
| `discovery[].data.Authority[].TTL` | Remaining authority-record time to live in seconds. | `1800` | `GET https://dns.google/resolve` |
| `discovery[].data.Authority[].data` | Raw SOA record describing the authoritative negative response. | `elliot.ns.cloudflare.com. dns.cloudflare.com. ...` | `GET https://dns.google/resolve` |
| `discovery[].data.Comment` | Resolver-provided diagnostic identifying the responding nameserver. | `Response from 108.162.192.234.` | `GET https://dns.google/resolve` |

`data.Answer[]` is absent from every response in the original three-agent
discovery capture. The separate Integrity examples below do contain badge
answers.

## Discoverable badge DNS responses

The two Integrity-example DNS captures contain the resolver response directly
at the root. The fields `Status`, `TC`, `RD`, `RA`, `AD`, `CD`, `Question[]`,
and optional `Comment` have the same meanings as their
`discovery[].data.*` counterparts above.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `badgeDns.Status` | DNS response code. Both observed badge lookups returned `0` (`NOERROR`). | `0` | `GET https://dns.google/resolve` |
| `badgeDns.TC` | Whether the response was truncated. | `false` | `GET https://dns.google/resolve` |
| `badgeDns.RD` | Whether recursion was requested. | `true` | `GET https://dns.google/resolve` |
| `badgeDns.RA` | Whether recursion was available. | `true` | `GET https://dns.google/resolve` |
| `badgeDns.AD` | Resolver assertion that DNSSEC validation succeeded. This is retained as an assertion, not treated as locally verified DNSSEC. | `true` | `GET https://dns.google/resolve` |
| `badgeDns.CD` | Whether DNSSEC checking was disabled. | `false` | `GET https://dns.google/resolve` |
| `badgeDns.Question[].name` | Queried `_ans-badge` DNS name. | `_ans-badge.agentcensus.io.` | `GET https://dns.google/resolve` |
| `badgeDns.Question[].type` | Numeric DNS type; `16` means TXT. | `16` | `GET https://dns.google/resolve` |
| `badgeDns.Answer[].name` | DNS owner name returned with the badge answer. | `_ans-badge.agentcensus.io.` | `GET https://dns.google/resolve` |
| `badgeDns.Answer[].type` | Numeric answer type; `16` means TXT. | `16` | `GET https://dns.google/resolve` |
| `badgeDns.Answer[].TTL` | Remaining badge-record TTL in seconds. | `3600` | `GET https://dns.google/resolve` |
| `badgeDns.Answer[].data` | Complete ANS badge value, including format, version, and Transparency Log URL. | `v=ans-badge1; version=v1.0.0; url=...` | `GET https://dns.google/resolve` |
| `badgeDns.Comment` | Optional resolver diagnostic naming the responding server. | `Response from 205.251.199.149.` | `GET https://dns.google/resolve` |

## Transparency Log badge

These fields occur in each complete `GET /v1/agents/{agentId}` response. Receipt of signatures and a Merkle proof is not the same as verification; the current notebook preserves them but does not cryptographically verify them.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `badge.merkleProof.leafHash` | Hex-encoded Merkle leaf hash for the sealed event. | `a6c466814350...` | `GET /v1/agents/{agentId}` |
| `badge.merkleProof.leafIndex` | Zero-based leaf position in the log tree. | `357545` | `GET /v1/agents/{agentId}` |
| `badge.merkleProof.path[]` | Base64-encoded sibling hashes forming the inclusion path. | `K/854rX0...` | `GET /v1/agents/{agentId}` |
| `badge.merkleProof.rootHash` | Base64-encoded root hash reported for the proof. | `9A/cF29Y...` | `GET /v1/agents/{agentId}` |
| `badge.merkleProof.rootSignature` | Compact JWS over the reported checkpoint/root information. | `eyJhbGci...` | `GET /v1/agents/{agentId}` |
| `badge.merkleProof.treeSize` | Tree size associated with the returned root. | `360210` | `GET /v1/agents/{agentId}` |
| `badge.merkleProof.treeVersion` | Merkle-tree proof format version. | `1` | `GET /v1/agents/{agentId}` |
| `badge.payload.logId` | Transparency Log event identifier. | `01a0f490-...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.ansId` | Stable ANS registration identifier. | `7d54a8d6-...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.ansName` | Versioned ANS name sealed in the event. | `ans://v1.2.0.godaddy.demo.ans.snitker.dev` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.eventType` | Lifecycle event type. | `AGENT_REGISTERED` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.agent.host` | Registered agent host. | `godaddy.demo.ans.snitker.dev` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.agent.name` | Registered display name. | `Snitker ANS Interoperability Demo` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.agent.version` | Registered semantic version. | `v1.2.0` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.dnsRecordsProvisioned.<recordName>` | Map of DNS names to values sealed at activation. Observed keys cover the host, `_ans`, `_ans-badge`, and `_443._tcp` TLSA records. | `v=ans-badge1; version=v1.2.0; url=...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.domainValidation` | Domain-control validation method recorded by the producer. | `ACME-DNS-01` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.identityCert.fingerprint` | Primary sealed identity-certificate fingerprint. | `SHA256:5050593e...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.identityCert.type` | Identity-certificate classification. | `X509-DV-CLIENT` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.serverCert.fingerprint` | Primary sealed server-certificate fingerprint. | `SHA256:fbc18168...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.serverCert.type` | Server-certificate classification. | `X509-DV-SERVER` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.validIdentityCerts[].fingerprint` | Fingerprint in the accepted identity-certificate set. | `SHA256:5050593e...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.validIdentityCerts[].type` | Accepted identity-certificate type. | `X509-DV-CLIENT` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.validIdentityCerts[].notAfter` | Identity-certificate expiry timestamp. | `2027-09-30T22:39:46Z` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.validServerCerts[].fingerprint` | Fingerprint in the accepted server-certificate set. | `SHA256:fbc18168...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.validServerCerts[].type` | Accepted server-certificate type. | `X509-DV-SERVER` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.validServerCerts[].notAfter` | Server-certificate expiry timestamp. | `2027-04-16T22:39:51Z` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.attestations.metadataHashes.<protocol>` | Optional protocol-keyed hash of metadata bytes sealed at activation. Snitker supplies `A2A` and `MCP`; AgentCensus supplies none. | `SHA256:22290c19...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.expiresAt` | Earliest relevant attestation expiry. | `2027-04-16T22:39:51Z` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.issuedAt` | Registration evidence issuance time. | `2026-09-30T22:39:46Z` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.raId` | Registration Authority identifier. | `raid-849e6e...` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.event.timestamp` | Producer-event timestamp. | `2026-09-30T23:04:39Z` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.keyId` | Producer signing-key identifier. | `d859e797` | `GET /v1/agents/{agentId}` |
| `badge.payload.producer.signature` | Producer's detached event signature. | `eyJhbGci...` | `GET /v1/agents/{agentId}` |
| `badge.schemaVersion` | Transparency Log envelope schema version. The observed deployment returned `V1`. | `V1` | `GET /v1/agents/{agentId}` |
| `badge.signature` | Transparency Log signature over the envelope. | `eyJhbGci...` | `GET /v1/agents/{agentId}` |
| `badge.status` | Current lifecycle status computed by the log. | `ACTIVE` | `GET /v1/agents/{agentId}` |

## Snitker A2A Agent Card

The complete card is retained because its original bytes are hashed for comparison with `metadataHashes.A2A`. Fields other than that byte-level comparison remain publisher-defined claims.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `a2aCard.name` | Published agent name. | `Snitker ANS Interoperability Demo` | Public A2A Agent Card URL |
| `a2aCard.description` | Published description. | `Inspects ANS agent configuration...` | Public A2A Agent Card URL |
| `a2aCard.version` | Published Agent Card version. | `1.2.0` | Public A2A Agent Card URL |
| `a2aCard.capabilities.extendedAgentCard` | Whether an extended Agent Card is supported. | `false` | Public A2A Agent Card URL |
| `a2aCard.capabilities.pushNotifications` | Push-notification capability declaration. | `false` | Public A2A Agent Card URL |
| `a2aCard.capabilities.streaming` | Streaming capability declaration. | `false` | Public A2A Agent Card URL |
| `a2aCard.capabilities.extensions[].uri` | Extension identifier. | `urn:ans-a2a-demo:ans6` | Public A2A Agent Card URL |
| `a2aCard.capabilities.extensions[].description` | Extension description. | `ANS-6 profile...` | Public A2A Agent Card URL |
| `a2aCard.capabilities.extensions[].params.contentBinding` | Extension content-binding declaration. | `supported` | Public A2A Agent Card URL |
| `a2aCard.capabilities.extensions[].params.diagnostics` | Extension diagnostics flag. | `true` | Public A2A Agent Card URL |
| `a2aCard.capabilities.extensions[].params.profiles[]` | Declared extension profile versions. | `1.0` | Public A2A Agent Card URL |
| `a2aCard.defaultInputModes[]` | Default accepted media types. | `application/json` | Public A2A Agent Card URL |
| `a2aCard.defaultOutputModes[]` | Default returned media types. | `application/json` | Public A2A Agent Card URL |
| `a2aCard.securityRequirements[].schemes.<schemeName>` | Required security-scheme references. Observed names: `ansDpop`, `ansReceipt`, and `ansStatus`. | `{}` | Public A2A Agent Card URL |
| `a2aCard.securitySchemes.<schemeName>.apiKeySecurityScheme.description` | Published purpose of an ANS request header. | `Fresh ES256 DPoP proof...` | Public A2A Agent Card URL |
| `a2aCard.securitySchemes.<schemeName>.apiKeySecurityScheme.location` | API-key location. | `header` | Public A2A Agent Card URL |
| `a2aCard.securitySchemes.<schemeName>.apiKeySecurityScheme.name` | HTTP header name. | `DPoP` | Public A2A Agent Card URL |
| `a2aCard.skills[].id` | Skill identifier. | `ans-compliance-check` | Public A2A Agent Card URL |
| `a2aCard.skills[].name` | Skill name. | `Inspect agent configuration` | Public A2A Agent Card URL |
| `a2aCard.skills[].description` | Skill description. | `Send a JSON data part...` | Public A2A Agent Card URL |
| `a2aCard.skills[].examples[]` | Example skill input when supplied. | `{"operation":"check_agent"...}` | Public A2A Agent Card URL |
| `a2aCard.skills[].inputModes[]` | Skill-specific accepted media types. | `application/json` | Public A2A Agent Card URL |
| `a2aCard.skills[].outputModes[]` | Skill-specific returned media types. | `application/json` | Public A2A Agent Card URL |
| `a2aCard.skills[].tags[]` | Published skill tags. | `ans` | Public A2A Agent Card URL |
| `a2aCard.supportedInterfaces[].protocolBinding` | Published protocol binding. | `JSONRPC` | Public A2A Agent Card URL |
| `a2aCard.supportedInterfaces[].protocolVersion` | Published protocol version. | `1.0` | Public A2A Agent Card URL |
| `a2aCard.supportedInterfaces[].url` | Published interface URL. | `https://godaddy.demo.ans.snitker.dev/a2a` | Public A2A Agent Card URL |

## Snitker MCP Server Card

The complete card is retained because its original bytes are hashed for comparison with `metadataHashes.MCP`. Its content remains publisher-defined apart from that byte-level comparison.

| Name | Description | Example value | Found in API endpoint(s) |
|---|---|---|---|
| `mcpCard.$schema` | Referenced MCP Server Card JSON Schema. | `https://static.modelcontextprotocol.io/...` | Public MCP Server Card URL |
| `mcpCard.name` | Published MCP server identifier. | `dev.snitker.ans.demo.godaddy/ans-a2a-demo` | Public MCP Server Card URL |
| `mcpCard.title` | Human-readable server title. | `Snitker ANS Interoperability Demo` | Public MCP Server Card URL |
| `mcpCard.version` | Published server version. | `1.2.0` | Public MCP Server Card URL |
| `mcpCard.description` | Published server description. | `Inspects ANS configuration...` | Public MCP Server Card URL |
| `mcpCard.remotes[].type` | Remote transport type. | `streamable-http` | Public MCP Server Card URL |
| `mcpCard.remotes[].url` | MCP remote URL. | `https://godaddy.demo.ans.snitker.dev/mcp` | Public MCP Server Card URL |
| `mcpCard.remotes[].headers[].name` | Optional ANS-related request header. | `DPoP` | Public MCP Server Card URL |
| `mcpCard.remotes[].headers[].description` | Header purpose. | `Fresh proof for each request...` | Public MCP Server Card URL |
| `mcpCard.remotes[].headers[].format` | Header value format. | `string` | Public MCP Server Card URL |
| `mcpCard.remotes[].headers[].isRequired` | Whether the header is required by the card. | `false` | Public MCP Server Card URL |
| `mcpCard.remotes[].supportedProtocolVersions[]` | Supported MCP protocol versions. | `2026-07-28` | Public MCP Server Card URL |
| `mcpCard._meta.com.godaddy.ans-a2a-demo/ans6.complianceTools[]` | Publisher extension listing ANS diagnostic tools. | `check_agent` | Public MCP Server Card URL |
| `mcpCard._meta.com.godaddy.ans-a2a-demo/ans6.contentBinding` | Publisher-declared content-binding policy. | `required` | Public MCP Server Card URL |
| `mcpCard._meta.com.godaddy.ans-a2a-demo/ans6.diagnostics` | Whether diagnostics are declared available. | `true` | Public MCP Server Card URL |
| `mcpCard._meta.com.godaddy.ans-a2a-demo/ans6.inspectionAccess` | Publisher-declared inspection-access rule. | `explicit targets do not require ANS authentication` | Public MCP Server Card URL |
| `mcpCard._meta.com.godaddy.ans-a2a-demo/ans6.outboundAccess` | Publisher-declared outbound-access rule. | `verified ANS caller or local operator...` | Public MCP Server Card URL |
| `mcpCard._meta.com.godaddy.ans-a2a-demo/ans6.profiles[]` | Declared ANS profile versions. | `1` | Public MCP Server Card URL |
| `mcpCard._meta.com.godaddy.ans-a2a-demo/ans6.reportSchemaVersion` | Extension report schema version. | `1.0` | Public MCP Server Card URL |
