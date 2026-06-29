// index.js
// ----------------------------------------------------------------------------
// Server yang berjalan di MacBook:
//   1. Menyajikan halaman controller (web) ke iPhone lewat WiFi.
//   2. Menerima input controller via WebSocket dengan latensi rendah.
//   3. Menerjemahkan input -> keyboard & mouse (lihat inputController.js).
// ----------------------------------------------------------------------------

import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { input } from "./inputController.js";
import { keymap } from "./keymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

const app = express();
app.use(express.static(path.join(__dirname, "..", "public")));

// Kirim keymap ke client agar bisa menampilkan label tombol.
app.get("/keymap", (_req, res) => res.json(keymap));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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

// State per koneksi
function createSessionState() {
  return {
    rightStick: { x: 0, y: 0 },
    mouseLoop: null,
  };
}

wss.on("connection", (ws) => {
  console.log("[ws] controller terhubung");
  const state = createSessionState();

  // Loop gerak mouse untuk stik kanan (mode mouse) — halus & terus menerus.
  state.mouseLoop = setInterval(async () => {
    const cfg = keymap.rightStick;
    if (cfg.mode !== "mouse") return;
    const { x, y } = state.rightStick;
    const t = cfg.threshold ?? 0.18;
    const mag = Math.hypot(x, y);
    if (mag < t) return;
    const s = cfg.sensitivity ?? 16;
    await input.moveMouseBy(Math.round(x * s), Math.round(y * s));
  }, 16); // ~60 fps

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    try {
      await handleMessage(msg, state);
    } catch (err) {
      console.error("[ws] error handle:", err?.message || err);
    }
  });

  ws.on("close", async () => {
    console.log("[ws] controller terputus");
    if (state.mouseLoop) clearInterval(state.mouseLoop);
    state.rightStick = { x: 0, y: 0 };
    await input.releaseAll();
  });

  ws.on("error", () => {});
});

async function handleMessage(msg, state) {
  switch (msg.type) {
    case "stick": {
      // msg: { type:'stick', side:'left'|'right', x, y }
      if (msg.side === "left") {
        const desired = stickToKeys({ x: msg.x, y: msg.y }, keymap.leftStick);
        await input.syncKeys(desired);
      } else if (msg.side === "right") {
        const cfg = keymap.rightStick;
        if (cfg.mode === "mouse") {
          state.rightStick = { x: msg.x, y: msg.y };
        } else {
          const desired = stickToKeys({ x: msg.x, y: msg.y }, cfg);
          // gunakan prefix supaya tidak bentrok dgn key stik kiri yang sama
          await syncNamespaced("rstick", desired);
        }
      }
      break;
    }

    case "dpad": {
      // msg: { type:'dpad', dir:'up'|'down'|'left'|'right', pressed:bool }
      const key = keymap.dpad[msg.dir];
      if (!key) break;
      if (msg.pressed) await input.pressKey(key);
      else await input.releaseKey(key);
      break;
    }

    case "button": {
      // msg: { type:'button', name:'a'|'b'|..., pressed:bool }
      const mapping = keymap.buttons[msg.name];
      if (!mapping) break;
      if (mapping.type === "key") {
        if (msg.pressed) await input.pressKey(mapping.value);
        else await input.releaseKey(mapping.value);
      } else if (mapping.type === "mouse") {
        if (msg.pressed) await input.pressMouse(mapping.value);
        else await input.releaseMouse(mapping.value);
      }
      break;
    }

    case "ping":
      break;
  }
}

// Sinkronisasi key dengan namespace agar stik kiri & kanan tidak saling
// melepas tombol satu sama lain bila kebetulan memetakan key yang sama.
const namespaced = new Map();
async function syncNamespaced(ns, desired) {
  const prev = namespaced.get(ns) || new Set();
  const next = new Set(desired);
  for (const k of prev) if (!next.has(k)) await input.releaseKey(k);
  for (const k of next) if (!prev.has(k)) await input.pressKey(k);
  namespaced.set(ns, next);
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
  console.log("  🎮  iPhone -> Mac Gamepad server berjalan");
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
