# CLAUDE.md

This repository's agent instructions live in **[AGENTS.md](AGENTS.md)** — read it
first; it is short and everything below is a summary of it.

Essentials:

- The dashboard is a React + TypeScript + Vite app for Home Assistant.
- `@data` selects the data layer: `src/data/mock.tsx` (demo, `--mode mock`) or
  `src/data/real.tsx` (real Home Assistant, official WebSocket client).
- `@config` selects the configuration: `src/config.local.ts` (local, **ignored
  by git**) if present, otherwise `src/config.example.ts`. All entity ids, room
  names, first name and city live there and nowhere else.
- Verify any change with `npm run build` (runs `tsc`), `npm run build:mock` and
  `npm run capture` (Playwright, checks the console too).
- Never commit a token, a password, a private host name or `src/config.local.ts`:
  `/config/www` is served without authentication.
- Do not redesign the UI while adapting it, and do not add dependencies without
  a real reason (versions are pinned).
- Adaptation checklist: **[docs/ADAPTER.md](docs/ADAPTER.md)**.
