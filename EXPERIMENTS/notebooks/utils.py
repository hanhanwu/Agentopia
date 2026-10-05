"""Read-only helper functions for agent discovery experiments.

Public functions are grouped by service and prefixed with ``agentcensus_``,
``a2a_registry_``, or ``ans_`` so evidence from different sources remains
distinguishable.
"""

from __future__ import annotations

import hashlib
import json
import os
import ssl
import time
from collections import Counter
from html import escape
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


# ---------------------------------------------------------------------------
# AgentCensus
# ---------------------------------------------------------------------------
AGENTCENSUS_API_BASE = "https://agentcensus.io/api/v1"

_AGENTCENSUS_SAFE_RESPONSE_HEADERS = (
    "content-type",
    "x-request-id",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
)


def agentcensus_load_api_key(
    credentials_path: str | Path | None = None,
    *,
    required: bool = False,
) -> str | None:
    """Load an AgentCensus key from the environment or local credentials YAML.

    The dependency-free YAML reader intentionally supports only the top-level
    ``agentcensus_api_key`` scalar used by this experiment. The credential is
    returned to the caller and is never printed.
    """
    environment_key = os.getenv("AGENTCENSUS_BEARER_TOKEN")
    if environment_key:
        return environment_key

    candidates = (
        [Path(credentials_path)]
        if credentials_path is not None
        else [
            Path("EXPERIMENTS/notebooks/credentials.yaml"),
            Path("credentials.yaml"),
            Path(__file__).resolve().with_name("credentials.yaml"),
        ]
    )
    checked: list[Path] = []
    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        if resolved in checked:
            continue
        checked.append(resolved)
        if not resolved.is_file():
            continue

        for raw_line in resolved.read_text(encoding="utf-8").splitlines():
            if (
                not raw_line
                or raw_line[0].isspace()
                or raw_line.lstrip().startswith("#")
            ):
                continue
            field, separator, raw_value = raw_line.partition(":")
            if not separator or field.strip() != "agentcensus_api_key":
                continue
            value = raw_value.strip()
            if len(value) >= 2 and value[0] == value[-1] == "'":
                value = value[1:-1].replace("''", "'")
            elif len(value) >= 2 and value[0] == value[-1] == '"':
                value = json.loads(value)
            else:
                value = value.split(" #", 1)[0].strip()
            if value:
                return value
            break

    if required:
        locations = ", ".join(str(path) for path in checked)
        raise RuntimeError(
            "AgentCensus API key not found. Set AGENTCENSUS_BEARER_TOKEN or "
            f"add agentcensus_api_key to one of: {locations}"
        )
    return None


def agentcensus_trusted_tls_context() -> ssl.SSLContext:
    """Return a verified TLS context using Python or common system CA bundles."""
    verify_paths = ssl.get_default_verify_paths()
    candidates = (
        os.getenv("SSL_CERT_FILE"),
        verify_paths.cafile,
        "/etc/ssl/cert.pem",
        "/etc/ssl/certs/ca-certificates.crt",
        "/opt/homebrew/etc/openssl@3/cert.pem",
        "/usr/local/etc/openssl@3/cert.pem",
    )
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return ssl.create_default_context(cafile=candidate)
    return ssl.create_default_context()


def agentcensus_get_json(
    path_or_url: str,
    params: Mapping[str, Any] | None = None,
    token: str | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    """Perform one read-only AgentCensus GET and retain response evidence."""
    if path_or_url.startswith("http"):
        url = path_or_url
    else:
        url = f"{AGENTCENSUS_API_BASE}/{path_or_url.lstrip('/')}"
    if params:
        query = urlencode(
            {key: value for key, value in params.items() if value is not None}
        )
        url = f"{url}{'&' if '?' in url else '?'}{query}"

    if token is None:
        token = agentcensus_load_api_key()
    headers = {
        "Accept": "application/json",
        "User-Agent": "agentopia-agentcensus-explorer/0.1",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    started = time.perf_counter()
    try:
        with urlopen(
            Request(url, headers=headers, method="GET"),
            timeout=timeout,
            context=agentcensus_trusted_tls_context(),
        ) as response:
            raw = response.read().decode("utf-8", errors="replace")
            status = response.status
            response_headers = response.headers
            ok = True
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        status = error.code
        response_headers = error.headers
        ok = False
    except URLError as error:
        return {
            "ok": False,
            "status": None,
            "url": url,
            "elapsedMs": round((time.perf_counter() - started) * 1000, 1),
            "headers": {},
            "data": {"error": str(error.reason)},
        }

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"rawText": raw}

    safe_headers = {
        name: response_headers.get(name)
        for name in _AGENTCENSUS_SAFE_RESPONSE_HEADERS
        if response_headers.get(name) is not None
    }
    return {
        "ok": ok,
        "status": status,
        "url": url,
        "elapsedMs": round((time.perf_counter() - started) * 1000, 1),
        "headers": safe_headers,
        "data": data,
    }


def agentcensus_show_response(
    response: Mapping[str, Any], max_json_chars: int = 12_000
) -> None:
    """Print request evidence followed by formatted, optionally truncated JSON."""
    print(
        f"HTTP {response['status']} | {response['elapsedMs']} ms | "
        f"ok={response['ok']}"
    )
    print(response["url"])
    if response["headers"]:
        print("Headers:", json.dumps(response["headers"], indent=2))
    rendered = json.dumps(response["data"], indent=2, ensure_ascii=False)
    if len(rendered) > max_json_chars:
        rendered = (
            rendered[:max_json_chars]
            + f"\n... truncated {len(rendered) - max_json_chars:,} characters"
        )
    print(rendered)


def agentcensus_print_table(
    rows: Iterable[Mapping[str, Any]], columns: Sequence[str], limit: int = 20
) -> None:
    """Print a dependency-free fixed-width table for notebook exploration."""
    limited_rows = list(rows)[:limit]
    if not limited_rows:
        print("No rows")
        return
    text_rows = [
        [str(row.get(column, "")) for column in columns] for row in limited_rows
    ]
    widths = [
        min(60, max(len(column), *(len(row[index]) for row in text_rows)))
        for index, column in enumerate(columns)
    ]

    def clipped(value: str, width: int) -> str:
        return value if len(value) <= width else value[: width - 1] + "…"

    print(
        " | ".join(
            column.ljust(widths[index]) for index, column in enumerate(columns)
        )
    )
    print("-+-".join("-" * width for width in widths))
    for row in text_rows:
        print(
            " | ".join(
                clipped(value, widths[index]).ljust(widths[index])
                for index, value in enumerate(row)
            )
        )


def agentcensus_response_data(
    response: Mapping[str, Any],
) -> Mapping[str, Any] | None:
    """Return successful response data, printing the evidence for failures."""
    if not response["ok"]:
        agentcensus_show_response(response)
        return None
    data = response["data"]
    return data if isinstance(data, Mapping) else None


def agentcensus_summarize_search(response: Mapping[str, Any]) -> None:
    """Explain AgentCensus hybrid-search metadata and print ranked results."""
    data = agentcensus_response_data(response)
    if data is None:
        return
    results = data.get("results", [])
    coverage = data.get("semanticCoverage") or {}
    embedded = coverage.get("embeddedAgents")
    total_agents = coverage.get("totalAgents")

    print("Query:", data.get("query"))
    print(
        "Mode:",
        data.get("mode"),
        "| semantic available:",
        data.get("semanticAvailable"),
    )
    print(
        "Returned:",
        len(results),
        "| reported total:",
        data.get("total"),
        "| exact total:",
        data.get("totalIsExact"),
    )
    if embedded is not None and total_agents:
        print(
            f"Semantic coverage: {embedded:,}/{total_agents:,} "
            f"({embedded / total_agents:.1%})"
        )
    print(
        "Match kinds:",
        dict(
            Counter(
                item.get("match", {}).get("kind", "unknown") for item in results
            )
        ),
    )
    print("Relaxation:", data.get("relaxation") or "not used")
    print()

    rows = []
    for item in results:
        agent = item.get("agent", {})
        match = item.get("match", {})
        rows.append(
            {
                "name": agent.get("displayName"),
                "type": agent.get("type"),
                "domain": agent.get("domain"),
                "protocols": ", ".join(agent.get("protocols") or []),
                "mechanisms": ", ".join(agent.get("mechanisms") or []),
                "match": match.get("kind"),
                "score": round(match.get("rrfScore", 0), 6),
                "relaxed": match.get("relaxed", False),
            }
        )
    agentcensus_print_table(
        rows,
        [
            "name",
            "type",
            "domain",
            "protocols",
            "mechanisms",
            "match",
            "score",
            "relaxed",
        ],
    )


def agentcensus_summarize_agent(response: Mapping[str, Any]) -> None:
    """Group one normalized AgentCensus agent record by meaning."""
    agent = agentcensus_response_data(response)
    if agent is None:
        return
    sections = {
        "Identity": [
            "agentKey",
            "displayName",
            "type",
            "domain",
            "registrableDomain",
        ],
        "Discovery": ["mechanisms", "protocols"],
        "Published claims": ["description", "capabilities"],
        "Security and control": [
            "posture",
            "activeVerification",
            "gate",
            "selfReported",
        ],
    }
    for title, fields in sections.items():
        print(f"\n{title}")
        for field in fields:
            print(f"  {field}: {agent.get(field)!r}")


def agentcensus_summarize_trust(response: Mapping[str, Any]) -> None:
    """Explain one AgentCensus Trust Vector without treating gaps as zeroes."""
    data = agentcensus_response_data(response)
    if data is None:
        return
    if "dimensions" not in data:
        print(
            "No Trust Vector was disclosed. This may be a minimal record for "
            "an opted-out subject."
        )
        return

    composite = data.get("composite") or {}
    score = composite.get("score")
    score_label = "not yet measured" if score is None else str(score)
    print(
        f"Composite: {score_label} | "
        f"coverage: {composite.get('measured', 0)} of {composite.get('of', 5)} "
        "dimensions measured"
    )
    print(
        "Engine version:",
        data.get("atdVersion") or composite.get("atdVersion") or "unknown",
    )
    print(
        "Evaluated at:",
        data.get("evaluatedAt") or composite.get("evaluatedAt") or "unknown",
    )
    print(
        "Recommended profile:",
        data.get("recommendedProfile")
        or composite.get("recommendedProfile")
        or "not provided",
    )
    print()

    rows = []
    for dimension in data.get("dimensions", []):
        active = bool(dimension.get("active"))
        rows.append(
            {
                "dimension": dimension.get("dimension"),
                "result": dimension.get("score") if active else "not measured",
                "active": active,
                "signals": len(dimension.get("signals") or []),
            }
        )
    agentcensus_print_table(
        rows,
        ["dimension", "result", "active", "signals"],
        limit=5,
    )

    risk_factors = data.get("riskFactors") or composite.get("riskFactors") or []
    print("\nRisk factors:", ", ".join(risk_factors) if risk_factors else "none reported")
    if "overlay" not in data:
        print("Overlay: absent (not the same as measured with no findings)")
    else:
        overlay = data.get("overlay") or {}
        print(
            "Overlay:",
            "behavior=" + ("available" if overlay.get("behavior") else "not measured"),
            "safety=" + ("available" if overlay.get("safety") else "not measured"),
        )


def agentcensus_summarize_domain_agents(response: Mapping[str, Any]) -> None:
    """Summarize records and publication mechanisms found on one domain."""
    data = agentcensus_response_data(response)
    if data is None:
        return
    agents = data.get("agents", [])
    print(
        f"Domain: {data.get('domain')} | returned: {len(agents)} | "
        f"total: {data.get('total')}"
    )
    print(
        "Types:",
        dict(Counter(agent.get("type", "unknown") for agent in agents)),
    )
    print(
        "Mechanisms:",
        dict(
            Counter(
                mechanism
                for agent in agents
                for mechanism in agent.get("mechanisms", [])
            )
        ),
    )
    print(
        "Protocols:",
        dict(
            Counter(
                protocol
                for agent in agents
                for protocol in agent.get("protocols", [])
            )
        ),
    )
    print()
    rows = [
        {
            "key": agent.get("agentKey"),
            "name": agent.get("displayName"),
            "type": agent.get("type"),
            "mechanisms": ", ".join(agent.get("mechanisms") or []),
            "protocols": ", ".join(agent.get("protocols") or []),
            "capabilities": ", ".join(agent.get("capabilities") or []),
        }
        for agent in agents
    ]
    agentcensus_print_table(
        rows,
        ["key", "name", "type", "mechanisms", "protocols", "capabilities"],
        limit=100,
    )


def agentcensus_render_integrity_table(
    agents: Sequence[Mapping[str, Any]],
    agent_responses: Mapping[str, Mapping[str, Any]],
    output_dir: str | Path,
) -> str:
    """Render per-mechanism integrity evidence with merged agent summaries.

    Version coverage includes only successful A2A and A2A-alt snapshots,
    where an agent version is expected. Missing snapshots remain visible but
    cannot contribute to the version denominator.
    """
    version_expected_sources = {"a2a", "a2a_alt"}
    output_path = Path(output_dir)
    table_rows: list[str] = []

    agent_markers = ("🟣", "🟢", "🟠")
    for agent_index, agent in enumerate(agents):
        agent_marker = agent_markers[agent_index % len(agent_markers)]
        agent_key = agent["agentcensus_agent_key"]
        if agent_key is None:
            table_rows.append(
                f"<tr><th>{agent_marker} {escape(str(agent['name']))}</th>"
                "<td>None</td><td>Not available</td><td>--</td><td>--</td>"
                "<td>--</td><td>--</td><td>--</td>"
                f"<td>{agent_marker} --</td>"
                f"<td>{agent_marker} Not assessed</td>"
                f"<td>{agent_marker} Not assessed</td></tr>"
            )
            continue

        sources = agent_responses[agent_key]["data"]["mechanisms"]
        mechanism_rows: list[dict[str, Any]] = []
        available: list[tuple[str, Mapping[str, Any], Mapping[str, Any]]] = []

        for source in sources:
            document_path = output_path / (
                "trust_model_comparison_agentcensus_"
                f"{agent['output_label']}_{source}_document.json"
            )
            payload = json.loads(document_path.read_text(encoding="utf-8"))
            if payload["ok"]:
                data = payload["data"]
                snapshot = json.loads(data["snapshot"])
                available.append((source, data, snapshot))
                version_expected = source in version_expected_sources
                mechanism_rows.append(
                    {
                        "source": source,
                        "available": True,
                        "snapshot": "Available",
                        "name_status": (
                            f"{escape(str(snapshot['display_name']))}<br>"
                            f"{escape(str(snapshot['status']))}"
                        ),
                        "version_expected": (
                            "Expected" if version_expected else "Not expected"
                        ),
                        "version": (
                            str(snapshot.get("version") or "Missing")
                            if version_expected
                            else "N/A"
                        ),
                        "transport": (
                            f"{snapshot.get('tls_version')} / "
                            f"{snapshot.get('transport')}"
                        ),
                        "hash": "Recorded" if data.get("contentHash") else "Missing",
                    }
                )
            else:
                mechanism_rows.append(
                    {
                        "source": source,
                        "available": False,
                        "snapshot": f"Missing for this agent (HTTP {payload['status']})",
                        "name_status": "--",
                        "version_expected": (
                            "Expected; snapshot missing"
                            if source in version_expected_sources
                            else "Not expected"
                        ),
                        "version": "--",
                        "transport": "--",
                        "hash": "--",
                    }
                )

        mechanism_rows.sort(key=lambda row: not row["available"])
        snapshots = [snapshot for _, _, snapshot in available]
        aligned: list[str] = []
        differing: list[str] = []
        checks = [
            (
                "registrable domain",
                [item.get("registrable_domain") for item in snapshots],
            ),
            ("crawl run", [item.get("run_id") for item in snapshots]),
            ("display name", [item.get("display_name") for item in snapshots]),
            ("status", [item.get("status") for item in snapshots]),
            (
                "capabilities",
                [tuple(item.get("capabilities", [])) for item in snapshots],
            ),
            (
                "TLS/transport",
                [
                    (item.get("tls_version"), item.get("transport"))
                    for item in snapshots
                ],
            ),
        ]
        for label, values in checks:
            (aligned if len(set(values)) == 1 else differing).append(label)

        version_snapshots = [
            snapshot
            for source, _, snapshot in available
            if source in version_expected_sources
        ]
        version_count = sum(
            snapshot.get("version") is not None for snapshot in version_snapshots
        )
        version_coverage = f"{version_count}/{len(version_snapshots)}"
        if len(version_snapshots) > 1:
            versions = [snapshot.get("version") for snapshot in version_snapshots]
            (aligned if len(set(versions)) == 1 else differing).append("version")

        compared_sources = ", ".join(
            f"<code>{escape(source)}</code>" for source, _, _ in available
        )
        missing_sources = ", ".join(
            f"<code>{escape(str(row['source']))}</code>"
            for row in mechanism_rows
            if not row["available"]
        )
        alignment = (
            f"Compared {len(available)} available snapshots:<br>{compared_sources}"
            f"<br><br>Aligned:<br>{', '.join(aligned)}"
            + (
                f"<br><br>Differ by source:<br>{', '.join(differing)}"
                if differing
                else ""
            )
            + (
                f"<br><br>Excluded because no snapshot was returned:<br>"
                f"{missing_sources}"
                if missing_sources
                else ""
            )
        )
        missing_count = len(sources) - len(available)
        if not differing and missing_count == 0:
            reading = "No inconsistency found in available snapshots"
        else:
            reading = "Source-specific differences; no integrity failure established"
            if missing_count:
                snapshot_word = "snapshot" if missing_count == 1 else "snapshots"
                missing_label = "one" if missing_count == 1 else str(missing_count)
                reading += (
                    f"<br><br>Evidence coverage: {len(available)}/{len(sources)}; "
                    f"{missing_label} AgentCensus {snapshot_word} unavailable"
                )

        for index, row in enumerate(mechanism_rows):
            cells = []
            if index == 0:
                cells.append(
                    f"<th rowspan='{len(mechanism_rows)}'>{agent_marker} "
                    f"{escape(str(agent['name']))}</th>"
                )
            cells.extend(
                [
                    f"<td><code>{escape(row['source'])}</code></td>",
                    f"<td>{escape(row['snapshot'])}</td>",
                    f"<td>{row['name_status']}</td>",
                    f"<td>{escape(row['version_expected'])}</td>",
                    f"<td>{escape(row['version'])}</td>",
                    f"<td>{escape(row['transport'])}</td>",
                    f"<td>{escape(row['hash'])}</td>",
                ]
            )
            if index == 0:
                cells.extend(
                    [
                        f"<td rowspan='{len(mechanism_rows)}'>{agent_marker} "
                        f"{alignment}</td>",
                        f"<td rowspan='{len(mechanism_rows)}'>{agent_marker} "
                        f"{version_coverage}"
                        "<br>expected available snapshots</td>",
                        f"<td rowspan='{len(mechanism_rows)}'>{agent_marker} "
                        f"{reading}</td>",
                    ]
                )
            table_rows.append("<tr>" + "".join(cells) + "</tr>")

    return (
        "<style>"
        ".agentcensus-integrity-table th,"
        ".agentcensus-integrity-table td {"
        "text-align: left !important; vertical-align: top !important;"
        "}"
        "</style>"
        "<table class='agentcensus-integrity-table'><thead><tr>"
        "<th>Agent</th><th>Mechanism</th><th>Snapshot</th><th>Name / status</th>"
        "<th>Version applicability</th><th>Version</th><th>TLS / transport</th>"
        "<th>Hash baseline</th><th>Available-snapshot comparison</th>"
        "<th>Version coverage</th><th>Reading</th>"
        "</tr></thead><tbody>"
        + "".join(table_rows)
        + "</tbody></table>"
    )


def agentcensus_render_ans_corroboration_table(
    examples: Sequence[Mapping[str, Any]],
    output_dir: str | Path,
) -> str:
    """Compare AgentCensus snapshots with live and sealed ANS versions."""
    output_path = Path(output_dir)
    markers = ("🔵", "🟡")
    table_rows = []

    def badge_version(value: str | None) -> str | None:
        if not value:
            return None
        for part in value.split(";"):
            key, separator, item = part.strip().partition("=")
            if separator and key == "version":
                return item
        return None

    def versions_match(left: Any, right: Any) -> bool:
        return bool(
            left
            and right
            and str(left).removeprefix("v") == str(right).removeprefix("v")
        )

    for example_index, example in enumerate(examples):
        marker = markers[example_index % len(markers)]
        agent_response = json.loads(
            (output_path / str(example["agent_file"])).read_text(encoding="utf-8")
        )
        agent = agent_response["data"]
        dns_response = json.loads(
            (output_path / str(example["ans_dns_file"])).read_text(encoding="utf-8")
        )
        badge = json.loads(
            (output_path / str(example["ans_badge_file"])).read_text(encoding="utf-8")
        )
        live_badge_value = next(
            (
                str(answer.get("data"))
                for answer in dns_response.get("Answer") or []
                if answer.get("type") == 16
            ),
            None,
        )
        live_version = badge_version(live_badge_value)
        sealed_version = badge["payload"]["producer"]["event"]["agent"]["version"]

        grouped_documents: dict[str, dict[str, Any]] = {}
        for source, filename in example["documents"].items():
            document_response = json.loads(
                (output_path / str(filename)).read_text(encoding="utf-8")
            )
            document = document_response["data"]
            content_hash = str(document["contentHash"])
            group = grouped_documents.setdefault(
                content_hash,
                {
                    "sources": [],
                    "snapshot": json.loads(document["snapshot"]),
                    "observed_at": [],
                },
            )
            group["sources"].append(source)
            group["observed_at"].append(
                f"{escape(str(source))}: {escape(str(document.get('observedAt')))}"
            )

        endpoint = agent.get("posture", {}).get("endpointHost")
        observed = agent.get("observed", {})
        endpoint_evidence = (
            f"Endpoint <code>{escape(str(endpoint))}</code><br>"
            f"same origin: <code>{str(bool(observed.get('endpointSameOrigin'))).lower()}</code><br>"
            f"{escape(str(observed.get('tlsVersion')))} / "
            f"{escape(str(observed.get('transport')))}"
        )
        active_verification = agent.get("activeVerification") or {}
        unauthenticated = active_verification.get("unauthenticated") or {}
        if unauthenticated:
            endpoint_evidence += (
                f"<br>Active {escape(str(unauthenticated.get('method')))}: "
                f"<code>{escape(str(unauthenticated.get('outcome')))}</code>"
            )
        else:
            endpoint_evidence += "<br>Active verification: not available"

        ans_snapshot_version = next(
            (
                group["snapshot"].get("version")
                for group in grouped_documents.values()
                if "ans" in group["sources"]
            ),
            None,
        )
        if (
            not versions_match(live_version, sealed_version)
            and versions_match(ans_snapshot_version, live_version)
        ):
            reading = (
                f"AgentCensus captured ANS version {escape(str(ans_snapshot_version))}, "
                f"matching the live badge and differing from the TL-sealed "
                f"{escape(str(sealed_version))}. This supports stale or lagging live "
                "ANS publication as the issue to investigate; it does not establish why. "
                "Successful TLS/DANE verification applies to the endpoint certificate, "
                "not badge freshness."
            )
        else:
            reading = (
                "AgentCensus independently observed the same agent version as the "
                "live and sealed ANS records, adding cross-source continuity evidence."
            )

        groups = list(grouped_documents.values())
        for row_index, group in enumerate(groups):
            snapshot = group["snapshot"]
            version = snapshot.get("version")
            if versions_match(version, sealed_version):
                relation = (
                    f"Matches live <code>{escape(str(live_version))}</code> and "
                    f"TL-sealed <code>{escape(str(sealed_version))}</code>"
                )
            elif versions_match(version, live_version):
                relation = (
                    f"Matches live <code>{escape(str(live_version))}</code>; differs "
                    f"from TL-sealed <code>{escape(str(sealed_version))}</code>"
                )
            else:
                relation = (
                    f"Source publishes <code>{escape(str(version))}</code>; differs from "
                    f"live <code>{escape(str(live_version))}</code> and TL-sealed "
                    f"<code>{escape(str(sealed_version))}</code>. Version semantics may "
                    "be source-specific."
                )

            cells = []
            if row_index == 0:
                cells.append(
                    f"<th rowspan='{len(groups)}'>{marker} "
                    f"{escape(str(example['name']))}</th>"
                )
            cells.extend(
                [
                    "<td>"
                    + ", ".join(
                        f"<code>{escape(str(source))}</code>"
                        for source in group["sources"]
                    )
                    + "</td>",
                    f"<td>{marker} <code>{escape(str(version))}</code><br>"
                    "observed:<br>" + "<br>".join(group["observed_at"]) + "</td>",
                    f"<td>{marker} {relation}</td>",
                ]
            )
            if row_index == 0:
                cells.extend(
                    [
                        f"<td rowspan='{len(groups)}'>{marker} {endpoint_evidence}</td>",
                        f"<td rowspan='{len(groups)}'>{marker} {reading}</td>",
                    ]
                )
            table_rows.append("<tr>" + "".join(cells) + "</tr>")

    return (
        "<style>"
        ".agentcensus-ans-table th,.agentcensus-ans-table td {"
        "text-align: left !important; vertical-align: top !important;"
        "}"
        "</style>"
        "<table class='agentcensus-ans-table'><thead><tr>"
        "<th>Agent</th><th>AgentCensus mechanism</th><th>Observed version</th>"
        "<th>Relation to ANS versions</th><th>Endpoint evidence</th>"
        "<th>Integrity insight</th>"
        "</tr></thead><tbody>"
        + "".join(table_rows)
        + "</tbody></table>"
    )


# ---------------------------------------------------------------------------
# A2A Registry
# ---------------------------------------------------------------------------

A2A_REGISTRY_API_BASE = "https://api.a2a-registry.org"
A2A_REGISTRY_CARD_URL = (
    "https://www.a2a-registry.org/.well-known/agent-card.json"
)
A2A_REGISTRY_DOCUMENTED_VERIFICATION_RANK = {
    # ``unclaimed`` is returned by the live public catalog. ``unverified`` is
    # retained for compatibility with the registry's earlier terminology.
    "unclaimed": 0,
    "unverified": 0,
    "github_verified": 1,
    "domain_verified": 2,
    "ans_verified": 3,
}
A2A_REGISTRY_MAX_VERIFICATION_RANK = 3

_A2A_REGISTRY_SAFE_RESPONSE_HEADERS = (
    "content-type",
    "location",
    "x-request-id",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
)


def a2a_registry_load_api_key(
    credentials_path: str | Path | None = None,
    *,
    required: bool = False,
) -> str | None:
    """Load an A2A Registry token without printing or persisting the secret."""
    environment_key = os.getenv("A2A_REGISTRY_API_TOKEN")
    if environment_key:
        return environment_key

    candidates = (
        [Path(credentials_path)]
        if credentials_path is not None
        else [
            Path("EXPERIMENTS/notebooks/credentials.yaml"),
            Path("credentials.yaml"),
            Path(__file__).resolve().with_name("credentials.yaml"),
        ]
    )
    checked: list[Path] = []
    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        if resolved in checked:
            continue
        checked.append(resolved)
        if not resolved.is_file():
            continue

        for raw_line in resolved.read_text(encoding="utf-8").splitlines():
            if (
                not raw_line
                or raw_line[0].isspace()
                or raw_line.lstrip().startswith("#")
            ):
                continue
            field, separator, raw_value = raw_line.partition(":")
            if not separator or field.strip() != "a2a_registry_api_token":
                continue
            value = raw_value.strip()
            if len(value) >= 2 and value[0] == value[-1] == "'":
                value = value[1:-1].replace("''", "'")
            elif len(value) >= 2 and value[0] == value[-1] == '"':
                value = json.loads(value)
            else:
                value = value.split(" #", 1)[0].strip()
            if value:
                return value
            break

    if required:
        locations = ", ".join(str(path) for path in checked)
        raise RuntimeError(
            "A2A Registry API token not found. Set A2A_REGISTRY_API_TOKEN or "
            f"add a2a_registry_api_token to one of: {locations}"
        )
    return None


def a2a_registry_trusted_tls_context() -> ssl.SSLContext:
    """Return a verified TLS context using Python or common system CA bundles."""
    verify_paths = ssl.get_default_verify_paths()
    candidates = (
        os.getenv("SSL_CERT_FILE"),
        verify_paths.cafile,
        "/etc/ssl/cert.pem",
        "/etc/ssl/certs/ca-certificates.crt",
        "/opt/homebrew/etc/openssl@3/cert.pem",
        "/usr/local/etc/openssl@3/cert.pem",
    )
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return ssl.create_default_context(cafile=candidate)
    return ssl.create_default_context()


def a2a_registry_request_json(
    method: str,
    path_or_url: str,
    *,
    params: Mapping[str, Any] | None = None,
    body: Any = None,
    authenticated: bool = True,
    token: str | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    """Call one Registry endpoint and retain status, safe headers, and JSON."""
    url = (
        path_or_url
        if path_or_url.startswith("http")
        else f"{A2A_REGISTRY_API_BASE}/{path_or_url.lstrip('/')}"
    )
    if params:
        clean_params = {
            key: value for key, value in params.items() if value is not None
        }
        url = f"{url}{'&' if '?' in url else '?'}{urlencode(clean_params, doseq=True)}"

    headers = {
        "Accept": "application/json, application/a2a+json",
        "User-Agent": "agentopia-a2a-registry-explorer/0.1",
    }
    if authenticated:
        token = token if token is not None else a2a_registry_load_api_key()
        if token:
            headers["Authorization"] = f"Bearer {token}"

    request_data = None
    if body is not None:
        request_data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    started = time.perf_counter()
    try:
        with urlopen(
            Request(
                url,
                data=request_data,
                headers=headers,
                method=method.upper(),
            ),
            timeout=timeout,
            context=a2a_registry_trusted_tls_context(),
        ) as response:
            raw = response.read().decode("utf-8", errors="replace")
            status = response.status
            response_headers = response.headers
            ok = True
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        status = error.code
        response_headers = error.headers
        ok = False
    except URLError as error:
        return {
            "ok": False,
            "status": None,
            "url": url,
            "elapsedMs": round((time.perf_counter() - started) * 1000, 1),
            "headers": {},
            "data": {"error": str(error.reason)},
        }

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {"rawText": raw}

    safe_headers = {
        name: response_headers.get(name)
        for name in _A2A_REGISTRY_SAFE_RESPONSE_HEADERS
        if response_headers.get(name) is not None
    }
    return {
        "ok": ok,
        "status": status,
        "url": url,
        "elapsedMs": round((time.perf_counter() - started) * 1000, 1),
        "headers": safe_headers,
        "data": data,
    }


def a2a_registry_show_response(
    response: Mapping[str, Any], max_json_chars: int = 16_000
) -> None:
    """Print request evidence followed by formatted, optionally truncated JSON."""
    print(
        f"HTTP {response['status']} | {response['elapsedMs']} ms | "
        f"ok={response['ok']}"
    )
    print(response["url"])
    if response["headers"]:
        print("Headers:", json.dumps(response["headers"], indent=2))
    rendered = json.dumps(response["data"], indent=2, ensure_ascii=False)
    if len(rendered) > max_json_chars:
        rendered = (
            rendered[:max_json_chars]
            + f"\n... truncated {len(rendered) - max_json_chars:,} characters"
        )
    print(rendered)


def a2a_registry_print_table(
    rows: Iterable[Mapping[str, Any]],
    columns: Sequence[str],
    limit: int = 20,
) -> None:
    """Print a dependency-free fixed-width table for Registry experiments."""
    limited_rows = list(rows)[:limit]
    if not limited_rows:
        print("No rows")
        return
    text_rows = [
        [str(row.get(column, "")) for column in columns]
        for row in limited_rows
    ]
    widths = [
        min(50, max(len(column), *(len(row[index]) for row in text_rows)))
        for index, column in enumerate(columns)
    ]

    def clipped(value: str, width: int) -> str:
        return value if len(value) <= width else value[: width - 1] + "…"

    print(
        " | ".join(
            column.ljust(widths[index])
            for index, column in enumerate(columns)
        )
    )
    print("-+-".join("-" * width for width in widths))
    for row in text_rows:
        print(
            " | ".join(
                clipped(value, widths[index]).ljust(widths[index])
                for index, value in enumerate(row)
            )
        )


def a2a_registry_summarize_agents(payload: Any) -> list[dict[str, Any]]:
    """Normalize search results while retaining each raw registry record."""
    if not isinstance(payload, Mapping):
        return []
    agents = payload.get("agents") or payload.get("results") or []
    rows = []
    for item in agents:
        if not isinstance(item, Mapping):
            continue
        nested = item.get("agent")
        agent = nested if isinstance(nested, Mapping) else item
        verification_level = (
            agent.get("verification_level")
            or agent.get("verificationLevel")
            or "missing"
        )
        manifest = agent.get("manifestUrl") or agent.get("manifest_url")
        openapi = agent.get("openapiUrl") or agent.get("openapi_url")
        rows.append(
            {
                "package": agent.get("packageName")
                or agent.get("package_name"),
                "name": agent.get("displayName") or agent.get("name"),
                "description": agent.get("description"),
                "category": agent.get("category"),
                "targetAudience": agent.get("targetAudience"),
                "protocol": agent.get("protocolStd"),
                "verificationLevel": verification_level,
                "verificationRank": (
                    A2A_REGISTRY_DOCUMENTED_VERIFICATION_RANK.get(
                        verification_level
                    )
                ),
                "verificationMaxRank": A2A_REGISTRY_MAX_VERIFICATION_RANK,
                "isVerified": agent.get("isVerified"),
                "manifest": manifest,
                "manifestDomain": (
                    urlparse(str(manifest)).hostname if manifest else None
                ),
                "openapi": openapi,
                "openapiDomain": (
                    urlparse(str(openapi)).hostname if openapi else None
                ),
                "payment": agent.get("payment"),
                # The registry returns this as search relevance. It is not a
                # trust, identity, or Agent Card quality score.
                "relevanceScore": item.get("score"),
                "lastCheckStatus": agent.get("lastCheckStatus"),
                "consecutiveFailures": agent.get("consecutiveFailures"),
                "ratingAverage": agent.get("ratingAvg"),
                "ratingCount": agent.get("ratingCount"),
                "rawRegistryRecord": dict(agent),
            }
        )
    return rows


def a2a_registry_search_agents(
    query: str,
    *,
    page: int = 1,
    category: str | None = None,
    target: str | None = None,
    sort: str | None = None,
    payment_model: str | None = None,
) -> dict[str, Any]:
    """Search the public catalog and return normalized rows plus raw evidence."""
    response = a2a_registry_request_json(
        "GET",
        "/public/agents",
        params={
            "q": query,
            "page": page,
            "category": category,
            "target": target,
            "sort": sort,
            "payment_model": payment_model,
        },
        authenticated=False,
    )
    payload = response.get("data")
    payload = payload if isinstance(payload, Mapping) else {}
    return {
        "query": query,
        "agents": a2a_registry_summarize_agents(payload),
        "total": payload.get("total"),
        "response": response,
    }


def a2a_registry_fetch_all_public_agents(
    filters: Mapping[str, Any] | None = None,
    *,
    max_pages: int | None = 5,
    delay_seconds: float = 0.25,
) -> dict[str, Any]:
    """Page through the UI-backed public catalog with deduplication."""
    filters = dict(filters or {})
    page = 1
    agents: list[dict[str, Any]] = []
    seen: set[str] = set()
    responses = []
    total = None
    while max_pages is None or page <= max_pages:
        response = a2a_registry_request_json(
            "GET",
            "/public/agents",
            params={**filters, "page": page},
            authenticated=False,
        )
        responses.append(
            {
                key: response[key]
                for key in ("status", "url", "elapsedMs")
            }
        )
        if not response["ok"]:
            break
        payload = response["data"]
        payload = payload if isinstance(payload, Mapping) else {}
        batch = payload.get("agents") or []
        total = payload.get("total", total)
        added = 0
        for agent in batch:
            if not isinstance(agent, Mapping):
                continue
            key = str(
                agent.get("id")
                or agent.get("packageName")
                or json.dumps(agent, sort_keys=True)
            )
            if key not in seen:
                seen.add(key)
                agents.append(dict(agent))
                added += 1
        if (
            not batch
            or not added
            or (isinstance(total, int) and len(agents) >= total)
        ):
            break
        page += 1
        time.sleep(delay_seconds)
    return {
        "agents": agents,
        "collected": len(agents),
        "reportedTotal": total,
        "requests": responses,
    }


def a2a_registry_verification_report(
    rows: Sequence[Mapping[str, Any]],
) -> None:
    """Report canonical and unknown identity-verification values."""
    counts = Counter(
        (row.get("verificationLevel") or "missing") for row in rows
    )
    print("Verification values returned:", dict(counts))
    unknown = sorted(
        level
        for level in counts
        if level not in A2A_REGISTRY_DOCUMENTED_VERIFICATION_RANK
    )
    if unknown:
        print(
            "Unknown/non-canonical levels (do not promote automatically):",
            unknown,
        )


def a2a_registry_meets_documented_level(
    row: Mapping[str, Any], minimum: str
) -> bool:
    """Apply a strict documented verification-level threshold."""
    if minimum not in A2A_REGISTRY_DOCUMENTED_VERIFICATION_RANK:
        raise ValueError(f"Unknown documented minimum level: {minimum}")
    level = row.get("verificationLevel")
    return bool(
        level in A2A_REGISTRY_DOCUMENTED_VERIFICATION_RANK
        and A2A_REGISTRY_DOCUMENTED_VERIFICATION_RANK[level]
        >= A2A_REGISTRY_DOCUMENTED_VERIFICATION_RANK[minimum]
    )


def a2a_registry_validation_data(
    response: Mapping[str, Any],
) -> Mapping[str, Any] | None:
    """Unwrap the public validator's outer response envelope."""
    outer = response.get("data")
    if isinstance(outer, Mapping) and isinstance(outer.get("data"), Mapping):
        return outer["data"]
    return outer if isinstance(outer, Mapping) else None


def a2a_registry_render_integrity_table(
    agents: Sequence[Mapping[str, Any]],
    validation_responses: Mapping[str, Mapping[str, Any]],
) -> str:
    """Render only JWS-related Agent Card integrity evidence."""
    agent_markers = ("🟣", "🟢", "🟠")
    rows = []

    for agent_index, agent in enumerate(agents):
        marker = agent_markers[agent_index % len(agent_markers)]
        manifest_url = agent.get("a2a_manifest_url")
        if not manifest_url:
            rows.append(
                "<tr>"
                f"<th>{marker} {escape(str(agent['name']))}</th>"
                "<td>Not available in selected registry evidence</td>"
                f"<td>{marker} Not assessed</td>"
                f"<td>{marker} Not assessed</td>"
                f"<td>{marker} Not assessed</td>"
                "</tr>"
            )
            continue

        response = validation_responses.get(str(agent["output_label"]))
        result = (
            a2a_registry_validation_data(response)
            if isinstance(response, Mapping)
            else None
        )
        if not response or not response.get("ok") or result is None:
            rows.append(
                "<tr>"
                f"<th>{marker} {escape(str(agent['name']))}</th>"
                f"<td><code>{escape(str(manifest_url))}</code></td>"
                "<td>Unknown</td><td>Validator response unavailable</td>"
                "<td>Not assessed</td>"
                "</tr>"
            )
            continue

        card = result.get("cardData")
        card = card if isinstance(card, Mapping) else {}
        signatures = card.get("signatures")
        signatures = signatures if isinstance(signatures, list) else []
        signature_findings = [
            finding
            for finding in result.get("findings") or []
            if isinstance(finding, Mapping)
            and any(
                token in str(finding.get("code", "")).upper()
                for token in ("JWS", "SIGNATURE")
            )
        ]
        valid_findings = [
            finding
            for finding in signature_findings
            if finding.get("severity") == "pass"
        ]
        invalid_findings = [
            finding
            for finding in signature_findings
            if finding.get("severity") == "error"
        ]

        if signature_findings:
            finding_text = "<br><br>".join(
                f"<code>{escape(str(finding.get('code')))}</code> "
                f"({escape(str(finding.get('severity')))})<br>"
                f"{escape(str(finding.get('message') or finding.get('title')))}"
                for finding in signature_findings
            )
        else:
            finding_text = "No signature-related finding returned"

        if valid_findings:
            reading = "Validator reported valid JWS document-integrity evidence"
        elif invalid_findings:
            reading = "Validator reported invalid JWS document-integrity evidence"
        elif signatures:
            reading = "JWS present but not validated; no positive integrity evidence"
        else:
            reading = "No JWS integrity evidence observed; absence is not failure"

        rows.append(
            "<tr>"
            f"<th>{marker} {escape(str(agent['name']))}</th>"
            f"<td><code>{escape(str(manifest_url))}</code></td>"
            f"<td>{marker} {len(signatures)} JWS signature"
            f"{'s' if len(signatures) != 1 else ''}</td>"
            f"<td>{marker} {finding_text}</td>"
            f"<td>{marker} {reading}</td>"
            "</tr>"
        )

    return (
        "<style>"
        ".a2a-integrity-table th,.a2a-integrity-table td {"
        "text-align: left !important; vertical-align: top !important;"
        "}"
        "</style>"
        "<table class='a2a-integrity-table'><thead><tr>"
        "<th>Agent</th><th>Agent Card URL</th><th>Card JWS</th>"
        "<th>Signature-related validator finding</th><th>Reading</th>"
        "</tr></thead><tbody>"
        + "".join(rows)
        + "</tbody></table>"
    )


def ans_render_integrity_table(
    agents: Sequence[Mapping[str, Any]],
    discovery_responses: Sequence[Mapping[str, Any]],
) -> str:
    """Render ANS integrity coverage from previously captured badge discovery."""
    agent_markers = ("🟣", "🟢", "🟠")
    rows = []

    for agent_index, agent in enumerate(agents):
        marker = agent_markers[agent_index % len(agent_markers)]
        output_label = str(agent["output_label"])
        observations = [
            item
            for item in discovery_responses
            if item.get("outputLabel") == output_label
        ]
        badge_answers = [
            answer
            for item in observations
            for answer in (item.get("data", {}).get("Answer") or [])
        ]

        if badge_answers:
            discovery = f"{len(badge_answers)} TXT answer(s) returned"
            artifacts = "Badge discovered; Transparency Log checks required"
            comparison = "Not performed by this discovery capture"
            reading = "ANS integrity evidence requires downstream verification"
        elif observations:
            result_lines = []
            for item in observations:
                record_name = str(item.get("recordName", ""))
                status = item.get("data", {}).get("Status")
                result = "NXDOMAIN" if status == 3 else "NOERROR, no Answer"
                result_lines.append(
                    f"<code>{escape(record_name)}</code>: {result}"
                )
            discovery = "<br>".join(result_lines)
            artifacts = "Not available; no badge supplied an ANS agent ID or log"
            comparison = "Not possible without authenticated sealed values"
            reading = "Not assessed; no ANS integrity evidence. Missing badge is not failure"
        else:
            discovery = "Not checked"
            artifacts = "Not available"
            comparison = "Not assessed"
            reading = "Not assessed"

        rows.append(
            "<tr>"
            f"<th>{marker} {escape(str(agent['name']))}</th>"
            f"<td>{discovery}</td>"
            f"<td>{marker} {artifacts}</td>"
            f"<td>{marker} {comparison}</td>"
            f"<td>{marker} {reading}</td>"
            "</tr>"
        )

    return (
        "<style>"
        ".ans-integrity-table th,.ans-integrity-table td {"
        "text-align: left !important; vertical-align: top !important;"
        "}"
        "</style>"
        "<table class='ans-integrity-table'><thead><tr>"
        "<th>Agent</th><th>Badge discovery reused from Identity</th>"
        "<th>ANS integrity artifacts</th><th>Sealed-to-live comparison</th>"
        "<th>Reading</th>"
        "</tr></thead><tbody>"
        + "".join(rows)
        + "</tbody></table>"
    )


def ans_render_integrity_examples_table(
    examples: Sequence[Mapping[str, Any]],
    output_dir: str | Path,
) -> str:
    """Compare live ANS artifacts with values sealed in Transparency Log badges."""
    output_path = Path(output_dir)
    markers = ("🔵", "🟡")
    rows = []

    for example_index, example in enumerate(examples):
        marker = markers[example_index % len(markers)]
        dns_response = json.loads(
            (output_path / str(example["dns_file"])).read_text(encoding="utf-8")
        )
        badge = json.loads(
            (output_path / str(example["badge_file"])).read_text(encoding="utf-8")
        )
        event = badge["payload"]["producer"]["event"]
        attestations = event["attestations"]
        record_name = str(example["record_name"])
        live_answers = dns_response.get("Answer") or []
        live_badge = next(
            (
                str(answer.get("data"))
                for answer in live_answers
                if answer.get("type") == 16
                and str(answer.get("data", "")).startswith("v=ans-badge1;")
            ),
            None,
        )
        sealed_records = attestations.get("dnsRecordsProvisioned") or {}
        sealed_badge = (
            sealed_records.get(record_name)
            if isinstance(sealed_records, Mapping)
            else next(
                (
                    record.get("data")
                    for record in sealed_records
                    if record.get("name") == record_name
                ),
                None,
            )
        )
        badge_match = live_badge is not None and live_badge == sealed_badge

        metadata_results = []
        metadata_match_values = []
        sealed_hashes = attestations.get("metadataHashes") or {}
        for protocol, metadata in example.get("metadata", {}).items():
            filename = metadata["file"]
            observed_hash = "SHA256:" + hashlib.sha256(
                (output_path / str(filename)).read_bytes()
            ).hexdigest()
            expected_hash = sealed_hashes.get(protocol)
            metadata_match_values.append(expected_hash == observed_hash)
            metadata_results.append(
                f"<code>{escape(str(protocol))}</code>: "
                f"{'Match' if expected_hash == observed_hash else 'Mismatch'}<br>"
                f"observed <code>{escape(observed_hash)}</code><br>"
                f"sealed <code>{escape(str(expected_hash))}</code>"
            )

        if metadata_results:
            metadata_text = "<br><br>".join(metadata_results)
            metadata_matches = all(metadata_match_values)
            metadata_count = len(metadata_results)
        else:
            metadata_text = "No metadata hashes sealed for this registration"
            metadata_matches = True
            metadata_count = 0

        if badge_match and metadata_matches and metadata_count:
            reading = (
                f"Observed badge and {metadata_count}/{metadata_count} metadata "
                "hashes align with sealed baselines"
            )
        elif not badge_match:
            reading = (
                "Potential integrity drift: live DNS badge differs from the "
                "sealed baseline"
            )
        else:
            reading = "No mismatch observed in the available comparison"

        rows.append(
            "<tr>"
            f"<th>{marker} {escape(str(example['name']))}</th>"
            f"<td><code>{escape(str(live_badge))}</code><br>"
            f"Resolver AD=<code>{str(bool(dns_response.get('AD'))).lower()}</code></td>"
            f"<td><code>{escape(str(sealed_badge))}</code></td>"
            f"<td>{marker} {'Match' if badge_match else 'Mismatch'}</td>"
            f"<td>{marker} {metadata_text}</td>"
            f"<td>{marker} Not performed: signatures and Merkle proof retained "
            "but not cryptographically checked</td>"
            f"<td>{marker} {reading}</td>"
            "</tr>"
        )

    return (
        "<style>"
        ".ans-integrity-examples-table th,.ans-integrity-examples-table td {"
        "text-align: left !important; vertical-align: top !important;"
        "}"
        "</style>"
        "<table class='ans-integrity-examples-table'><thead><tr>"
        "<th>Agent</th><th>Live DNS badge</th><th>TL-sealed DNS badge</th>"
        "<th>Badge comparison</th><th>Metadata hash comparison</th>"
        "<th>Cryptographic verification</th><th>Reading</th>"
        "</tr></thead><tbody>"
        + "".join(rows)
        + "</tbody></table>"
    )


def a2a_registry_summarize_validation(
    response: Mapping[str, Any],
) -> Mapping[str, Any] | None:
    """Print readiness plus every validator finding without implying trust."""
    result = a2a_registry_validation_data(response)
    if not response.get("ok") or result is None:
        print("No validation result")
        return None
    a2a_registry_print_table(
        [
            {
                "valid": result.get("isValid"),
                "readiness": result.get("readinessScore"),
                "grade": result.get("grade"),
                "spec": result.get("specVersionDetected"),
                "offline": result.get("isOffline"),
            }
        ],
        ["valid", "readiness", "grade", "spec", "offline"],
    )
    a2a_registry_print_table(
        result.get("findings") or [],
        ["tier", "severity", "code", "title"],
        limit=100,
    )
    return result


def a2a_registry_batch_validate(
    rows: Sequence[Mapping[str, Any]],
    *,
    limit: int = 3,
    delay_seconds: float = 0.5,
) -> list[dict[str, Any]]:
    """Validate a bounded set of discovered hosted manifests."""
    audits = []
    candidates = [row for row in rows if row.get("manifest")][:limit]
    for row in candidates:
        response = a2a_registry_request_json(
            "POST",
            "/public/tools/validate-url",
            body={"url": row["manifest"]},
            authenticated=False,
            timeout=45,
        )
        result = a2a_registry_validation_data(response) or {}
        findings = result.get("findings") or []
        audits.append(
            {
                "package": row.get("package"),
                "identityLevel": row.get("verificationLevel"),
                "identityRank": row.get("verificationRank"),
                "http": response.get("status"),
                "valid": result.get("isValid"),
                "readiness": result.get("readinessScore"),
                "grade": result.get("grade"),
                "errors": sum(
                    finding.get("severity") == "error"
                    for finding in findings
                ),
                "warnings": sum(
                    finding.get("severity") == "warning"
                    for finding in findings
                ),
                "signatureFindings": [
                    finding.get("code")
                    for finding in findings
                    if "SIGNATURE" in str(finding.get("code", ""))
                ],
            }
        )
        time.sleep(delay_seconds)
    return audits


def a2a_registry_assess_agent(
    row: Mapping[str, Any],
    *,
    timeout: int = 45,
) -> dict[str, Any]:
    """Validate one discovered Agent Card and keep all scoring evidence.

    The returned values deliberately remain separate: ``relevanceScore`` is a
    search signal, ``verificationRank`` is an ordinal registry identity level,
    and ``readinessScore`` measures Agent Card readiness. The A2A Registry does
    not provide enough behavioral evidence for a general trust score.
    """
    manifest = row.get("manifest")
    if not manifest:
        response: Mapping[str, Any] = {
            "ok": False,
            "status": None,
            "url": "",
            "elapsedMs": 0,
            "headers": {},
            "data": {"error": "No manifest URL in registry record"},
        }
        result: Mapping[str, Any] = {}
    else:
        response = a2a_registry_request_json(
            "POST",
            "/public/tools/validate-url",
            body={"url": manifest},
            authenticated=False,
            timeout=timeout,
        )
        result = a2a_registry_validation_data(response) or {}

    findings = result.get("findings") or []
    signature_findings = [
        finding.get("code")
        for finding in findings
        if isinstance(finding, Mapping)
        and "SIGNATURE" in str(finding.get("code", ""))
    ]
    return {
        "package": row.get("package"),
        "name": row.get("name"),
        "relevanceScore": row.get("relevanceScore"),
        "verificationLevel": row.get("verificationLevel"),
        "verificationRank": row.get("verificationRank"),
        "verificationMaxRank": row.get(
            "verificationMaxRank", A2A_REGISTRY_MAX_VERIFICATION_RANK
        ),
        "cardValid": result.get("isValid"),
        "readinessScore": result.get("readinessScore"),
        "readinessGrade": result.get("grade"),
        "errors": sum(
            isinstance(finding, Mapping)
            and finding.get("severity") == "error"
            for finding in findings
        ),
        "warnings": sum(
            isinstance(finding, Mapping)
            and finding.get("severity") == "warning"
            for finding in findings
        ),
        "signatureFindings": signature_findings,
        "trustScore": None,
        "trustExplanation": (
            "Not computed: registry identity and card readiness do not measure "
            "behavioral trust."
        ),
        "card": result.get("cardData"),
        "findings": findings,
        "validatorResult": result,
        "validatorResponse": response,
    }


def a2a_registry_cross_check_agent(
    row: Mapping[str, Any],
    card: Mapping[str, Any] | None,
) -> list[dict[str, str]]:
    """Compare registry metadata with deterministic claims in an Agent Card."""
    card = card or {}
    manifest = str(row.get("manifest") or "")
    manifest_host = urlparse(manifest).hostname or ""
    interfaces = card.get("supportedInterfaces") or []
    interface_hosts = sorted(
        {
            urlparse(str(item.get("url", ""))).hostname or ""
            for item in interfaces
            if isinstance(item, Mapping)
        }
    )
    capabilities = card.get("capabilities") or {}
    extensions = (
        capabilities.get("extensions")
        if isinstance(capabilities, Mapping)
        else []
    ) or []
    registry_extensions = [
        item
        for item in extensions
        if isinstance(item, Mapping)
        and item.get("uri")
        == "https://a2a-registry.org/extensions/registry/v1"
    ]
    identity: Mapping[str, Any] = {}
    if registry_extensions:
        extension_params = registry_extensions[0].get("params") or {}
        if isinstance(extension_params, Mapping):
            candidate_identity = extension_params.get("identity") or {}
            if isinstance(candidate_identity, Mapping):
                identity = candidate_identity
    package_hint = identity.get("packageName")
    security_declared = bool(card.get("securitySchemes")) or (
        card.get("security") is not None
    )
    return [
        {
            "check": "manifest_https",
            "status": "pass" if manifest.startswith("https://") else "review",
            "evidence": manifest,
        },
        {
            "check": "interface_https",
            "status": (
                "pass"
                if interfaces
                and all(
                    str(item.get("url", "")).startswith("https://")
                    for item in interfaces
                    if isinstance(item, Mapping)
                )
                else "review"
            ),
            "evidence": str(interface_hosts),
        },
        {
            "check": "host_relationship",
            "status": "pass" if manifest_host in interface_hosts else "review",
            "evidence": (
                f"manifest={manifest_host}; interfaces={interface_hosts}"
            ),
        },
        {
            "check": "package_hint",
            "status": (
                "pass"
                if not package_hint or package_hint == row.get("package")
                else "review"
            ),
            "evidence": str(package_hint),
        },
        {
            "check": "security_declared",
            "status": "pass" if security_declared else "review",
            "evidence": str(security_declared),
        },
    ]
