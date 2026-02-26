const CACHE_NAME = "sellmore-v2";
const OFFLINE_URL = "/offline";

// Core assets that must be cached for offline cold start
// ALL paths must be relative (starting with /)
const PRECACHE_ASSETS = [
  "/",
  "/offline",
  "/logowotext.png",
  "/logowtext.png",
  "/manifest.json",
  "/ka-ching.mp3",
];

// Install event - precache core assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log("[SW] Caching core assets");
      // Cache core assets
      await cache.addAll(PRECACHE_ASSETS);
      // Force activate immediately
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
      // Take control of all clients immediately
      await self.clients.claim();
      console.log("[SW] Service worker activated and controlling all clients");
    })()
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // CRITICAL: Only handle requests from the same origin
  // This prevents caching/intercepting requests to other domains like softgen.dev
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip API calls - these should always try network
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache successful responses (only same-origin)
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          // Clone the response before caching
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (error) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
          console.log("[SW] Serving from cache:", request.url);
          return cachedResponse;
        }

        // For navigation requests, show offline page
        if (request.mode === "navigate") {
          console.log("[SW] Navigation failed, showing offline page");
          const offlineResponse = await caches.match(OFFLINE_URL);
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        // Return a basic offline response for other requests
        return new Response("Offline", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({
            "Content-Type": "text/plain",
          }),
        });
      }
    })()
  );
});

// Handle messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});