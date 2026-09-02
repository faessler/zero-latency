# zero-latency

A tiny real-time round-trip latency demo. A WebSocket echo server pongs every
ping straight back, and a browser client measures the live round-trip time,
showing current / min / avg / max latency plus a rolling chart.

## Stack

- Node.js (>= 20), ES modules
- [Express](https://expressjs.com/) for static hosting + a `/healthz` endpoint
- [`ws`](https://github.com/websockets/ws) for the WebSocket echo endpoint (`/ws`)
- Vanilla HTML/CSS/JS client (no build step)

## Getting started

```bash
npm install      # first time (or: npm ci with the committed lockfile)
npm start        # serves http://localhost:3000
```

Open http://localhost:3000 to watch live latency measurements.

## Scripts

| Command        | Description                              |
| -------------- | ---------------------------------------- |
| `npm start`    | Start the server on `PORT` (default 3000) |
| `npm run dev`  | Start with `--watch` auto-reload          |
| `npm test`     | Run the Node built-in test suite          |
| `npm run lint` | Lint with ESLint                          |

## Endpoints

- `GET /` – latency dashboard
- `GET /healthz` – JSON health check
- `WS /ws` – ping/pong echo (`{ "type": "ping", "clientSentAt": <number> }`)

## Cloud Agent environment

`.cursor/environment.json` installs dependencies with `npm ci` and runs the dev
server (`npm start`) in a persistent terminal, exposing port `3000`.
