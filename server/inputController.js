// inputController.js
// ----------------------------------------------------------------------------
// Lapisan abstraksi untuk mensimulasikan keyboard & mouse di Mac.
//
// Memakai @nut-tree-fork/nut-js bila tersedia (butuh izin Accessibility di
// macOS). Jika modul tidak terpasang / gagal di-load (mis. saat dites di
// platform lain), otomatis jatuh ke mode "mock" yang hanya mencetak log,
// sehingga server tetap bisa jalan untuk pengujian.
// ----------------------------------------------------------------------------

let nut = null;
let ready = false;
let mode = "mock";

async function loadNut() {
  // Paksa mode mock (berguna untuk mengetes koneksi tanpa menggerakkan game,
  // atau di mesin tanpa layar/izin). Aktifkan dengan FORCE_MOCK=1.
  if (process.env.FORCE_MOCK === "1") {
    mode = "mock";
    ready = true;
    console.log("[input] FORCE_MOCK=1 — jalan dalam mode MOCK (hanya log).");
    return;
  }
  try {
    const mod = await import("@nut-tree-fork/nut-js");
    nut = mod;
    // Matikan delay bawaan supaya input terasa real-time.
    if (nut.keyboard) nut.keyboard.config.autoDelayMs = 0;
    if (nut.mouse) nut.mouse.config.autoDelayMs = 0;
    mode = "native";
    ready = true;
    console.log("[input] nut-js aktif — keyboard & mouse akan disimulasikan.");
  } catch (err) {
    mode = "mock";
    ready = true;
    console.log(
      "[input] nut-js tidak tersedia, jalan dalam mode MOCK (hanya log).\n" +
        "        Install dependency & jalankan di macOS untuk kontrol nyata.\n" +
        "        Detail: " + (err?.message || err)
    );
  }
}

// Map nama tombol kita -> enum Key nut-js.
function toKey(name) {
  if (!nut) return null;
  const Key = nut.Key;
  const map = {
    w: Key.W, a: Key.A, s: Key.S, d: Key.D,
    e: Key.E, q: Key.Q, r: Key.R, f: Key.F, c: Key.C, v: Key.V,
    space: Key.Space, enter: Key.Enter, escape: Key.Escape, tab: Key.Tab,
    shift: Key.LeftShift, control: Key.LeftControl, alt: Key.LeftAlt,
    up: Key.Up, down: Key.Down, left: Key.Left, right: Key.Right,
    "1": Key.Num1, "2": Key.Num2, "3": Key.Num3, "4": Key.Num4,
    "5": Key.Num5, "6": Key.Num6, "7": Key.Num7, "8": Key.Num8, "9": Key.Num9,
  };
  return map[name] ?? null;
}

function toMouseButton(name) {
  if (!nut) return null;
  const B = nut.Button;
  if (name === "left") return B.LEFT;
  if (name === "right") return B.RIGHT;
  if (name === "middle") return B.MIDDLE;
  return null;
}

// Hitungan referensi tombol yang ditekan. Memakai Map agar beberapa sumber
// (mis. stik kiri & tilt yang sama-sama memetakan "a") bisa menahan tombol
// yang sama tanpa saling melepas: tombol fisik baru dilepas saat hitungan 0.
const heldKeys = new Map();
const heldMouse = new Set();

export const input = {
  get mode() {
    return mode;
  },

  async init() {
    if (!ready) await loadNut();
  },

  async pressKey(name) {
    const count = heldKeys.get(name) || 0;
    heldKeys.set(name, count + 1);
    if (count > 0) return; // sudah ditekan oleh sumber lain
    if (mode === "native") {
      const k = toKey(name);
      if (k != null) await nut.keyboard.pressKey(k);
    } else {
      console.log(`[mock] pressKey ${name}`);
    }
  },

  async releaseKey(name) {
    const count = heldKeys.get(name) || 0;
    if (count === 0) return;
    if (count > 1) {
      heldKeys.set(name, count - 1);
      return; // masih ditahan sumber lain
    }
    heldKeys.delete(name);
    if (mode === "native") {
      const k = toKey(name);
      if (k != null) await nut.keyboard.releaseKey(k);
    } else {
      console.log(`[mock] releaseKey ${name}`);
    }
  },

  async pressMouse(name) {
    if (heldMouse.has(name)) return;
    heldMouse.add(name);
    if (mode === "native") {
      const b = toMouseButton(name);
      if (b != null) await nut.mouse.pressButton(b);
    } else {
      console.log(`[mock] pressMouse ${name}`);
    }
  },

  async releaseMouse(name) {
    if (!heldMouse.has(name)) return;
    heldMouse.delete(name);
    if (mode === "native") {
      const b = toMouseButton(name);
      if (b != null) await nut.mouse.releaseButton(b);
    } else {
      console.log(`[mock] releaseMouse ${name}`);
    }
  },

  async moveMouseBy(dx, dy) {
    if (dx === 0 && dy === 0) return;
    if (mode === "native") {
      const pos = await nut.mouse.getPosition();
      await nut.mouse.setPosition(
        new nut.Point(pos.x + dx, pos.y + dy)
      );
    } else {
      // hindari spam log untuk gerak mouse
    }
  },

  // Lepas semua input (dipanggil saat controller disconnect). Paksa lepas
  // tombol fisik apa pun hitungannya, lalu kosongkan state.
  async releaseAll() {
    for (const name of [...heldKeys.keys()]) {
      if (mode === "native") {
        const k = toKey(name);
        if (k != null) await nut.keyboard.releaseKey(k);
      } else {
        console.log(`[mock] releaseKey ${name}`);
      }
    }
    heldKeys.clear();
    for (const m of [...heldMouse]) await this.releaseMouse(m);
  },

  // Tekan lalu lepas (untuk d-pad/tombol pulse jika diperlukan).
  async tapKey(name) {
    await this.pressKey(name);
    setTimeout(() => this.releaseKey(name), 40);
  },
};
