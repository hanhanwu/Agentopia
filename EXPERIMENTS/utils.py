"""Read-only helper functions for AgentCensus experiments.

Every public function is prefixed with ``agentcensus_`` so this module can
later hold clearly separated helpers for other agent-discovery tools.
"""

from __future__ import annotations

import json
import os
import ssl
import time
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


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
            Path("EXPERIMENTS/credentials.yaml"),
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
