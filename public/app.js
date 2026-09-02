const els = {
  current: document.getElementById("current"),
  min: document.getElementById("min"),
  avg: document.getElementById("avg"),
  max: document.getElementById("max"),
  status: document.getElementById("status"),
  samples: document.getElementById("samples"),
  chart: document.getElementById("chart"),
};

const ctx = els.chart.getContext("2d");
const history = [];
const MAX_POINTS = 120;

const stats = { min: Infinity, max: 0, sum: 0, count: 0 };

function setStatus(state, text) {
  els.status.className = `status ${state}`;
  els.status.textContent = text;
}

function fmt(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "–";
}

function record(rtt) {
  stats.min = Math.min(stats.min, rtt);
  stats.max = Math.max(stats.max, rtt);
  stats.sum += rtt;
  stats.count += 1;

  history.push(rtt);
  if (history.length > MAX_POINTS) history.shift();

  els.current.textContent = fmt(rtt);
  els.min.textContent = fmt(stats.min);
  els.avg.textContent = fmt(stats.sum / stats.count);
  els.max.textContent = fmt(stats.max);
  els.samples.textContent = `${stats.count} samples`;

  draw();
}

function draw() {
  const { width, height } = els.chart;
  ctx.clearRect(0, 0, width, height);
  if (history.length < 2) return;

  const peak = Math.max(...history, 1);
  const stepX = width / (MAX_POINTS - 1);

  ctx.beginPath();
  history.forEach((rtt, i) => {
    const x = i * stepX;
    const y = height - (rtt / peak) * (height - 12) - 6;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#38e1b0";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.addEventListener("open", () => {
    setStatus("online", "online");
    ping();
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "pong") {
      record(performance.now() - msg.clientSentAt);
      setTimeout(ping, 250);
    }
  });

  ws.addEventListener("close", () => {
    setStatus("offline", "offline — reconnecting…");
    setTimeout(connect, 1000);
  });

  ws.addEventListener("error", () => ws.close());

  function ping() {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "ping", clientSentAt: performance.now() }));
  }
}

connect();
