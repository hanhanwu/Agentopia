# Verification and observed behavior

Keep external evidence separate from what Agentopia observes directly. Build
scores only after both types of evidence have been normalized.

```text
Agent
├── External evidence and assessments
│   ├── ANS identity, lifecycle, certificates, and signed proofs
│   ├── AgentCensus observations
│   ├── ATD scores, risks, coverage, version, and timestamp
│   └── A2A Registry claims and validation findings
│
├── Agentopia observations
│   ├── Operational: discovery, reachability, protocol, schema, latency
│   ├── Capability: task success and expected versus observed result
│   ├── Authorization: credential, scope, and destructive-action checks
│   ├── Behavior: delegation and tool-boundary compliance
│   └── Safety: privacy, data access, prompt injection, and unsafe tool use
│
└── Agentopia assessment
    ├── Dimension scores
    ├── Coverage and confidence
    └── Policy decision or composite
```

## Rules

- ANS provides verification evidence, not behavior or an overall trust score.
- ATD is an external assessment. Its current behavior, safety, and solvency
  zeroes mean unmeasured, not failure.
- Reachability and latency are operational observations, not behavior.
- Replace ambiguous `auth_success` with specific results such as
  `unauthenticated_request_rejected`, `insufficient_scope_rejected`, and
  `authorized_scope_accepted`.
- Preserve each source's raw output, timestamp, version, and provenance.
- Do not count the same underlying fact multiple times when sources repeat it.
- Treat missing, not checked, not applicable, stale, and failed as different
  states.
