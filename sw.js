const CACHE_NAME = 'teacher-schedule-v19';
const ASSETS = [
  './index.html',
  './manifest.json',
  './css/app.css?v=19',
  './js/00-core.js?v=19',
  './js/10-week-render.js?v=19',
  './js/20-cell-modals.js?v=19',
  './js/30-records-events.js?v=19',
  './js/40-settings-data.js?v=19',
  './js/50-todo-fixed-nav.js?v=19',
  './js/60-platform.js?v=19',
  './js/70-students.js?v=19',
  './js/app.js?v=19'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
