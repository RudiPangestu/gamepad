// controller.js
// ----------------------------------------------------------------------------
// Berjalan di Safari iPhone. Menangani sentuhan (stik analog + tombol) lalu
// mengirim input ke server Mac via WebSocket dengan latensi rendah.
// ----------------------------------------------------------------------------

const statusEl = document.getElementById("status");

// --- Koneksi WebSocket dengan auto-reconnect ------------------------------
let ws = null;
let connected = false;

function wsUrl() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}`;
}

function connect() {
  ws = new WebSocket(wsUrl());

  ws.onopen = () => {
    connected = true;
    statusEl.textContent = "🎮 Terhubung";
    statusEl.className = "status ok";
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
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
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

// Coba minta layar tetap menyala (jika didukung).
async function keepAwake() {
  try {
    if ("wakeLock" in navigator) {
      await navigator.wakeLock.request("screen");
    }
  } catch {}
}
document.addEventListener("touchstart", keepAwake, { once: true });
