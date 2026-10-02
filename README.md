# Agentopia

An open-source environment for making agent discovery, interaction, and evidence visible.

## Run the Studio UI

```bash
npm install
npm run dev
```

The Studio always runs at [http://127.0.0.1:8678](http://127.0.0.1:8678). The port is strict: startup fails if `8678` is already in use rather than silently selecting another port.

To stop every process listening on port `8678`:

```bash
for pid in $(lsof -tiTCP:8678 -sTCP:LISTEN); do kill "$pid"; done
```
