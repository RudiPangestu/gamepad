// index.js
// ----------------------------------------------------------------------------
// Server yang berjalan di MacBook:
//   1. Menyajikan halaman controller (web) ke iPhone lewat WiFi.
//   2. Menerima input controller via WebSocket dengan latensi rendah.
//   3. Menerjemahkan input -> keyboard & mouse (lihat inputController.js).
//
// Mendukung 2 pemain: tiap iPhone memilih slot Player 1 / Player 2, dan tiap
// pemain punya keymap sendiri. State input dipisah per koneksi sehingga 2
// controller tidak saling mengganggu.
// ----------------------------------------------------------------------------

import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { input } from "./inputController.js";
import { getKeymap, applyPatch, resetKeymap } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function parsePlayer(v) {
  return v === 2 || v === "2" ? 2 : 1;
}

// Kirim keymap efektif pemain tertentu (untuk label & layar remap).
app.get("/keymap", (req, res) => res.json(getKeymap(parsePlayer(req.query.player))));

// Simpan perubahan remap dari iPhone. Body: { player, patch }.
app.post("/keymap", (req, res) => {
  const { player, patch } = req.body || {};
  if (!patch || typeof patch !== "object") {
    return res.status(400).json({ error: "patch tidak valid" });
  }
  const updated = applyPatch(parsePlayer(player), patch);
  console.log(`[config] keymap Player ${parsePlayer(player)} diperbarui via remap`);
  res.json(updated);
});

// Kembalikan keymap pemain ke default. Body: { player }.
app.post("/keymap/reset", (req, res) => {
  res.json(resetKeymap(parsePlayer((req.body || {}).player)));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- Sesi input PER KONEKSI ------------------------------------------------
// Melacak tombol/mouse yang ditahan koneksi ini, agar saat putus hanya melepas
// miliknya sendiri (bukan milik pemain lain). Lapisan fisik (inputController)
// tetap ref-counted, jadi aman bila kedua pemain menekan tombol yang sama.
function makeSession() {
  const keyCounts = new Map();
  const mouseCounts = new Map();
  return {
    async pressKey(k) {
      keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
      await input.pressKey(k);
    },
    async releaseKey(k) {
      const c = keyCounts.get(k) || 0;
      if (c <= 0) return;
      if (c === 1) keyCounts.delete(k);
      else keyCounts.set(k, c - 1);
      await input.releaseKey(k);
    },
    async pressMouse(m) {
      mouseCounts.set(m, (mouseCounts.get(m) || 0) + 1);
      await input.pressMouse(m);
    },
    async releaseMouse(m) {
      const c = mouseCounts.get(m) || 0;
      if (c <= 0) return;
      if (c === 1) mouseCounts.delete(m);
      else mouseCounts.set(m, c - 1);
      await input.releaseMouse(m);
    },
    async moveMouseBy(dx, dy) {
      await input.moveMouseBy(dx, dy);
    },
    // Lepas semua yang ditahan koneksi ini.
    async releaseAll() {
      for (const [k, c] of keyCounts) for (let i = 0; i < c; i++) await input.releaseKey(k);
      keyCounts.clear();
      for (const [m, c] of mouseCounts) for (let i = 0; i < c; i++) await input.releaseMouse(m);
      mouseCounts.clear();
    },
  };
}

// --- Logika penerjemahan stik analog -> tombol ----------------------------
function stickToKeys(stick, cfg) {
  const keys = [];
  const t = cfg.threshold ?? 0.4;
  if (stick.y <= -t) keys.push(cfg.up);
  if (stick.y >= t) keys.push(cfg.down);
  if (stick.x <= -t) keys.push(cfg.left);
  if (stick.x >= t) keys.push(cfg.right);
  return keys;
}

// Sinkronisasi tombol per-namespace, per-koneksi (mis. "lstick", "tilt").
async function syncNamespaced(state, ns, desired) {
  const prev = state.namespaced.get(ns) || new Set();
  const next = new Set(desired);
  for (const k of prev) if (!next.has(k)) await state.io.releaseKey(k);
  for (const k of next) if (!prev.has(k)) await state.io.pressKey(k);
  state.namespaced.set(ns, next);
}

function createSessionState() {
  return {
    player: 1,
    helloReceived: false, // true setelah iPhone memilih slot pemain
    rightStick: { x: 0, y: 0 },
    mouseLoop: null,
    namespaced: new Map(),
    io: makeSession(),
  };
}

// Hitung berapa koneksi yang aktif di tiap slot pemain (yang sudah memilih).
function computeSlotCounts() {
  const counts = { 1: 0, 2: 0 };
  for (const c of wss.clients) {
    if (c.readyState === WebSocket.OPEN && c._state && c._state.helloReceived) {
      counts[c._state.player] = (counts[c._state.player] || 0) + 1;
    }
  }
  return counts;
}

// Siarkan status slot ke semua iPhone agar bisa menampilkan indikator.
function broadcastSlots() {
  const payload = JSON.stringify({ type: "slots", counts: computeSlotCounts() });
  for (const c of wss.clients) {
    if (c.readyState === WebSocket.OPEN) {
      try { c.send(payload); } catch {}
    }
  }
}

wss.on("connection", (ws) => {
  const state = createSessionState();
  ws._state = state; // agar bisa dibaca saat menghitung slot
  console.log("[ws] controller terhubung (menunggu pilihan pemain)");
  broadcastSlots(); // kirim status awal ke koneksi baru

  // Loop gerak mouse untuk stik kanan (mode mouse). Hanya berarti untuk pemain
  // yang memakai mode mouse (default Player 1).
  let moving = false;
  state.mouseLoop = setInterval(async () => {
    if (moving) return;
    const cfg = getKeymap(state.player).rightStick;
    if (cfg.mode !== "mouse") return;
    const { x, y } = state.rightStick;
    const t = cfg.threshold ?? 0.18;
    if (Math.hypot(x, y) < t) return;
    const s = cfg.sensitivity ?? 16;
    moving = true;
    try {
      await state.io.moveMouseBy(Math.round(x * s), Math.round(y * s));
    } finally {
      moving = false;
    }
  }, 16);

  // Pesan diproses BERURUTAN per koneksi (antrian promise). Tanpa ini, handler
  // async bisa saling menyela di titik `await` — mis. input bisa diproses
  // sebelum `hello` selesai menetapkan slot pemain.
  let queue = Promise.resolve();
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    queue = queue.then(() => handleMessage(msg, state)).catch((err) => {
      console.error("[ws] error handle:", err?.message || err);
    });
  });

  ws.on("close", async () => {
    if (state.mouseLoop) clearInterval(state.mouseLoop);
    state.rightStick = { x: 0, y: 0 };
    try { await queue; } catch {} // tunggu pesan tersisa selesai diproses
    state.namespaced.clear();
    await state.io.releaseAll();
    console.log(`[ws] Player ${state.player} terputus`);
    broadcastSlots();
  });

  ws.on("error", () => {});
});

async function handleMessage(msg, state) {
  // Pilihan slot pemain dari iPhone.
  if (msg.type === "hello") {
    const newPlayer = parsePlayer(msg.player);
    if (newPlayer !== state.player) {
      // lepas tombol pemetaan lama agar tidak ada yang nyangkut
      state.namespaced.clear();
      await state.io.releaseAll();
      state.player = newPlayer;
    }
    state.helloReceived = true;
    console.log(`[ws] -> Player ${state.player} terhubung`);
    broadcastSlots();
    return;
  }

  const keymap = getKeymap(state.player);
  switch (msg.type) {
    case "stick": {
      if (msg.side === "left") {
        await syncNamespaced(state, "lstick", stickToKeys({ x: msg.x, y: msg.y }, keymap.leftStick));
      } else if (msg.side === "right") {
        const cfg = keymap.rightStick;
        if (cfg.mode === "mouse") {
          state.rightStick = { x: msg.x, y: msg.y };
        } else {
          await syncNamespaced(state, "rstick", stickToKeys({ x: msg.x, y: msg.y }, cfg));
        }
      }
      break;
    }

    case "dpad": {
      const key = keymap.dpad[msg.dir];
      if (!key) break;
      if (msg.pressed) await state.io.pressKey(key);
      else await state.io.releaseKey(key);
      break;
    }

    case "button": {
      const mapping = keymap.buttons[msg.name];
      if (!mapping) break;
      if (mapping.type === "key") {
        if (msg.pressed) await state.io.pressKey(mapping.value);
        else await state.io.releaseKey(mapping.value);
      } else if (mapping.type === "mouse") {
        if (msg.pressed) await state.io.pressMouse(mapping.value);
        else await state.io.releaseMouse(mapping.value);
      }
      break;
    }

    case "tilt": {
      const cfg = keymap.tilt;
      if (!cfg || !cfg.enabled) break;
      const desired = [];
      const t = cfg.threshold ?? 0.25;
      if (msg.x <= -t) desired.push(cfg.left);
      if (msg.x >= t) desired.push(cfg.right);
      await syncNamespaced(state, "tilt", desired);
      break;
    }

    case "ping":
      break;
  }
}

// --- Util: cari alamat IP LAN untuk ditampilkan ---------------------------
function getLanIps() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name] || []) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

await input.init();

server.listen(PORT, "0.0.0.0", () => {
  const ips = getLanIps();
  console.log("\n==========================================================");
  console.log("  🎮  iPhone -> Mac Gamepad server berjalan (2 pemain)");
  console.log("  Mode input :", input.mode === "native" ? "NATIVE (keyboard+mouse aktif)" : "MOCK (hanya log)");
  console.log("----------------------------------------------------------");
  console.log("  Buka di Safari iPhone (WiFi yang sama dgn Mac):");
  if (ips.length === 0) {
    console.log(`     http://<IP-MAC-KAMU>:${PORT}`);
  } else {
    for (const ip of ips) console.log(`     http://${ip}:${PORT}`);
  }
  console.log("==========================================================\n");
});
