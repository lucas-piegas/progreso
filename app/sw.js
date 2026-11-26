// Guarda la app y las bases en el teléfono: todo funciona sin conexión.
// Lo único externo es Open Food Facts, y solo para un código de barras que no esté en productos.json.
// Subí VERSION cada vez que cambies un archivo de la app.
const VERSION = 'progreso-v4';
const ARCHIVOS = ['./', 'index.html', 'estilos.css', 'plan.js', 'ejercicios.js', 'nucleo.js', 'comida.js', 'entreno.js', 'medir.js', 'hoy.js', 'alimentos.json', 'productos.json', 'vendor/html5-qrcode.min.js', 'manifest.webmanifest', 'icono-180.png', 'icono-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.origin === location.origin) {
    // Primero la copia del teléfono (instantáneo). En segundo plano se baja la versión nueva
    // y queda lista para la próxima vez que se abra la app.
    const red = fetch(e.request).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
      return r;
    });
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((m) => m || red));
    e.waitUntil(red.catch(() => {}));
  }
});
