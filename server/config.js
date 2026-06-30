// config.js
// ----------------------------------------------------------------------------
// Mengelola PROFIL mapping. Tiap profil berisi keymap untuk Player 1 & 2,
// jadi kamu bisa simpan beberapa preset (mis. "FPS", "Balapan", "Minecraft")
// dan berganti cepat. Disimpan ke profiles.json.
//
// Bentuk profiles.json:
// { "active": "Default", "profiles": { "Default": { "1": {...}, "2": {...} } } }
//
// API:
//   getKeymap(player)            keymap pemain pada profil aktif
//   applyPatch(player, patch)    remap pemain pada profil aktif (disimpan)
//   resetKeymap(player)          kembalikan pemain ke default kode
//   listProfiles()               { active, names: [...] }
//   setActiveProfile(name)
//   createProfile(name, copy)    buat profil baru (copy=true: salin aktif)
//   deleteProfile(name)
// ----------------------------------------------------------------------------

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defaultKeymaps } from "./keymap.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, "profiles.json");
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const DEFAULT_NAME = "Default";

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

function freshProfile() {
  return { 1: deepClone(defaultKeymaps[1]), 2: deepClone(defaultKeymaps[2]) };
}

// State default.
let store = { active: DEFAULT_NAME, profiles: { [DEFAULT_NAME]: freshProfile() } };

function load() {
  try {
    if (!fs.existsSync(FILE)) return;
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (raw && raw.profiles && typeof raw.profiles === "object") {
      // pastikan tiap profil punya keymap P1 & P2
      const profiles = {};
      for (const name of Object.keys(raw.profiles)) {
        if (UNSAFE_KEYS.has(name)) continue;
        const p = raw.profiles[name] || {};
        profiles[name] = {
          1: deepMerge(freshProfile()[1], p[1] || {}),
          2: deepMerge(freshProfile()[2], p[2] || {}),
        };
      }
      if (!profiles[DEFAULT_NAME]) profiles[DEFAULT_NAME] = freshProfile();
      store.profiles = profiles;
      store.active = profiles[raw.active] ? raw.active : DEFAULT_NAME;
      console.log(`[config] ${Object.keys(profiles).length} profil dimuat (aktif: ${store.active})`);
    }
  } catch (err) {
    console.warn("[config] gagal memuat profiles.json:", err?.message || err);
  }
}
load();

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.warn("[config] gagal menyimpan profiles.json:", err?.message || err);
  }
}

function activeProfile() {
  if (!store.profiles[store.active]) store.active = DEFAULT_NAME;
  if (!store.profiles[store.active]) store.profiles[store.active] = freshProfile();
  return store.profiles[store.active];
}

export function getKeymap(player = 1) {
  return activeProfile()[normalizePlayer(player)];
}

export function applyPatch(player, patch) {
  const p = normalizePlayer(player);
  deepMerge(activeProfile()[p], patch);
  save();
  return activeProfile()[p];
}

export function resetKeymap(player) {
  const p = normalizePlayer(player);
  activeProfile()[p] = deepClone(defaultKeymaps[p]);
  save();
  return activeProfile()[p];
}

// ---------- Manajemen profil ----------
export function listProfiles() {
  return { active: store.active, names: Object.keys(store.profiles) };
}

function cleanName(name) {
  if (typeof name !== "string") return null;
  const n = name.trim().slice(0, 24);
  if (!n || UNSAFE_KEYS.has(n)) return null;
  return n;
}

export function setActiveProfile(name) {
  const n = cleanName(name);
  if (!n || !store.profiles[n]) return { error: "profil tidak ada" };
  store.active = n;
  save();
  return listProfiles();
}

export function createProfile(name, copyActive = true) {
  const n = cleanName(name);
  if (!n) return { error: "nama tidak valid" };
  if (store.profiles[n]) return { error: "nama sudah dipakai" };
  store.profiles[n] = copyActive ? deepClone(activeProfile()) : freshProfile();
  store.active = n;
  save();
  return listProfiles();
}

export function deleteProfile(name) {
  const n = cleanName(name);
  if (!n || !store.profiles[n]) return { error: "profil tidak ada" };
  if (n === DEFAULT_NAME) return { error: "profil Default tidak bisa dihapus" };
  delete store.profiles[n];
  if (store.active === n) store.active = DEFAULT_NAME;
  save();
  return listProfiles();
}
