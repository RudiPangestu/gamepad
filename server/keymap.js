// keymap.js
// ----------------------------------------------------------------------------
// Konfigurasi pemetaan tombol controller -> aksi di Mac (keyboard / mouse).
// Silakan ubah sesuai kontrol game kamu.
//
// Nilai key memakai nama tombol dari nut-js (huruf kecil), contoh:
//   "w", "a", "s", "d", "space", "enter", "escape", "shift", "left", "right",
//   "up", "down", "e", "q", "tab", "f", "r", dst.
//
// Untuk stik kanan kamu bisa pilih mode:
//   - "mouse"  : gerakkan kamera dengan mouse (cocok untuk FPS / game 3D)
//   - "keys"   : pakai tombol panah (atau key lain) seperti d-pad
// ----------------------------------------------------------------------------

export const keymap = {
  // Stik kiri -> gerak karakter (WASD). Ambang (threshold) 0..1.
  leftStick: {
    mode: "keys",
    threshold: 0.4,
    up: "w",
    down: "s",
    left: "a",
    right: "d",
  },

  // Stik kanan -> kamera/aim lewat mouse.
  rightStick: {
    mode: "mouse",      // "mouse" atau "keys"
    sensitivity: 18,    // kecepatan gerak mouse saat mode "mouse"
    threshold: 0.18,
    // dipakai hanya jika mode === "keys"
    up: "up",
    down: "down",
    left: "left",
    right: "right",
  },

  // D-pad -> tombol panah.
  dpad: {
    up: "up",
    down: "down",
    left: "left",
    right: "right",
  },

  // Tombol muka (gaya Xbox: A B X Y).
  buttons: {
    a: { type: "key", value: "space" },   // lompat
    b: { type: "key", value: "control" }, // jongkok / aksi
    x: { type: "key", value: "e" },       // interaksi
    y: { type: "key", value: "r" },       // reload

    // Bumper & trigger
    l1: { type: "key", value: "q" },
    r1: { type: "key", value: "f" },
    l2: { type: "mouse", value: "right" }, // aim (klik kanan)
    r2: { type: "mouse", value: "left" },  // tembak (klik kiri)

    // Tombol tengah
    start: { type: "key", value: "escape" },
    select: { type: "key", value: "tab" },

    // Klik stik (L3 / R3)
    l3: { type: "key", value: "shift" },   // sprint
    r3: { type: "key", value: "c" },
  },
};
