/*
 * KoaMessenger service worker.
 *
 * Deliberately conservative — messaging platforms render in iframes/webviews on
 * other origins, so offline support only applies to our own shell:
 *  - Hashed build assets (/assets/…) are immutable → cache-first.
 *  - Navigations are network-first with a cached shell fallback when offline.
 *  - /api requests (including the Clerk proxy at /api/__clerk), non-GET
 *    requests, and cross-origin requests are NEVER intercepted.
 *  - skipWaiting + clients.claim so a new deploy replaces the old worker
 *    immediately (avoids stale-bundle issues).
 *
 * Bump VERSION when changing caching behavior — old caches are dropped on activate.
 */

const VERSION = "v1";
const STATIC_CACHE = `koa-static-${VERSION}`;
const SHELL_CACHE = `koa-shell-${VERSION}`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n !== STATIC_CACHE && n !== SHELL_CACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Keep one shell copy per scope as the offline fallback.
      cache.put("shell", response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match("shell");
    if (cached) return cached;
    throw new Error("offline and no cached shell");
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never touch the API or the Clerk auth proxy.
  if (url.pathname.startsWith("/api")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Vite emits content-hashed filenames under assets/ — safe to cache forever.
  if (url.pathname.includes("/assets/")) {
    event.respondWith(cacheFirstAsset(request));
  }
});
