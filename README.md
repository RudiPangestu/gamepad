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

## ⚠️ Batasan yang perlu diketahui

- **Stik kanan = kamera (mouse):** server menggerakkan kursor lewat *setPosition*
  (memindah kursor). Ini bekerja untuk game 2D, menu, point-and-click, dan
  banyak game. **Tapi sebagian game FPS 3D mengunci kursor / membaca gerak
  mouse "mentah" (raw input)** sehingga pemindahan kursor tidak memutar kamera.
  Untuk game seperti itu, kamera lewat stik kanan mungkin tidak berfungsi —
  gunakan tombol/d-pad untuk aksi lain, atau remap sesuai kebutuhan.
- **Getaran di iPhone:** iOS Safari tidak punya API getaran resmi; efek haptic
  bersifat _best-effort_ dan bisa saja tidak terasa (lihat bagian Fitur).
- **2 pemain butuh dukungan game:** bisa 2 iPhone sekaligus (Player 1 & 2),
  tapi game-nya harus mendukung 2 pemain di satu keyboard. Lihat bagian
  "Main berdua (2 pemain)".

## ⚙️ Kenapa pakai keyboard/mouse, bukan "gamepad asli"?

Membuat **virtual gamepad asli** (yang dikenali macOS persis seperti controller
Xbox/PS fisik) membutuhkan driver / kernel extension dan sangat rumit di macOS
modern. Pendekatan **keyboard + mouse** jauh lebih sederhana, tidak butuh
driver, dan bekerja untuk mayoritas game PC/Mac. Pemetaan tombol bisa kamu ubah
sendiri di `server/keymap.js`.

---

## 🚀 Cara pakai

### Cara cepat (1-klik, tanpa ketik Terminal)

1. Di Finder, buka folder `gamepad`.
2. **Klik kanan `start.command` → Open** (cukup sekali, untuk melewati
   peringatan keamanan macOS). Berikutnya tinggal **double-klik**.
3. Jendela akan otomatis install dependency (kali pertama) lalu menjalankan
   server dan menampilkan alamat untuk dibuka di iPhone.
4. Lanjut ke langkah **"Beri izin Accessibility"** dan **"Di iPhone"** di bawah.

> Mau cek koneksi dulu tanpa menggerakkan game? Pakai **`start-test.command`**
> (mode tes — input hanya dicetak di jendela).

### Cara manual (lewat Terminal)

#### 1. Di MacBook — install & jalankan server

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

Ubah semuanya di **`server/keymap.js`**, atau langsung dari iPhone (lihat di bawah).

---

## ✨ Fitur tambahan

Ketuk ikon **⚙︎** di pojok kanan atas layar iPhone untuk membuka pengaturan.

### 1. Getaran / Haptic
Saat menekan tombol, iPhone bergetar halus sebagai umpan balik.
- **Android / browser pendukung**: pakai `navigator.vibrate`.
- **iPhone (Safari)**: iOS tidak mendukung `navigator.vibrate`, jadi dipakai
  trik haptic ringan (iOS 17.4+). Efeknya halus dan _best-effort_ — tidak
  semua iPhone/versi memberi getaran. Bisa dimatikan dari panel pengaturan.

### 2. Remap tombol dari layar iPhone
Di panel pengaturan ada daftar **Ubah Tombol**. Ketuk satu kontrol (mis. A,
D-pad ↑, Setir ◀) lalu pilih aksi baru (tombol keyboard atau klik mouse).
Perubahan langsung dikirim ke Mac dan **tersimpan** di `server/keymap.user.json`
sehingga tetap ada setelah server di-restart. Tombol **Kembalikan ke Default**
menghapus semua perubahan.

### 3. Main berdua (2 pemain) 👥
Bisa 2 iPhone sekaligus jadi Player 1 & Player 2.
1. Buka alamat server di **kedua** iPhone (WiFi sama).
2. Tiap iPhone memilih slot: **Player 1** atau **Player 2** (bisa diganti
   kapan saja lewat ⚙︎ → "Ganti"). Layar pemilihan menampilkan **indikator
   slot**: _kosong_, _dipakai kamu_, atau _🔒 dipakai HP lain_. Slot yang
   sudah dipakai HP lain **terkunci** dan tidak bisa dipilih (server juga
   menolak bila ada perebutan bersamaan).
3. Tiap pemain punya **keymap sendiri** dan bisa di-remap terpisah:
   - **Player 1** default: `WASD` + mouse (kamera).
   - **Player 2** default: `IJKL` + tombol angka/huruf lain, **tanpa mouse**
     (Mac hanya punya 1 kursor).

> ⚠️ **Penting:** ini hanya berguna kalau **game-nya mendukung 2 pemain di satu
> keyboard** (Player 1 satu set tombol, Player 2 set lain). Sesuaikan tombol
> tiap pemain lewat menu remap agar cocok dengan pengaturan game kamu. Edit
> default-nya di `server/keymap.js` (`keymap` untuk P1, `keymap2` untuk P2).

### 4. Setir dengan kemiringan (Tilt / Gyroscope)
Aktifkan **"Setir dengan kemiringan"** di pengaturan, lalu miringkan iPhone
kiri/kanan untuk menyetir (default dipetakan ke tombol `A`/`D`, bisa di-remap).
Cocok untuk game balap/mengemudi.
- iOS akan meminta **izin gerak (Motion)** sekali — ketuk *Allow*.
- Sumbu & ambang bisa diatur di `keymap.tilt` (`server/keymap.js`).

### 5. Profil mapping per-game 🎚️
Di pengaturan ada bagian **Profil Game**. Simpan beberapa preset mapping
(mis. "FPS", "Balapan", "Minecraft") dan **ganti cepat** sesuai game yang
dimainkan.
- **+ Buat**: bikin profil baru (menyalin mapping profil aktif sebagai awal).
- **Pakai**: aktifkan profil — semua iPhone yang terhubung otomatis ikut
  memuat mapping profil itu.
- **Hapus**: hapus profil (profil "Default" tidak bisa dihapus).
- Tiap profil menyimpan mapping **Player 1 & 2** terpisah, dan remap yang kamu
  lakukan masuk ke profil yang sedang aktif. Tersimpan di `server/profiles.json`.

### 6. Mode Trackpad 🖱
Pengaturan → **Mode Trackpad** mengubah layar iPhone jadi touchpad presisi:
- **Geser jari** di area trackpad untuk menggerakkan kursor mouse Mac.
- **Ketuk** = klik kiri; tombol **Klik Kiri / Klik Kanan** untuk klik & tahan
  (mis. drag atau klik kanan).
- Berguna untuk navigasi menu/inventory atau game point-and-click. (Ingat:
  Mac hanya punya 1 kursor, jadi trackpad menggerakkan kursor yang sama.)

### 7. Kunci layar 🔒
Ketuk ikon **🔓** (di kiri ikon ⚙︎) untuk mengunci. Saat terkunci, tombol
pengaturan dinonaktifkan supaya tidak terbuka tak sengaja saat main —
kontrol game tetap jalan normal. Untuk membuka, **tahan ikon gembok ±0,7
detik** (sengaja dibuat agak lama agar tidak kebuka tak sengaja).

### 8. Atur tata letak tombol 🧩
Pengaturan → **Atur tata letak tombol**. Masuk mode atur, lalu **seret** tiap
grup (stik, d-pad, ABXY, L1/R1, L2/R2, Start/Select) ke posisi yang nyaman.
- **Selesai ✓** menyimpan tata letak (tersimpan di iPhone, per-perangkat).
- **Reset** mengembalikan ke tata letak bawaan.
- Saat mode atur, tombol tidak menembak input — jadi aman memindahkannya.

### 9. Bagikan set tombol (profil) 🔗
Di tiap profil ada tombol **Bagikan** → muncul **kode** yang bisa kamu salin
dan kirim ke pemain lain (lewat chat/WA dll). Pemain lain menempel kode itu
di kolom **Impor** pada aplikasi mereka, lalu profil (mapping P1 & P2) langsung
muncul & aktif. Cocok untuk berbagi setting yang sudah pas untuk suatu game.

### 10. QR code untuk koneksi 📷
Biar tak perlu mengetik IP:
- Saat `npm start` di **macOS**, otomatis terbuka **halaman QR yang tajam di
  browser Mac** (`/connect`). Buka **Kamera iPhone**, arahkan ke QR, lalu ketuk
  notifikasi untuk membuka controller. (QR ASCII di terminal sering gepeng &
  susah dipindai, jadi dipakai cara browser ini.)
- Kalau tak terbuka otomatis, kunjungi sendiri `http://<IP-MAC>:8080/connect`.
- Di iPhone yang sudah terhubung, layar pilih pemain / pengaturan punya tombol
  **QR** untuk menampilkan QR ke **HP lain** (jaringan sama) agar gampang ikut
  menyambung.

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
│   ├── config.js          # profil mapping (P1 & P2) + simpan/muat
│   ├── keymap.js          # pemetaan default P1 & P2  ← edit di sini
│   └── profiles.json       # (otomatis) profil & remap dari iPhone
└── public/
    ├── index.html         # UI controller + panel pengaturan/remap
    ├── style.css
    └── controller.js      # sentuh + WebSocket + haptic + tilt + remap
```

## Lisensi

MIT
