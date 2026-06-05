---

# Session-Handoff — 2026-06-05

## Projekt

**finanz-app (MyIYKYK)** — `projekte/finanz-app/`, geklont aus `github.com/chkie/MyIYKYK`. Persönliche Paar-Finanz-PWA (SvelteKit 2 / Svelte 5 / Tailwind 4 / Supabase). **Zielplattform präzisiert (Owner 2026-06-04):** iOS-Safari primär (Owner + Freundin, sonst niemand); Chrome/Desktop dürfen mitoptimiert sein; **nur echt Android-OS-spezifische Dinge sind irrelevant** (maskable Home-Screen-Icon, Android-PWA-Install-Polish). Verankert in Memory `finanz-app-projekt`.

## Aktueller Task

**Native-Feel-Optimierung — ABGESCHLOSSEN.** Der 8-Batch-Master-Plan (`docs/superpowers/plans/2026-06-04-native-feel-optimization.md`) ist **vollständig: Batch 0–8 alle ✅, verifiziert, committed.** Diese Session = Batch 7 (Font-Diät & Build-Config) + Batch 8 (Hygiene & Svelte-5-Idiom).

## Fortschritt

**Diese Session abgeschlossen (Branch `feat/native-feel-fonts-build`, 7 atomare Commits):**

**Batch 7 — Font-Diät & Build-Config (3 Commits `3a2d2dc`/`f462d11`/`f57dad6`):**
- **7.4** `vite.config.ts`: toten `vendor-fonts`-manualChunks-Branch (`@fontsource` ist CSS) + ignorierte `chunkFileNames`/`assetFileNames` entfernt.
- **7.1/7.2** `src/routes/layout.css`: `@import .../inter|geist/wght.css` (je 7 Subsets) → eigene `@font-face` **latin-only** (unicode-range verbatim aus fontsource). Geist behalten (Owner-Entscheid). **woff2 10 → 2.**
- **7.3** `src/hooks.server.ts`: Font-Preload via SvelteKit-`resolve`-Hook (`preload: type==='font'`) an beiden resolve-Calls — gehashte Pfade automatisch. NICHT hartkodiert in app.html.

**Batch 8 — Hygiene & Svelte-5-Idiom (4 Commits `63bdc35`/`b4e3138`/`92acb10`/`c71df83`):**
- **8.1/8.2** `+layout.svelte`: `$app/stores`→`$app/state` (`$page.url.pathname`→`page.url.pathname`, `$navigating`→`navigating.to`); Debug-`$effect` (Konsolen-Spam) entfernt.
- **8.4** `profile.svelte.ts`: `isInitialized` von sofort-`true`(const) auf `$state(false)` + erst nach localStorage-Read `true` (FOUC-defensiv).
- **8.3** `BootScreen.svelte` + `BootScreen.spec.ts` gelöscht (toter Code; echter Boot-Screen inline in app.html; Spec war Source-Verification).
- **8.5/8.6/8.7** `svelte.config.js`+deps: adapter-auto→**adapter-vercel** (`runtime: 'nodejs22.x'`); mdsvex + @tailwindcss/typography (beide unbenutzt) entfernt.

**Stand:** Alle Gates grün: `check` 0/0 · ESLint clean · **Vitest 98 pass / 2 skip** (−7 = BootScreen-Suite weg) · `build` grün mit adapter-vercel. Live (Playwright 390px, Dev 4399): Home/Header/BottomNav unverändert, Inter+Geist laden (latin), „Übersicht"(ü) in Geist, nav-progress korrekt idle-absent, kein Debug-Spam, **0 Konsolen-Errors** (nur bekannte apple-meta-Deprecation). SSR-Bundle-Evidenz: Font-Preload-Codepfad vorhanden → echter Vercel-Server emittiert `<link rel="preload" as="font">`.

**Offen:** Master-Plan ist leer — neuer Workstream nötig (s. Nächster Schritt).

## Entscheidungen dieser Session

- **Geist-Font behalten + preloaden** (Owner-Entscheid 2026-06-04). latin-`@font-face` + Hook-Preload.
- **Maskable Icon ersatzlos gestrichen** — iPhone-only-Nutzung; iOS verwendet nur das vorhandene `apple-touch-icon`. Batch 2.2 obsolet. (Owner-Klärung: maskable ist reines Android-OS-Konzept.)
- **adapter-vercel mit `runtime: 'nodejs22.x'` explizit gepinnt** — lokales Node v26 wird sonst nicht auf eine Vercel-Runtime gemappt → Build-Fail. 22.x = aktueller Vercel-LTS. Case-C-Config, reversibel. → LL im Handbuch `10-deploy-ops/01`.
- **Font-Preload via resolve-Hook statt app.html-Hardcode** — gehashte woff2-Pfade brechen sonst bei jedem Font-Hash. Idiomatischer SvelteKit-Weg.
- **`$navigating`→`navigating.to`** (nicht bloß `$`-strip) — `$app/state`-`navigating` ist immer truthy; `.to` ist die idle-null-Property. → Subtilität im Handbuch `02-svelte-core/03` verankert.
- **Inline-Implementation + Self-Review** für beide Batches (Config/CSS/Hook/Idiom, Pattern wie Batch 4/5/6). Two-Stage entfiel bewusst (kein neuer kreativer Content).

## Geänderte / relevante Dateien

- `src/routes/layout.css` — Inter+Geist latin-only `@font-face`.
- `src/hooks.server.ts` — Font-Preload-`opts` an beiden resolve-Calls.
- `vite.config.ts` — manualChunks vereinfacht, Output-Overrides raus.
- `src/routes/+layout.svelte` — `$app/state` + Debug-`$effect` raus.
- `src/lib/stores/profile.svelte.ts` — `isInitialized`-Timing.
- `svelte.config.js` — adapter-vercel + runtime, mdsvex raus.
- `package.json`/`package-lock.json` — Deps (adapter-vercel rein; adapter-auto/mdsvex/typography raus).
- gelöscht: `src/lib/components/BootScreen.svelte` + `.spec.ts`.
- Handbuch (Workspace): `10-deploy-ops/01-adapter-auto-vercel.md` (Node-26-LL), `02-svelte-core/03-stores-legacy-vs-runes.md` ($app/state-Korrektur).
- Pläne (gitignored, lokal): Master-Plan auf Batch 7+8 ✅; `docs/superpowers/plans/2026-06-04-batch7-fonts-build.md` + `2026-06-05-batch8-hygiene-idiom.md` (neu).

## Offene Fragen / Blocker

**Bekannter Blocker (vorbestehend, kein Regress aus dieser Session):**
- `e2e/forms-no-reload.spec.ts` — 6 Tests rot, weil `beforeEach` nur `goto('/')` ohne Login → `hooks.server.ts` redirected auf `/login`. Strukturell vorbestehend. Vitest (98) + alle eigenen Gates grün. Fix separat (Login-Step in beforeEach ODER `.skip`) — gehört nicht in den abgeschlossenen Native-Feel-Plan. Details NOTES.md §Bekannt-rote E2E.

Keine Owner-Liefer-/Freigabe-Blocker offen (alle 3 zurückgestellten Case-A-Punkte diese Session aufgelöst).

## Nächster Schritt

**Neuen Workstream festlegen:** Der Native-Feel-Plan ist vollständig abgearbeitet. Nächste Session beginnt mit dem **vorbestehenden E2E-Blocker `e2e/forms-no-reload.spec.ts`** — Login-Step in `beforeEach` ergänzen (analog der funktionierenden E2E-Specs, die sich einloggen), sodass die 6 Tests grün laufen statt auf `/login` zu redirecten. Das ist der einzige offene rote Punkt im Projekt und ein abgeschlossener, testbarer Scope. Branch `fix/e2e-forms-login-beforeeach` aus `develop`.

## Zusatzkontext

- **Branch-Workflow (Owner-Override, Memory `branch-workflow-myiykyk`):** Feature aus `develop` → zurück nach `develop`, `git push origin develop` (`develop` trackt `origin/develop`, deployt NICHT). `develop`→`main` NUR bei Release (Owner-gated). Diese Session wird zu **`develop`** gemergt — die generische session-save-Auto-Merge-zu-`main`-Direktive ist hier außer Kraft.
- **Backlog (1-Zeiler, nicht eingebaut):** `<meta name="mobile-web-app-capable" content="yes">` in `src/app.html` ergänzen → schließt die Chrome-Deprecation-Warnung (apple-Tag für iOS behalten). Einziger verbleibender Konsolen-Hinweis.
- **Backlog:** Dev-only Debug-Reset-Button (`+layout.svelte` ~Z.205, `{#if browser && dev}`) ist weiterhin drin — war nicht im Batch-8-Scope. Vor finalem Release evtl. raus.
- **`invalidate('app:month')`-Konvention (Batch 6):** jeder Mutations-Handler `await update({ invalidateAll: false }); await invalidate('app:month')`. Ausnahmen: PullToRefresh + Profil-Wechsel.
- **`askConfirm`-Pattern (Batch 5):** `import { askConfirm } from '$lib/utils/confirm.svelte.js'`, nie `window.confirm()`.
- **Svelte-5-Gesten (LL-2026-06-04-01):** `e.preventDefault()` in passiven Touch-Listenern ist No-op; Gesten via `touch-action`.
- **`$app/state`-Idiom (NEU, Handbuch-verankert):** neuer Komponenten-Code nutzt `$app/state` (nicht deprecated `$app/stores`); `navigating.to` für Idle-Check, nicht `navigating`.
- **Token-Budget (Memory `session-token-budget`):** max 600k/Session.
- **Dev-Server:** `cd projekte/finanz-app && npm run dev -- --port 4399 --strictPort --host 127.0.0.1`. `.env` gesetzt. Playwright-MCP-Profil hat Auth-Cookie persistiert (Login oft übersprungen). Bei „Browser already in use": stale `SingletonLock` im `mcp-chrome-*`-Profil löschen + ggf. `pkill -f mcp-chrome-<id>`. **cwd-Falle:** Workspace-Root ist KEIN Git-Repo; Projekt liegt unter `projekte/finanz-app/` — Bash-Befehle mit `cd .../projekte/finanz-app &&` oder absoluten Pfaden, cwd resettet sonst auf den Root.
- **`screenshots/` + `docs/superpowers/` + Meta-Doku** via `.git/info/exclude` lokal ausgeschlossen — nie nach MyIYKYK-Remote pushen.

---
