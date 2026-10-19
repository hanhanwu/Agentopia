# Agentopia

## Making Agent-to-Agent Interactions Observable, with A Game UI 😉

![Agentopia game UI demo](demo/agentopia_v0_demo.gif)

## Run the Studio UI

Use Node.js 20.19 or newer (Node.js 22.12+ is also supported), then run:

```bash
npm install
npm run dev
```

The Studio always runs at [http://127.0.0.1:8678](http://127.0.0.1:8678). The port is strict: startup fails if `8678` is already in use rather than silently selecting another port.

During local development, the current scenario step is kept in the browser tab.
After Vite reloads for a code change, Studio skips the intro and replays that
step instead of starting the whole scenario again. Close the tab to start with
a fresh session.

To stop every process listening on port `8678`:

```bash
for pid in $(lsof -tiTCP:8678 -sTCP:LISTEN); do kill "$pid"; done
```
