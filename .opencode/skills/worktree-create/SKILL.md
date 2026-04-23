---
name: worktree-create
description: Create and manage git worktrees with isolated environments using make commands. Use when the user wants to create, start, stop, check status of, or remove a parallel worktree environment for a branch.
---

# worktree-create

Manage git worktrees with isolated Docker environments (Postgres, Redis) via `make parallel-*` targets.

Each worktree gets a deterministic slot (1-8) with unique ports so multiple branches can run simultaneously.

## Create a worktree

```bash
make parallel-create BRANCH=<branch-name>
```

This will:
1. Create a git worktree for the branch via `workmux add`
2. Copy `.env` from the repo root and override ports/container names for slot isolation
3. Create `pg_data/` and `redis_data/` directories
4. Write `.parallel-env.json` metadata in the worktree

The worktree is placed under `../secrets-watch/worktrees/<branch-slug>`.

## Start services (Docker)

```bash
make parallel-start BRANCH=<branch-name>
```

Brings up Postgres and Redis containers for the worktree and validates database connectivity.

## Check status

```bash
make parallel-status
```

Or for a specific branch:

```bash
make parallel-status BRANCH=<branch-name>
```

Outputs a table with `branch slot app db redis state` for all managed worktrees.

## Stop services

```bash
make parallel-stop BRANCH=<branch-name>
```

Stops Postgres and Redis containers without removing the worktree.

## Remove a worktree

```bash
make parallel-remove BRANCH=<branch-name>
```

This will:
1. Tear down Docker containers (`docker compose down --remove-orphans`)
2. Close the tmux session via `workmux close`
3. Remove `pg_data/`, `redis_data/`, `.parallel-env.json`
4. Remove the git worktree entirely

## Typical workflow

```bash
make parallel-create BRANCH=feature/new-thing
make parallel-start BRANCH=feature/new-thing
# ... work in the worktree ...
make parallel-stop BRANCH=feature/new-thing
make parallel-remove BRANCH=feature/new-thing
```

## Notes

- A root `.env` file must exist before creating a worktree
- The branch must not have a trailing slash
- Slot collisions between branches are detected and reported
- Up to 8 concurrent slots are supported
