# ANS data schema

This catalog covers every field currently present in the ANS JSON files under `EXPERIMENTS/output/`.

The current output contains raw DNS-over-HTTPS responses used to discover ANS `_ans-badge` and legacy `_ra-badge` TXT records. No selected domain returned a badge record, so no ANS Transparency Log response is present yet.

API endpoint used below:

- `GET https://dns.google/resolve`

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

`data.Answer[]` is absent in all current responses. Add its fields only when an ANS badge TXT answer is actually observed.
