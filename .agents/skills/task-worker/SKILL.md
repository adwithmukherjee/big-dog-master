---
name: task-worker
description: >-
  Use at the start of a Big Dog Master task session opened from a Start Codex
  session link. Register the current Codex session on the specified task in
  data/state.json, then continue with the task prompt.
---

# Task Worker

## Purpose

Register this Codex session against one Big Dog Master task. This skill is intentionally small: update task state, then proceed with the task prompt. Do not intake, rescope, dispatch, or reorganize the board.

## Inputs

The kickoff prompt should include:

- `Task ID`: the `data/state.json` task id to update.
- `Task state`: `/Users/adwithmukherjee/dev/big-dog-master/data/state.json`.

## Finding This Session's Thread ID

Prefer the current shell environment:

```bash
printf '%s\n' "$CODEX_THREAD_ID"
```

If `CODEX_THREAD_ID` is empty, use an exact UUID/thread id visible in the app or prompt context, or one supplied by Adwith. Do not guess or synthesize an id.

## Workflow

1. Read `/Users/adwithmukherjee/dev/big-dog-master/data/state.json`.
2. Find the task by the provided `Task ID`. If it is missing, stop and report that the task could not be registered.
3. Determine the current Codex thread id. Check `CODEX_THREAD_ID` first, then fall back to an exact UUID/thread id visible in the session context or supplied by Adwith.
4. If the thread id is known, add or update one entry in `task.sessions`:

```json
{
  "id": "<thread_id>",
  "label": "Task worker session",
  "url": "codex://threads/<thread_id>"
}
```

5. If the task is still in `inbox`, move it to `inProgress` and set `status` to `In progress: Codex session started`.
6. Set `updated` to today's date and `meta.lastSaved` to the current ISO timestamp.
7. Write `data/state.json` and report only the task id plus whether registration succeeded.
8. Continue with the original task prompt.

If the current thread id is not visible, do not edit `sessions`. Report the missing thread id and continue with the task prompt unless Adwith asked registration to be mandatory.
