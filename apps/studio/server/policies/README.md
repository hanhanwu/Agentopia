`improvement-rule-families-v1.json` is a bundled copy of
`Agentopia_Lab/Scoring_System/score_mcp_servers/policies/improvement-rule-families-v1.json`.
Keep both files in sync when revising the improvement policy. Bundling the file
keeps Studio runnable without the sibling research checkout.

The catalog supplies family membership, effort estimates, confidence, and
remediation context. Live assessment `configured_weight` values supply ranking
weights and potential points; the catalog's weight fields are review snapshots.

Studio selects at most five families by the sum of eligible member weights times
family ease times family confidence. Applicable, evidenced failures support
repair guidance and conditional potential points. Evidenced, explicitly
applicable skipped checks support verification guidance only. Unknown, passed,
not-applicable, zero-weight and unsupported checks are excluded. A verification
check's weight can influence ordering but contributes no displayed point gain.

DeepInfra generates at most 35 words per selected family using `LLM_MODEL` and
`deepinfra_api_key` on the server. Reason and Tips requests run concurrently, each
bounded to 30 seconds; Tips has one attempt. Output IDs, length and completeness
are validated, and model ordering is replaced by deterministic backend ordering.
The model cannot choose points or priorities. If Tips fails, the assessment and
Reason remain available with an explicit retry message and no point estimate.

The assessment caches the score display projection, family names, and per-rule
remediation actions alongside each selected tip. Family gains and their total
are validated against the contributing failures and reused by Studio and PDF
export. Legacy presentations remain readable.

The PDF contains the score overview and a single actions table for up to five
selected families. It reuses the cached projection, guidance, actions and gains
without ranking, model calls or reassessment. Older reports without cached
actions show their existing guidance. Rule outcome tables, reasons, raw
observations and JSON appendices are omitted.

PDF pages repeat the green Agentopia wordmark and a compact report title in the
header, with a matching green divider and a continuous dark page background.
The overview shows score and rule pass percentage without collection
status, assessed maximum or explanatory footnotes. The actions total uses the
Skynet blue display color.
