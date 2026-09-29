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
evidence, coverage, time window, confidence, and rule version. The APIs marked
**write** require an owned agent/domain and explicit approval before use. All
paths below are relative to `/api/v1`.

| Dimension | Definition | AgentCensus APIs to explore |
|---|---|---|
| **Identity and control** | Who operates the agent, and has control been proved? | `GET /agents/{agentKey}` and `GET /domains/{domain}` for identity evidence; `GET/POST /orgs/{slug}/agents/{agentKey}/claim` and `POST /orgs/{slug}/agents/{agentKey}/claim/verify` (**POSTs are write**) for agent-control verification; `POST /orgs/{slug}/domains` and `POST /orgs/{slug}/domains/{domain}/verify` (**write**) for domain-control verification; `GET /orgs/{slug}/agents/{agentKey}/claim/assertion` for the signed ACV assertion. |
| **Integrity** | Are its discovery records, versions, endpoints, and signatures consistent? | `GET /agents/{agentKey}`, `GET /agents/{agentKey}/documents/{document}`, and `GET /domains/{domain}` for provenance, history, TLS, and DNS evidence; `GET /orgs/{slug}/agents/{agentKey}/insights` for conformance and trust drift; `POST /orgs/{slug}/domains/{domain}/recrawl` (**write**) to request fresh observations. |
| **Behavioral reliability** | Does it remain available and produce correct results repeatedly? | `PUT /orgs/{slug}/domains/{domain}/active-verification` (**write**) to enable scheduled introspection; `GET/POST /orgs/{slug}/domains/{domain}/checks` (**POST is write**) to inspect or define MCP/A2A/OpenAPI checks; `POST /orgs/{slug}/domains/{domain}/checks/{checkId}/test` (**write**) for a manual test. Manual tests are diagnostic and do not enter AgentCensus measurements. |
| **Security and authorization** | Does it enforce authentication, scope, and destructive-action boundaries? | `GET /agents/{agentKey}` for declared auth posture; `PUT/DELETE /orgs/{slug}/agents/{agentKey}/credential` (**write**) for authenticated read-only verification; active-verification results for unauthenticated refusal and declared-versus-enforced auth; synthetic-check APIs for narrowly scoped calls and destructive-tool acknowledgement. |
| **Safety** | Does it avoid prohibited or harmful behavior under controlled tests? | `GET /agents/{agentKey}/trust` for the DNS-AID safety overlay; `GET /domains/{domain}` for DNS-AID conformance evidence; owner-defined synthetic checks for controlled safety tests. Current AgentCensus safety observations are an overlay and do not affect its Trust Vector. |
| **Claim accuracy** | How often do published claims agree with independent observations? | `GET /agents/{agentKey}` and `GET /agents/{agentKey}/documents/{document}` for published claims; active-verification results for declared-versus-observed versions, capabilities, and auth; `GET /orgs/{slug}/agents/{agentKey}/insights` for source disagreements and history; synthetic checks for independently validated outcomes. |

## Requirements for our implementation

- Preserve raw observations, timestamps, provenance, signal version, weights,
  and explanations so every score can be reproduced exactly.
- Represent `missing`, `not applicable`, `not checked`, and an observed zero as
  different states. Never silently treat missing evidence as failure or omit it
  from a denominator.
- Return the numerator and denominator used for every dimension and composite.
- Version the scoring rules and never compare scores across versions without an
  explicit migration or re-evaluation.
- Keep self-reported claims, ownership proofs, passive observations, active
  verification, and inferred conclusions as separate evidence classes.
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
