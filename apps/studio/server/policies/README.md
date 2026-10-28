`improvement-rule-families-v1.json` is a bundled copy of
`Agentopia_Lab/Scoring_System/score_mcp_servers/policies/improvement-rule-families-v1.json`.
Keep both files in sync when revising the improvement policy. Bundling the file
keeps Studio runnable without the sibling research checkout.

The catalog supplies family membership, effort estimates, confidence, and
remediation context. Live assessment `configured_weight` values supply ranking
weights and potential points; the catalog's weight fields are review snapshots.

Studio selects at most five families by the sum of eligible member weights times
family ease times family confidence. Applicable, evidenced failures support
repair guidance and conditional potential points. Evidenced, explicitly applicable skipped checks support verification guidance
only. Unknown, passed, not-applicable, zero-weight and unsupported checks are
excluded. A verification
check's weight can influence ordering but contributes no displayed point gain.

DeepInfra generates at most 35 words per selected family using `LLM_MODEL` and
`deepinfra_api_key` on the server. Reason and Tips requests run concurrently, each
bounded to 30 seconds; Tips has one attempt. Output IDs, length and completeness
are validated, and model ordering is replaced by deterministic backend ordering.
The model cannot choose points or priorities. If Tips fails, the assessment and
Reason remain available with an explicit retry message and no point estimate.

Both report validation and PDF export check the displayed estimate against the
contributing failures. Legacy presentations remain readable.
