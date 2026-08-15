/* Station — Suivi ISS
   Incrémenter VERSION à chaque modification de index.html ou des ressources. */
const VERSION = "iss-v7";
const COQUE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(COQUE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(c => c !== VERSION).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Données vivantes : jamais de cache
  if (/api\.wheretheiss\.at|celestrak\.org|nominatim\.openstreetmap\.org/.test(url.hostname)) return;

  // Tuiles de carte : réseau seul, elles sont trop volumineuses pour être stockées
  if (/basemaps\.cartocdn\.com|arcgisonline\.com/.test(url.hostname)) return;

  // Bibliothèques et polices : cache d'abord, rafraîchi en arrière-plan
  if (/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => {
        const reseau = fetch(req).then(rep => {
          if (rep && rep.status === 200) caches.open(VERSION).then(c => c.put(req, rep.clone()));
          return rep;
        }).catch(() => hit);
        return hit || reseau;
      })
    );
    return;
  }

  // Coque de l'application : réseau d'abord pour recevoir les mises à jour
  e.respondWith(
    fetch(req)
      .then(rep => {
        if (rep && rep.status === 200 && rep.type === "basic")
          caches.open(VERSION).then(c => c.put(req, rep.clone()));
        return rep;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
  );
});
