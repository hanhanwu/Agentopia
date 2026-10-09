# Trust score implementation notes

## Current AgentCensus / ATD baseline

Observed from `GET /api/v1/agents/{agentKey}/trust` on 2026-09-29 using
ATD version `6ec1034`.

AgentCensus passively collects discovery-document, DNS, and TLS observations
and passes them to ATD. ATD maps the observations to 0–100 signals and groups
them into five dimensions. The current engine measures only `identity` and
`integrity`; `solvency`, `behavior`, and `safety` are inactive. Their zeroes
mean **not measured**, not untrustworthy.

| Dimension | Signal | Raw-score rule |
|---|---|---|
| Identity | `certtype` | EV = 100, OV = 70, DV = 40, absent = 0 |
| Integrity | `dnssecurity` | DNSSEC + CAA = 100, one = 50, neither = 0 |
| Integrity | `agentage` | `round(100 * age_days / 180)`, capped at 100 |
| Integrity | `versionstability` | `round(100 / (1 + version_changes_30d))` |
| Integrity | fingerprint/DNS drift | match = 100, mismatch or absent = 0 |

The four drift signals currently have weight 0, so they are evidence but do
not change the score.

For each active dimension:

```text
dimension_score = round(sum(raw_score * effective_weight) /
                        sum(effective_weight))
```

The current composite is the integer mean of measured dimensions:

```text
composite = round(sum(active_dimension_scores) / measured_dimension_count)
```

The recommended profile is based on individual active dimensions rather than
the composite. With the default thresholds, any active dimension below 20
yields `UNTRUSTED`. Risk codes such as `IDENTITY_CERT_DV_ONLY`,
`INTEGRITY_DNSSEC_BROKEN`, and `INTEGRITY_AGENT_NEW` explain contributing
conditions; they are not additional scores.


