// Funciona offline depois da primeira visita. App e conteúdo: rede primeiro (pega atualizações),
// cache como reserva. PDFs, fontes e PDF.js: cache primeiro.
const V = "margem-v6";
const APP = ["./", "index.html", "css/app.css", "js/app.js", "js/data.js", "js/store.js", "js/ui.js", "js/folhas.js", "js/busca.js",
  "js/views/hoje.js", "js/views/trilha.js", "js/views/topico.js", "js/views/sessao.js", "js/views/revisar.js", "js/views/biblioteca.js",
  "js/views/material.js", "js/views/pdf.js", "js/views/busca.js", "js/views/glossario.js", "js/views/ajustes.js",
  "content/conteudo.json", "manifest.webmanifest", "icons/icon.svg", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(APP)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || r.headers.has("range")) return;
  const u = new URL(r.url);
  const primeiroCache = u.pathname.endsWith(".pdf") || u.host !== location.host;
  if (primeiroCache) {
    e.respondWith(caches.match(r).then(c => c || fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(ca => ca.put(r, cp)); } return res; })));
  } else {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(ca => ca.put(r, cp)); } return res; }).catch(() => caches.match(r).then(c => c || caches.match("index.html"))));
  }
});
