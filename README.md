# Agentopia

## Explain Agent Discovery -> Agent Interactions, in a Fun Way 🐙

![Agentopia game UI demo](demo/agentopia_v0_demo.gif)

## Run Studio

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open [localhost:8678](http://127.0.0.1:8678). Stop the server with `Ctrl+C`.

To kill all the process in port 8678:
```bash
for pid in $(lsof -tiTCP:8678 -sTCP:LISTEN); do kill "$pid"; done
```


## Portable Visualization

![Portable visualization](demo/portable_gif.gif)

👉 [Enter the exhibition >>](demo/exhibition.md)