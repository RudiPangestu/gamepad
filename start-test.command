#!/bin/bash
# ============================================================================
# start-test.command — Mode TES (double-klik di Finder).
#
# Sama seperti start.command, tapi server jalan dalam mode MOCK: input dari
# iPhone hanya DICETAK di jendela ini, TIDAK menggerakkan game. Berguna untuk
# memastikan koneksi iPhone <-> Mac sudah benar tanpa perlu izin Accessibility.
# ============================================================================

cd "$(dirname "$0")" || exit 1

clear
echo "======================================================"
echo "   iPhone -> Mac Gamepad  (MODE TES / MOCK)"
echo "======================================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js belum terpasang. Install dari https://nodejs.org (versi LTS)."
  read -n 1 -s -r -p "Tekan tombol apa saja untuk menutup..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Memasang dependency untuk pertama kali..."
  npm install
  echo ""
fi

echo "Mode tes aktif: tekan tombol di iPhone, hasilnya muncul di sini."
echo "(tutup jendela ini untuk berhenti)"
echo ""

FORCE_MOCK=1 npm start

echo ""
read -n 1 -s -r -p "Tekan tombol apa saja untuk menutup..."
