# AGENTS.md — ha-dash

Instructions for AI agents (and humans) working in this repository. Read this
first: it is the entry point for adapting the dashboard to a home.

## What this is

A React + TypeScript single-page dashboard for **Home Assistant**, built with
Vite. Five pages — Accueil, Chauffage, Volets, Climat, Prières — share one
design system. Built output is a plain static folder (`dist/`) that Home
Assistant serves from `/config/www/`, either as a sidebar panel or inside an
iframe card.

Stack: React 19, TypeScript, Vite, `react-router-dom` (HashRouter),
`lucide-react` for icons, `home-assistant-js-websocket` (the official Home
Assistant client), plain CSS. No UI framework, no CSS-in-JS, no state library.

## Source layout

    src/
      config.example.ts   neutral example configuration + the MaisonConfig type
      config.local.ts     real configuration — LOCAL FILE, ignored by git
      data/
        types.ts          shared contract: Ent, Point, Call
        real.tsx          real Home Assistant connection
        mock.tsx          simulated data for the demo (no Home Assistant)
      ui/                 Layout, Dial, Shutter, Spark, Charts, SunArc, Sky, Sheet…
      pages/              Home, Heating, Shutters, Climate, Prayers
      styles.css          design system (CSS variables + bundled fonts)
      util.ts             dates, French formatting, rounding

## Two aliases do all the wiring

- **`@data`** → `src/data/real.tsx` normally, `src/data/mock.tsx` with `--mode
  mock`. Both export exactly the same API: `Connection`, `useEnt(id)`,
  `useCall()`, `useHist(ids, hours)`. Pages and UI components must never import
  `home-assistant-js-websocket` (or any Home Assistant library) directly: they
  import `@data` and `src/data/types.ts` only.
- **`@config`** → `src/config.local.ts` if that file exists, otherwise
  `src/config.example.ts`. Every entity id, room, name and city comes from
  there. `config.local.ts` is typed with `MaisonConfig` (exported by the
  example), so `npm run build` fails if a field is missing or mistyped.

Authentication: when the dashboard runs inside Home Assistant (same-origin
iframe, see `public/panel.js`) it inherits the existing session; otherwise it
uses a long-lived token from the build, then saved browser tokens, then Home
Assistant's login form. See `ouvrirConnexion()` in `src/data/real.tsx`.

## Working without Home Assistant

    npm ci
    npm run dev:mock        # http://localhost:5173/ — simulated data
    npm run build           # tsc --noEmit + vite build          (real data layer)
    npm run build:mock      # bundle for the online demo         (mock data layer)
    npm run capture         # Playwright screenshots + console error check

`npm run capture` needs the dev server running. Useful options:
`--sortie DIR`, `--heure HH:MM`, `--heures 03:00,07:50,12:00,18:44,21:00`
(home page at each sky phase), `--pages accueil,climat`, `--url URL`.
It exits non-zero if a page fails to render or the console logs an error, so it
works as a smoke test after any change. `CHROME_PATH` selects the browser
(default `/usr/bin/google-chrome`).

## Rules

- **Never put a token, password, private address or domain in a versioned
  file.** `/config/www` is served **without authentication**: anything in the
  published bundle is public. `scripts/deploy.sh` forces `VITE_HA_URL` and
  `VITE_HA_TOKEN` to empty and refuses to publish if a JWT is found in `dist/`.
- **Never commit `src/config.local.ts`, `.env*` or a real host name.** The
  repository ships `src/config.example.ts` only.
- **Do not add a dependency without a real reason**, and pin exact versions (no
  `^`/`~`). Updates come monthly through Dependabot, validated by CI.
- **`npm run build` must pass** — it runs `tsc`, which is the gate for the
  configuration type as well as the code.
- **Never call the REST history API** (`/api/history/period`) from the
  dashboard: an unauthenticated request counts as a login attempt in Home
  Assistant and a handful of them ban the client IP. History uses the
  WebSocket stream (`history/stream`) in `useHist`.
- Keep the code style of the existing files (French comments, English
  identifiers are both fine; the UI text is French).

## The design system ("nuit zellige")

One dark palette, defined once in `src/styles.css`: `--ink #0a0e1b`, `--night
#141a2e` (deep night blue), `--brass #f2b441` (warm brass accent), `--ember
#ff7a45`, semantic `--ok/--warn/--bad`, rounded 26px surfaces, Fraunces
(display) + Manrope (body) bundled locally through `@fontsource-variable`.

**When adapting the dashboard, do not redesign it.** Change entity ids, room
names and text through `src/config.local.ts`; leave colours, spacing, typography
and layout alone. The dynamic sky (`src/ui/Sky.tsx`) and the sun arc
(`src/ui/SunArc.tsx`) are driven by the prayer times, so they keep working with
any prayer sensor you provide.

## Installation-specific things

Everything that depends on one particular home is listed, with what to replace
or remove, in **[docs/ADAPTER.md](docs/ADAPTER.md)**: first name and city, rooms
and their sensors, covers, heating (boiler + thermostat orchestration), prayer
time source (and how to drop the Prières page), weather entity, deployment
target, Home Assistant panel registration.
