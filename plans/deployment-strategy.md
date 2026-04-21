# Deployment & Distribution Strategy

Target audience for this document: the team. Target audience for the _product_: non-technical parents of children aged 3–12 who just want a safe, easy way to give their kid access to the games on whatever device is nearby (phone, tablet, Chromebook, old laptop).

This document answers three questions:

1. How do we ship the **hub** (`platform/`) to production?
2. How do we ship **individual games** (`games/*`) without redeploying the whole hub for every game change?
3. How does a **non-technical user** actually get the thing onto their device?

Phase 6 of `development-plan.md` left the hosting platform "deferred — deployment platform not yet chosen". This document chooses it.

---

## 1. Summary of the plan

| Layer               | Choice                                            | Why                                                                                                                     |
| ------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Hosting             | **Cloudflare Pages**                              | Free tier fits a static PWA, global CDN, unlimited bandwidth, auto preview per PR, cheap custom domain.                 |
| Install format (v1) | **Installable PWA**                               | Zero-install UX for parents (tap "Add to Home Screen"), auto-update, works offline, one codebase for all OSes.          |
| Install format (v2) | **Capacitor** iOS / Android wrappers              | Adds App Store + Play Store presence, parental-controls integration, reviews, ratings — same web codebase.              |
| Install format (v3) | **Tauri** desktop wrappers                        | Small (~5–10 MB) signed installers for Windows / macOS when a school / family wants a real desktop app.                 |
| Game delivery       | Vite code-split chunks, cached per game by the SW | Each game loads on first play and then works offline. No per-game deploys needed — they ship with the hub.              |
| Versioning          | Changesets (already wired) + manifest `version`   | `changeset version` bumps shell and games; PWA autoUpdate SW pulls the new shell; game chunks rev via hashed filenames. |
| Release cadence     | Deploy on every merge to `main`; preview every PR | Short feedback loop without involving an app-store review cycle.                                                        |

Non-technical users only ever need to remember **one URL** (e.g. `play.kidsgameszone.com`). Everything else is one tap.

---

## 2. Why Cloudflare Pages (and not Vercel / Netlify)

All three work. Cloudflare wins on four small-but-real axes for this project:

- **Bandwidth.** Free plan is unmetered. The game bundles include audio (`mp3`) and image (`webp`) assets; Netlify charges on bandwidth past 100 GB/mo, Vercel has a similar cap on hobby.
- **Workers compatibility.** If we ever add a tiny server function (e.g. a signed upload URL for user-generated content), Cloudflare Workers are already in the same control plane — no second vendor.
- **Latency.** Cloudflare's edge is closer to African / Asian users than Vercel's default regions, which matters given the target audience.
- **COPPA / privacy posture.** Fewer third-party cookies/logs by default than Vercel Analytics.

If the team already has Vercel or Netlify accounts, the migration cost is a different `deploy.yml` — the rest of this plan is identical.

---

## 3. CI/CD pipeline

```
  PR opened           → CI (lint, typecheck, test, build, size-limit, Lighthouse, E2E, a11y) → Preview deploy (Cloudflare) → Preview URL comment on PR
  PR merged to main   → CI → Production deploy → purge old SW / roll out autoUpdate manifest
  Tag (changeset rel) → Optional: build Capacitor / Tauri artifacts, upload to GitHub Releases / TestFlight / Play Internal Testing
```

### Files changed / added in this round

- `.github/workflows/deploy.yml` — new. Builds `platform/` and deploys via `cloudflare/pages-action@v1`. Runs on push to `main` (production) and on every PR (preview). Needs two repo secrets:
  - `CLOUDFLARE_API_TOKEN` — scoped to "Pages:Edit" on this account.
  - `CLOUDFLARE_ACCOUNT_ID`.
- `.github/workflows/ci.yml` — unchanged in this round; already handles lint / typecheck / tests / E2E / a11y / bundle-size / Lighthouse.

### Branch protection

- Require `CI / lint-and-test`, `CI / e2e`, `CI / a11y` before merge to `main`.
- `deploy.yml` runs independently of `ci.yml` for preview deploys (so parents / designers can click a preview even while E2E is still running). Production deploy in `deploy.yml` is gated on `main` — if CI fails on `main`, revert, don't hotfix forward.

---

## 4. PWA configuration (already wired)

`platform/vite.config.ts` already sets up `vite-plugin-pwa` with:

- `registerType: 'autoUpdate'` — new shell versions install silently on next app open.
- Precache glob covering `js/css/html/svg/ico/png` — the app shell.
- Runtime caching:
  - `CacheFirst` for `woff2` + `mp3` (fonts, audio), 1200 entries, 1-year expiry.
  - `CacheFirst` for `webp` (images), 400 entries, 1-year expiry.
- Manifest with 192 / 512 / maskable icons (present in `platform/public/`), `display: standalone`, brand colours, `start_url: /`.

**Open polish items** (tracked but out of scope for this PR):

- Install-prompt UI: currently the browser decides when to surface "Install". We can add a small "Install on this device" button in the hub footer that calls the cached `beforeinstallprompt` event. Non-critical.
- "New version ready" toast: `autoUpdate` currently ships silently. For a kids app this is fine — no action needed from parents — but we may want a changelog toast for active users.
- iOS nit: `display-mode: standalone` works on iOS but icon sizes need `apple-touch-icon.png` at 180×180. We already ship `apple-touch-icon.png`; verify the size.

---

## 5. Game-level distribution

The plugin architecture (`GamePlugin` / `GameManifest` + `React.lazy`) already gives us per-game code splitting for free. The deploy story is therefore simple:

- **Games ship with the hub.** One Cloudflare Pages deploy per merged PR — shell and all game bundles together.
- **Each game is its own Vite chunk** with a content-hashed filename (`math-adventure-abc123.js`). The SW serves them `CacheFirst`, so after a child opens a game once it's fully offline.
- **When a game updates**, its chunk filename changes → the SW fetches the new one next time the child opens that game; the old chunk is evicted by the Workbox expiration policy.
- **The `GameManifest.version` field** is used by the hub UI ("Math Adventure — v1.4 — new!" ribbon) but does not drive the deploy itself.

We do **not** need separate deploys per game. The phrase "independently deployable" in `games-zone-requirements.md §10` is satisfied by the code-split + hashed-filename model — a bug fix in `spelling-bee` only invalidates the `spelling-bee-*.js` cache entry, not the whole hub.

### If we ever want truly independent game deploys

(Not recommended for v1, but documented so we don't repaint the bike shed later.)

- Host the hub on `play.kidsgameszone.com` and each game's built chunk at `games.kidsgameszone.com/<slug>/<version>/index.js`.
- Hub fetches a `games.json` registry at boot (hosted on Cloudflare KV or a static JSON with `Cache-Control: max-age=60`).
- Each game repo gets its own GitHub Action that publishes to `games.<domain>/<slug>/<version>/`.
- Cost: CORS setup, registry drift, SW precache becomes harder, worse offline story.
- Benefit: only if games are contributed by external developers who should not have write access to the hub. Not our current situation.

---

## 6. Getting it onto a non-technical user's device

Everything below is designed so the parent only has to do one thing: **open a URL**.

### 6.1 The URL

- Production: `https://play.kidsgameszone.com` (register + point CNAME to Cloudflare Pages).
- Share it via QR code on a printed card / website hero — a QR is the friction-free entry point on phones and tablets.

### 6.2 Install flow — by device

| Device                        | Parent taps                                 | Result                                               |
| ----------------------------- | ------------------------------------------- | ---------------------------------------------------- |
| Android (Chrome)              | "Install app" banner or ⋮ → _Install app_   | Real icon, opens fullscreen, works offline           |
| iOS / iPadOS (Safari)         | Share → _Add to Home Screen_                | Icon, fullscreen, works offline                      |
| ChromeOS (Chrome)             | Omnibox install button (⊕) or ⋮ → _Install_ | Shelf icon, window mode                              |
| macOS / Windows (Chrome/Edge) | Omnibox install button (⊕)                  | Standalone window, launchable from dock / start menu |

For each of those, **our job** is to make sure the install prompt surfaces at a sensible moment. v1: rely on the browser heuristics (user interacts twice → browser shows banner). v2: add an explicit "Install" CTA on the home screen.

### 6.3 App-store paths (later phases)

- **Google Play / App Store** via **Capacitor**. Capacitor wraps the Vite build output; we get native wrapping, push notifications if we ever want them, and crucially the **"Designed for Families"** / **"Made for Kids"** program badges that parents look for.
- **Windows / macOS** via **Tauri**. Signed installers, autoupdate via Tauri's updater, distribute via the project website or Microsoft Store.
- **Why after PWA, not instead:** shipping to an app store means review cycles (2–7 days), cert renewals, per-platform icons and screenshots, and paid developer accounts. The PWA gets us 95% of the value in 0% of the overhead.

### 6.4 Parent-facing install instructions

Ship a short, illustrated "How to install" page in the app (behind a `/install` route), three steps per platform with screenshots. Link to it from the hub footer and from the parent dashboard. This single page resolves ~90% of support questions.

### 6.5 Offline guarantee

The whole value proposition for many parents ("can my kid use it on the plane / in the car / without unsupervised internet?") depends on offline working. Acceptance test:

1. Load the hub online.
2. Open each game once (so its chunk is cached).
3. Turn off wifi and airplane-mode the device.
4. Every game must still launch, play, record progress, and show rewards.

This is already covered by the E2E "offline flow" test in `development-plan.md §6A` — continue to run it on every PR.

---

## 7. Versioning and release cadence

- **Hub shell:** Semver, one version per production deploy, driven by `changesets`. Shown in the parent dashboard as `Platform v1.4.2`.
- **Games:** Semver in each game's `package.json` + mirrored in its `GameManifest.version`. Bumped via `changesets` when the game changes.
- **No coordinated "release trains".** Merge, CI goes green, Cloudflare deploys. The autoUpdate SW picks it up on the user's next open.
- **Rollback:** `wrangler pages deployment rollback <id>` (or the Cloudflare dashboard button). Fast and safe because the build artifact is already there — no rebuild needed.

---

## 8. Observability

All of this stays COPPA-clean (no per-user server logs):

- **Cloudflare Web Analytics** — privacy-friendly, no cookies, no fingerprinting, pageview + geography only. Off by default; turn on if useful.
- **Error log stays local** (as spec'd in `technical-specs.md §10.4`) — surfaced in parent dashboard.
- **Uptime** — Cloudflare's status page is sufficient for a static site.
- **Performance** — Lighthouse CI already on every PR in `ci.yml`.

---

## 9. Phased rollout

Ordered from "most value per hour spent" to "optional future work":

1. **This PR** — Cloudflare Pages workflow + this strategy doc. `main` merges now auto-deploy to production; PRs get a preview URL comment.
2. **Next** — register a domain, point it at Cloudflare Pages, share the URL with first beta parents.
3. **Then** — add an explicit "Install" CTA + an `/install` help page with per-device screenshots.
4. **When we have signups** — turn on Cloudflare Web Analytics to confirm the install funnel works.
5. **When PWA ceiling hit** — wrap with Capacitor for Play Store, then App Store. (Expect ~2 weeks each the first time; much less on subsequent releases.)
6. **When a school / family asks** — Tauri desktop installer. (Expect ~1 week the first time.)

---

## 10. What we are explicitly **not** doing (and why)

- **No Electron.** Tauri gives us the same outcome at ~1/10 the binary size and with better sandboxing — important for a kids app.
- **No React Native rewrite.** Our game runtime is the DOM; porting `framer-motion`, `howler`, and the CSS module setup to RN would be a full rewrite of `shared/` and every game.
- **No per-game repos / per-game deploys.** Already explained in §5. Adds CORS, registry drift, and worse offline for zero current benefit.
- **No server.** Every time we consider one, the COPPA / privacy review gets more expensive. The moment we need multi-device sync or leaderboards, revisit — but default is no.
- **No third-party analytics SDKs** (GA, Segment, Mixpanel). COPPA non-starter.

---

## Related documents

- `plans/games-zone-requirements.md §10` — high-level deployment requirements.
- `plans/technical-specs.md §10` — pipeline spec and content-review workflow.
- `plans/development-plan.md` Phase 6 — testing + CI/CD history; this doc closes out the "deferred — deployment platform not yet chosen" checkboxes.
- `GAME_DEVELOPER_GUIDE.md` — per-game development workflow (unchanged by this doc).
