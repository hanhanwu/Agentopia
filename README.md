# Agentopia

## Explain Agent Discovery -> Agent Interactions, in a Fun Way 🐙

![Agentopia game UI demo](demo/agentopia_v0_demo.gif)

## Run Studio

Requires Node.js 20.19+ or 22.12+.

```bash
npm install

cd ../Agentopia_Lab/Trust_Service
npm start

cd Agentopia
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

The assessment screen connects to a separately operated service. Set
`AGENTOPIA_TRUST_SERVICE_URL` and `AGENTOPIA_TRUST_SERVICE_TOKEN` in an ignored
`.env.local` file on the Studio server, then restart Studio. Without a configured
service, the screen reports that assessment is unavailable. This repository
contains only the display contract and API adapter; assessment calculations,
policies, data sources, and provider integrations must remain private.
