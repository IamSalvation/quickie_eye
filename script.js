/* ============================================================
   QUICKIE EYE — APP LOGIC (v6 — iOS PWA download fix)
   ============================================================ */

import * as Mediabunny from "./mediabunny.min.mjs";

("use strict");

// ------------------------------------------------------------
// Platform feature detection
// ------------------------------------------------------------
const HAS_WEBCODECS =
  typeof VideoEncoder !== "undefined" && typeof VideoDecoder !== "undefined";
const IS_IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const IS_STANDALONE =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;
const IS_IOS_STANDALONE = IS_IOS && IS_STANDALONE;

// ------------------------------------------------------------
// ELEMENTS
// ------------------------------------------------------------
const splashScreen = document.getElementById("splashScreen");
const homeScreen = document.getElementById("homeScreen");
const allVideosScreen = document.getElementById("allVideosScreen");
const recordScreen = document.getElementById("recordScreen");
const previewScreen = document.getElementById("previewScreen");

// Home
const newVideoBtn = document.getElementById("newVideoBtn");
const videoGrid = document.getElementById("videoGrid");
const videoCount = document.getElementById("videoCount");
const emptyState = document.getElementById("emptyState");
const installBtn = document.getElementById("installBtn");
const homeSeeAllBtn = document.getElementById("homeSeeAllBtn");
const homeSeeAllCount = document.getElementById("homeSeeAllCount");
const homeSeeAllLink = document.getElementById("homeSeeAllLink");
const folderChipsHome = document.getElementById("folderChipsHome");

// All Videos screen
const allVideosGrid = document.getElementById("allVideosGrid");
const allVideosCount = document.getElementById("allVideosCount");
const allVideosBackBtn = document.getElementById("allVideosBackBtn");
const allVideosEmptyState = document.getElementById("allVideosEmptyState");
const folderChipsAll = document.getElementById("folderChipsAll");

// Home selection header
const homeHeader = document.getElementById("homeHeader");
const selectionHeader = document.getElementById("selectionHeader");
const selectionCancelBtn = document.getElementById("selectionCancelBtn");
const selectionCount = document.getElementById("selectionCount");
const selectionSelectAllBtn = document.getElementById("selectionSelectAllBtn");
const selectionShareBtn = document.getElementById("selectionShareBtn");
const selectionMoveBtn = document.getElementById("selectionMoveBtn");
const selectionDownloadBtn = document.getElementById("selectionDownloadBtn");
const selectionDeleteBtn = document.getElementById("selectionDeleteBtn");

// All Videos selection header
const allVideosHeader = document.getElementById("allVideosHeader");
const allVideosSelectionHeader = document.getElementById("allVideosSelectionHeader");
const allSelectionCancelBtn = document.getElementById("allSelectionCancelBtn");
const allSelectionCount = document.getElementById("allSelectionCount");
const allSelectionSelectAllBtn = document.getElementById("allSelectionSelectAllBtn");
const allSelectionShareBtn = document.getElementById("allSelectionShareBtn");
const allSelectionMoveBtn = document.getElementById("allSelectionMoveBtn");
const allSelectionDownloadBtn = document.getElementById("allSelectionDownloadBtn");
const allSelectionDeleteBtn = document.getElementById("allSelectionDeleteBtn");

// Record
const video = document.getElementById("video");
const prompterWrap = document.getElementById("prompterWrap");
const prompterText = document.getElementById("prompterText");
const timerEl = document.getElementById("timer");
const recordBackBtn = document.getElementById("recordBackBtn");
const openSettings = document.getElementById("openSettings");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const scriptInput = document.getElementById("scriptInput");
const wordCount = document.getElementById("wordCount");
const formatSelect = document.getElementById("formatSelect");
const qualitySelect = document.getElementById("qualitySelect");
const qualityHint = document.getElementById("qualityHint");
const speed = document.getElementById("speed");
const speedVal = document.getElementById("speedVal");
const fontSize = document.getElementById("fontSize");
const fontVal = document.getElementById("fontVal");
const position = document.getElementById("position");
const posVal = document.getElementById("posVal");
const bgOpacity = document.getElementById("bgOpacity");
const bgVal = document.getElementById("bgVal");
const countdownSec = document.getElementById("countdownSec");
const cdVal = document.getElementById("cdVal");
const countdownOverlay = document.getElementById("countdownOverlay");
const voiceBtn = document.getElementById("voiceBtn");
const mirrorBtn = document.getElementById("mirrorBtn");
const recordBtn = document.getElementById("recordBtn");

// Preview
const previewCloseBtn = document.getElementById("previewCloseBtn");
const previewVideo = document.getElementById("previewVideo");
const retakeBtn = document.getElementById("retakeBtn");
const saveBtn = document.getElementById("saveBtn");
const parallelMp4Check = document.getElementById("parallelMp4Check");
const parallelMp4Row = document.getElementById("parallelMp4Row");
const previewFolderSelect = document.getElementById("previewFolderSelect");

// Player
const playerModal = document.getElementById("playerModal");
const playerCloseBtn = document.getElementById("playerCloseBtn");
const playerTitle = document.getElementById("playerTitle");
const playerMenuBtn = document.getElementById("playerMenuBtn");
const playerVideo = document.getElementById("playerVideo");
const playerMenu = document.getElementById("playerMenu");
const menuShareBtn = document.getElementById("menuShareBtn");
const menuDownloadBtn = document.getElementById("menuDownloadBtn");
const menuConvertBtn = document.getElementById("menuConvertBtn");
const menuMoveBtn = document.getElementById("menuMoveBtn");
const menuDeleteBtn = document.getElementById("menuDeleteBtn");
const menuCancelBtn = document.getElementById("menuCancelBtn");

// Modal
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");

// Toast
const toast = document.getElementById("toast");

// ------------------------------------------------------------
// STATE
// ------------------------------------------------------------
let offset = 0;
let scrolling = false;
let rafId = null;
let lastTime = 0;
let mirror = true;
let mediaRecorder = null;
let recordedChunks = [];
let recordedBlob = null;
let recordingStartTime = 0;
let timerInterval = null;
let voiceMode = false;
let recognition = null;
let cameraStream = null;
let currentPlayingId = null;
let toastTimeout = null;

// Data cache
let allVideosCache = [];
let allFoldersCache = [];
let currentFolderFilter = null;

// Selection mode
let selectionMode = false;
let selectionScreen = null;
const selectedIds = new Set();

// Long-press
let pressTimer = null;
let pressTarget = null;
let longPressed = false;

// Blob URLs — track to avoid memory leaks
const activeBlobUrls = new Set();

// Canvas recording
let canvas = null;
let canvasCtx = null;
let camVideo = null;
let drawRaf = null;

// Wake Lock
let wakeLock = null;

// Folder colors
const FOLDER_COLORS = [
  "#0175f7", "#16d6f1", "#3af391", "#8cf754",
  "#f7c948", "#ff8a4c", "#ff4757", "#a855f7",
];

const HOME_LIMIT = 6;

// ------------------------------------------------------------
// PWA — SERVICE WORKER + INSTALL
// ------------------------------------------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { scope: "./" })
      .then((reg) => setInterval(() => reg.update().catch(() => { }), 60 * 60 * 1000))
      .catch((err) => console.warn("SW registration failed:", err));
  });
}

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.hidden = false;
});
if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") showToast("Installing Quickie Eye…", "success");
    deferredInstallPrompt = null;
    installBtn.hidden = true;
  });
}
window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  if (installBtn) installBtn.hidden = true;
  showToast("App installed ✓", "success");
});
if (IS_STANDALONE) {
  if (installBtn) installBtn.hidden = true;
}

// ------------------------------------------------------------
// WAKE LOCK
// ------------------------------------------------------------
async function requestWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch (e) { console.warn("Wake Lock failed:", e); }
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; }
}

// ------------------------------------------------------------
// FORMAT / QUALITY PRESETS
// ------------------------------------------------------------
const FORMAT_PRESETS = {
  tiktok: { width: 1080, height: 1920, label: "TikTok / Reels / Shorts" },
  youtube: { width: 1920, height: 1080, label: "YouTube" },
  igpost: { width: 1080, height: 1080, label: "Instagram Post" },
  igportrait: { width: 1080, height: 1350, label: "Instagram Portrait" },
};

const QUALITY_PRESETS = {
  saver: { label: "Data Saver", factor: 0.8 },
  balanced: { label: "Balanced", factor: 1.4 },
  high: { label: "High", factor: 2.4 },
};

const savedFormat = localStorage.getItem("qe_format") || "tiktok";
if (formatSelect) formatSelect.value = savedFormat;

const savedQuality = localStorage.getItem("qe_quality") || "balanced";
if (qualitySelect) qualitySelect.value = savedQuality;

const savedParallelMp4 = localStorage.getItem("qe_parallel_mp4") === "1";
if (parallelMp4Check) parallelMp4Check.checked = savedParallelMp4;

if (!HAS_WEBCODECS && parallelMp4Row) {
  parallelMp4Row.hidden = true;
}

function getCurrentFormat() {
  const key = formatSelect?.value || "tiktok";
  return FORMAT_PRESETS[key] || FORMAT_PRESETS.tiktok;
}

function getTargetBitrate() {
  const fmt = getCurrentFormat();
  const quality = qualitySelect?.value || "balanced";
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.balanced;
  const pixels = fmt.width * fmt.height;
  return Math.round(pixels * preset.factor);
}

function updateQualityHint() {
  if (!qualityHint) return;
  const bps = getTargetBitrate();
  qualityHint.textContent = (bps / 1_000_000).toFixed(1) + " Mbps";
}

if (formatSelect) {
  formatSelect.addEventListener("change", () => {
    localStorage.setItem("qe_format", formatSelect.value);
    showToast("Format: " + FORMAT_PRESETS[formatSelect.value].label, "success");
    updateQualityHint();
  });
}
if (qualitySelect) {
  qualitySelect.addEventListener("change", () => {
    localStorage.setItem("qe_quality", qualitySelect.value);
    showToast("Quality: " + QUALITY_PRESETS[qualitySelect.value].label, "success");
    updateQualityHint();
  });
}
if (parallelMp4Check) {
  parallelMp4Check.addEventListener("change", () => {
    localStorage.setItem("qe_parallel_mp4", parallelMp4Check.checked ? "1" : "0");
  });
}
updateQualityHint();

// ------------------------------------------------------------
// TOAST
// ------------------------------------------------------------
function showToast(msg, type = "") {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "toast " + type;
  void toast.offsetWidth;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2200);
}

// ------------------------------------------------------------
// NAVIGATION
// ------------------------------------------------------------
function showScreen(screen) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  screen.classList.add("active");
}

// ------------------------------------------------------------
// BLOB URL TRACKING
// ------------------------------------------------------------
function trackBlobUrl(url) {
  if (url) activeBlobUrls.add(url);
  return url;
}
function revokeAllBlobUrls() {
  for (const url of activeBlobUrls) {
    try { URL.revokeObjectURL(url); } catch (_) { }
  }
  activeBlobUrls.clear();
}

// ------------------------------------------------------------
// INDEXEDDB
// ------------------------------------------------------------
const DB_NAME = "quickie_eye_db";
const DB_VERSION = 2;
const STORE_VIDEOS = "videos";
const STORE_FOLDERS = "folders";
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      const oldVersion = e.oldVersion;

      if (!d.objectStoreNames.contains(STORE_VIDEOS)) {
        const store = d.createObjectStore(STORE_VIDEOS, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }

      if (oldVersion < 2) {
        if (!d.objectStoreNames.contains(STORE_FOLDERS)) {
          d.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
        }
        try {
          const videoStore = e.target.transaction.objectStore(STORE_VIDEOS);
          if (!videoStore.indexNames.contains("folderId")) {
            videoStore.createIndex("folderId", "folderId");
          }
        } catch (_) { }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbGet(store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(store, obj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(obj);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbDelete(store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const saveVideo = (v) => dbPut(STORE_VIDEOS, v);
const getVideo = (id) => dbGet(STORE_VIDEOS, id);
const deleteVideo = (id) => dbDelete(STORE_VIDEOS, id);
const saveFolder = (f) => dbPut(STORE_FOLDERS, f);
const getFolder = (id) => dbGet(STORE_FOLDERS, id);
const deleteFolderDb = (id) => dbDelete(STORE_FOLDERS, id);

async function getAllVideos() {
  const list = await dbGetAll(STORE_VIDEOS);
  list.sort((a, b) => b.createdAt - a.createdAt);
  return list;
}

async function getAllFolders() {
  const list = await dbGetAll(STORE_FOLDERS);
  list.sort((a, b) => a.createdAt - b.createdAt);
  return list;
}

// ------------------------------------------------------------
// DURATION UTILITY
// ------------------------------------------------------------
function getBlobDuration(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.muted = true;

    let resolved = false;
    const finish = (dur) => {
      if (resolved) return;
      resolved = true;
      URL.revokeObjectURL(url);
      resolve(dur);
    };

    v.onloadedmetadata = () => {
      if (v.duration && isFinite(v.duration) && v.duration > 0) {
        finish(v.duration);
        return;
      }
      try {
        v.currentTime = 1e101;
        v.ontimeupdate = () => {
          v.ontimeupdate = null;
          const d = v.duration;
          if (d && isFinite(d) && d > 0) finish(d);
          else if (v.seekable && v.seekable.length > 0) finish(v.seekable.end(0));
          else finish(0);
          v.currentTime = 0;
        };
      } catch (_) { finish(0); }
    };
    v.onerror = () => finish(0);
    setTimeout(() => finish(0), 4000);
  });
}

// ------------------------------------------------------------
// FOLDER HELPERS
// ------------------------------------------------------------
function getFolderById(id) {
  if (!id) return null;
  return allFoldersCache.find((f) => f.id === id) || null;
}

function countVideosInFolder(folderId) {
  if (folderId === null) return allVideosCache.length;
  return allVideosCache.filter((v) => v.folderId === folderId).length;
}

function getFilteredVideos() {
  if (currentFolderFilter === null) return allVideosCache;
  return allVideosCache.filter((v) => v.folderId === currentFolderFilter);
}

// ------------------------------------------------------------
// DOWNLOAD BLOB — iOS PWA aware
// ------------------------------------------------------------
async function downloadBlob(blob, filename) {
  // iOS standalone PWA: `<a download>` is silently blocked by iOS.
  // Route through the Web Share API instead.
  if (IS_IOS_STANDALONE && navigator.canShare) {
    try {
      const file = new File([blob], filename, {
        type: blob.type || "application/octet-stream",
      });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return true;
      }
    } catch (e) {
      if (e.name === "AbortError") return true;
      // fall through
    }
  }

  // Standard path
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } catch (err) {
    console.error("downloadBlob failed:", err);
    return false;
  }
}

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------
async function refreshData() {
  allVideosCache = await getAllVideos();
  allFoldersCache = await getAllFolders();
}

async function renderHome() {
  try {
    await refreshData();
  } catch (err) {
    console.error("refreshData failed:", err);
    showToast("Storage error", "error");
    return;
  }

  for (const id of Array.from(selectedIds)) {
    if (!allVideosCache.some((v) => v.id === id)) selectedIds.delete(id);
  }

  const filtered = getFilteredVideos();
  const total = filtered.length;
  const onHome = filtered.slice(0, HOME_LIMIT);

  videoCount.textContent = String(total);

  renderFolderChips(folderChipsHome);

  if (total > HOME_LIMIT) {
    homeSeeAllBtn.hidden = false;
    homeSeeAllLink.hidden = false;
    homeSeeAllCount.textContent = String(total);
  } else {
    homeSeeAllBtn.hidden = true;
    homeSeeAllLink.hidden = true;
  }

  if (total === 0) {
    emptyState.classList.remove("hidden");
    videoGrid.classList.add("hidden");
    videoGrid.innerHTML = "";
    if (selectionMode && selectionScreen === "home") exitSelectionMode();
    updateSelectionUI();
    return;
  }

  emptyState.classList.add("hidden");
  videoGrid.classList.remove("hidden");
  videoGrid.innerHTML = "";

  for (const v of onHome) {
    try {
      videoGrid.appendChild(buildVideoCard(v));
    } catch (err) {
      console.error("Card render failed for", v.id, err);
      videoGrid.appendChild(buildBrokenCard(v));
    }
  }

  if (selectionMode && selectionScreen === "home") updateSelectionUI();
}

async function renderAllVideos() {
  try {
    await refreshData();
  } catch (err) {
    console.error("refreshData failed:", err);
    return;
  }

  const filtered = getFilteredVideos();
  allVideosCount.textContent = String(filtered.length);

  renderFolderChips(folderChipsAll);

  if (filtered.length === 0) {
    allVideosEmptyState.hidden = false;
    allVideosGrid.classList.add("hidden");
    allVideosGrid.innerHTML = "";
    if (selectionMode && selectionScreen === "all") exitSelectionMode();
    updateSelectionUI();
    return;
  }

  allVideosEmptyState.hidden = true;
  allVideosGrid.classList.remove("hidden");
  allVideosGrid.innerHTML = "";

  for (const v of filtered) {
    try {
      allVideosGrid.appendChild(buildVideoCard(v));
    } catch (err) {
      console.error("Card render failed for", v.id, err);
      allVideosGrid.appendChild(buildBrokenCard(v));
    }
  }

  if (selectionMode && selectionScreen === "all") updateSelectionUI();
}

function buildBrokenCard(v) {
  const card = document.createElement("div");
  card.className = "video-card broken";
  card.dataset.id = v.id;

  const overlay = document.createElement("div");
  overlay.className = "video-card-overlay";
  const title = document.createElement("div");
  title.className = "video-card-title";
  title.textContent = v.title || "Broken video";
  const meta = document.createElement("div");
  meta.className = "video-card-meta";
  meta.textContent = "Cannot display";
  overlay.appendChild(title);
  overlay.appendChild(meta);
  card.appendChild(overlay);
  return card;
}

function buildVideoCard(v) {
  const card = document.createElement("div");
  card.className = "video-card";
  card.dataset.id = v.id;
  if (selectedIds.has(v.id)) card.classList.add("selected");

  if (!v.blob || v.blob.size === 0) return buildBrokenCard(v);

  let blobUrl;
  try {
    blobUrl = trackBlobUrl(URL.createObjectURL(v.blob));
  } catch (err) {
    console.error("Failed to create blob URL for", v.id, err);
    return buildBrokenCard(v);
  }

  const thumb = document.createElement("video");
  thumb.className = "video-card-thumb";
  thumb.src = blobUrl;
  thumb.muted = true;
  thumb.playsInline = true;
  thumb.preload = "metadata";

  thumb.addEventListener("loadedmetadata", () => {
    const dur = thumb.duration;
    let target = 0.5;
    if (dur && isFinite(dur) && dur > 0) {
      target = Math.min(1, dur * 0.1, dur);
      if (target < 0.1) target = 0.1;
    }
    try { thumb.currentTime = target; } catch (_) { }
  });
  setTimeout(() => {
    if (!thumb.dataset.drawn) {
      try { thumb.currentTime = 0.1; } catch (_) { }
    }
  }, 1500);
  thumb.addEventListener("seeked", () => { thumb.dataset.drawn = "1"; });

  const badge = document.createElement("div");
  badge.className = "video-card-badge";
  badge.textContent = formatDuration(v.duration || 0);

  if (!v.duration || v.duration <= 0) {
    const tempUrl = URL.createObjectURL(v.blob);
    const tempVid = document.createElement("video");
    tempVid.preload = "metadata";
    tempVid.src = tempUrl;
    tempVid.muted = true;
    tempVid.addEventListener("loadedmetadata", () => {
      const dur = tempVid.duration;
      if (dur && isFinite(dur) && dur > 0) {
        badge.textContent = formatDuration(dur);
        v.duration = dur;
        saveVideo(v).catch(() => { });
      } else {
        try {
          tempVid.currentTime = 1e101;
          tempVid.ontimeupdate = () => {
            tempVid.ontimeupdate = null;
            const d = tempVid.duration;
            if (d && isFinite(d) && d > 0) {
              badge.textContent = formatDuration(d);
              v.duration = d;
              saveVideo(v).catch(() => { });
            }
            URL.revokeObjectURL(tempUrl);
          };
        } catch (_) { URL.revokeObjectURL(tempUrl); }
      }
    });
    tempVid.onerror = () => URL.revokeObjectURL(tempUrl);
  }

  const dotsBtn = document.createElement("button");
  dotsBtn.className = "video-card-dots";
  dotsBtn.setAttribute("aria-label", "More options");
  dotsBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <circle cx="12" cy="5" r="1.8"/>
      <circle cx="12" cy="12" r="1.8"/>
      <circle cx="12" cy="19" r="1.8"/>
    </svg>
  `;
  dotsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (selectionMode) return;
    openCardPopover(v.id, dotsBtn);
  });
  dotsBtn.addEventListener("pointerdown", (e) => e.stopPropagation());

  const checkEl = document.createElement("div");
  checkEl.className = "video-card-check";
  checkEl.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12l5 5L20 7"/>
    </svg>
  `;

  const overlay = document.createElement("div");
  overlay.className = "video-card-overlay";

  const title = document.createElement("div");
  title.className = "video-card-title";
  title.textContent = v.title;

  if (v.folderId) {
    const folder = getFolderById(v.folderId);
    if (folder) {
      const dot = document.createElement("span");
      dot.className = "folder-dot";
      dot.style.background = folder.color || "#16d6f1";
      title.appendChild(dot);
    }
  }

  const meta = document.createElement("div");
  meta.className = "video-card-meta";
  meta.textContent = formatDate(v.createdAt);

  overlay.appendChild(title);
  overlay.appendChild(meta);

  card.appendChild(thumb);
  card.appendChild(badge);
  card.appendChild(dotsBtn);
  card.appendChild(checkEl);
  card.appendChild(overlay);

  attachLongPress(card, v.id, dotsBtn);
  return card;
}

function attachLongPress(card, id, dotsBtn) {
  const screenKey = card.closest("#allVideosScreen") ? "all" : "home";

  const startPress = (e) => {
    if (e.target === dotsBtn || dotsBtn.contains(e.target)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    pressTarget = card;
    longPressed = false;
    card.classList.add("long-pressing");

    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => {
      longPressed = true;
      card.classList.remove("long-pressing");
      enterSelectionMode(id, screenKey);
    }, 500);
  };

  const cancelPress = () => {
    clearTimeout(pressTimer);
    pressTimer = null;
    if (pressTarget) pressTarget.classList.remove("long-pressing");
    pressTarget = null;
  };

  const endPress = (e) => {
    clearTimeout(pressTimer);
    if (pressTarget) pressTarget.classList.remove("long-pressing");

    if (longPressed) {
      longPressed = false;
      pressTarget = null;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    pressTarget = null;
    if (e.target === dotsBtn || dotsBtn.contains(e.target)) return;

    if (selectionMode) toggleSelection(id);
    else openPlayer(id);
  };

  card.addEventListener("pointerdown", startPress);
  card.addEventListener("pointerup", endPress);
  card.addEventListener("pointercancel", cancelPress);
  card.addEventListener("pointerleave", cancelPress);
  card.addEventListener("contextmenu", (e) => {
    if (selectionMode) e.preventDefault();
  });
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ------------------------------------------------------------
// FOLDER CHIPS
// ------------------------------------------------------------
function renderFolderChips(container) {
  if (!container) return;
  container.innerHTML = "";

  const allChip = document.createElement("div");
  allChip.className = "folder-chip";
  if (currentFolderFilter === null) allChip.classList.add("active");
  allChip.innerHTML = `All <span class="chip-count">(${allVideosCache.length})</span>`;
  allChip.addEventListener("click", () => {
    if (selectionMode) return;
    currentFolderFilter = null;
    refreshActiveScreen();
  });
  container.appendChild(allChip);

  for (const f of allFoldersCache) {
    const chip = document.createElement("div");
    chip.className = "folder-chip";
    if (currentFolderFilter === f.id) chip.classList.add("active");

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = f.color || "#16d6f1";
    chip.appendChild(dot);

    const label = document.createElement("span");
    label.textContent = f.name;
    chip.appendChild(label);

    const count = document.createElement("span");
    count.className = "chip-count";
    count.textContent = `(${countVideosInFolder(f.id)})`;
    chip.appendChild(count);

    let chipPressTimer = null;
    let chipLongPressed = false;

    chip.addEventListener("pointerdown", () => {
      chipLongPressed = false;
      clearTimeout(chipPressTimer);
      chipPressTimer = setTimeout(() => {
        chipLongPressed = true;
        openFolderManageSheet(f.id);
      }, 500);
    });
    const cancelChipPress = () => {
      clearTimeout(chipPressTimer);
      chipPressTimer = null;
    };
    chip.addEventListener("pointerup", (e) => {
      clearTimeout(chipPressTimer);
      if (chipLongPressed) {
        chipLongPressed = false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (selectionMode) return;
      currentFolderFilter = f.id;
      refreshActiveScreen();
    });
    chip.addEventListener("pointercancel", cancelChipPress);
    chip.addEventListener("pointerleave", cancelChipPress);
    chip.addEventListener("contextmenu", (e) => e.preventDefault());

    container.appendChild(chip);
  }

  const newChip = document.createElement("div");
  newChip.className = "folder-chip new-chip";
  newChip.textContent = "＋ New folder";
  newChip.addEventListener("click", () => {
    if (selectionMode) return;
    openCreateFolderModal();
  });
  container.appendChild(newChip);
}

function refreshActiveScreen() {
  if (allVideosScreen.classList.contains("active")) renderAllVideos();
  else renderHome();
}

// ------------------------------------------------------------
// SELECTION MODE
// ------------------------------------------------------------
function enterSelectionMode(initialId, screenKey) {
  if (selectionMode) {
    if (initialId) toggleSelection(initialId);
    return;
  }
  selectionMode = true;
  selectionScreen = screenKey;
  selectedIds.clear();
  if (initialId) selectedIds.add(initialId);

  if (screenKey === "home") {
    homeScreen.classList.add("selection-active");
    homeHeader.hidden = true;
    selectionHeader.hidden = false;
  } else {
    allVideosScreen.classList.add("selection-active");
    allVideosHeader.hidden = true;
    allVideosSelectionHeader.hidden = false;
  }

  const grid = screenKey === "home" ? videoGrid : allVideosGrid;
  grid.querySelectorAll(".video-card").forEach((el) => {
    el.classList.toggle("selected", selectedIds.has(el.dataset.id));
  });

  updateSelectionUI();
}

function exitSelectionMode() {
  if (!selectionMode) return;
  selectionMode = false;
  selectionScreen = null;
  selectedIds.clear();

  homeScreen.classList.remove("selection-active");
  allVideosScreen.classList.remove("selection-active");
  homeHeader.hidden = false;
  selectionHeader.hidden = true;
  allVideosHeader.hidden = false;
  allVideosSelectionHeader.hidden = true;

  document.querySelectorAll(".video-card.selected").forEach((el) => el.classList.remove("selected"));
  updateSelectionUI();
}

function toggleSelection(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);

  const card = document.querySelector(`.video-card[data-id="${cssEscape(id)}"]`);
  if (card) card.classList.toggle("selected", selectedIds.has(id));

  updateSelectionUI();

  if (selectedIds.size === 0) exitSelectionMode();
}

function updateSelectionUI() {
  const n = selectedIds.size;

  if (selectionScreen === "home") {
    selectionCount.textContent = n + " selected";
    selectionShareBtn.disabled = n === 0;
    selectionMoveBtn.disabled = n === 0;
    selectionDeleteBtn.disabled = n === 0;
    if (IS_IOS_STANDALONE) {
      selectionDownloadBtn.disabled = true;
      selectionDownloadBtn.style.opacity = "0.3";
      selectionDownloadBtn.title = "Not available in iOS app";
    } else {
      selectionDownloadBtn.disabled = n === 0;
    }
    const total = getFilteredVideos().length;
    selectionSelectAllBtn.textContent = n === total && total > 0 ? "Deselect all" : "Select all";
  } else if (selectionScreen === "all") {
    allSelectionCount.textContent = n + " selected";
    allSelectionShareBtn.disabled = n === 0;
    allSelectionMoveBtn.disabled = n === 0;
    allSelectionDeleteBtn.disabled = n === 0;
    if (IS_IOS_STANDALONE) {
      allSelectionDownloadBtn.disabled = true;
      allSelectionDownloadBtn.style.opacity = "0.3";
      allSelectionDownloadBtn.title = "Not available in iOS app";
    } else {
      allSelectionDownloadBtn.disabled = n === 0;
    }
    const total = getFilteredVideos().length;
    allSelectionSelectAllBtn.textContent = n === total && total > 0 ? "Deselect all" : "Select all";
  }
}

function cssEscape(str) {
  return String(str).replace(/"/g, '\\"');
}

function handleSelectAll(btn, screenKey) {
  const filtered = getFilteredVideos();
  const total = filtered.length;
  const grid = screenKey === "home" ? videoGrid : allVideosGrid;

  if (selectedIds.size === total) {
    selectedIds.clear();
    document.querySelectorAll(".video-card.selected").forEach((el) => el.classList.remove("selected"));
  } else {
    selectedIds.clear();
    for (const v of filtered) selectedIds.add(v.id);
    grid.querySelectorAll(".video-card").forEach((el) => {
      if (selectedIds.has(el.dataset.id)) el.classList.add("selected");
    });
  }
  updateSelectionUI();
}

selectionCancelBtn.addEventListener("click", exitSelectionMode);
allSelectionCancelBtn.addEventListener("click", exitSelectionMode);

selectionSelectAllBtn.addEventListener("click", () => handleSelectAll(selectionSelectAllBtn, "home"));
allSelectionSelectAllBtn.addEventListener("click", () => handleSelectAll(allSelectionSelectAllBtn, "all"));

selectionShareBtn.addEventListener("click", () => selectedIds.size && shareSelectedVideos());
allSelectionShareBtn.addEventListener("click", () => selectedIds.size && shareSelectedVideos());

selectionMoveBtn.addEventListener("click", () => selectedIds.size && openBulkMoveSheet());
allSelectionMoveBtn.addEventListener("click", () => selectedIds.size && openBulkMoveSheet());

selectionDownloadBtn.addEventListener("click", () => {
  if (IS_IOS_STANDALONE) {
    showToast("Use Share to save multiple on iOS", "");
    return;
  }
  if (selectedIds.size) downloadSelectedVideos();
});
allSelectionDownloadBtn.addEventListener("click", () => {
  if (IS_IOS_STANDALONE) {
    showToast("Use Share to save multiple on iOS", "");
    return;
  }
  if (selectedIds.size) downloadSelectedVideos();
});

selectionDeleteBtn.addEventListener("click", () => selectedIds.size && deleteSelectedVideos());
allSelectionDeleteBtn.addEventListener("click", () => selectedIds.size && deleteSelectedVideos());

// ------------------------------------------------------------
// SELECTION ACTIONS
// ------------------------------------------------------------
async function shareSelectedVideos() {
  const ids = Array.from(selectedIds);
  try {
    const files = [];
    for (const id of ids) {
      const v = await getVideo(id);
      if (!v || !v.blob) continue;
      files.push(new File([v.blob], v.title + blobExt(v.blob), { type: v.blob.type }));
    }
    if (files.length === 0) return;
    if (navigator.canShare && navigator.canShare({ files })) {
      await navigator.share({ files });
      return;
    }
    showToast("Share not supported here", "error");
  } catch (_) { }
}

async function downloadSelectedVideos() {
  const ids = Array.from(selectedIds);
  showToast("Downloading " + ids.length + "…", "success");
  for (const id of ids) {
    const v = await getVideo(id);
    if (!v) continue;
    await downloadBlob(v.blob, v.title.replace(/\s+/g, "-") + blobExt(v.blob));
    await new Promise((r) => setTimeout(r, 350));
  }
}

async function deleteSelectedVideos() {
  const n = selectedIds.size;
  const confirmed = confirm(`Delete ${n} video${n > 1 ? "s" : ""}? This cannot be undone.`);
  if (!confirmed) return;

  const ids = Array.from(selectedIds);
  for (const id of ids) {
    try { await deleteVideo(id); } catch (_) { }
  }
  selectedIds.clear();
  exitSelectionMode();
  await refreshActiveScreen();
  showToast(`Deleted ${n} video${n > 1 ? "s" : ""}`, "success");
}

// ------------------------------------------------------------
// CARD POPOVER
// ------------------------------------------------------------
let cardPopoverEl = null;
let cardPopoverBackdropEl = null;
let currentPopoverVideoId = null;

function ensureCardPopover() {
  if (cardPopoverEl) return;

  cardPopoverBackdropEl = document.createElement("div");
  cardPopoverBackdropEl.className = "card-popover-backdrop";
  cardPopoverBackdropEl.addEventListener("click", closeCardPopover);
  document.body.appendChild(cardPopoverBackdropEl);

  cardPopoverEl = document.createElement("div");
  cardPopoverEl.className = "card-popover";
  cardPopoverEl.innerHTML = `
    <button data-action="share">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>
      </svg> Share
    </button>
    <button data-action="download">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"/>
      </svg> Download
    </button>
    <button data-action="move">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7a2 2 0 012-2h3l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
      </svg> Move to folder…
    </button>
    <button data-action="delete" class="danger">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
      </svg> Delete
    </button>
  `;

  cardPopoverEl.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = currentPopoverVideoId;
    closeCardPopover();
    if (!id) return;

    if (action === "share") await cardShareVideo(id);
    else if (action === "download") await cardDownloadVideo(id);
    else if (action === "move") await openMoveToFolderSheet(id);
    else if (action === "delete") await cardDeleteVideo(id);
  });

  document.body.appendChild(cardPopoverEl);
}

function openCardPopover(videoId, anchorBtn) {
  ensureCardPopover();
  currentPopoverVideoId = videoId;

  const rect = anchorBtn.getBoundingClientRect();
  cardPopoverEl.classList.remove("open", "flip-up");
  cardPopoverEl.style.visibility = "hidden";
  cardPopoverEl.style.display = "block";
  cardPopoverEl.style.top = "0px";
  cardPopoverEl.style.left = "0px";

  const popW = cardPopoverEl.offsetWidth;
  const popH = cardPopoverEl.offsetHeight;
  const margin = 8;

  let left = rect.right - popW;
  let top = rect.bottom + margin;

  if (left < 8) left = 8;
  if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;

  if (top + popH > window.innerHeight - 8) {
    top = rect.top - popH - margin;
    cardPopoverEl.classList.add("flip-up");
  }

  cardPopoverEl.style.left = left + "px";
  cardPopoverEl.style.top = top + "px";
  cardPopoverEl.style.visibility = "visible";

  cardPopoverBackdropEl.classList.add("open");
  void cardPopoverEl.offsetWidth;
  cardPopoverEl.classList.add("open");
}

function closeCardPopover() {
  if (!cardPopoverEl) return;
  cardPopoverEl.classList.remove("open");
  cardPopoverBackdropEl.classList.remove("open");
  currentPopoverVideoId = null;
}

document.addEventListener("scroll", () => {
  if (cardPopoverEl && cardPopoverEl.classList.contains("open")) closeCardPopover();
}, true);
window.addEventListener("resize", () => {
  if (cardPopoverEl && cardPopoverEl.classList.contains("open")) closeCardPopover();
});

// ------------------------------------------------------------
// CARD ACTIONS
// ------------------------------------------------------------
function blobExt(blob) {
  if (!blob) return ".webm";
  if (blob.type.includes("mp4")) return ".mp4";
  if (blob.type.includes("quicktime")) return ".mov";
  return ".webm";
}

async function cardShareVideo(id) {
  const v = await getVideo(id);
  if (!v) return;
  try {
    const file = new File([v.blob], v.title + blobExt(v.blob), { type: v.blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: v.title });
    } else showToast("Share not supported", "error");
  } catch (_) { }
}

async function cardDownloadVideo(id) {
  const v = await getVideo(id);
  if (!v) return;
  try {
    const ok = await downloadBlob(v.blob, v.title.replace(/\s+/g, "-") + blobExt(v.blob));
    if (ok) {
      showToast(IS_IOS_STANDALONE ? "Save from the share sheet" : "Downloading…", "success");
    } else {
      showToast("Download failed", "error");
    }
  } catch (_) { showToast("Download failed", "error"); }
}

async function cardDeleteVideo(id) {
  const confirmed = confirm("Delete this video? This cannot be undone.");
  if (!confirmed) return;
  await deleteVideo(id);
  await refreshActiveScreen();
  showToast("Deleted", "success");
}

// ------------------------------------------------------------
// GENERIC MODAL
// ------------------------------------------------------------
function openModal(html) {
  modalContent.innerHTML = html;
  modalBackdrop.classList.add("open");
}

function closeModal() {
  modalBackdrop.classList.remove("open");
  modalContent.innerHTML = "";
}

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

// ------------------------------------------------------------
// FOLDER: CREATE / MANAGE
// ------------------------------------------------------------
function openCreateFolderModal() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">New folder</div>
    <input type="text" id="newFolderName" class="modal-input" placeholder="Folder name" autocomplete="off" maxlength="40" />
    <div class="modal-actions">
      <button class="primary" id="newFolderSave">Create</button>
      <button class="ghost" id="newFolderCancel">Cancel</button>
    </div>
  `);
  const input = document.getElementById("newFolderName");
  const saveBtn = document.getElementById("newFolderSave");
  const cancelBtn = document.getElementById("newFolderCancel");

  setTimeout(() => input.focus(), 100);

  const doSave = async () => {
    const name = input.value.trim();
    if (!name) { showToast("Enter a name", "error"); return; }
    const color = FOLDER_COLORS[allFoldersCache.length % FOLDER_COLORS.length];
    const folder = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name, color, createdAt: Date.now(),
    };
    await saveFolder(folder);
    closeModal();
    showToast("Folder created", "success");
    await refreshActiveScreen();
  };

  saveBtn.addEventListener("click", doSave);
  cancelBtn.addEventListener("click", closeModal);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSave(); });
}

function openFolderManageSheet(folderId) {
  const f = getFolderById(folderId);
  if (!f) return;

  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">${escapeHtml(f.name)}</div>
    <div class="modal-actions">
      <button id="fldRename">✏️  Rename</button>
      <button id="fldColor">🎨  Change color</button>
      <button class="danger" id="fldDelete">🗑️  Delete folder</button>
      <button class="ghost" id="fldCancel">Cancel</button>
    </div>
  `);

  document.getElementById("fldCancel").addEventListener("click", closeModal);
  document.getElementById("fldRename").addEventListener("click", () => {
    closeModal();
    openRenameFolderModal(folderId);
  });
  document.getElementById("fldColor").addEventListener("click", () => {
    closeModal();
    openFolderColorModal(folderId);
  });
  document.getElementById("fldDelete").addEventListener("click", () => {
    closeModal();
    confirmDeleteFolder(folderId);
  });
}

function openRenameFolderModal(folderId) {
  const f = getFolderById(folderId);
  if (!f) return;
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Rename folder</div>
    <input type="text" id="renameInput" class="modal-input" value="${escapeAttr(f.name)}" maxlength="40" />
    <div class="modal-actions">
      <button class="primary" id="renameSave">Save</button>
      <button class="ghost" id="renameCancel">Cancel</button>
    </div>
  `);
  const input = document.getElementById("renameInput");
  setTimeout(() => { input.focus(); input.select(); }, 100);

  document.getElementById("renameCancel").addEventListener("click", closeModal);
  document.getElementById("renameSave").addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) { showToast("Enter a name", "error"); return; }
    f.name = name;
    await saveFolder(f);
    closeModal();
    showToast("Renamed", "success");
    await refreshActiveScreen();
  });
}

function openFolderColorModal(folderId) {
  const f = getFolderById(folderId);
  if (!f) return;

  const swatches = FOLDER_COLORS.map((c) =>
    `<div class="color-swatch ${c === f.color ? "selected" : ""}" data-color="${c}" style="background:${c}"></div>`
  ).join("");

  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Folder color</div>
    <div class="color-grid" id="colorGrid">${swatches}</div>
    <div class="modal-actions">
      <button class="ghost" id="colorCancel">Cancel</button>
    </div>
  `);

  document.getElementById("colorCancel").addEventListener("click", closeModal);

  const grid = document.getElementById("colorGrid");
  grid.querySelectorAll(".color-swatch").forEach((el) => {
    el.addEventListener("click", async () => {
      const color = el.dataset.color;
      f.color = color;
      await saveFolder(f);
      closeModal();
      showToast("Color updated", "success");
      await refreshActiveScreen();
    });
  });
}

function confirmDeleteFolder(folderId) {
  const f = getFolderById(folderId);
  if (!f) return;
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Delete folder?</div>
    <p style="text-align:center;color:var(--qe-muted);font-size:14px;margin-bottom:14px;">
      Videos inside will stay and become unfiled.
    </p>
    <div class="modal-actions">
      <button class="danger" id="delFolderYes">Delete folder</button>
      <button class="ghost" id="delFolderNo">Cancel</button>
    </div>
  `);

  document.getElementById("delFolderNo").addEventListener("click", closeModal);
  document.getElementById("delFolderYes").addEventListener("click", async () => {
    await deleteFolderDb(folderId);
    const videos = await getAllVideos();
    for (const v of videos) {
      if (v.folderId === folderId) {
        v.folderId = null;
        await saveVideo(v);
      }
    }
    if (currentFolderFilter === folderId) currentFolderFilter = null;
    closeModal();
    showToast("Folder deleted", "success");
    await refreshActiveScreen();
  });
}

// ------------------------------------------------------------
// MOVE VIDEO TO FOLDER
// ------------------------------------------------------------
function buildFolderPickerHtml(currentFolderId) {
  const rows = [];
  rows.push(`
    <button class="folder-pick-item ${currentFolderId === null ? "current" : ""}" data-fid="">
      <span class="dot" style="background:#4a5568"></span>
      No folder
      ${currentFolderId === null ? '<span class="check">✓</span>' : ""}
    </button>
  `);
  for (const f of allFoldersCache) {
    rows.push(`
      <button class="folder-pick-item ${currentFolderId === f.id ? "current" : ""}" data-fid="${f.id}">
        <span class="dot" style="background:${f.color || "#16d6f1"}"></span>
        ${escapeHtml(f.name)}
        ${currentFolderId === f.id ? '<span class="check">✓</span>' : ""}
      </button>
    `);
  }
  rows.push(`
    <button class="folder-pick-item" data-fid="__new__">
      <span class="dot" style="background:var(--qe-grad)"></span>
      ＋ Create new folder…
    </button>
  `);
  return rows.join("");
}

async function openMoveToFolderSheet(videoId) {
  const v = await getVideo(videoId);
  if (!v) return;
  const currentFolderId = v.folderId || null;

  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Move to folder</div>
    <div class="folder-pick-list" id="folderPickList">
      ${buildFolderPickerHtml(currentFolderId)}
    </div>
    <div class="modal-actions">
      <button class="ghost" id="moveCancel">Cancel</button>
    </div>
  `);

  document.getElementById("moveCancel").addEventListener("click", closeModal);

  document.getElementById("folderPickList").addEventListener("click", async (e) => {
    const btn = e.target.closest(".folder-pick-item");
    if (!btn) return;
    const fid = btn.dataset.fid;
    if (fid === "__new__") {
      closeModal();
      openCreateFolderThenMove([videoId]);
      return;
    }
    v.folderId = fid || null;
    await saveVideo(v);
    closeModal();
    showToast("Moved", "success");
    await refreshActiveScreen();
  });
}

async function openBulkMoveSheet() {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;

  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">Move ${ids.length} video${ids.length > 1 ? "s" : ""} to folder</div>
    <div class="folder-pick-list" id="folderPickList">
      ${buildFolderPickerHtml(null)}
    </div>
    <div class="modal-actions">
      <button class="ghost" id="moveCancel">Cancel</button>
    </div>
  `);

  document.getElementById("moveCancel").addEventListener("click", closeModal);

  document.getElementById("folderPickList").addEventListener("click", async (e) => {
    const btn = e.target.closest(".folder-pick-item");
    if (!btn) return;
    const fid = btn.dataset.fid;
    if (fid === "__new__") {
      closeModal();
      openCreateFolderThenMove(ids);
      return;
    }
    for (const id of ids) {
      const v = await getVideo(id);
      if (!v) continue;
      v.folderId = fid || null;
      await saveVideo(v);
    }
    closeModal();
    exitSelectionMode();
    showToast("Moved", "success");
    await refreshActiveScreen();
  });
}

function openCreateFolderThenMove(videoIds) {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">New folder</div>
    <input type="text" id="newFolderName" class="modal-input" placeholder="Folder name" maxlength="40" />
    <div class="modal-actions">
      <button class="primary" id="newFolderSave">Create &amp; Move</button>
      <button class="ghost" id="newFolderCancel">Cancel</button>
    </div>
  `);
  const input = document.getElementById("newFolderName");
  setTimeout(() => input.focus(), 100);

  document.getElementById("newFolderCancel").addEventListener("click", closeModal);
  document.getElementById("newFolderSave").addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) { showToast("Enter a name", "error"); return; }
    const color = FOLDER_COLORS[allFoldersCache.length % FOLDER_COLORS.length];
    const folder = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name, color, createdAt: Date.now(),
    };
    await saveFolder(folder);
    for (const id of videoIds) {
      const v = await getVideo(id);
      if (!v) continue;
      v.folderId = folder.id;
      await saveVideo(v);
    }
    closeModal();
    exitSelectionMode();
    showToast("Created & moved", "success");
    await refreshActiveScreen();
  });
}

// ------------------------------------------------------------
// UTILS
// ------------------------------------------------------------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

// ------------------------------------------------------------
// NAVIGATION BETWEEN HOME & ALL VIDEOS
// ------------------------------------------------------------
async function openAllVideos() {
  await renderAllVideos();
  showScreen(allVideosScreen);
}
homeSeeAllBtn.addEventListener("click", openAllVideos);
homeSeeAllLink.addEventListener("click", (e) => { e.preventDefault(); openAllVideos(); });
allVideosBackBtn.addEventListener("click", async () => {
  if (selectionMode) exitSelectionMode();
  showScreen(homeScreen);
  await renderHome();
});

// ------------------------------------------------------------
// HOME → RECORD
// ------------------------------------------------------------
newVideoBtn.addEventListener("click", () => {
  if (selectionMode) exitSelectionMode();
  offset = 0;
  renderPrompter();
  timerEl.textContent = "00:00";
  showScreen(recordScreen);
  startCamera();
});

recordBackBtn.addEventListener("click", () => {
  stopCamera();
  stopScroll();
  showScreen(homeScreen);
  renderHome();
});

// ------------------------------------------------------------
// CAMERA
// ------------------------------------------------------------
async function startCamera() {
  if (cameraStream) return;
  const constraints = {
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: true,
  };
  const fallback = { video: { facingMode: "user" }, audio: true };
  try {
    try { cameraStream = await navigator.mediaDevices.getUserMedia(constraints); }
    catch (err1) {
      console.warn("Preferred camera failed, using fallback:", err1);
      cameraStream = await navigator.mediaDevices.getUserMedia(fallback);
    }
    video.srcObject = cameraStream;
  } catch (e) {
    showToast("Camera access failed", "error");
    console.error(e);
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
    video.srcObject = null;
  }
  if (drawRaf) { cancelAnimationFrame(drawRaf); drawRaf = null; }
  if (camVideo) {
    camVideo.pause();
    camVideo.srcObject = null;
    camVideo = null;
  }
  canvas = null;
  canvasCtx = null;
}

// ------------------------------------------------------------
// PROMPTER
// ------------------------------------------------------------
function renderPrompter() {
  prompterText.style.transform = `translateY(${-offset}px)`;
}
function loop(t) {
  if (!scrolling) return;
  if (!lastTime) lastTime = t;
  const dt = (t - lastTime) / 1000;
  lastTime = t;
  if (!voiceMode) {
    const pxPerSec = parseFloat(speed.value) * 1.2;
    offset += pxPerSec * dt;
    renderPrompter();
  }
  rafId = requestAnimationFrame(loop);
}
function startScroll() {
  if (scrolling) return;
  scrolling = true;
  lastTime = 0;
  rafId = requestAnimationFrame(loop);
}
function stopScroll() {
  scrolling = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

// ------------------------------------------------------------
// SCRIPT + SETTINGS
// ------------------------------------------------------------
scriptInput.addEventListener("input", () => {
  prompterText.textContent = scriptInput.value || "Tap ⚙ to enter your script";
  const words = scriptInput.value.trim().split(/\s+/).filter(Boolean).length;
  wordCount.textContent = words + " words";
});
prompterText.textContent = "Tap ⚙ to enter your script";

openSettings.addEventListener("click", () => settingsPanel.classList.add("open"));
closeSettings.addEventListener("click", () => settingsPanel.classList.remove("open"));

speed.addEventListener("input", () => (speedVal.textContent = speed.value));
fontSize.addEventListener("input", () => {
  fontVal.textContent = fontSize.value + "px";
  prompterText.style.fontSize = fontSize.value + "px";
});
position.addEventListener("input", () => {
  posVal.textContent = position.value + "%";
  prompterWrap.style.top = position.value + "%";
});
bgOpacity.addEventListener("input", () => {
  const o = bgOpacity.value / 100;
  bgVal.textContent = bgOpacity.value + "%";
  prompterWrap.style.background = `rgba(0,0,0,${o * 0.7})`;
});
countdownSec.addEventListener("input", () => (cdVal.textContent = countdownSec.value + "s"));

// ------------------------------------------------------------
// MIRROR / VOICE
// ------------------------------------------------------------
mirrorBtn.addEventListener("click", () => {
  mirror = !mirror;
  video.classList.toggle("no-mirror", !mirror);
  mirrorBtn.classList.toggle("active", mirror);
});

voiceBtn.addEventListener("click", () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast("Voice not supported in this browser", "error"); return; }
  voiceMode = !voiceMode;
  voiceBtn.classList.toggle("active", voiceMode);

  if (voiceMode) {
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = () => { offset += 12; renderPrompter(); };
    recognition.onerror = (e) => console.warn("Speech error", e);
    recognition.onend = () => {
      if (voiceMode) try { recognition.start(); } catch (_) { }
    };
    try { recognition.start(); } catch (_) { }
  } else if (recognition) {
    try { recognition.stop(); } catch (_) { }
    recognition = null;
  }
});

// ------------------------------------------------------------
// RECORDING
// ------------------------------------------------------------
recordBtn.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") stopRecording();
  else startCountdownThenRecord();
});

function startCountdownThenRecord() {
  const secs = parseInt(countdownSec.value);
  if (secs > 0) {
    countdownOverlay.classList.add("show");
    let n = secs;
    countdownOverlay.textContent = n;
    countdownOverlay.style.animation = "none";
    void countdownOverlay.offsetWidth;
    countdownOverlay.style.animation = "";
    const iv = setInterval(() => {
      n--;
      if (n <= 0) {
        clearInterval(iv);
        countdownOverlay.classList.remove("show");
        beginRecording();
      } else {
        countdownOverlay.textContent = n;
        countdownOverlay.style.animation = "none";
        void countdownOverlay.offsetWidth;
        countdownOverlay.style.animation = "";
      }
    }, 1000);
  } else beginRecording();
}

async function beginRecording() {
  if (!cameraStream) { showToast("Camera not ready", "error"); return; }

  offset = 0;
  renderPrompter();

  try {
    const fmt = getCurrentFormat();
    canvas = document.createElement("canvas");
    canvas.width = fmt.width;
    canvas.height = fmt.height;
    canvasCtx = canvas.getContext("2d");
    canvasCtx.fillStyle = "#000";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    camVideo = document.createElement("video");
    camVideo.srcObject = cameraStream;
    camVideo.muted = true;
    camVideo.playsInline = true;
    await camVideo.play();

    const drawFrame = () => {
      if (!canvas || !canvasCtx || !camVideo) return;
      const camW = camVideo.videoWidth;
      const camH = camVideo.videoHeight;
      const targetAspect = canvas.width / canvas.height;
      const camAspect = camW / camH;
      let sx, sy, sw, sh;
      if (camAspect > targetAspect) {
        sh = camH; sw = sh * targetAspect; sx = (camW - sw) / 2; sy = 0;
      } else {
        sw = camW; sh = sw / targetAspect; sx = 0; sy = (camH - sh) / 2;
      }
      if (mirror) {
        canvasCtx.save();
        canvasCtx.translate(canvas.width, 0);
        canvasCtx.scale(-1, 1);
        canvasCtx.drawImage(camVideo, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        canvasCtx.restore();
      } else {
        canvasCtx.drawImage(camVideo, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      }
      drawRaf = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    const canvasStream = canvas.captureStream(30);
    const audioTrack = cameraStream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    recordedChunks = [];
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: mime,
      videoBitsPerSecond: getTargetBitrate(),
      audioBitsPerSecond: 96_000,
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: "video/webm" });
      previewVideo.src = URL.createObjectURL(recordedBlob);
      populatePreviewFolderSelect();
      showScreen(previewScreen);
      if (drawRaf) { cancelAnimationFrame(drawRaf); drawRaf = null; }
    };

    mediaRecorder.start();
    recordBtn.classList.add("recording");
    requestWakeLock();
    startScroll();
    startTimer();
  } catch (e) {
    console.error("Recording failed:", e);
    showToast("Recording failed: " + e.message, "error");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  recordBtn.classList.remove("recording");
  stopScroll();
  stopTimer();
  releaseWakeLock();
}

function startTimer() {
  recordingStartTime = Date.now();
  timerEl.textContent = "00:00";
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - recordingStartTime) / 1000);
    timerEl.textContent =
      String(Math.floor(s / 60)).padStart(2, "0") + ":" +
      String(s % 60).padStart(2, "0");
  }, 250);
}
function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

// ------------------------------------------------------------
// PREVIEW — folder dropdown
// ------------------------------------------------------------
function populatePreviewFolderSelect() {
  if (!previewFolderSelect) return;
  previewFolderSelect.innerHTML = "";

  const noneOpt = document.createElement("option");
  noneOpt.value = "";
  noneOpt.textContent = "📁 No folder";
  previewFolderSelect.appendChild(noneOpt);

  for (const f of allFoldersCache) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = "📁 " + f.name;
    previewFolderSelect.appendChild(opt);
  }

  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "＋ Create new folder…";
  previewFolderSelect.appendChild(newOpt);

  if (currentFolderFilter) previewFolderSelect.value = currentFolderFilter;
}

previewFolderSelect?.addEventListener("change", async () => {
  if (previewFolderSelect.value === "__new__") {
    previewFolderSelect.value = currentFolderFilter || "";
    openCreateFolderModalForPreview();
  }
});

function openCreateFolderModalForPreview() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">New folder</div>
    <input type="text" id="newFolderName" class="modal-input" placeholder="Folder name" maxlength="40" />
    <div class="modal-actions">
      <button class="primary" id="newFolderSave">Create</button>
      <button class="ghost" id="newFolderCancel">Cancel</button>
    </div>
  `);
  const input = document.getElementById("newFolderName");
  setTimeout(() => input.focus(), 100);

  document.getElementById("newFolderCancel").addEventListener("click", closeModal);
  document.getElementById("newFolderSave").addEventListener("click", async () => {
    const name = input.value.trim();
    if (!name) { showToast("Enter a name", "error"); return; }
    const color = FOLDER_COLORS[allFoldersCache.length % FOLDER_COLORS.length];
    const folder = {
      id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name, color, createdAt: Date.now(),
    };
    await saveFolder(folder);
    allFoldersCache = await getAllFolders();
    populatePreviewFolderSelect();
    previewFolderSelect.value = folder.id;
    closeModal();
    showToast("Folder created", "success");
  });
}

// ------------------------------------------------------------
// PREVIEW ACTIONS
// ------------------------------------------------------------
previewCloseBtn.addEventListener("click", () => {
  if (recordedBlob) {
    URL.revokeObjectURL(previewVideo.src);
    recordedBlob = null;
  }
  previewVideo.src = "";
  stopCamera();
  showScreen(homeScreen);
  renderHome();
});

retakeBtn.addEventListener("click", () => {
  if (recordedBlob) {
    URL.revokeObjectURL(previewVideo.src);
    recordedBlob = null;
  }
  previewVideo.src = "";
  offset = 0;
  renderPrompter();
  timerEl.textContent = "00:00";
  showScreen(recordScreen);
  startCamera();
});

saveBtn.addEventListener("click", async () => {
  if (!recordedBlob) { showToast("Nothing to save", "error"); return; }

  const folderId = previewFolderSelect?.value && previewFolderSelect.value !== "__new__"
    ? previewFolderSelect.value
    : null;

  try {
    const duration = await getBlobDuration(recordedBlob);
    const existing = await getAllVideos();
    const title = "Video " + (existing.length + 1);
    const videoId = "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);

    await saveVideo({
      id: videoId,
      title,
      blob: recordedBlob,
      createdAt: Date.now(),
      duration,
      folderId,
    });

    showToast("Saved to Home", "success");

    const alsoMp4 = parallelMp4Check?.checked && HAS_WEBCODECS;
    if (alsoMp4) {
      const blobForMp4 = recordedBlob;
      const mp4Title = title + " (MP4)";
      saveParallelMp4(blobForMp4, mp4Title, folderId);
    }

    recordedBlob = null;
    previewVideo.src = "";
    stopCamera();
    showScreen(homeScreen);
    await renderHome();
  } catch (e) {
    console.error(e);
    showToast("Failed to save", "error");
  }
});

async function saveParallelMp4(webmBlob, title, folderId) {
  showToast("Converting MP4…", "");
  try {
    const input = new Mediabunny.Input({
      source: new Mediabunny.BlobSource(webmBlob),
      formats: Mediabunny.ALL_FORMATS,
    });
    const target = new Mediabunny.BufferTarget();
    const output = new Mediabunny.Output({
      format: new Mediabunny.Mp4OutputFormat(),
      target,
    });
    const conversion = await Mediabunny.Conversion.init({ input, output });
    if (!conversion.isValid) {
      showToast("MP4 not supported on this device", "error");
      return;
    }
    await conversion.execute();
    if (!target.buffer) { showToast("MP4 conversion failed", "error"); return; }

    const mp4Blob = new Blob([target.buffer], { type: "video/mp4" });
    if (mp4Blob.size < 1024) { showToast("MP4 conversion failed", "error"); return; }

    const mp4Duration = await getBlobDuration(mp4Blob);

    await saveVideo({
      id: "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title,
      blob: mp4Blob,
      createdAt: Date.now(),
      duration: mp4Duration || 0,
      folderId,
    });

    showToast("MP4 saved ✓", "success");
    await refreshActiveScreen();
  } catch (e) {
    console.error("Parallel MP4 failed:", e);
    showToast("MP4 save failed: " + e.message, "error");
  }
}

// ------------------------------------------------------------
// PLAYER MODAL
// ------------------------------------------------------------
async function openPlayer(id) {
  const v = await getVideo(id);
  if (!v) { showToast("Video not found", "error"); return; }
  currentPlayingId = id;
  playerTitle.textContent = v.title;
  playerVideo.src = URL.createObjectURL(v.blob);
  playerModal.classList.add("open");
  playerMenu.classList.remove("open");
}

function closePlayer() {
  playerModal.classList.remove("open");
  playerMenu.classList.remove("open");
  if (playerVideo.src) URL.revokeObjectURL(playerVideo.src);
  playerVideo.src = "";
  currentPlayingId = null;
}

playerCloseBtn.addEventListener("click", closePlayer);
playerMenuBtn.addEventListener("click", () => playerMenu.classList.toggle("open"));
menuCancelBtn.addEventListener("click", () => playerMenu.classList.remove("open"));

menuShareBtn.addEventListener("click", async () => {
  if (!currentPlayingId) return;
  playerMenu.classList.remove("open");
  await cardShareVideo(currentPlayingId);
});
menuDownloadBtn.addEventListener("click", async () => {
  if (!currentPlayingId) return;
  playerMenu.classList.remove("open");
  await cardDownloadVideo(currentPlayingId);
});
menuMoveBtn.addEventListener("click", async () => {
  if (!currentPlayingId) return;
  const id = currentPlayingId;
  playerMenu.classList.remove("open");
  closePlayer();
  await openMoveToFolderSheet(id);
});

menuConvertBtn.addEventListener("click", async () => {
  if (!currentPlayingId) return;
  const v = await getVideo(currentPlayingId);
  if (!v) return;
  playerMenu.classList.remove("open");
  showToast("Converting to MP4…", "");

  try {
    const input = new Mediabunny.Input({
      source: new Mediabunny.BlobSource(v.blob),
      formats: Mediabunny.ALL_FORMATS,
    });
    const target = new Mediabunny.BufferTarget();
    const output = new Mediabunny.Output({
      format: new Mediabunny.Mp4OutputFormat(),
      target,
    });
    const conversion = await Mediabunny.Conversion.init({ input, output });
    if (!conversion.isValid) { showToast("MP4 not supported on this device", "error"); return; }
    await conversion.execute();
    if (!target.buffer) { showToast("Conversion produced no data", "error"); return; }
    const mp4Blob = new Blob([target.buffer], { type: "video/mp4" });
    if (mp4Blob.size < 1024) { showToast("Conversion failed (empty)", "error"); return; }
    const mp4Duration = await getBlobDuration(mp4Blob);
    await saveVideo({
      id: "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      title: v.title + " (MP4)",
      blob: mp4Blob,
      createdAt: Date.now(),
      duration: mp4Duration || v.duration || 0,
      folderId: v.folderId || null,
    });
    showToast("MP4 saved to Home ✓", "success");
    closePlayer();
    await refreshActiveScreen();
  } catch (e) {
    console.error("MP4 conversion error:", e);
    showToast("MP4 failed: " + e.message, "error");
  }
});

menuDeleteBtn.addEventListener("click", async () => {
  if (!currentPlayingId) return;
  const id = currentPlayingId;
  playerMenu.classList.remove("open");
  const confirmed = confirm("Delete this video? This cannot be undone.");
  if (!confirmed) return;
  await deleteVideo(id);
  closePlayer();
  await refreshActiveScreen();
  showToast("Deleted", "success");
});

// ------------------------------------------------------------
// BOOT
// ------------------------------------------------------------
async function boot() {
  try {
    db = await openDB();
  } catch (e) {
    console.error("DB failed", e);
    showToast("Storage unavailable", "error");
  }

  try { await refreshData(); } catch (_) { }

  setTimeout(async () => {
    showScreen(homeScreen);
    await renderHome();
  }, 1000);
}

boot();

// ------------------------------------------------------------
// VISIBILITY
// ------------------------------------------------------------
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopScroll();
    if (mediaRecorder && mediaRecorder.state === "recording") stopRecording();
  } else {
    if (mediaRecorder && mediaRecorder.state === "recording") requestWakeLock();
  }
});

// ------------------------------------------------------------
// CLEANUP
// ------------------------------------------------------------
window.addEventListener("beforeunload", () => {
  stopCamera();
  stopScroll();
  releaseWakeLock();
  revokeAllBlobUrls();
});