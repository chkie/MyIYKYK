// Service Worker for Kosten-Tool PWA
// Strategy: Conservative, Auth-Safe, Network-First for Dynamic Content

const CACHE_NAME = 'kosten-tool-v2'; // BUMPED: Logo optimized
const CACHE_VERSION = 2;

// ============================================================================
// WHITELIST: Safe to cache (Static Assets)
// ============================================================================

const PWA_ASSETS = [
	'/manifest.json',
	'/icon-192.png',
	'/icon-512.png',
	'/icon-192.svg',
	'/icon-512.svg',
	'/favicon.svg',
	'/webtool_logo.webp', // Optimized WebP (15KB)
	'/webtool_logo.png'   // Fallback PNG (169KB)
];

// ============================================================================
// BLACKLIST: NEVER cache (Auth, Mutations, Session-Critical)
// ============================================================================

const NEVER_CACHE_PATTERNS = [
	'/login',
	'/logout',
	'/api/', // Future-proofing
	'.supabase.co' // Future-proofing (no client-side calls currently)
];

// ============================================================================
// URL PATTERNS
// ============================================================================

const PATTERNS = {
	immutable: /_app\/immutable\//,
	html: /\/(fixkosten|ausgaben|profil|archiv)?$/,
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
		// Pathname pattern
		return pathname.startsWith(pattern);
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
				// App will still work, just slower initial load
			})
	);

	// CONSERVATIVE: Don't skip waiting - let old SW finish serving existing clients
	// New SW activates only when all tabs are closed
	// This prevents version mismatch bugs between tabs
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
				// CONSERVATIVE: Only claim clients after old caches are cleaned
				// This ensures we don't serve stale content from old caches
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

	// 1. AUTH ROUTES: /login, /logout
	if (shouldNeverCache(url)) {
		console.log('[SW] NEVER CACHE - Bypassing:', pathname);
		return; // Let browser handle naturally
	}

	// 2. POST REQUESTS: All mutations (Form Actions)
	if (method !== 'GET') {
		console.log('[SW] NON-GET REQUEST - Bypassing:', method, pathname);
		return; // Let browser handle
	}

	// 3. CROSS-ORIGIN: Only handle same-origin requests
	if (url.origin !== self.location.origin) {
		// Future-proofing: If Supabase client-side added
		if (PATTERNS.supabase.test(hostname)) {
			console.log('[SW] SUPABASE REQUEST - Bypassing:', hostname);
		}
		return; // Let browser handle all cross-origin
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
	// HTML ROUTES: Network-First (Offline Fallback)
	// ============================================================================

	if (
		method === 'GET' &&
		request.headers.get('Accept')?.includes('text/html')
	) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					console.log('[SW] HTML - Network success:', pathname);

					// Cache successful HTML responses for offline fallback
					if (response && response.status === 200) {
						const responseClone = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						});
					}

					return response;
				})
				.catch((error) => {
					console.log('[SW] HTML - Network failed, trying cache:', pathname);

					// Network failed: Try cached version
					return caches.match(request).then((cached) => {
						if (cached) {
							console.log('[SW] HTML - Returning cached (STALE!)');
							return cached;
						}

						// No cache: Try to return root as fallback
						console.log('[SW] HTML - No cache, trying root fallback');
						return caches.match('/').then((root) => {
							if (root) {
								return root;
							}

							// Last resort: Offline message
							return new Response(
								`
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline - Kosten-Tool</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f8fafc;
      color: #1e293b;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
    p { color: #64748b; }
    button {
      margin-top: 1.5rem;
      padding: 0.75rem 1.5rem;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📵</div>
    <h1>Keine Verbindung</h1>
    <p>Du bist offline. Bitte überprüfe deine Internetverbindung.</p>
    <button onclick="window.location.reload()">Erneut versuchen</button>
  </div>
</body>
</html>
								`,
								{
									headers: {
										'Content-Type': 'text/html; charset=utf-8'
									}
								}
							);
						});
					});
				})
		);
		return;
	}

	// ============================================================================
	// DEFAULT: Network-First (Don't cache unknown resources)
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
// MESSAGE: Handle messages from client (optional)
// ============================================================================

self.addEventListener('message', (event) => {
	console.log('[SW] Message received:', event.data);

	if (event.data === 'SKIP_WAITING') {
		// Allow client to force update (for future use)
		console.log('[SW] SKIP_WAITING requested by client');
		self.skipWaiting();
	}
});
