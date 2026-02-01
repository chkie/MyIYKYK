// Service Worker for Kosten-Tool PWA
// Strategy: Conservative, Auth-Safe, Network-First for Dynamic Content

const CACHE_NAME = 'kosten-tool-v3'; // BUMPED: Robust update behavior
const CACHE_VERSION = 3;

// ============================================================================
// WHITELIST: Safe to cache (Static Assets ONLY)
// ============================================================================

const PWA_ASSETS = [
	'/manifest.json',
	'/favicon.svg',
	'/webtool_logo.webp',
	'/webtool_logo.png'
];

// ============================================================================
// BLACKLIST: NEVER cache (Auth, HTML, SSR, Mutations)
// ============================================================================

const NEVER_CACHE_PATTERNS = [
	'/', // Root - SSR content
	'/login',
	'/logout',
	'/fixkosten',
	'/ausgaben',
	'/profil',
	'/archiv',
	'/admin',
	'/api/', // Future-proofing
	'.supabase.co' // Future-proofing
];

// ============================================================================
// URL PATTERNS
// ============================================================================

const PATTERNS = {
	immutable: /_app\/immutable\//,
	version: /_app\/version\.json$/,
	supabase: /\.supabase\.co/
};

// ============================================================================
// HELPER: Check if URL should never be cached
// ============================================================================

function shouldNeverCache(url) {
	const pathname = url.pathname;
	return NEVER_CACHE_PATTERNS.some((pattern) => {
		if (pattern.includes('.')) {
			// Hostname pattern (e.g., .supabase.co)
			return url.hostname.includes(pattern);
		}
		// Pathname pattern (exact match or starts with)
		return pathname === pattern || pathname.startsWith(pattern + '/');
	});
}

// ============================================================================
// INSTALL: Pre-cache PWA Assets
// ============================================================================

self.addEventListener('install', (event) => {
	console.log('[SW] Installing Service Worker v' + CACHE_VERSION);

	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				console.log('[SW] Pre-caching PWA assets');
				return cache.addAll(PWA_ASSETS);
			})
			.catch((error) => {
				console.error('[SW] Pre-cache failed:', error);
				// Don't fail installation if pre-cache fails
			})
	);

	// CONSERVATIVE: Don't skip waiting - let old SW finish serving existing clients
	// New SW activates only when all tabs are closed
});

// ============================================================================
// ACTIVATE: Clean old caches
// ============================================================================

self.addEventListener('activate', (event) => {
	console.log('[SW] Activating Service Worker v' + CACHE_VERSION);

	event.waitUntil(
		caches
			.keys()
			.then((keys) => {
				return Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME)
						.map((key) => {
							console.log('[SW] Deleting old cache:', key);
							return caches.delete(key);
						})
				);
			})
			.then(() => {
				// Only claim clients after old caches are cleaned
				return self.clients.claim();
			})
	);
});

// ============================================================================
// FETCH: Request Interception & Caching Strategy
// ============================================================================

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);
	const { pathname, hostname } = url;
	const { method } = request;

	// ============================================================================
	// CRITICAL: NEVER CACHE (Network-Only)
	// ============================================================================

	// 1. HTML/SSR ROUTES: Always network, never cache
	if (
		method === 'GET' &&
		request.headers.get('Accept')?.includes('text/html')
	) {
		console.log('[SW] HTML - Network-only (NO CACHE):', pathname);
		return; // Let browser handle - no caching
	}

	// 2. AUTH & SSR ROUTES: /login, /logout, /, /fixkosten, etc.
	if (shouldNeverCache(url)) {
		console.log('[SW] NEVER CACHE - Bypassing:', pathname);
		return; // Let browser handle naturally
	}

	// 3. POST REQUESTS: All mutations (Form Actions)
	if (method !== 'GET') {
		console.log('[SW] NON-GET REQUEST - Bypassing:', method, pathname);
		return; // Let browser handle
	}

	// 4. CROSS-ORIGIN: Only handle same-origin requests
	if (url.origin !== self.location.origin) {
		if (PATTERNS.supabase.test(hostname)) {
			console.log('[SW] SUPABASE REQUEST - Bypassing:', hostname);
		}
		return; // Let browser handle all cross-origin
	}

	// ============================================================================
	// VERSION CHECK: Network-only, set update flag
	// ============================================================================

	if (PATTERNS.version.test(pathname)) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					console.log('[SW] VERSION CHECK - Network success');
					// Notify clients about version
					self.clients.matchAll().then((clients) => {
						clients.forEach((client) => {
							client.postMessage({ type: 'VERSION_CHECKED' });
						});
					});
					return response;
				})
				.catch((error) => {
					console.log('[SW] VERSION CHECK - Failed (offline)');
					// Return minimal JSON on failure
					return new Response(
						JSON.stringify({ buildDate: 0 }),
						{
							headers: { 'Content-Type': 'application/json' }
						}
					);
				})
		);
		return;
	}

	// ============================================================================
	// IMMUTABLE ASSETS: Cache-First (Forever)
	// ============================================================================

	if (PATTERNS.immutable.test(pathname)) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) {
					console.log('[SW] IMMUTABLE - Returning cached:', pathname);
					return cached;
				}

				console.log('[SW] IMMUTABLE - Fetching:', pathname);
				return fetch(request).then((response) => {
					// Only cache successful responses
					if (response && response.status === 200) {
						const responseClone = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						});
					}
					return response;
				});
			})
		);
		return;
	}

	// ============================================================================
	// PWA ASSETS: Cache-First (Manifest, Icons)
	// ============================================================================

	if (PWA_ASSETS.includes(pathname)) {
		event.respondWith(
			caches.match(request).then((cached) => {
				if (cached) {
					console.log('[SW] PWA ASSET - Returning cached:', pathname);
					// Stale-While-Revalidate: Return cached, update in background
					fetch(request).then((response) => {
						if (response && response.status === 200) {
							caches.open(CACHE_NAME).then((cache) => {
								cache.put(request, response);
							});
						}
					});
					return cached;
				}

				console.log('[SW] PWA ASSET - Fetching:', pathname);
				return fetch(request).then((response) => {
					if (response && response.status === 200) {
						const responseClone = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						});
					}
					return response;
				});
			})
		);
		return;
	}

	// ============================================================================
	// DEFAULT: Network-First (Try cache only on failure)
	// ============================================================================

	console.log('[SW] DEFAULT - Network-first:', pathname);
	event.respondWith(
		fetch(request).catch(() => {
			// If network fails, try cache as last resort
			return caches.match(request);
		})
	);
});

// ============================================================================
// MESSAGE: Handle messages from client
// ============================================================================

self.addEventListener('message', (event) => {
	console.log('[SW] Message received:', event.data);

	if (event.data === 'SKIP_WAITING') {
		// Allow client to force update (requires user confirmation)
		console.log('[SW] SKIP_WAITING requested by client');
		self.skipWaiting();
	}
});
