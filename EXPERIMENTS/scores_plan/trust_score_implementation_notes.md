# Trust score implementation notes

## AgentCensus / ATD model

Observed from `GET /api/v1/agents/{agentKey}/trust` on 2026-09-29 using
ATD version `6ec1034`.

### Evaluation pipeline

1. AgentCensus passively crawls discovery documents, DNS, and TLS.
2. It converts those observations into signals for the external Agent Trust
   Discovery (ATD) scorer.
3. ATD maps each signal to a raw score from 0 to 100 and groups signals into
   five dimensions.
4. AgentCensus derives a coverage-aware composite from the dimensions ATD
   actually measured.
5. AgentCensus attaches a separate behavior/safety overlay. The overlay does
   not currently affect the Trust Vector or composite.

### Current dimensions and signals

Only `identity` and `integrity` are measured by the current engine.
`solvency`, `behavior`, and `safety` are returned with `active: false`; their
zeroes mean **not measured**, not untrustworthy.

| Dimension | Signal | Raw-score rule |
|---|---|---|
| Identity | `certtype` | EV = 100, OV = 70, DV = 40, absent = 0 |
| Integrity | `dnssecurity` | DNSSEC + CAA = 100, one = 50, neither = 0 |
| Integrity | `agentage` | `round(100 * age_days / 180)`, capped at 100 |
| Integrity | `versionstability` | `round(100 / (1 + version_changes_30d))` |
| Integrity | fingerprint/DNS drift | match = 100, mismatch or absent = 0 |

AgentCensus currently gives the four drift signals weight 0, so they are
shown as evidence but do not move the dimension score.

### Score calculation

For each active dimension:

```text
dimension_score = round(sum(raw_score * weight) / sum(weight))
```

The composite is the integer mean of measured dimensions only:

```text
composite = round(sum(active_dimension_scores) / measured_dimension_count)
```

Always store and display `measured` beside the composite. For example, a score
of 78 from 2/5 dimensions is not equivalent to 78 from 5/5 dimensions. Scores
should only be compared when `atdVersion` is the same.

### Recommended profile and risks

The profile is determined from individual active dimensions, not from the
composite. With the default thresholds, any active dimension below 20 yields
`UNTRUSTED`. Signals also emit explanatory risk codes such as:

- `IDENTITY_CERT_DV_ONLY`
- `INTEGRITY_DNSSEC_BROKEN`
- `INTEGRITY_AGENT_NEW`

Risk codes explain contributing conditions; they are not separate scores.

### Observed example

For `ag_9b1affba8bee`, AgentCensus returned integrity 7 and identity 40:

```text
composite = round((7 + 40) / 2) = 24, measured 2 of 5
```

The agent was classified `UNTRUSTED` because integrity 7 was below 20. The
main evidence was: DV TLS certificate, no DNSSEC or CAA, record age 23 days,
and no version observation.

There is an important reproducibility discrepancy: the visible integrity
signals and weights imply `round((0 + 13 + 0) / 3) = 4`, but the API returned
7, equal to `round((0 + 13) / 2)`. This suggests the missing version signal was
excluded from the real denominator even though it was displayed with weight
1, or the API displayed the wrong effective weight. Do not copy this ambiguity.

## Proposed stronger trust model

Treat published claims as hypotheses to verify, not as proof. Keep each score's
evidence, coverage, time window, confidence, and rule version. The API
inventory below is limited to the evidence sources currently available to this
experiment. All AgentCensus paths are relative to `/api/v1` and use public
reads only. The A2A Registry column is
limited to the two public operations already used in
`a2a_registry_api_explorer.ipynb`: `GET /public/agents` (through
`search_agents`) and `POST /public/tools/validate-url` (through
`assess_agent`). Reuse their atomic observations, not the aggregate readiness
score or grade. ANS is an optional evidence provider, not a numeric score and
not a prerequisite for evaluating a non-ANS agent.

### Source inputs and outputs

This inventory separates what a source needs from what it produces. A returned
artifact is raw evidence until its signatures, bindings, expiry, and provenance
have been verified locally where applicable.

| Source | Input and access needed | Raw outputs | Current role and boundary |
|---|---|---|---|
| **AgentCensus** | Agent key or domain for public reads. | Crawled discovery documents, DNS/TLS observations, history, ATD signals and explanations, and the compact behavior/safety overlay when present. | Provides identity context and integrity evidence. The available public reads do not prove operator control or provide repeated task outcomes or authorization-enforcement tests. Its current ATD evaluation mainly measures identity and integrity. |
| **A2A Registry** | Search parameters for `GET /public/agents`; an Agent Card URL for `POST /public/tools/validate-url`. | Registry identity level and claims, fetched Agent Card, schema/network/trust-artifact findings, and readiness result. | Supplies registry assertions, self-reported claims, and validator observations. `ans_verified`, relevance, and readiness are not general trust scores. |
| **ANS public verification** | An agent host for DNS badge discovery; an ANS agent ID or badge URL is required for subsequent Transparency Log reads. Public reads depend on the deployment's access policy. | `_ans-badge` or legacy `_ra-badge` DNS responses; when a badge is discoverable, lifecycle status, sealed lifecycle event, certificate and metadata attestations, linked identities, audit history, Merkle proof, SCITT receipt, and signed status token may also be available. | Optional cryptographic identity, provenance, continuity, and integrity evidence. The selected comparison domains currently expose no public ANS badge, so no Transparency Log identity record can be fetched for them. Missing ANS discovery is not failed verification, and ANS does not measure behavior or safety. |
| **ANS registration and management** | Authentication plus display name, host, semantic version, endpoint/protocol, and a server CSR or certificate; activation also requires control of the domain and prescribed DNS records. An identity CSR and operator-identity proofs are optional. | ANS ID/name, registration state, certificates, DNS instructions, sealed events, receipts, catalog artifacts, and linked verified identities when configured. | Owner-controlled workflow; it cannot be performed for an arbitrary discovered agent. Registration and `ACTIVE` status are evidence, not scores. |

### Evidence by trust dimension

| Dimension | Definition | AgentCensus APIs to explore | A2A Registry APIs to explore | ANS APIs and artifacts to explore |
|---|---|---|---|---|
| **Identity and control** | Who operates the agent, and has control been proved? | `GET /agents/{agentKey}` and `GET /domains/{domain}` for public identity context. Treat operator names, domains, endpoints, and discovery metadata as claims; these reads do not prove operator or domain control. | `GET /public/agents`: retain `verificationLevel`, `isVerified`, organization/package claims, and manifest domain as registry-reported identity evidence. Do not convert the verification rank into a percentage or assume it proves the real-world organization. | Query `_ans-badge.{host}` TXT, then legacy `_ra-badge.{host}` TXT. Only when discovery returns an ANS agent ID or badge URL, call `GET /v1/agents/{agentId}` on that Transparency Log and retain the current lifecycle status, sealed event, certificate attestations, linked identities, and Merkle proof. Verify signatures, inclusion proof, status, expiry, and certificate or identity bindings locally. The selected domains returned no badge record on 2026-10-04 UTC; record this as not ANS-discoverable, not as a verification failure. |
| **Integrity** | Are its discovery records, versions, endpoints, and signatures consistent? | `GET /agents/{agentKey}`, `GET /agents/{agentKey}/documents/{document}`, and `GET /domains/{domain}` for public provenance, history, TLS, and DNS evidence. Do not reuse readiness-owned schema, protocol-negotiation, or latest-reachability signals in this score. | `POST /public/tools/validate-url`: retain the Agent Card's JWS objects and all signature-related validator findings so `valid`, `unresolved`, `invalid`, `absent`, and `not checked` remain distinct. Only a passing cryptographic JWS finding is positive document-integrity evidence. An unresolved key is unverified evidence, not an integrity failure; absence is not failure. A signature counts as identity evidence only when its key is independently bound to a verified operator. Schema findings, specification version, HTTPS/reachability findings, and the readiness score, grade, error count, and warning count are outside this dimension and must not be used in its interpretation. Preserve the complete raw validator response once as a shared artifact for provenance and later dimensions; expose only signature-relevant fields in the Integrity comparison and do not create dimension-specific copies of the same response. | Retain the badge's sealed event and Merkle proof, `GET /v1/agents/{agentId}/audit`, the SCITT receipt from `/receipt`, and the signed `/status-token` when enabled. Extract sealed certificate fingerprints, metadata hashes, DNS-record attestations, lifecycle history, and their timestamps. Compare authenticated sealed values with fresh DNS, TLS, and document observations; an ANS artifact alone does not establish that the current live value still matches. For the selected examples, reuse `trust_model_comparison_ans_identity_discovery.json`: because it contains no badge TXT answer, no ANS agent ID or Transparency Log location is available, so do not create another Integrity JSON file or report an integrity failure. |
| **Behavioral reliability** | Does it remain available and produce correct results repeatedly? | — No direct evidence from the available public reads. Search results, history, provenance, and the latest observation do not establish repeated task correctness over a defined window. | — No direct evidence. | — No direct evidence. Registration continuity and certificate availability do not demonstrate repeated task success or service reliability. |
| **Security and authorization** | Does it enforce authentication, scope, and destructive-action boundaries? | `GET /agents/{agentKey}` exposes declared authentication posture only. The available public reads do not test unauthenticated refusal, scopes, least privilege, or destructive-action boundaries. | `POST /public/tools/validate-url`: retain HTTPS enforcement and the fetched card's `securitySchemes` and `security` fields. Treat the latter as self-reported claims; this endpoint does not show that authentication, scopes, or destructive-action boundaries are enforced. | Partial: retain verified server/identity certificate bindings and declared mTLS-capable identity material. These can authenticate a connection or peer but do not show that application-level authentication, scopes, least privilege, or destructive-action boundaries are enforced. |
| **Safety** | Does it avoid prohibited or harmful behavior under controlled tests? | `GET /agents/{agentKey}/trust` exposes the DNS-AID safety overlay, and `GET /domains/{domain}` exposes DNS-AID conformance observations. These infrastructure observations do not demonstrate safe agent behavior and do not affect the current Trust Vector. | — No direct evidence. | — No direct evidence. |
| **Claim accuracy** | How often do published claims agree with independent observations? | `GET /agents/{agentKey}` and `GET /agents/{agentKey}/documents/{document}` expose published claims and source consistency. Agreement among records from the same operator is not independent validation of capability, behavior, or authorization claims. | Compare registry fields from `GET /public/agents` with the fetched `cardData` and observations from `POST /public/tools/validate-url`, including identity, description, protocol/version, endpoint, capabilities, and authentication declarations. Agreement is cross-source consistency, not independent proof that capability or behavior claims are true. | Use sealed version, endpoint, certificate, metadata-hash, and DNS attestations as an authenticated baseline, then compare them with fresh independent observations. Agreement establishes consistency with the registered baseline, not that capability or behavior claims are true. |

### ANS Integrity demonstration examples

The selected task agents remain unassessed by ANS because their shared discovery
artifact contains no badge answer. Two additional public registrations captured
on 2026-10-04 demonstrate the Integrity workflow without changing the selected
comparison set:

- **Snitker ANS Interoperability Demo:** the live `_ans-badge` value matches the
  value in its downloaded Transparency Log badge, and the live A2A and MCP
  metadata bytes match both sealed SHA-256 hashes.
- **AgentCensus:** the live `_ans-badge` record declares `v1.0.0`, while the
  downloaded log badge seals `v2.0.0`. Report this as potential drift requiring
  confirmation, not as a proven failure.

For the second example, reuse a narrow AgentCensus corroboration capture. Its
`ans` snapshot also observed `v1.0.0`, matching the live badge rather than the
log's sealed `v2.0.0`; its A2A and alternate-A2A snapshots share a content hash
and publish `v1.3`. This supports a stale or lagging live ANS publication as the
specific issue to investigate, while preserving the possibility that version
semantics differ by discovery source. AgentCensus also reports successful
TLS/DANE active verification for the endpoint, but that validates certificate
binding rather than badge freshness. Keep this supplemental table separate
from the original three-agent comparison. Do not add A2A Registry Integrity
artifacts for these examples unless signature evidence becomes available: the
current public validation returned unsigned cards and no positive JWS evidence.

These are value-comparison results only. The capture retains the producer and
Transparency Log signatures and Merkle proof, but the notebook does not yet
verify those signatures, the inclusion proof and checkpoint, or the DNSSEC
chain. Google Public DNS `AD=true` is a resolver assertion, not local DNSSEC
verification.

## Requirements for our implementation

- Treat each complete API response as a shared raw artifact. Save one JSON file
  for one unique request and capture, then let every relevant trust dimension,
  readiness check, capability analysis, and claim comparison read that same
  file rather than re-fetching the request or writing copied responses.
- A dimension-specific notebook table or interpretation should select fields
  from the shared raw artifact in memory. Do not save a derived JSON summary
  merely to give another dimension its own file. Create another artifact only
  when it contains genuinely new evidence, such as a different endpoint,
  request body, subject, source, or capture time.
- Reuse does not make historical evidence current. Re-fetch and save a new,
  separately named capture when the analysis requires freshness, the earlier
  call failed or was incomplete, the API or rule version changed, or the
  request parameters differ. Keep the original artifact so changes over time
  remain inspectable.
- Record which shared artifact and fields support each derived table or finding
  so later dimensions can reuse evidence without silently changing its source,
  timestamp, or meaning.
- Preserve raw observations, timestamps, provenance, signal version, weights,
  and explanations so every score can be reproduced exactly.
- Represent `missing`, `not applicable`, `not checked`, and an observed zero as
  different states. Never silently treat missing evidence as failure or omit it
  from a denominator.
- Return the numerator and denominator used for every dimension and composite.
- Version the scoring rules and never compare scores across versions without an
  explicit migration or re-evaluation.
- Keep self-reported claims, ownership proofs, passive observations, and
  inferred conclusions as separate evidence classes.
- Treat received ANS artifacts as unverified until the relevant producer and
  Transparency Log signatures, inclusion proof, status, expiry, and bindings
  have been checked. Record both receipt and verification outcomes.
- Keep ANS lifecycle states and A2A `ans_verified` categorical; do not convert
  them into percentages or treat them as standalone trust scores.
- Distinguish an agent that is not ANS-registered from one that was not checked,
  could not be verified, failed verification, or was verified successfully.
- Deduplicate evidence by underlying fact and provenance. An ANS fact repeated
  by AgentCensus and the A2A Registry is not three independent confirmations.
- Add real behavior and safety measurements instead of presenting infrastructure
  posture as overall agent trust.
- Treat a composite as a summary with coverage, not a verdict, probability, or
  ranking key.

## References

- AgentCensus API: <https://agentcensus.io/docs>
- AgentCensus signal definitions: <https://agentcensus.io/docs/signals>
- AgentCensus OpenAPI: <https://agentcensus.io/openapi.json>
- ATD source: <https://github.com/agentnameservice/agent-trust-discovery>
- Exact observed scorer version: <https://github.com/agentnameservice/agent-trust-discovery/tree/6ec1034>
- ANS source: <https://github.com/agentnameservice/ans>
- ANS Management API: <https://github.com/agentnameservice/ans/blob/main/spec/api-spec-v2.yaml>
- ANS Transparency Log API: <https://github.com/agentnameservice/ans/blob/main/spec/api-spec-tl-v2.yaml>
