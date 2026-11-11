/* Gerador de QR Code v3: offline completo (rede primeiro, cache como reserva). */
const CACHE='qrcode-v3-1';
const SHELL=['./','index.html','style.css','qr.js','app.js','manifest.json','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/favicon.png','fonts/inter-400.woff','fonts/inter-500.woff','fonts/inter-600.woff','fonts/inter-700.woff','fonts/inter-800.woff'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP')self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))))});
