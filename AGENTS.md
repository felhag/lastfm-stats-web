# AGENTS.md

Guidance for AI agents working in this repository. Humans, see `README.md`.

## What this project is

An Angular app that renders extra statistics on top of a user's listening history. There are two deployable apps that share the bulk of the code:

- **lastfm-stats** — live at https://lastfmstats.com, sources data from the last.fm API.
- **spotify-stats** — deployed to https://spotifystats.app. Built from this repo; the `felhag/spotify-stats-web` repo exists only to host the `gh-pages` branch and custom domain (GitHub Pages is one custom domain per repo). Its `master` branch is unused.

Keep the two apps as similar as possible. Real differences (so far): the noun used in the UI (`scrobbles` vs `plays`) and how data is imported (last.fm paginates over its API; Spotify loads everything at once from a user-supplied zip).

## Repo layout

```
projects/
  shared/         Angular library — most code lives here
    src/lib/
      app/        AppComponent, root model.ts (Scrobble, TempStats, Artist, …)
      service/    StatsBuilderService, ScrobbleStore, DatabaseService, ExportService, SettingsService, …
      charts/     Highcharts wrappers (race chart, timeline, scatter, wordcloud, …)
      lists/      Per-tab list components (artist/album/track/scrobble)
      dataset/    Dataset tab + modal
      stats/      Stats shell component (tabs)
      general/    General overview tab
      enrichment/ MusicBrainz / last.fm artist info enrichment
      …
  lastfm-stats/   Thin wrapper: home page, ScrobbleRetrieverService (last.fm API), URL service
  spotify-stats/  Thin wrapper: home page (zip parsing), SpotifyItemService, URL service
```

Each app is bootstrapped in `projects/<app>/src/main.ts`. The wiring there is what defines the differences between the apps — see "App differences" below.

## The `TempStats` model

Everything downstream of data loading is fed by a single `TempStats` object (`projects/shared/src/lib/app/model.ts`). Scrobbles are streamed into `StatsBuilderService` (`projects/shared/src/lib/service/stats-builder.service.ts`), which walks them once and accumulates streaks, per-month buckets, hour/day/year histograms, seen artists/albums/tracks, milestones, etc.

**Performance matters here.** A large profile can be hundreds of thousands of scrobbles. The builder is hot path:

- Avoid allocating per scrobble. Mutate the accumulator, don't rebuild it.
- Don't introduce per-scrobble RxJS pipelines, deep clones, or `Object.entries`/`Object.values` traversals over `seenArtists`-sized maps inside the loop.
- The builder runs in two modes (see `tempStats` setup): incremental (`autoUpdate` on — `scan` over chunks, accumulator reused) and full rebuild (settings changed, or load completed with `autoUpdate` off — starts from `emptyStats()`). Changes must keep both modes correct.
- Downstream lists/charts subscribe to `tempStats` and derive their own views; don't push view-specific data into `TempStats` if it can be computed downstream cheaply.

If you're tempted to add a field to `TempStats`, first check whether the same value can be computed lazily by a single list or chart component. Adding to `TempStats` costs every user on every rebuild.

## App differences and the `translate` pipe

The user-facing noun (`scrobble` vs `play`) is **never hardcoded** in shared code. Use the `translate` pipe / `TranslatePipe` (`projects/shared/src/lib/service/translate.pipe.ts`). Keys today: `scrobble` / `scrobbles` / `scrobbled` — bound to `play` / `plays` / `played` in spotify-stats. Bindings are set up in each app's `main.ts` via `Shared.translationsProvider(...)`.

When adding new shared UI strings, decide:

- Same word in both apps → hardcode it.
- Different word → add a translation key, wire it in both `main.ts` files, and use the pipe.

The scrobbles tab is also routed under a different path in each app: `scrobbles` for last.fm, `plays` for spotify. This is passed into `Shared.routerProvider(...)` from `main.ts`.

Other DI knobs set per app in `main.ts`:

- `AbstractItemRetriever` — `ScrobbleRetrieverService` (paginates the last.fm API) vs `SpotifyItemService` (hands off pre-imported scrobbles from the home page's zip parser).
- `AbstractUrlService` — builds external links to artist/album/track pages on last.fm or Spotify.
- `App` enum token — used by `DatabaseService` to pick the IndexedDB name (`lastfmstats` vs `spotifystats`) and by anything else that needs to branch on platform.

If you need to branch on app, prefer injecting `App` or one of these abstract services over duplicating components.

## Data import / export (mostly last.fm)

Last.fm's API is slow for large profiles, so caching the data client-side is a first-class feature:

- `ExportService` (`projects/shared/src/lib/service/export-service.ts`) — JSON and CSV export.
- `DatabaseService` (`projects/shared/src/lib/service/database.service.ts`) — IndexedDB via Dexie. Scrobbles plus `ArtistInfo` enrichment are persisted per user; on revisit they load instantly and only the delta is fetched from the API.
- `ScrobbleImporter` (`projects/shared/src/lib/service/scrobble-importer.service.ts`) — bridges the home page's parsed scrobbles into the stats flow.

Spotify only uses the importer + IndexedDB; there is no incremental API fetch because Spotify provides all the data in the export zip up front. Both `StreamingHistoryEntry` (old format) and `EndSongEntry` (extended history) are parsed in the spotify home component.

When touching import/export, the `Export` shape in `model.ts` is the on-disk contract — changing it breaks users' saved files.

## Tooling

- Package manager: **pnpm**. Don't generate `package-lock.json` or `yarn.lock`.
- Framework: Angular (currently 21), standalone components, `OnPush` change detection where present.
- State: `@ngrx/component-store` for the scrobble store; RxJS elsewhere.
- Charts: Highcharts via `highcharts-angular`.
- Persistence: Dexie (IndexedDB).

Common commands:

```bash
pnpm install
ng serve lastfm-stats          # http://localhost:4200
ng serve spotify-stats         # http://localhost:4200 (or 4201 with the script)
pnpm run both                  # serves both: lastfm on 4200, spotify on 4201
ng build --project lastfm-stats
ng lint
pnpm exec playwright test      # e2e in projects-root /e2e
```

In development, last.fm uses `MockRetrieverService` instead of hitting the real API — see the `useFactory` in `lastfm-stats/src/main.ts`. There's a checked-in `lastfmstats-TestUser.json` for the test user.

## Deployment

GitHub Actions:

- `.github/workflows/main.yml` — CI build on every push. Matrix builds both `lastfm-stats` and `spotify-stats`, uploads artifacts `build-lastfm-stats` and `build-spotify-stats`.
- `.github/workflows/deploy.yml` — runs on tag push. Reuses `main.yml` to produce both artifacts, then fans out into two deploy jobs:
  - `deploy-lastfm` → this repo's `gh-pages/docs/` (uses `GITHUB_TOKEN`).
  - `deploy-spotify` → `felhag/spotify-stats-web`'s `gh-pages/docs/` via `JamesIves/github-pages-deploy-action` with `repository-name` + `secrets.SPOTIFY_DEPLOY_PAT` (a fine-grained PAT with `contents: write` on the spotify repo). GitHub Pages on that repo picks up the commit and ships spotifystats.app.
  - The 404 page is just a copy of `index.html` so the SPA router handles deep links.
- `.github/workflows/playwright.yml` — e2e on every push.

One tag here deploys both apps; **do not** push commits to `felhag/spotify-stats-web`'s `master`. The matrix artifact names (`build-<project>`) and the `download-artifact` names in `deploy.yml` must stay in sync with the Angular project names in `angular.json`.

## Conventions

- Imports of shared code typically look like `projects/shared/src/lib/...` or relative `../../shared/src/lib/...`. Either is accepted in the codebase; match what surrounding files do.
- Components are standalone; declare imports in the `@Component` metadata.
- Tab styling and shared utilities live in `projects/shared/src/lib/shared-styles.scss`.
- Don't write tests just for the sake of coverage — there's no unit test suite here, only Playwright e2e. Verify behavior by running the dev server.

## When in doubt

- A change that touches `TempStats` or `StatsBuilderService` → check performance with a large profile.
- A change to the UI → if the wording mentions scrobbles/plays, use the `translate` pipe.
- A change to import/export formats → it's a user data contract.
- A change that should affect both apps → make it in `projects/shared`. Both apps build and deploy from this repo, so wrapper drift just means duplicated code, not merge pain.
