// config.js
// ----------------------------------------------------------------------------
// Mengelola keymap "hidup" PER PEMAIN (1 & 2): gabungan default (keymap.js) +
// override yang disimpan user lewat remap di layar iPhone (keymap.user.json).
//
//  - getKeymap(player)       : keymap efektif pemain tsb
//  - applyPatch(player,patch): deep-merge sebagian keymap pemain, simpan, aktif
//  - resetKeymap(player)     : kembalikan pemain tsb ke default
//
// Format keymap.user.json: { "1": <diff P1>, "2": <diff P2> }
// ----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defaultKeymaps } from "./keymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_FILE = path.join(__dirname, "keymap.user.json");

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function deepMerge(target, patch) {
  for (const key of Object.keys(patch)) {
    if (UNSAFE_KEYS.has(key)) continue; // cegah prototype pollution
    const val = patch[key];
    if (
      val && typeof val === "object" && !Array.isArray(val) &&
      target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
    ) {
      deepMerge(target[key], val);
    } else {
      target[key] = val;
    }
  }
  return target;
}

function normalizePlayer(player) {
  return player === 2 || player === "2" ? 2 : 1;
}

// Keymap hidup per pemain.
const current = {
  1: deepClone(defaultKeymaps[1]),
  2: deepClone(defaultKeymaps[2]),
};

function loadUserOverrides() {
  try {
    if (!fs.existsSync(USER_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(USER_FILE, "utf8"));
    for (const p of [1, 2]) {
      if (raw[p]) deepMerge(current[p], raw[p]);
    }
    console.log("[config] override user dimuat dari keymap.user.json");
  } catch (err) {
    console.warn("[config] gagal memuat keymap.user.json:", err?.message || err);
  }
}
loadUserOverrides();

export function getKeymap(player = 1) {
  return current[normalizePlayer(player)];
}

export function applyPatch(player, patch) {
  const p = normalizePlayer(player);
  deepMerge(current[p], patch);
  saveOverrides();
  return current[p];
}

export function resetKeymap(player) {
  const p = normalizePlayer(player);
  current[p] = deepClone(defaultKeymaps[p]);
  saveOverrides();
  return current[p];
}

function saveOverrides() {
  try {
    const diff = {};
    for (const p of [1, 2]) {
      const d = diffFromDefaults(current[p], defaultKeymaps[p]);
      if (Object.keys(d).length) diff[p] = d;
    }
    if (Object.keys(diff).length === 0) {
      if (fs.existsSync(USER_FILE)) fs.unlinkSync(USER_FILE);
    } else {
      fs.writeFileSync(USER_FILE, JSON.stringify(diff, null, 2));
    }
  } catch (err) {
    console.warn("[config] gagal menyimpan override:", err?.message || err);
  }
}

// Hitung bagian `cur` yang berbeda dari `def` (rekursif).
function diffFromDefaults(cur, def) {
  const out = {};
  for (const key of Object.keys(cur)) {
    const c = cur[key];
    const d = def[key];
    if (c && typeof c === "object" && !Array.isArray(c) && d && typeof d === "object") {
      const sub = diffFromDefaults(c, d);
      if (Object.keys(sub).length) out[key] = sub;
    } else if (JSON.stringify(c) !== JSON.stringify(d)) {
      out[key] = c;
    }
  }
  return out;
}
