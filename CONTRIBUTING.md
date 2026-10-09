# Contributing

This is a personal project shared as is, so there is no roadmap, no support and
no guarantee that a feature request or an issue will be answered.

What is genuinely useful:

- **A bug report with the steps to reproduce it**, the browser you used, and what
  the console said (`npm run capture` fails loudly on console errors, which helps).
- **A fix in a pull request**, small and focused, that keeps `npm ci && npm run
  build && npm run build:mock` passing and the five pages rendering in
  `npm run dev:mock`.

Before opening anything, please read [AGENTS.md](AGENTS.md) (architecture and
rules) and [docs/ADAPTER.md](docs/ADAPTER.md) (what is specific to one home).
Two rules matter for every contribution:

1. **No personal data** — no name, city, entity id, private address, domain or
   token in a versioned file. Configuration lives in `src/config.local.ts`, which
   is ignored by git; the repository only ships `src/config.example.ts`.
2. **No new dependency without a real reason**, and exact versions (no `^`/`~`).

For a configuration problem ("my entity is not found"), the answer is almost
always in your own `src/config.local.ts`, not in the code: adjust it using
`src/config.example.ts` as the model.

By contributing you agree that your contribution is licensed under the MIT
license of this repository.
