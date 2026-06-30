// keymap.js
// ----------------------------------------------------------------------------
// Konfigurasi pemetaan tombol controller -> aksi di Mac (keyboard / mouse).
// Mendukung 2 pemain. Tiap pemain WAJIB memakai tombol yang BERBEDA, dan
// game-nya harus mendukung 2 pemain di satu keyboard.
//
// Nilai key memakai nama tombol (huruf kecil), contoh:
//   "w" "a" "s" "d" "i" "j" "k" "l" "space" "enter" "escape" "shift"
//   "left" "right" "up" "down" "e" "q" "tab" "f" "r" "0".."9" dst.
//
// Stik kanan punya mode:
//   - "mouse" : gerakkan kamera dengan mouse (hanya cocok untuk 1 pemain,
//               karena Mac hanya punya 1 kursor)
//   - "keys"  : pakai tombol seperti d-pad
// ----------------------------------------------------------------------------

// ---------- Player 1 (default: WASD + mouse) ----------
export const keymap = {
  leftStick: { mode: "keys", threshold: 0.4, up: "w", down: "s", left: "a", right: "d" },

  rightStick: {
    mode: "mouse",      // "mouse" atau "keys"
    sensitivity: 18,
    threshold: 0.18,
    up: "up", down: "down", left: "left", right: "right", // dipakai jika mode "keys"
  },

  dpad: { up: "up", down: "down", left: "left", right: "right" },

  buttons: {
    a: { type: "key", value: "space" },
    b: { type: "key", value: "control" },
    x: { type: "key", value: "e" },
    y: { type: "key", value: "r" },
    l1: { type: "key", value: "q" },
    r1: { type: "key", value: "f" },
    l2: { type: "mouse", value: "right" },
    r2: { type: "mouse", value: "left" },
    start: { type: "key", value: "escape" },
    select: { type: "key", value: "tab" },
    l3: { type: "key", value: "shift" },
    r3: { type: "key", value: "c" },
  },

  tilt: { enabled: true, threshold: 0.25, left: "a", right: "d" },

  haptics: { enabled: true },
};

// ---------- Player 2 (default: IJKL + tombol berbeda, tanpa mouse) ----------
// Catatan: Mac hanya punya 1 mouse, jadi Player 2 sebaiknya full-keyboard.
// Tombol di bawah ini ARBITER — remap sesuai skema 2-pemain game kamu.
export const keymap2 = {
  leftStick: { mode: "keys", threshold: 0.4, up: "i", down: "k", left: "j", right: "l" },

  rightStick: {
    mode: "keys",       // Player 2 tidak pakai mouse
    sensitivity: 18,
    threshold: 0.18,
    up: "i", down: "k", left: "j", right: "l",
  },

  dpad: { up: "i", down: "k", left: "j", right: "l" },

  buttons: {
    a: { type: "key", value: "0" },
    b: { type: "key", value: "9" },
    x: { type: "key", value: "8" },
    y: { type: "key", value: "7" },
    l1: { type: "key", value: "u" },
    r1: { type: "key", value: "o" },
    l2: { type: "key", value: "n" },
    r2: { type: "key", value: "m" },
    start: { type: "key", value: "enter" },
    select: { type: "key", value: "p" },
    l3: { type: "key", value: "h" },
    r3: { type: "key", value: "y" },
  },

  tilt: { enabled: true, threshold: 0.25, left: "j", right: "l" },

  haptics: { enabled: true },
};

// Default keymap per pemain.
export const defaultKeymaps = { 1: keymap, 2: keymap2 };
