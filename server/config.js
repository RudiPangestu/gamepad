// config.js
// ----------------------------------------------------------------------------
// Mengelola keymap "hidup": gabungan dari default (keymap.js) + override yang
// disimpan user lewat remap di layar iPhone (keymap.user.json).
//
//  - getKeymap()  : keymap efektif saat ini
//  - applyPatch() : deep-merge sebagian keymap, simpan ke disk, langsung aktif
//  - resetKeymap(): kembali ke default & hapus file override
// ----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { keymap as defaults } from "./keymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USER_FILE = path.join(__dirname, "keymap.user.json");

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Deep-merge: nilai object di-merge rekursif, selain itu di-replace.
function deepMerge(target, patch) {
  for (const key of Object.keys(patch)) {
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

let current = deepClone(defaults);

function loadUserOverrides() {
  try {
    if (fs.existsSync(USER_FILE)) {
      const raw = JSON.parse(fs.readFileSync(USER_FILE, "utf8"));
      deepMerge(current, raw);
      console.log("[config] override user dimuat dari keymap.user.json");
    }
  } catch (err) {
    console.warn("[config] gagal memuat keymap.user.json:", err?.message || err);
  }
}
loadUserOverrides();

export function getKeymap() {
  return current;
}

// Patch = bagian keymap yang berubah (mis. { buttons: { a: { type, value } } }).
export function applyPatch(patch) {
  deepMerge(current, patch);
  try {
    // Simpan SELISIH terhadap default supaya file tetap minimal & rapi.
    const diff = diffFromDefaults(current, defaults);
    fs.writeFileSync(USER_FILE, JSON.stringify(diff, null, 2));
  } catch (err) {
    console.warn("[config] gagal menyimpan override:", err?.message || err);
  }
  return current;
}

export function resetKeymap() {
  current = deepClone(defaults);
  try {
    if (fs.existsSync(USER_FILE)) fs.unlinkSync(USER_FILE);
  } catch {}
  return current;
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
