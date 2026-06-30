#!/bin/bash
# ============================================================================
# start.command — Jalankan server iPhone Gamepad cukup dengan DOUBLE-KLIK
# di Finder (macOS). Tidak perlu mengetik di Terminal.
#
# Cara pakai pertama kali:
#   1. Klik kanan file ini -> Open (sekali, untuk melewati peringatan keamanan).
#   2. Selanjutnya cukup double-klik.
# ============================================================================

# Pindah ke folder tempat skrip ini berada (apa pun lokasinya).
cd "$(dirname "$0")" || exit 1

clear
echo "======================================================"
echo "   iPhone -> Mac Gamepad"
echo "======================================================"
echo ""

# --- Cek Node.js ------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js belum terpasang."
  echo "Silakan install dulu dari: https://nodejs.org  (pilih versi LTS)."
  echo ""
  echo "Setelah install, tutup jendela ini lalu double-klik lagi start.command."
  echo ""
  read -n 1 -s -r -p "Tekan tombol apa saja untuk menutup..."
  exit 1
fi

echo "Node.js terdeteksi: $(node --version)"
echo ""

# --- Install dependency bila belum ada -------------------------------------
if [ ! -d "node_modules" ]; then
  echo "Memasang dependency untuk pertama kali (mungkin perlu 1-2 menit)..."
  echo ""
  npm install
  echo ""
fi

# --- Jalankan server --------------------------------------------------------
echo "Menjalankan server... (tutup jendela ini untuk menghentikan)"
echo ""

# Catatan: bila game tidak bergerak, pastikan izin Accessibility aktif untuk
# Terminal di System Settings -> Privacy & Security -> Accessibility.

npm start

# Bila server berhenti, jaga jendela tetap terbuka agar pesan bisa dibaca.
echo ""
echo "Server berhenti."
read -n 1 -s -r -p "Tekan tombol apa saja untuk menutup..."
