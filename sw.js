const CACHE = 'recipe-vault-v24';
const APP_SHELL = [
  './', './index.html', './styles.css?v=24', './recipe-core.js?v=24', './recipe-import.js?v=24', './storage.js?v=24', './translations.js?v=24', './app.js?v=24', './manifest.webmanifest?v=24',
  './icon-192.png', './icon-512.png'
];
const DB_NAME = 'recipe-vault-db';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('recipes')) db.createObjectStore('recipes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('shared')) db.createObjectStore('shared', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveShared(payload) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('shared', 'readwrite');
    tx.objectStore('shared').put(payload);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method === 'POST' && /\/share-target\/?$/.test(url.pathname)) {
    event.respondWith((async () => {
      try {
        const form = await req.formData();
        const files = form.getAll('files').filter(v => v instanceof File).map(file => ({
          name: file.name,
          type: file.type,
          blob: file
        }));
        await saveShared({
          id: 'latest',
          title: String(form.get('title') || ''),
          text: String(form.get('text') || ''),
          url: String(form.get('url') || ''),
          files,
          createdAt: Date.now()
        });
        return Response.redirect(new URL('./?shared=1#import', self.registration.scope).href, 303);
      } catch (error) {
        return Response.redirect(new URL('./?shareError=1#import', self.registration.scope).href, 303);
      }
    })());
    return;
  }

  if (req.method !== 'GET') return;
  event.respondWith((async () => {
    // Network-first for our own app files so updates are visible immediately; cache remains the offline fallback.
    if (url.origin === self.location.origin) {
      try {
        const response = await fetch(req, {cache:'no-store'});
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, response.clone());
        }
        return response;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./index.html');
        throw e;
      }
    }
    const cached = await caches.match(req);
    if (cached) return cached;
    return fetch(req);
  })());
});
