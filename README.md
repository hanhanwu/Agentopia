# Agentopia

## Making Agent-to-Agent Interactions Observable, with A Game UI 😉

![Agentopia game UI demo](demo/agentopia_v0_demo.gif)

## Run Studio

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open [localhost:8678](http://127.0.0.1:8678). Stop the server with `Ctrl+C`.

After the logo, choose **Check Trust Score** or **Understand Agents’ World**.
The walkthrough and its intro both provide a **Home** button.

## MCP scoring

Install the scorer in Studio's Python environment (Python 3.11+):

```bash
.venv/bin/python -m pip install -e ../Agentopia_Lab/Scoring_System/score_mcp_servers
```

Studio uses `.venv/bin/python`, otherwise `python3`. Override it with
`AGENTOPIA_SCORER_PYTHON`. Runtime imports the installed package, not notebooks
or research caches. Other machines need the scoring package installed too.

Submit a public HTTP(S) MCP endpoint to collect a fresh assessment. Skynet shows
weighted points, rule pass rate, Passed/Failed/Skipped/Unknown counts, evidence,
and JSON download. It stays empty until submission. All status messages appear
on Skynet. Agent scoring is not implemented.

The local API runs in dev and preview: `POST /api/trust-score/v1` accepts
`{"type":"mcp","identifier":"https://example.com/mcp"}` and returns
`{"schema_version":"1.0","source":"live","report":...}`.
It permits two workers, imposes a 90-second deadline, pins public destination
addresses, and cancels disconnected requests. Only local, same-origin requests
are accepted. Static hosting requires a separate scoring service.

## Checks

```bash
npm run build
npm test
.venv/bin/python -m unittest discover -s apps/studio/server -p 'test_score_worker.py'
```

## Portable Visualization

![Portable visualization](demo/portable_gif.gif)

👉 [Enter the exhibition >>](demo/exhibition.md)
