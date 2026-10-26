// Service worker: lưu sẵn app để mở được cả khi mất mạng (nhận giọng nói của Chrome vẫn cần mạng).
const CACHE = 'tu1923-v1.4.0';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'words.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // File của app: lấy bản mới nếu có mạng, mất mạng thì dùng bản đã lưu
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
    );
    return;
  }
  // Font Google: dùng bản đã lưu trước
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
  }
});
