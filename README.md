# RestoreProof

Disaster-recovery **exercise tracker** by **Saeed Rumaneh**. Walk synthetic backup plans, complete checklists, and score measured RPO/RTO against targets. Plans and results persist to `data/restore.json` through Next.js API routes.

> This project never connects to real backup systems or production data.

## Features

- Demo backup plans with RPO/RTO targets
- Required / optional checklist items
- Pass / fail / incomplete verdicts (manual mark override)
- Running scoreboard of exercise results
- JSON persistence + fetch-wired UI

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/exercises` | Plans + results |
| POST | `/api/exercises` | Score a new exercise |
| POST | `/api/exercises/:id` | Mark `{ verdict: "pass" \| "fail" }` |

## Stack

Next.js 15 · React 19 · TypeScript · Vitest

## Scripts

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
```

## Library

Core logic: [`lib/restore.ts`](lib/restore.ts) · Persistence: [`lib/store.ts`](lib/store.ts) · Tests: [`__tests__/restore.test.ts`](__tests__/restore.test.ts)

Runtime data under `data/` is gitignored.

## Complete product flows

1. Pick a backup plan, toggle checklist items, set achieved RPO/RTO, then **Start exercise**.
2. Incomplete runs appear under **In progress** — mark pass or fail to override.
3. Completed pass/fail results stack under **Completed** and persist in `data/restore.json`.

## License

MIT © 2026 Saeed Rumaneh
