---
name: worktree-create
description: Create and manage parallel git worktrees with fully isolated environments (ports, containers, db, data) under .worktrees/. Use when the user wants to create, start, stop, check status of, or remove a parallel worktree so they can work on multiple branches at the same time without port or database collisions.
---

# worktree-create

Manage git worktrees with isolated Docker environments (Postgres, Redis) via `make parallel-*` targets. Each worktree lives under `.worktrees/<branch-slug>/` and gets a deterministic slot (1–8) with unique ports so multiple branches can run **simultaneously** without colliding.

## The isolation contract

Every worktree is fully isolated from the main checkout and from every other worktree:

| Concern        | Isolated how                                                           |
|----------------|------------------------------------------------------------------------|
| App port       | `PORT`/`APP_PORT` = `20000 + 3000 + slot` (e.g. 23006)                 |
| Postgres port  | `PG_PORT` = `20000 + 5432 + slot`                                      |
| Redis port     | `REDIS_PORT` = `20000 + 6379 + slot`                                   |
| Database name  | `PG_DB_NAME` = `secrets_watch_<slot>`                                  |
| Containers     | `sw-pg-<slot>-<slug>` / `sw-redis-<slot>-<slug>`                       |
| Compose project| `COMPOSE_PROJECT_NAME` = `sw_slot_<slot>_<slug>`                       |
| Data dirs      | `<worktree>/pg_data/`, `<worktree>/redis_data/`                        |

The slot is deterministic: `sha256(branchSlug) % 8 + 1`, so the same branch always maps to the same environment.

## How the worktree `.env` is generated (from main's `.env`)

On `make parallel-create`, the script copies the repo-root `.env` and rewrites the isolation keys above to the slot's values. **The root `.env` is the template.** It must contain the `PG_*`/`REDIS_*`/`COMPOSE_*` keys with defaults that match its own `DATABASE_URL`/`REDIS_URL` ports — `make parallel-create` backfills any that are missing, but keep them in sync by hand when you change a port:

- `DATABASE_URL` port must equal `PG_PORT`
- `REDIS_URL` port must equal `REDIS_PORT`

If you change a port in the root `.env`, change it in **both** the URL and the `*_PORT` var. The worktree `.env` overrides only the isolation keys; every other secret (Stripe, Product Hunt, etc.) is inherited from the root `.env`.

## Create a worktree

```bash
make parallel-create BRANCH=<branch-name>
```

This will:
1. Create a git worktree for the branch at `.worktrees/<branch-slug>/` via `workmux add`
2. Copy `.env` from the repo root and override the isolation keys for slot isolation
3. Create `pg_data/` and `redis_data/` directories inside the worktree
4. Write `.parallel-env.json` metadata in the worktree

Requires: `workmux` on PATH (`brew`/external binary) and a root `.env` file.

## Start services (Docker)

```bash
make parallel-start BRANCH=<branch-name>
```

Brings up the worktree's own Postgres and Redis containers (on its slot ports) and validates database connectivity via `DATABASE_URL`.

## Check status

```bash
make parallel-status
```

Or for a specific branch:

```bash
make parallel-status BRANCH=<branch-name>
```

Outputs a table with `branch slot app db redis state` for every worktree under `.worktrees/`.

## Stop services

```bash
make parallel-stop BRANCH=<branch-name>
```

Stops that worktree's Postgres and Redis containers without removing the worktree.

## Remove a worktree

```bash
make parallel-remove BRANCH=<branch-name>
```

This will:
1. Tear down Docker containers (`docker compose down --remove-orphans`)
2. Close the tmux session via `workmux close`
3. Remove `pg_data/`, `redis_data/`, `.parallel-env.json` inside the worktree
4. Remove the git worktree entirely

## Typical workflow

```bash
make parallel-create BRANCH=feature/new-thing
make parallel-start BRANCH=feature/new-thing
# ... work in .worktrees/feature-new-thing/ ...
make parallel-stop BRANCH=feature/new-thing
make parallel-remove BRANCH=feature/new-thing
```

## Running the full test suite inside a worktree

Because each worktree has its own isolated ports/db, the full `npx vitest run` works there without colliding with your main checkout. The `DATABASE_URL`/`REDIS_URL` in the generated `.env` already point at the worktree's own containers — no overrides needed.

## Notes

- A root `.env` file must exist before creating a worktree
- The branch must not have a trailing slash
- Slot collisions between branches are detected and reported (rename the branch to re-slot)
- Up to 8 concurrent slots are supported
- `.worktrees/` is gitignored; worktree runtime state (`.env`, data dirs, metadata) never gets committed
- Worktrees created before the move to `.worktrees/` (e.g. under a sibling `secrets-watch/worktrees/`) are not listed by `parallel-status` but still work until removed
