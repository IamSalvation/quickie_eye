/* ============================================================
   QUICKIE EYE — SERVICE WORKER
   ============================================================ */

const CACHE_VERSION = "qe-v6";
const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./mediabunny.min.mjs",
    "./manifest.json",
    "./logo.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/apple-touch-icon.png",
    "./icons/favicon-32x32.png",
    "./icons/favicon-16x16.png",
    "./icons/og-image.png",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_VERSION)
            .then((cache) =>
                Promise.all(
                    APP_SHELL.map((url) =>
                        fetch(url, { redirect: "follow" })
                            .then((res) => {
                                if (!res.ok) throw new Error("Bad status " + res.status);
                                return cache.put(url, res);
                            })
                            .catch((err) => console.warn("[SW] Failed to cache:", url, err))
                    )
                )
            )
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;

    let url;
    try { url = new URL(req.url); } catch { return; }
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    if (url.origin !== self.location.origin) return;

    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    if (res && res.status === 200 && res.type === "basic") {
                        const resClone = res.clone();
                        caches.open(CACHE_VERSION).then((c) => c.put(req, resClone)).catch(() => { });
                    }
                    return res;
                })
                .catch(() => caches.match("./index.html"))
        );
        return;
    }

    event.respondWith(
        caches.match(req).then((cached) => {
            const networkFetch = fetch(req, { redirect: "follow" })
                .then((res) => {
                    if (res && res.status === 200 && res.type === "basic" && !res.redirected) {
                        const resClone = res.clone();
                        caches.open(CACHE_VERSION).then((c) => c.put(req, resClone)).catch(() => { });
                    }
                    return res;
                })
                .catch(() => null);

            if (cached) { networkFetch; return cached; }

            return networkFetch.then((res) => {
                if (res) return res;
                return new Response("Offline", {
                    status: 503,
                    statusText: "Offline",
                    headers: { "Content-Type": "text/plain" },
                });
            });
        })
    );
});

self.addEventListener("message", (event) => {
    if (event.data === "SKIP_WAITING") self.skipWaiting();
});