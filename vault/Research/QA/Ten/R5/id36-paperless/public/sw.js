const CACHE='paperless-v1';const FILES=['/','/index.html','/styles.css','/app.js','/storage.js','/compute.mjs','/domain.mjs','/lib/offline.js','/lib/validation.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method==='GET'&&url.origin===self.location.origin&&FILES.includes(url.pathname))event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(r=>r??caches.match('/'))))});
