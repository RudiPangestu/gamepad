# 🎮 iPhone → Mac Gamepad

Jadikan **iPhone sebagai controller** (gaya Xbox / PlayStation) untuk game yang
berjalan di **MacBook**. iPhone dan Mac terhubung lewat **WiFi yang sama**,
tanpa perlu install aplikasi dari App Store — iPhone cukup membuka **Safari**.

Input dari iPhone (stik analog, tombol ABXY, D-pad, L1/R1/L2/R2, Start/Select)
diterjemahkan oleh Mac menjadi **keyboard & mouse**, sehingga dibaca oleh
hampir semua game di macOS yang memakai kontrol WASD + mouse.

```
  iPhone (Safari)                 MacBook (server Node.js)
 ┌───────────────┐   WebSocket   ┌────────────────────────┐
 │  Controller   │ ─────────────▶│  Terjemah ke keyboard  │──▶ Game
 │  layar sentuh │   (WiFi/LAN)  │  & mouse (nut-js)      │
 └───────────────┘               └────────────────────────┘
```

---

## ⚠️ Kenapa pakai keyboard/mouse, bukan "gamepad asli"?

Membuat **virtual gamepad asli** (yang dikenali macOS persis seperti controller
Xbox/PS fisik) membutuhkan driver / kernel extension dan sangat rumit di macOS
modern. Pendekatan **keyboard + mouse** jauh lebih sederhana, tidak butuh
driver, dan bekerja untuk mayoritas game PC/Mac. Pemetaan tombol bisa kamu ubah
sendiri di `server/keymap.js`.

---

## 🚀 Cara pakai

### 1. Di MacBook — install & jalankan server

```bash
git clone <repo-ini>
cd gamepad
npm install
npm start
```

Saat pertama jalan, terminal akan menampilkan alamat seperti:

```
  Buka di Safari iPhone (WiFi yang sama dgn Mac):
     http://192.168.1.23:8080
```

### 2. Beri izin Accessibility (WAJIB di macOS)

Agar Mac boleh "menekan" keyboard/mouse untuk game:

1. **System Settings → Privacy & Security → Accessibility**
2. Tambahkan aplikasi yang menjalankan server (mis. **Terminal** atau
   **iTerm**) lalu aktifkan toggle-nya.
3. Jalankan ulang `npm start`.

> Jika `nut-js` tidak terpasang, server tetap jalan dalam **mode MOCK**
> (input hanya dicetak di terminal, tidak menggerakkan game) — berguna untuk
> mengetes koneksi.

### 3. Di iPhone — buka controller

1. Pastikan iPhone di **WiFi yang sama** dengan Mac.
2. Buka **Safari**, ketik alamat dari langkah 1 (mis. `http://192.168.1.23:8080`).
3. **Putar iPhone ke landscape** (horizontal).
4. (Opsional) Tambahkan ke Home Screen untuk tampilan fullscreen:
   tombol Share → *Add to Home Screen*.

### 4. Main!

Buka game di Mac, klik jendela game agar fokus, lalu gerakkan dengan iPhone. 🎮

---

## 🎛️ Pemetaan default

| Kontrol iPhone        | Aksi di Mac            |
|-----------------------|------------------------|
| Stik kiri             | W / A / S / D (gerak)  |
| Stik kanan            | Gerak mouse (kamera)   |
| D-pad                 | Tombol panah ↑ ↓ ← →   |
| A                     | Spasi (lompat)         |
| B                     | Control                |
| X                     | E (interaksi)          |
| Y                     | R (reload)             |
| L1 / R1               | Q / F                  |
| L2 / R2               | Klik kanan / klik kiri |
| Start / Select        | Esc / Tab              |

Ubah semuanya di **`server/keymap.js`**.

---

## 🔧 Konfigurasi

- **Ganti port**: `PORT=9000 npm start`
- **Stik kanan jadi tombol panah** (bukan mouse): set `rightStick.mode = "keys"`
  di `server/keymap.js`.
- **Sensitivitas mouse**: ubah `rightStick.sensitivity`.
- **Tes koneksi tanpa menggerakkan game**: `FORCE_MOCK=1 npm start`
  (input hanya dicetak di terminal).

---

## 🩺 Masalah umum

| Masalah | Solusi |
|---|---|
| iPhone tidak bisa buka halaman | Pastikan WiFi sama; matikan VPN; cek firewall Mac. |
| Game tidak bergerak | Pastikan izin **Accessibility** aktif & server mode **NATIVE**. Klik jendela game agar fokus. |
| `nut-js` gagal di-install | Butuh Xcode Command Line Tools: `xcode-select --install`. Tanpa ini server tetap jalan di mode MOCK. |
| Input terasa delay | Gunakan WiFi 5GHz; dekatkan ke router. |

---

## 🧱 Struktur proyek

```
gamepad/
├── package.json
├── server/
│   ├── index.js           # server: HTTP + WebSocket + routing input
│   ├── inputController.js  # simulasi keyboard & mouse (nut-js / mock)
│   └── keymap.js          # konfigurasi pemetaan tombol  ← edit di sini
└── public/
    ├── index.html         # UI controller untuk iPhone
    ├── style.css
    └── controller.js      # logika sentuh + WebSocket client
```

## Lisensi

MIT
