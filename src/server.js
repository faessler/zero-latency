import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { WebSocketServer } from "ws";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const HOST = process.env.HOST ?? "0.0.0.0";
const PORT = Number(process.env.PORT ?? 3000);

export function createServer() {
  const app = express();
  app.use(express.static(PUBLIC_DIR));

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    socket.on("message", (data) => {
      // Echo the client's ping straight back so it can measure round-trip time.
      // The payload carries the client's high-resolution send timestamp untouched.
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }

      if (message?.type === "ping") {
        socket.send(
          JSON.stringify({
            type: "pong",
            clientSentAt: message.clientSentAt,
            serverTime: Date.now(),
          }),
        );
      }
    });
  });

  return { app, server, wss };
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const { server } = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`zero-latency listening on http://${HOST}:${PORT}`);
  });
}
