# Big Dog Master

Local Kanban board for Adwith's Codex tasks.

## Run

```bash
npm start
```

Open `http://localhost:4321`.

## State

- Source-of-truth state lives in [data/state.json](/Users/adwithmukherjee/dev/big-dog-master/data/state.json).
- The app reads and writes state through `GET /api/state` and `PUT /api/state`.
- [public/seed.json](/Users/adwithmukherjee/dev/big-dog-master/public/seed.json) is only the reset/import seed.
- Browser localStorage is only a fallback cache under `big-dog-master:v1`.
- Use `Reset Seed` in the UI to reload from `public/seed.json` and persist that reset into `data/state.json`.
- Use `Export JSON` to download the current browser state.
- Columns are `Inbox`, `In Progress`, `Done`, and `Cancelled`.
- Columns can be collapsed from the board header; collapsed state is a browser-local UI preference.
- Inbox cards can be deleted from the board. Slack messages are not seeded into Inbox unless Adwith explicitly asks to track them.
- Every Inbox card renders a generated `Start Codex session` deeplink using `codex://new` with a kickoff prompt, `workspace` as the `path`, and the strongest task source as `originUrl`.
- Generated kickoff prompts tell the new session to use `task-worker` first so the new Codex thread can be registered on the task.

## Agent Skill

- [.agents/skills/master-secretary/SKILL.md](/Users/adwithmukherjee/dev/big-dog-master/.agents/skills/master-secretary/SKILL.md) is the board-maintenance and `/intake` skill.
- [.agents/skills/task-worker/SKILL.md](/Users/adwithmukherjee/dev/big-dog-master/.agents/skills/task-worker/SKILL.md) is the lightweight session-registration skill for sessions opened from Inbox kickoff links.
