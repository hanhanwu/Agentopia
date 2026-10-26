# Agentopia

## Making Agent-to-Agent Interactions Observable, with A Game UI 😉

![Agentopia game UI demo](demo/agentopia_v0_demo.gif)

## Run the Studio UI

Use Node.js 20.19 or newer (Node.js 22.12+ is also supported), then run:

```bash
npm install
npm run dev
```

* The Studio always runs at [http://127.0.0.1:8678](http://127.0.0.1:8678).

After the logo, choose **Check Trust Score** or **Understand Agents’ World**.
Enter a public HTTP(S) MCP endpoint and click **Check Trust Score** to collect a
fresh assessment through the local Python scoring bridge. Skynet shows the
weighted points, rule pass rate, four outcome groups, expandable evidence, and
JSON download. It remains empty before submission. Loading and error messages
appear only on Skynet. Agent scoring is not implemented yet.

The scorer must be installed in the Python environment used by Studio. For this
workspace, use the notebook environment:

```bash
.venv/bin/python -m pip install -e ../Agentopia_Lab/Scoring_System/score_mcp_servers
```

Studio uses `.venv/bin/python` when present, otherwise `python3`. Set
`AGENTOPIA_SCORER_PYTHON` to an absolute interpreter path to override it. Runtime
code imports the installed `score_mcp_servers` package; it does not import
notebooks or require a Lab checkout path. Install the scoring package on any
machine that runs the bridge.

The local bridge is available in `npm run dev` and `npm run preview` at
`POST /api/trust-score/v1`, with JSON `{ "type": "mcp", "identifier": "https://example.com/mcp" }`.
Responses use `{ "schema_version": "1.0", "source": "live", "report": ... }`.
It allows two assessments at a time, limits each worker to 90 seconds, pins
public target addresses, and cancels work when the browser disconnects. It is
restricted to local, same-origin Studio requests. A standalone static deployment
needs a separately hosted scoring service; this does not deploy a public API.

The walkthrough remains available through **Understand Agents’ World**.

* To stop every process listening on port `8678`:

```bash
for pid in $(lsof -tiTCP:8678 -sTCP:LISTEN); do kill "$pid"; done
```

## Portable Visualization

![Portable visualization](demo/portable_gif.gif)

👉 [Enter the exhibition >>](demo/exhibition.md)
