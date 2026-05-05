Use the repo-local `master-secretary` skill.

Read `.agents/skills/master-secretary/SKILL.md`, then act as the Big Dog Master secretary against `data/state.json`.

Rules:
- Treat `data/state.json` as the source of truth.
- Do not update `MASTER.md` unless explicitly asked for a Markdown export or legacy sync.
- Do not import Slack items into Inbox unless Adwith explicitly asks to track that Slack item.
- Keep Codex session links clickable with `codex://threads/<thread_id>`.
- Keep output terse and action-oriented.

