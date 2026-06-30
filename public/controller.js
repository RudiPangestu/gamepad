// controller.js
// ----------------------------------------------------------------------------
// Berjalan di Safari iPhone. Menangani sentuhan (stik analog + tombol) lalu
// mengirim input ke server Mac via WebSocket dengan latensi rendah.
// ----------------------------------------------------------------------------

const statusEl = document.getElementById("status");

// --- Pemain (1 atau 2). 0 = belum dipilih. ---------------------------------
let player = parseInt(localStorage.getItem("player"), 10) || 0;
let slotCounts = { 1: 0, 2: 0 }; // jumlah HP di tiap slot (dari server)

// --- Koneksi WebSocket dengan auto-reconnect ------------------------------
let ws = null;
let connected = false;

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
}

function statusConnected() {
  // Tampilkan peringatan bila slotku dipakai lebih dari 1 HP (bentrok).
  if (player && (slotCounts[player] || 0) > 1) {
    statusEl.textContent = `⚠️ P${player} dipakai ${slotCounts[player]} HP`;
    statusEl.className = "status warn";
    return;
  }
  statusEl.textContent = `🎮 P${player} Terhubung`;
  statusEl.className = player === 2 ? "status ok p2" : "status ok";
}

// Perbarui badge slot di modal pilih pemain + status bar.
function renderSlots() {
  for (const s of [1, 2]) {
    const el = document.querySelector(`.pstate[data-state="${s}"]`);
    if (!el) continue;
    const count = slotCounts[s] || 0;
    el.classList.remove("free", "mine", "other");
    if (count === 0) {
      el.textContent = "kosong";
      el.classList.add("free");
    } else if (player === s) {
      if (count > 1) {
        el.textContent = `kamu +${count - 1} ⚠️`;
        el.classList.add("other");
      } else {
        el.textContent = "dipakai kamu";
        el.classList.add("mine");
      }
    } else {
      el.textContent = count > 1 ? `dipakai (${count} HP)` : "dipakai HP lain";
      el.classList.add("other");
    }
  }
  if (connected && player) statusConnected();
}

function connect() {
  ws = new WebSocket(wsUrl());

  ws.onopen = () => {
    connected = true;
    // Beritahu server slot pemain (jika sudah dipilih).
    if (player) {
      send({ type: "hello", player });
      statusConnected();
    } else {
      statusEl.textContent = "🎮 Terhubung";
      statusEl.className = "status ok";
    }
  };

  ws.onmessage = (ev) => {
    let msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === "slots") {
      slotCounts = msg.counts || { 1: 0, 2: 0 };
      renderSlots();
    }
  };

  ws.onclose = () => {
    connected = false;
    statusEl.textContent = "Terputus — menyambung ulang…";
    statusEl.className = "status err";
    setTimeout(connect, 1000);
  };

  ws.onerror = () => {
    statusEl.textContent = "Gagal terhubung";
    statusEl.className = "status err";
  };
}

function send(obj) {
  if (connected && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

connect();

// Keepalive
setInterval(() => send({ type: "ping" }), 2000);

// --- Cegah scroll / zoom / gesture default --------------------------------
// Tapi IZINKAN scroll di dalam panel pengaturan (.sheet) yang memang panjang,
// jika tidak, daftar remap tidak bisa di-scroll di iPhone.
document.addEventListener("touchmove", (e) => {
  if (e.target.closest && e.target.closest(".sheet")) return;
  e.preventDefault();
}, { passive: false });
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault());

// --- Analog stick ----------------------------------------------------------
function setupStick(zoneId, side) {
  const zone = document.getElementById(zoneId);
  const base = zone.querySelector(".stick-base");
  const knob = zone.querySelector(".stick-knob");
  const maxR = 40; // radius gerak knob (px)
  let activeTouchId = null;
  let centerX = 0, centerY = 0;
  let lastSent = { x: 0, y: 0 };

  function center() {
    const r = base.getBoundingClientRect();
    centerX = r.left + r.width / 2;
    centerY = r.top + r.height / 2;
  }

  function update(touch) {
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;

    const nx = +(dx / maxR).toFixed(3);
    const ny = +(dy / maxR).toFixed(3);
    // Kirim hanya bila berubah cukup berarti (kurangi traffic).
    if (Math.abs(nx - lastSent.x) > 0.03 || Math.abs(ny - lastSent.y) > 0.03) {
      lastSent = { x: nx, y: ny };
      send({ type: "stick", side, x: nx, y: ny });
    }
  }

  function reset() {
    knob.style.transform = "translate(0,0)";
    lastSent = { x: 0, y: 0 };
    send({ type: "stick", side, x: 0, y: 0 });
  }

  zone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (activeTouchId !== null) return;
    const t = e.changedTouches[0];
    activeTouchId = t.identifier;
    center();
    update(t);
  }, { passive: false });

  zone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === activeTouchId) update(t);
    }
  }, { passive: false });

  function end(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === activeTouchId) {
        activeTouchId = null;
        reset();
      }
    }
  }
  zone.addEventListener("touchend", end);
  zone.addEventListener("touchcancel", end);
}

setupStick("leftStick", "left");
setupStick("rightStick", "right");

// --- Tombol (multi-touch, press & release) --------------------------------
function bindButton(el, onDown, onUp) {
  el.addEventListener("touchstart", (e) => {
    e.preventDefault();
    el.classList.add("active");
    haptic();
    onDown();
  }, { passive: false });

  const up = (e) => {
    e.preventDefault();
    el.classList.remove("active");
    onUp();
  };
  el.addEventListener("touchend", up);
  el.addEventListener("touchcancel", up);
}

// Tombol biasa (data-btn) -> button event
document.querySelectorAll("[data-btn]").forEach((el) => {
  const name = el.dataset.btn;
  bindButton(
    el,
    () => send({ type: "button", name, pressed: true }),
    () => send({ type: "button", name, pressed: false })
  );
});

// D-pad (data-dpad) -> dpad event
document.querySelectorAll("[data-dpad]").forEach((el) => {
  const dir = el.dataset.dpad;
  bindButton(
    el,
    () => send({ type: "dpad", dir, pressed: true }),
    () => send({ type: "dpad", dir, pressed: false })
  );
});

// ===========================================================================
//  HAPTIC / GETARAN
// ===========================================================================
// iOS Safari TIDAK mendukung navigator.vibrate. Sebagai gantinya dipakai trik
// label + <input switch> yang memicu haptic halus di iOS 17.4+. Di Android
// dipakai navigator.vibrate biasa. Bila keduanya gagal, fungsi ini no-op.
let hapticsEnabled = localStorage.getItem("haptics") !== "off";

let iosHapticLabel = null;
function buildIosHaptic() {
  const label = document.createElement("label");
  label.style.cssText = "position:absolute;opacity:0;pointer-events:none;";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  label.appendChild(input);
  document.body.appendChild(label);
  iosHapticLabel = label;
}
buildIosHaptic();

function haptic() {
  if (!hapticsEnabled) return;
  try {
    if (navigator.vibrate) navigator.vibrate(12);
  } catch {}
  try {
    if (iosHapticLabel) iosHapticLabel.click(); // best-effort iOS
  } catch {}
}

// ===========================================================================
//  TILT / GYROSCOPE (setir dengan kemiringan)
// ===========================================================================
let tiltEnabled = false;
let lastTiltSent = 0;

function screenAngle() {
  if (screen.orientation && typeof screen.orientation.angle === "number") {
    return screen.orientation.angle;
  }
  if (typeof window.orientation === "number") return window.orientation;
  return 0;
}

function handleOrientation(e) {
  if (!tiltEnabled) return;
  const beta = e.beta || 0;   // depan-belakang
  const gamma = e.gamma || 0; // kiri-kanan
  const angle = screenAngle();

  // Saat landscape, sumbu setir = beta (tanda tergantung sisi landscape).
  let raw;
  if (angle === 90) raw = -beta;
  else if (angle === -90 || angle === 270) raw = beta;
  else raw = gamma; // portrait fallback

  // ~35° = belok penuh.
  const x = Math.max(-1, Math.min(1, raw / 35));

  const now = Date.now();
  if (now - lastTiltSent > 60) {
    lastTiltSent = now;
    send({ type: "tilt", x: +x.toFixed(2) });
  }
}
window.addEventListener("deviceorientation", handleOrientation);

async function enableTilt() {
  // iOS 13+ butuh izin eksplisit lewat gesture pengguna.
  try {
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") {
        alert("Izin gerak (Motion) ditolak. Tilt tidak bisa aktif.");
        return false;
      }
    }
    tiltEnabled = true;
    return true;
  } catch {
    alert("Perangkat tidak mendukung sensor gerak.");
    return false;
  }
}
function disableTilt() {
  tiltEnabled = false;
  send({ type: "tilt", x: 0 }); // lepas setir
}

// ===========================================================================
//  PANEL PENGATURAN + REMAP
// ===========================================================================
const gearBtn = document.getElementById("gear");
const settingsEl = document.getElementById("settings");
const pickerEl = document.getElementById("picker");
const hapticsToggle = document.getElementById("hapticsToggle");
const tiltToggle = document.getElementById("tiltToggle");
const remapListEl = document.getElementById("remapList");
const keyGridEl = document.getElementById("keyGrid");
const pickerTitle = document.getElementById("pickerTitle");

let keymap = null; // keymap efektif dari server

// Kontrol yang bisa di-remap. kind 'button' => {type,value}; 'plainkey' => string.
const REMAP = [
  { label: "A", path: ["buttons", "a"], kind: "button" },
  { label: "B", path: ["buttons", "b"], kind: "button" },
  { label: "X", path: ["buttons", "x"], kind: "button" },
  { label: "Y", path: ["buttons", "y"], kind: "button" },
  { label: "L1", path: ["buttons", "l1"], kind: "button" },
  { label: "R1", path: ["buttons", "r1"], kind: "button" },
  { label: "L2", path: ["buttons", "l2"], kind: "button" },
  { label: "R2", path: ["buttons", "r2"], kind: "button" },
  { label: "Start", path: ["buttons", "start"], kind: "button" },
  { label: "Select", path: ["buttons", "select"], kind: "button" },
  { label: "D-pad ↑", path: ["dpad", "up"], kind: "plainkey" },
  { label: "D-pad ↓", path: ["dpad", "down"], kind: "plainkey" },
  { label: "D-pad ◀", path: ["dpad", "left"], kind: "plainkey" },
  { label: "D-pad ▶", path: ["dpad", "right"], kind: "plainkey" },
  { label: "Stik kiri ↑", path: ["leftStick", "up"], kind: "plainkey" },
  { label: "Stik kiri ↓", path: ["leftStick", "down"], kind: "plainkey" },
  { label: "Stik kiri ◀", path: ["leftStick", "left"], kind: "plainkey" },
  { label: "Stik kiri ▶", path: ["leftStick", "right"], kind: "plainkey" },
  { label: "Setir ◀", path: ["tilt", "left"], kind: "plainkey" },
  { label: "Setir ▶", path: ["tilt", "right"], kind: "plainkey" },
];

const KEY_OPTS = [
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
  "space", "enter", "escape", "tab", "shift", "control", "alt",
  "up", "down", "left", "right",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
];
const MOUSE_OPTS = [
  { value: "left", label: "🖱 Kiri" },
  { value: "right", label: "🖱 Kanan" },
  { value: "middle", label: "🖱 Tengah" },
];

function getByPath(obj, path) {
  return path.reduce((o, k) => (o ? o[k] : undefined), obj);
}
function patchFromPath(path, value) {
  const root = {};
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) {
    cur[path[i]] = {};
    cur = cur[path[i]];
  }
  cur[path[path.length - 1]] = value;
  return root;
}

function actionLabel(item) {
  const v = getByPath(keymap, item.path);
  if (item.kind === "button") {
    if (!v) return "—";
    return v.type === "mouse" ? `🖱 ${v.value}` : `⌨ ${v.value}`;
  }
  return `⌨ ${v}`;
}

function renderRemapList() {
  remapListEl.innerHTML = "";
  for (const item of REMAP) {
    const row = document.createElement("div");
    row.className = "remap-item";
    row.innerHTML =
      `<span class="ctrl">${item.label}</span>` +
      `<span class="act">${actionLabel(item)}</span>`;
    row.addEventListener("click", () => openPicker(item));
    remapListEl.appendChild(row);
  }
}

let pickerItem = null;
function openPicker(item) {
  pickerItem = item;
  pickerTitle.textContent = `Aksi untuk: ${item.label}`;
  keyGridEl.innerHTML = "";

  for (const k of KEY_OPTS) {
    const b = document.createElement("button");
    b.className = "key-opt";
    b.textContent = k;
    b.addEventListener("click", () => chooseAction(k, "key"));
    keyGridEl.appendChild(b);
  }
  // Opsi mouse hanya untuk tombol (bukan stik/d-pad/tilt).
  if (item.kind === "button") {
    for (const m of MOUSE_OPTS) {
      const b = document.createElement("button");
      b.className = "key-opt mouse";
      b.textContent = m.label;
      b.addEventListener("click", () => chooseAction(m.value, "mouse"));
      keyGridEl.appendChild(b);
    }
  }
  pickerEl.classList.remove("hidden");
}

async function chooseAction(value, type) {
  const item = pickerItem;
  const newVal = item.kind === "button" ? { type, value } : value;
  const patch = patchFromPath(item.path, newVal);
  // Optimistic update lokal lalu kirim ke server.
  keymap = deepMergeLocal(keymap, patch);
  renderRemapList();
  pickerEl.classList.add("hidden");
  haptic();
  try {
    await fetch("/keymap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: player || 1, patch }),
    });
  } catch {}
}

function deepMergeLocal(target, patch) {
  const out = structuredClone(target);
  (function m(t, p) {
    for (const k of Object.keys(p)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      if (p[k] && typeof p[k] === "object" && !Array.isArray(p[k]) &&
          t[k] && typeof t[k] === "object") {
        m(t[k], p[k]);
      } else t[k] = p[k];
    }
  })(out, patch);
  return out;
}

async function loadKeymap() {
  try {
    const res = await fetch(`/keymap?player=${player || 1}`);
    keymap = await res.json();
    renderRemapList();
  } catch {}
}

// --- Wiring tombol pengaturan ---
function refreshToggleUI() {
  hapticsToggle.textContent = hapticsEnabled ? "ON" : "OFF";
  hapticsToggle.classList.toggle("on", hapticsEnabled);
  tiltToggle.textContent = tiltEnabled ? "ON" : "OFF";
  tiltToggle.classList.toggle("on", tiltEnabled);
}

gearBtn.addEventListener("click", () => {
  if (!keymap) loadKeymap();
  refreshToggleUI();
  settingsEl.classList.remove("hidden");
});
document.getElementById("closeSettings").addEventListener("click", () =>
  settingsEl.classList.add("hidden")
);
document.getElementById("closePicker").addEventListener("click", () =>
  pickerEl.classList.add("hidden")
);

hapticsToggle.addEventListener("click", () => {
  hapticsEnabled = !hapticsEnabled;
  localStorage.setItem("haptics", hapticsEnabled ? "on" : "off");
  refreshToggleUI();
  haptic();
});

tiltToggle.addEventListener("click", async () => {
  if (!tiltEnabled) {
    const ok = await enableTilt();
    if (!ok) return;
  } else {
    disableTilt();
  }
  refreshToggleUI();
});

document.getElementById("resetMap").addEventListener("click", async () => {
  try {
    const res = await fetch("/keymap/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: player || 1 }),
    });
    keymap = await res.json();
    renderRemapList();
  } catch {}
});

// ===========================================================================
//  PILIH / GANTI PEMAIN
// ===========================================================================
const playerSelectEl = document.getElementById("playerSelect");
const playerLabelEl = document.getElementById("playerLabel");

function setPlayer(p) {
  player = p;
  localStorage.setItem("player", String(p));
  playerSelectEl.classList.add("hidden");
  if (playerLabelEl) playerLabelEl.textContent = `P${p}`;
  if (connected) {
    send({ type: "hello", player: p });
    statusConnected();
  }
  renderSlots();
  loadKeymap(); // muat keymap pemain ini
}

document.querySelectorAll(".player-btn").forEach((btn) => {
  btn.addEventListener("click", () => setPlayer(parseInt(btn.dataset.player, 10)));
});

// Tombol "Ganti" di pengaturan -> buka lagi modal pilih pemain.
document.getElementById("changePlayer").addEventListener("click", () => {
  settingsEl.classList.add("hidden");
  renderSlots();
  playerSelectEl.classList.remove("hidden");
});

// Tampilkan modal pilih pemain bila belum memilih; jika sudah, sembunyikan.
if (player) {
  playerSelectEl.classList.add("hidden");
  if (playerLabelEl) playerLabelEl.textContent = `P${player}`;
} else {
  playerSelectEl.classList.remove("hidden");
}

// Muat keymap di awal agar label remap siap.
loadKeymap();

// Coba minta layar tetap menyala (jika didukung).
async function keepAwake() {
  try {
    if ("wakeLock" in navigator) {
      await navigator.wakeLock.request("screen");
    }
  } catch {}
}
document.addEventListener("touchstart", keepAwake, { once: true });
