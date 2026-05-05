const STORAGE_KEY = 'big-dog-master:v1';
const BOARD_COLUMNS = [
  { id: 'inbox', title: 'Inbox', description: 'Things you intentionally added for triage.' },
  { id: 'inProgress', title: 'In Progress', description: 'Active PRs, sessions, and merge work.' },
  { id: 'done', title: 'Done', description: 'Closed or shipped work.' },
  { id: 'cancelled', title: 'Cancelled', description: 'Dropped or superseded work.' },
];

const app = document.querySelector('#app');
let state = null;
let editingId = null;

async function loadState() {
  const response = await fetch('/api/state');
  state = await response.json();
  migrateState();
  saveState();
}

function migrateState() {
  state.columns = BOARD_COLUMNS;
  state.tasks = (state.tasks || []).map((task) => ({
    ...task,
    column: task.column || 'inbox',
  }));
}

async function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state, null, 2));
  try {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
  } catch {
    // LocalStorage keeps the board usable if the file-backed server is unavailable.
  }
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function taskPrimaryUrl(task) {
  return [
    ...(task.links || []),
    ...(task.prs || []),
    ...(task.sessions || []),
  ].find((link) => link.url)?.url || '';
}

function kickoffPrompt(task) {
  const links = sourceLinks(task)
    .map((link) => `- ${link.label}: ${link.url}`)
    .join('\n');
  const workspace = task.workspace || '/Users/adwithmukherjee/dev/lavender-core/lavender-core';

  return `You are working in ${workspace}.

First read AGENTS.md if it exists in the workspace and follow repo rules.

Before task work:
- Use the task-worker skill first.
- Task ID: ${task.id}
- Task state: /Users/adwithmukherjee/dev/big-dog-master/data/state.json
- Register this Codex session on the task if your current thread ID is visible. Do not guess the ID.

Task: ${task.title}
Project: ${task.project || 'Unsorted'}
Priority: ${task.priority || 'P2'}
Status: ${task.status || 'Needs triage'}

Summary:
${task.summary || 'No summary provided.'}

Next concrete action:
${task.nextStep || 'Scope the task and identify the first implementation step.'}

Known links:
${links || '- None'}

Instructions:
- Start by doing a bounded research pass over the relevant Slack/GitHub/code context.
- Identify likely files, services, and tests before editing.
- Preserve existing user changes and do not reset or revert files unless explicitly asked.
- If this is lavender-core, do not run full Jest. Use targeted tests and npm run check after code changes.`;
}

function codexKickoffLink(task) {
  const prompt = encodeURIComponent(kickoffPrompt(task));
  const path = encodeURIComponent(task.workspace || '/Users/adwithmukherjee/dev/lavender-core/lavender-core');
  const originUrl = taskPrimaryUrl(task);
  const originParam = originUrl ? `&originUrl=${encodeURIComponent(originUrl)}` : '';

  return `codex://new?prompt=${prompt}${originParam}&path=${path}`;
}

function sourceLinks(task) {
  const sessions = (task.sessions || []).map((session) => ({
    label: `Session ${session.id.slice(0, 8)}`,
    url: session.url || `codex://threads/${session.id}`,
  }));
  const prs = (task.prs || []).map((pr) => ({
    label: `PR #${pr.id}`,
    url: pr.url,
  }));
  return [...sessions, ...prs, ...(task.links || [])];
}

function allLinks(task) {
  const kickoff = task.column === 'inbox'
    ? [{ label: 'Start Codex session', url: codexKickoffLink(task), kind: 'kickoff' }]
    : [];
  return [...kickoff, ...sourceLinks(task)];
}

function renderTask(task) {
  const links = allLinks(task)
    .map(
      (link) =>
        `<a class="link ${escapeHtml(link.kind || '')}" href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`,
    )
    .join('');

  return `
    <article class="task" draggable="true" data-task-id="${escapeHtml(task.id)}">
      <div class="task-top">
        <div>
          <h3>${escapeHtml(task.title)}</h3>
          <div class="project">${escapeHtml(task.project)}</div>
        </div>
        <div class="task-controls">
          <span class="pill ${task.priority?.toLowerCase() || ''}">${escapeHtml(task.priority)}</span>
          ${
            task.column === 'inbox'
              ? `<button class="delete-button" data-action="delete-card" data-task-id="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.title)}">Delete</button>`
              : ''
          }
        </div>
      </div>
      <p class="summary">${escapeHtml(task.summary)}</p>
      <div class="next"><strong>Next:</strong> ${escapeHtml(task.nextStep)}</div>
      <div class="links">${links}</div>
      <div class="small">
        ${escapeHtml(task.status)}<br />
        ${escapeHtml(task.branch || task.source || '')}
      </div>
    </article>
  `;
}

function renderColumn(column) {
  const tasks = state.tasks.filter((task) => task.column === column.id);
  return `
    <section class="column" data-column-id="${escapeHtml(column.id)}">
      <div class="column-head">
        <div>
          <h2 class="column-title">${escapeHtml(column.title)}</h2>
          <p class="column-desc">${escapeHtml(column.description)}</p>
        </div>
        <span class="count">${tasks.length}</span>
      </div>
      <div class="task-list">
        ${tasks.map(renderTask).join('')}
      </div>
    </section>
  `;
}

function renderDrawer() {
  const task = state.tasks.find((candidate) => candidate.id === editingId);
  const open = Boolean(task);
  return `
    <aside class="drawer" data-open="${open}">
      ${
        task
          ? `
        <h2>Edit Card</h2>
        <div class="field">
          <label for="edit-title">Title</label>
          <input id="edit-title" value="${escapeHtml(task.title)}" />
        </div>
        <div class="field">
          <label for="edit-column">Column</label>
          <select id="edit-column">
            ${state.columns
              .map(
                (column) =>
                  `<option value="${escapeHtml(column.id)}" ${column.id === task.column ? 'selected' : ''}>${escapeHtml(column.title)}</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label for="edit-status">Status</label>
          <input id="edit-status" value="${escapeHtml(task.status)}" />
        </div>
        <div class="field">
          <label for="edit-next">Next Step</label>
          <textarea id="edit-next">${escapeHtml(task.nextStep)}</textarea>
        </div>
        <div class="drawer-actions">
          <button class="button" data-action="save-edit">Save</button>
          <button class="button secondary" data-action="close-drawer">Close</button>
        </div>
        <div class="small">Card ID: ${escapeHtml(task.id)}</div>
      `
          : ''
      }
    </aside>
  `;
}

function render() {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <div class="eyebrow">Codex command board</div>
          <h1>${escapeHtml(state.meta.title)}</h1>
          <div class="meta">
            Source: ${escapeHtml(state.meta.source)}<br />
            Last reviewed: ${escapeHtml(state.meta.lastReviewed)}
          </div>
        </div>
        <div class="actions">
          <button class="button" data-action="add-card">Add Card</button>
          <button class="button secondary" data-action="export-json">Export JSON</button>
          <button class="button secondary" data-action="reset-seed">Reset Seed</button>
        </div>
      </header>
      <section class="board">
        ${state.columns.map(renderColumn).join('')}
      </section>
      ${renderDrawer()}
    </main>
  `;
}

function moveTask(taskId, columnId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return;
  task.column = columnId;
  saveState();
  render();
}

function deleteTask(taskId) {
  const task = state.tasks.find((candidate) => candidate.id === taskId);
  if (!task || task.column !== 'inbox') return;

  state.tasks = state.tasks.filter((candidate) => candidate.id !== taskId);
  if (editingId === taskId) editingId = null;
  saveState();
  render();
}

function addCard() {
  const id = `TASK-${Date.now()}`;
  state.tasks.unshift({
    id,
    title: 'New task',
    priority: 'P2',
    column: 'inbox',
    status: 'New',
    project: 'Unsorted',
    summary: 'Describe the task.',
    nextStep: 'Decide the next action.',
    owner: 'Adwith',
    workspace: '',
    branch: '',
    updated: new Date().toISOString().slice(0, 10),
    sessions: [],
    prs: [],
    links: [],
    source: 'Manual',
  });
  editingId = id;
  saveState();
  render();
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'big-dog-master-state.json';
  anchor.click();
  URL.revokeObjectURL(url);
}

async function resetSeed() {
  localStorage.removeItem(STORAGE_KEY);
  const response = await fetch('/seed.json');
  state = await response.json();
  migrateState();
  editingId = null;
  saveState();
  render();
}

function saveEdit() {
  const task = state.tasks.find((candidate) => candidate.id === editingId);
  if (!task) return;

  task.title = document.querySelector('#edit-title').value;
  task.column = document.querySelector('#edit-column').value;
  task.status = document.querySelector('#edit-status').value;
  task.nextStep = document.querySelector('#edit-next').value;
  task.updated = new Date().toISOString().slice(0, 10);
  editingId = null;
  saveState();
  render();
}

document.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  const taskElement = event.target.closest('.task');

  if (!action && taskElement && !event.target.closest('a')) {
    editingId = taskElement.dataset.taskId;
    render();
    return;
  }

  if (action === 'add-card') addCard();
  if (action === 'export-json') exportJson();
  if (action === 'reset-seed') resetSeed();
  if (action === 'delete-card') deleteTask(event.target.closest('[data-task-id]')?.dataset.taskId);
  if (action === 'save-edit') saveEdit();
  if (action === 'close-drawer') {
    editingId = null;
    render();
  }
});

document.addEventListener('dragstart', (event) => {
  const task = event.target.closest('.task');
  if (!task) return;
  event.dataTransfer.setData('text/plain', task.dataset.taskId);
});

document.addEventListener('dragover', (event) => {
  const column = event.target.closest('.column');
  if (!column) return;
  event.preventDefault();
  column.dataset.dragOver = 'true';
});

document.addEventListener('dragleave', (event) => {
  const column = event.target.closest('.column');
  if (!column || column.contains(event.relatedTarget)) return;
  column.dataset.dragOver = 'false';
});

document.addEventListener('drop', (event) => {
  const column = event.target.closest('.column');
  if (!column) return;
  event.preventDefault();
  column.dataset.dragOver = 'false';
  moveTask(event.dataTransfer.getData('text/plain'), column.dataset.columnId);
});

await loadState();
render();
