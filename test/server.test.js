import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { WebSocket } from "ws";

import { createServer } from "../src/server.js";

async function withServer(run) {
  const { server } = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  try {
    await run(port);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("GET /healthz reports ok", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/healthz`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
    assert.equal(typeof body.uptime, "number");
  });
});

test("serves the client index page", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /zero-latency/);
  });
});

test("WebSocket ping is echoed back as a pong with the client timestamp", async () => {
  await withServer(async (port) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    await once(ws, "open");

    const sentAt = 123.456;
    ws.send(JSON.stringify({ type: "ping", clientSentAt: sentAt }));

    const [raw] = await once(ws, "message");
    const msg = JSON.parse(raw.toString());

    assert.equal(msg.type, "pong");
    assert.equal(msg.clientSentAt, sentAt);
    assert.equal(typeof msg.serverTime, "number");

    ws.close();
    await once(ws, "close");
  });
});
