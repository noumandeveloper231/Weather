// Service Worker for WeatherPro PWA
const CACHE_NAME = 'weatherpro-v1.0.0';
const STATIC_CACHE = 'weatherpro-static-v1';
const DYNAMIC_CACHE = 'weatherpro-dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
    '/',
    '/Index.html',
    '/src/output.css',
    '/script.js',
    '/weather-api.js',
    '/ui-controller.js',
    '/storage.js',
    '/notifications.js',
    '/manifest.json',
    '/clear.png',
    '/cloud.png',
    '/rain.png',
    '/wind.png',
    '/pressure.png',
    '/error.png',
    '/image.png',
    '/image copy.png'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Error caching static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API requests
    if (url.hostname === 'api.openweathermap.org') {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static files
    if (STATIC_FILES.some(file => request.url.includes(file))) {
        event.respondWith(handleStaticRequest(request));
        return;
    }

    // Handle other requests
    event.respondWith(handleDynamicRequest(request));
});

// Handle API requests with cache-first strategy for better performance
async function handleApiRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);

    // Return cached response if available and not too old (5 minutes)
    if (cachedResponse) {
        const cacheDate = new Date(cachedResponse.headers.get('date'));
        const now = new Date();
        const age = now - cacheDate;

        if (age < 5 * 60 * 1000) { // 5 minutes
            console.log('Serving cached API response:', request.url);
            return cachedResponse;
        }
    }

    try {
        console.log('Fetching fresh API data:', request.url);
        const response = await fetch(request);

        if (response.ok) {
            // Cache successful API responses
            const responseClone = response.clone();
            cache.put(request, responseClone);
        }

        return response;
    } catch (error) {
        console.log('API request failed, serving cached response:', error);

        // Return cached response if network fails
        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline response
        return new Response(
            JSON.stringify({
                error: 'Network unavailable',
                message: 'Please check your internet connection'
            }),
            {
                status: 503,
                statusText: 'Service Unavailable',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
    }
}

// Handle static file requests with cache-first strategy
async function handleStaticRequest(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            console.log('Serving cached static file:', request.url);
            return cachedResponse;
        }

        console.log('Fetching static file:', request.url);
        const response = await fetch(request);

        if (response.ok) {
            const responseClone = response.clone();
            cache.put(request, responseClone);
        }

        return response;
    } catch (error) {
        console.error('Static file request failed:', error);

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const cache = await caches.open(STATIC_CACHE);
            return cache.match('/Index.html');
        }

        return new Response('File not available offline', {
            status: 404,
            statusText: 'Not Found'
        });
    }
}

// Handle dynamic requests with network-first strategy
async function handleDynamicRequest(request) {
    try {
        console.log('Fetching dynamic content:', request.url);
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            const responseClone = response.clone();
            cache.put(request, responseClone);
        }

        return response;
    } catch (error) {
        console.log('Dynamic request failed, checking cache:', error);

        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const staticCache = await caches.open(STATIC_CACHE);
            return staticCache.match('/Index.html');
        }

        return new Response('Content not available offline', {
            status: 404,
            statusText: 'Not Found'
        });
    }
}

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);

    if (event.tag === 'weather-sync') {
        event.waitUntil(syncWeatherData());
    }
});

// Sync weather data when back online
async function syncWeatherData() {
    try {
        console.log('Syncing weather data...');

        // Get stored locations that need syncing
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();

        // Refresh cached API data
        for (const request of requests) {
            if (request.url.includes('api.openweathermap.org')) {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.put(request, response.clone());
                    }
                } catch (error) {
                    console.log('Failed to sync:', request.url);
                }
            }
        }

        console.log('Weather data sync completed');
    } catch (error) {
        console.error('Weather data sync failed:', error);
    }
}

// Handle push notifications
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);

    const options = {
        body: event.data ? event.data.text() : 'Weather update available',
        icon: '/image.png',
        badge: '/image.png',
        tag: 'weather-update',
        requireInteraction: false,
        actions: [
            {
                action: 'view',
                title: 'View Weather'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('WeatherPro Update', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    event.notification.close();

    if (event.action === 'view') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Clean up old cache entries periodically
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CLEAN_CACHE') {
        event.waitUntil(cleanOldCache());
    }
});

async function cleanOldCache() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        const now = Date.now();

        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const cacheDate = new Date(response.headers.get('date'));
                const age = now - cacheDate.getTime();

                // Remove entries older than 1 hour
                if (age > 60 * 60 * 1000) {
                    await cache.delete(request);
                    console.log('Removed old cache entry:', request.url);
                }
            }
        }

        console.log('Cache cleanup completed');
    } catch (error) {
        console.error('Cache cleanup failed:', error);
    }
}
