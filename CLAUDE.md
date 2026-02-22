# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build + type check
npm run lint     # ESLint
npx tsc --noEmit # Type check only (faster than build)
```

There are no tests currently. Always run `npx tsc --noEmit` after changes to verify types.

## Architecture

**GitSpace** transforms a GitHub profile into an interactive 3D solar system. The user's repos become planets orbiting a star.

### Data Flow

```
SearchBar → GET /api/github/:username
  → fetchUser + fetchRepos (parallel)
  → fetchLanguages per repo (Promise.allSettled, capped at 30)
  → buildSolarSystem()          ← pure domain mapping
  → SolarSystemView (R3F scene)
  → upsertEntry() [fire-and-forget] → data/galaxy.json
```

**`GET /api/galaxy`** reads `data/galaxy.json` and returns all previously searched users for the Galaxy View.

### Layer Map

| Layer | Files | Role |
|---|---|---|
| Types | `src/types/index.ts` | All domain types: `Star`, `Planet`, `SolarSystem`, `GalaxyEntry` |
| GitHub client | `src/lib/githubClient.ts` | Fetch wrappers, 5-min revalidate, throws `"NOT_FOUND"` / `"RATE_LIMIT"` |
| Domain mapping | `src/lib/planetMapper.ts` | `buildSolarSystem()` — all visual rules live here |
| Colors | `src/lib/languageColors.ts` | Language → hex map. C is `#ffffff` |
| Galaxy store | `src/lib/galaxyStore.ts` | File-based persistence with in-memory write lock + atomic rename |
| Galaxy layout | `src/lib/galaxyLayout.ts` | Fermat spiral: `computeGalaxyLayout(count, spread)` |
| API routes | `src/app/api/` | `github/[username]` (main fetch) and `galaxy` (read store) |
| Page state | `src/app/page.tsx` | Union state: `"galaxy"` ↔ `"loading-solar"` ↔ `"solar"` |
| 3D solar view | `src/components/solar/SolarSystemView.tsx` | Full R3F scene, ~970 lines |
| 3D galaxy view | `src/components/galaxy/GalaxyView.tsx` | Mini systems, dynamically imported (SSR=false) |

### Key Visual Rules (in `planetMapper.ts`)

- **Planet type:** `icy` = 0 stars + 0 activity; `gaseous` = stars/activity > 3; `rocky` = otherwise
- **Ring:** `stargazers_count ≥ 50`
- **Moon:** `forks_count ≥ 10`
- **Activity score:** recency × 0.7 + log(size) × 0.3 — used for orbit speed and brightness
- **Orbit radius:** `6 + index × 2.2` (deterministic, Kepler speed: `4.0 / r^1.5`)
- **Axial tilt:** `(planet.id × 1.618) % 1 × 0.6 rad` — deterministic from repo ID

### Important Conventions

- **Deterministic seeding:** All "random" visuals are seeded from `planet.id` or `repo.id` so the same profile always renders identically.
- **Emissive luminance correction:** `emissiveForColor(hex, base)` in `SolarSystemView.tsx` scales emissive intensity inversely to perceived luminance so white (`#ffffff`, used for C language) doesn't over-bloom.
- **`THREE.Line` in JSX:** Use `<primitive object={new THREE.Line(...)} />` — never `<line>` (conflicts with SVG).
- **Galaxy store writes are fire-and-forget** in the API route — failures are logged but never break the response.
- **`GalaxyView` is `dynamic(..., { ssr: false })`** — R3F canvas cannot SSR.
- **Design tokens:** cyan `#00e5ff` for all accents; `--font-mono` and `--font-display` CSS variables; dark glass panels with `backdropFilter: blur`.
- **Easter egg:** `8bury` and `ju-caju` always appear adjacent in the galaxy (fixed positions `_PA`/`_PB` in `GalaxyView.tsx`) with a faint pink bond line between them.

### Galaxy Store

- File: `data/galaxy.json` (gitignored, auto-created)
- Written atomically: `galaxy.json.tmp` → rename
- In-memory `writeLock` (Promise chain) serializes concurrent writes within the Node process
- `GalaxyEntry` includes `bio?` (optional — missing in entries saved before bio was added)
