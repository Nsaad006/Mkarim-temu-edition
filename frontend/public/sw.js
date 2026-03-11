// sw.js - Basic Service Worker to fulfill PWA installability requirements
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // A simple pass-through to network, falling back to a dummy offline response if it fails.
    // This satisfies the "has a fetch event handler" requirement.
    event.respondWith(
        fetch(event.request).catch(
            () => new Response('Vous êtes hors ligne. Veuillez vérifier votre connexion.', {
                status: 503,
                statusText: 'Service Unavailable'
            })
        )
    );
});
