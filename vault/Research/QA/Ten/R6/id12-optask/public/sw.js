import {invoke} from './domain.mjs';
const CACHE='synthetic-optask-shell-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/app.js','/styles.css','/domain.mjs'])).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('synthetic-optask-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(url.pathname==='/api/invoke'&&req.method==='POST'){event.respondWith((async()=>{const copy=req.clone();if(req.headers.get('X-Offline-Route')!=='1'){try{return await fetch(req);}catch{}}
 try{return Response.json(invoke(await copy.json()));}catch{return Response.json({status:'error',error:'INVALID_INPUT',result:null});}})());return;}
 if(req.method==='GET')event.respondWith(fetch(req).catch(()=>caches.match(req).then(r=>r||Response.error())));
});
