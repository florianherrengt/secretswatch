---
name: ci-watch
description: Watch GitHub Actions CI runs using `gh run watch`. Use when the user wants to monitor, check, or wait for CI/CD pipeline status on the current branch or a specific run.
---

# ci-watch

Watch GitHub Actions CI runs in real time using `gh run watch`.

## Watch the latest run on the current branch

```bash
gh run watch --exit-status
```

## Watch a specific run by ID

```bash
gh run watch <run-id> --exit-status
```

## Watch in compact mode (only failed/relevant steps)

```bash
gh run watch --compact --exit-status
```

## Find the latest run and watch it

If the user doesn't provide a run ID, find the latest run first:

```bash
gh run list --limit 1 --json databaseId,status,conclusion,name,headBranch --jq '.[0]'
```

Then watch it using the `databaseId` from the output.

## Watch runs for current branch only

```bash
gh run list --branch $(git branch --show-current) --limit 1 --json databaseId --jq '.[0].databaseId' | xargs gh run watch --exit-status
```

## Report results

After the watch completes, report:
- The final status (success / failure / cancelled)
- Which steps failed, if any
- If failed, suggest checking logs with `gh run view <run-id> --log-failed`
