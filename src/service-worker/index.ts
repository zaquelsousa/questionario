
import { self } from '$app/service-worker';
import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';

const CACHE = `questionarios-${version}`;

const ASSETS = [
    '/',
    ...immutable.map((file) => file.path),
    ...assets.map((file) => file.path),
    ...prerendered.map((file) => file.path)
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith('questionarios-') && key !== CACHE)
                        .map((key) => caches.delete(key))
                )
            )
        ])
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then(async (cached) => {
            if (cached) return cached;

            try {
                const response = await fetch(event.request);

                if (response.ok) {
                    const cache = await caches.open(CACHE);
                    await cache.put(event.request, response.clone());
                }

                return response;
            } catch {
                if (event.request.mode === 'navigate') {
                    const fallback = await caches.match('/');
                    if (fallback) return fallback;
                }

                return new Response('Offline: resource unavailable.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            }
        })
    );
});

