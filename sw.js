// Keeps the app working offline.
// The page itself: always fetched fresh when online (so updates show at once), saved copy when offline.
// Icons and manifest: saved copy at once, refreshed in the background.
// Fonts, Supabase library and Quran text from CDNs: saved once, then served from the cache.
var V = "muraja-v9";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) {
    return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.endsWith("/quran.txt") || url.pathname.endsWith("/version.json")) return;
    var isPage = req.mode === "navigate" || /\/(index\.html)?$/.test(url.pathname);
    if (isPage) {
      e.respondWith(caches.open(V).then(function (c) {
        return fetch(req, { cache: "no-cache" }).then(function (res) {
          if (res.ok) c.put("index.html", res.clone());
          return res;
        }).catch(function () {
          return c.match("index.html").then(function (hit) { return hit || c.match("./"); });
        });
      }));
      return;
    }
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(req, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req, { cache: "no-cache" }).then(function (res) { if (res.ok) c.put(req, res.clone()); return res; });
        if (hit) { net.catch(function () {}); return hit; }
        return net;
      });
    }));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$|cdn\.jsdelivr\.net$/.test(url.hostname)) {
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (res) { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; });
      });
    }));
  }
});
