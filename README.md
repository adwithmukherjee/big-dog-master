# Big Dog Master

Local Kanban board for the Codex master ledger.

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
- Inbox cards can be deleted from the board. Slack messages are not seeded into Inbox unless Adwith explicitly asks to track them.

`/Users/adwithmukherjee/Documents/Codex/MASTER.md` is legacy context now, not the live task source.

## Agent Skill

The repo-local master secretary skill is checked in at [.agents/skills/master-secretary/SKILL.md](/Users/adwithmukherjee/dev/big-dog-master/.agents/skills/master-secretary/SKILL.md). This is the single source of truth for agent instructions.
