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

* To stop every process listening on port `8678`:

```bash
for pid in $(lsof -tiTCP:8678 -sTCP:LISTEN); do kill "$pid"; done
```

## Portable visualization

Select steps to preview their animations immediately. Previewing does not generate
a GIF. Click **Submit** to choose a save location and generate the downloadable
GIF. Playback continues while the export runs. After saving, copy the Markdown or
HTML below the preview and upload the GIF alongside the page that embeds it.
