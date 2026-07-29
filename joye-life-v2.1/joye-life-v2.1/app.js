const storageKey = 'joye_app_v2';
const defaultState = {
  tasks: [
    { id: 1, title: 'Study Network+ for 30 minutes', area: 'Career', done: true },
    { id: 2, title: 'Review credit card payoff plan', area: 'Money', done: false },
    { id: 3, title: 'Complete pull workout', area: 'Health', done: false }
  ],
  money: { paycheck: 1854, essentials: 1001, debt: 519, savings: 100 },
  milestones: [
    { id: 1, title: 'Earn AZ-900', done: true },
    { id: 2, title: 'Lead a client-facing project', done: true },
    { id: 3, title: 'Document five measurable work wins', done: true },
    { id: 4, title: 'Pass Network+', done: false },
    { id: 5, title: 'Build a home lab project', done: false }
  ],
  goals: [
    { id: 1, name: 'Reach target weight', current: 174, target: 165, reverse: true },
    { id: 2, name: 'Emergency fund', current: 500, target: 2000 }
  ]
};

const clone = (value) => JSON.parse(JSON.stringify(value));
let state;
try { state = JSON.parse(localStorage.getItem(storageKey)) || clone(defaultState); }
catch { state = clone(defaultState); }
const save = () => localStorage.setItem(storageKey, JSON.stringify(state));
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function renderAll() {
  renderTasks(); renderMoney(); renderMilestones(); renderGoals(); renderSummary();
}

function renderSummary() {
  const done = state.tasks.filter(t => t.done).length;
  const progress = state.tasks.length ? Math.round(done / state.tasks.length * 100) : 0;
  document.querySelector('#progress-value').textContent = `${progress}%`;
  document.querySelector('#progress-bar').style.width = `${progress}%`;
  const flexible = state.money.paycheck - state.money.essentials - state.money.debt - state.money.savings;
  document.querySelector('#available-value').textContent = money.format(Math.max(flexible, 0));
  document.querySelector('#available-note').textContent = flexible >= 0 ? 'after essentials, debt, and savings' : 'allocation is over budget';
  const completed = state.milestones.filter(m => m.done).length;
  document.querySelector('#career-value').textContent = `${completed}/${state.milestones.length}`;
}

function renderTasks() {
  const list = document.querySelector('#task-list');
  list.innerHTML = '';
  document.querySelector('#empty-tasks').hidden = state.tasks.length > 0;
  state.tasks.forEach(task => {
    const row = document.createElement('div'); row.className = `app-task ${task.done ? 'done' : ''}`;
    row.innerHTML = `<label><input type="checkbox" ${task.done ? 'checked' : ''}><span><strong></strong><small></small></span></label><button aria-label="Delete priority">×</button>`;
    row.querySelector('strong').textContent = task.title;
    row.querySelector('small').textContent = task.area;
    row.querySelector('input').addEventListener('change', e => { task.done = e.target.checked; save(); renderAll(); });
    row.querySelector('button').addEventListener('click', () => { state.tasks = state.tasks.filter(t => t.id !== task.id); save(); renderAll(); });
    list.appendChild(row);
  });
}

function renderMoney() {
  ['paycheck','essentials','debt','savings'].forEach(id => document.querySelector(`#${id}`).value = state.money[id]);
  const flexible = state.money.paycheck - state.money.essentials - state.money.debt - state.money.savings;
  document.querySelector('#flexible-result').textContent = money.format(flexible);
  const warning = document.querySelector('#allocation-warning');
  warning.textContent = flexible < 0 ? `Reduce allocations by ${money.format(Math.abs(flexible))}.` : `${money.format(flexible)} remains for food, fuel, and flexible spending.`;
  warning.className = flexible < 0 ? 'warning' : '';
}

function renderMilestones() {
  const list = document.querySelector('#milestone-list'); list.innerHTML = '';
  state.milestones.forEach(item => {
    const row = document.createElement('label'); row.className = `milestone ${item.done ? 'done' : ''}`;
    row.innerHTML = `<input type="checkbox" ${item.done ? 'checked' : ''}><span></span><button type="button">×</button>`;
    row.querySelector('span').textContent = item.title;
    row.querySelector('input').addEventListener('change', e => { item.done = e.target.checked; save(); renderAll(); });
    row.querySelector('button').addEventListener('click', () => { state.milestones = state.milestones.filter(m => m.id !== item.id); save(); renderAll(); });
    list.appendChild(row);
  });
}

function renderGoals() {
  const list = document.querySelector('#goal-list'); list.innerHTML = '';
  state.goals.forEach(goal => {
    let pct = goal.reverse ? ((goal.current - goal.target) <= 0 ? 100 : 0) : Math.min(100, Math.max(0, goal.current / goal.target * 100));
    if (goal.reverse && goal.current > goal.target) pct = Math.max(0, Math.min(100, (1 - (goal.current - goal.target) / Math.max(goal.current, 1)) * 100));
    const card = document.createElement('article'); card.className = 'goal-card';
    card.innerHTML = `<div><strong></strong><button>×</button></div><p></p><div class="progress-track"><i></i></div>`;
    card.querySelector('strong').textContent = goal.name;
    card.querySelector('p').textContent = `${goal.current} of ${goal.target}`;
    card.querySelector('i').style.width = `${pct}%`;
    card.querySelector('button').addEventListener('click', () => { state.goals = state.goals.filter(g => g.id !== goal.id); save(); renderAll(); });
    list.appendChild(card);
  });
}

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item,.view').forEach(el => el.classList.remove('active'));
  button.classList.add('active'); document.querySelector(`#view-${button.dataset.view}`).classList.add('active');
  document.querySelector('#view-title').textContent = button.dataset.view === 'today' ? 'Good afternoon, Thomas.' : button.textContent;
}));

document.querySelector('#today-date').textContent = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric' }).format(new Date()).toUpperCase();
const modal = document.querySelector('#task-modal');
document.querySelector('#open-task-modal').onclick = () => modal.showModal();
document.querySelector('#close-task-modal').onclick = () => modal.close();
document.querySelector('#task-form').addEventListener('submit', e => {
  e.preventDefault(); const title = document.querySelector('#task-title').value.trim(); if (!title) return;
  state.tasks.push({ id: Date.now(), title, area: document.querySelector('#task-area').value, done: false });
  e.target.reset(); modal.close(); save(); renderAll();
});
document.querySelector('#money-form').addEventListener('submit', e => {
  e.preventDefault(); ['paycheck','essentials','debt','savings'].forEach(id => state.money[id] = Number(document.querySelector(`#${id}`).value || 0)); save(); renderAll();
});
document.querySelector('#add-milestone').onclick = () => { const title = prompt('Milestone name'); if (title?.trim()) { state.milestones.push({ id: Date.now(), title: title.trim(), done:false }); save(); renderAll(); } };
document.querySelector('#goal-form').addEventListener('submit', e => {
  e.preventDefault(); state.goals.push({ id: Date.now(), name: document.querySelector('#goal-name').value.trim(), current:Number(document.querySelector('#goal-current').value), target:Number(document.querySelector('#goal-target').value) }); e.target.reset(); save(); renderAll();
});
document.querySelectorAll('[data-question]').forEach(button => button.onclick = () => {
  const openTasks = state.tasks.filter(t => !t.done);
  const flexible = state.money.paycheck - state.money.essentials - state.money.debt - state.money.savings;
  const responses = {
    focus: openTasks.length ? `Start with “${openTasks[0].title}.” It is your next unfinished priority.` : 'Your planned priorities are complete. Use the remaining time to prepare tomorrow.',
    money: flexible > 200 ? `You have about ${money.format(flexible)} unallocated. Protect a buffer before making a nonessential purchase.` : `Your flexible amount is ${money.format(flexible)}. Avoid adding new spending until the next paycheck plan is balanced.`,
    career: `Complete one open milestone and document a measurable work win this week. You have ${state.milestones.filter(m=>m.done).length} of ${state.milestones.length} roadmap milestones complete.`
  };
  document.querySelector('#coach-response').textContent = responses[button.dataset.question];
});
document.querySelector('#reset-demo').onclick = () => { if (confirm('Reset all dashboard demo data?')) { state = clone(defaultState); save(); renderAll(); } };
renderAll();
