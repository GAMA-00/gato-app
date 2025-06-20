
// Service Worker for image caching
const CACHE_NAME = 'image-cache-v1';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Critical images to cache immediately
const CRITICAL_IMAGES = [
  '/lovable-uploads/11446302-74b0-4775-bc77-01fbf112f8f0.png', // home
  '/lovable-uploads/7613f29b-5528-4db5-9357-1d3724a98d5d.png', // pets
  '/lovable-uploads/19672ce3-748b-4ea7-86dc-b281bb9b8d45.png', // classes
  '/lovable-uploads/f5cf3911-b44f-47e9-b52e-4e16ab8b8987.png', // personal-care
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CRITICAL_IMAGES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only cache image requests
  if (url.pathname.includes('/lovable-uploads/') || 
      event.request.destination === 'image') {
    
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          if (response) {
            // Check if cache is expired
            const dateHeader = response.headers.get('sw-cached-date');
            if (dateHeader) {
              const cachedDate = new Date(dateHeader);
              const now = new Date();
              if (now.getTime() - cachedDate.getTime() > CACHE_EXPIRY) {
                // Cache expired, fetch new version
                return fetchAndCache(event.request, cache);
              }
            }
            return response;
          }
          
          return fetchAndCache(event.request, cache);
        });
      })
    );
  }
});

function fetchAndCache(request, cache) {
  return fetch(request).then(response => {
    if (response.ok) {
      const responseClone = response.clone();
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-date', new Date().toISOString());
      
      const modifiedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
    }
    return response;
  }).catch(() => {
    // Return a fallback or cached version if available
    return cache.match(request);
  });
}
