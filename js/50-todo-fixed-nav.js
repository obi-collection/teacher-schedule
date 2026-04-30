// ══════════════════════════════════════════
// TODO PANEL
// ══════════════════════════════════════════

function openTodoPanel() {
  closeRecordsPanel();
  renderTodoList();
  document.getElementById('todoPanel').classList.add('open');
  document.getElementById('navTodo').classList.add('active');
  document.getElementById('navWeek').classList.remove('active');
  document.getElementById('navRecords').classList.remove('active');
}

function closeTodoPanel() {
  document.getElementById('todoPanel').classList.remove('open');
  document.getElementById('navTodo').classList.remove('active');
  document.getElementById('navWeek').classList.add('active');
}

document.getElementById('navTodo').addEventListener('click', openTodoPanel);
document.getElementById('closeTodoPanel').addEventListener('click', closeTodoPanel);

function renderTodoList() {
  const list = document.getElementById('todoList');
  list.innerHTML = '';
  if (state.todos.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text3);font-size:13px;padding:24px 0';
    empty.textContent = 'タスクはありません';
    list.appendChild(empty);
    return;
  }
  state.todos.forEach((todo, i) => {
    const item = document.createElement('div');
    item.className = 'todo-item';
    item.style.opacity = todo.done ? '0.55' : '1';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'todo-check';
    cb.checked = todo.done;
    cb.dataset.idx = i;
    cb.addEventListener('change', function() {
      state.todos[parseInt(this.dataset.idx)].done = this.checked;
      save(); renderTodoList();
    });

    const txt = document.createElement('span');
    txt.className = 'todo-text' + (todo.done ? ' done' : '');
    txt.textContent = todo.text;
    txt.style.cursor = 'text';
    txt.addEventListener('click', function(e) {
      e.stopPropagation();
      const input = document.createElement('input');
      input.className = 'todo-edit-input';
      input.value = todo.text;
      item.replaceChild(input, txt);
      input.focus();
      input.select();
      function finishEdit() {
        const newText = input.value.trim();
        if (newText && newText !== todo.text) {
          state.todos[i].text = newText;
          save();
        }
        renderTodoList();
      }
      input.addEventListener('blur', finishEdit);
      input.addEventListener('keydown', e2 => {
        if (e2.key === 'Enter') input.blur();
        if (e2.key === 'Escape') { input.value = todo.text; input.blur(); }
      });
    });

    const del = document.createElement('button');
    del.className = 'master-item-del';
    del.textContent = '✕';
    del.dataset.idx = i;
    del.addEventListener('click', function() {
      state.todos.splice(parseInt(this.dataset.idx), 1);
      save(); renderTodoList();
    });

    item.appendChild(cb); item.appendChild(txt); item.appendChild(del);
    list.appendChild(item);
  });
}

document.getElementById('addTodoBtn').addEventListener('click', () => {
  const input = document.getElementById('newTodoInput');
  const text = input.value.trim();
  if (!text) return;
  state.todos.push({ text, done: false });
  input.value = '';
  save(); renderTodoList();
});

document.getElementById('newTodoInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('addTodoBtn').click();
});

// ══════════════════════════════════════════
// FIXED TIMETABLE
// ══════════════════════════════════════════

function openFixedModal(dow, periodIdx) {
  state.fixedCell        = { dow, periodIdx };
  state.selectedCell     = null;
  state.selectedGenreIdx = null;
  state.selectedSubject  = null;

  const key = `${dow}_p${periodIdx}`;
  const existing = state.fixedTimetable[key];
  const freeInput = document.getElementById('subjectFreeText');
  freeInput.value = '';

  if (existing) {
    let matched = false;
    state.settings.genres.forEach((g, gi) => {
      if (!matched && g.items.includes(existing.name)) {
        state.selectedGenreIdx = gi;
        state.selectedSubject  = existing.name;
        matched = true;
      }
    });
    if (!matched) freeInput.value = existing.name;
  }

  document.getElementById('subjectNewInput').value = '';
  const p = state.settings.periods[periodIdx];
  document.getElementById('subjectModalTitle').textContent = `固定時間割 ${DAY_NAMES[dow]}曜日`;
  document.getElementById('subjectModalSub').textContent   = `${periodIdx+1}限 ${p.start}〜${p.end}`;

  renderModalStep();
  document.getElementById('subjectModal').classList.add('open');
}

function renderFixedTimetableGrid() {
  const container = document.getElementById('fixedTimetableGrid');
  if (!container) return;
  container.innerHTML = '';

  const dows      = [1, 2, 3, 4, 5];
  const dayLabels = ['月', '火', '水', '木', '金'];
  const periods   = state.settings.periods;

  const grid = document.createElement('div');
  grid.className = 'fixed-grid';
  grid.style.gridTemplateColumns = `24px repeat(5, 1fr)`;

  // Header row
  grid.appendChild(document.createElement('div'));
  dayLabels.forEach(d => {
    const h = document.createElement('div');
    h.className = 'fixed-grid-header';
    h.textContent = d;
    grid.appendChild(h);
  });

  // Period rows
  periods.forEach((p, pi) => {
    const lbl = document.createElement('div');
    lbl.className = 'fixed-grid-period';
    lbl.textContent = pi + 1;
    grid.appendChild(lbl);

    dows.forEach(dow => {
      const key   = `${dow}_p${pi}`;
      const entry = state.fixedTimetable[key];
      const cell  = document.createElement('div');
      cell.className = 'fixed-cell' + (entry ? ' has-entry' : '');
      if (entry && entry.color) cell.style.background = entry.color + '20';

      if (entry) {
        const lbl2 = document.createElement('div');
        lbl2.className = 'fixed-cell-label';
        lbl2.style.color = 'var(--text)';
        lbl2.textContent = entry.name;
        cell.appendChild(lbl2);
      }

      cell.addEventListener('click', () => openFixedModal(dow, pi));
      grid.appendChild(cell);
    });
  });

  container.appendChild(grid);
}

function applyFixedTimetable() {
  const days = getDaysToShow();
  let applied = 0;

  days.forEach(d => {
    const dk = dateKey(d);
    const dw = d.getDay();
    // Skip holidays (no classes on holidays)
    if (state.holidays[dk]) return;
    state.settings.periods.forEach((p, i) => {
      const fixedKey = `${dw}_p${i}`;
      const cellK    = cellKey(dk, i);
      if (state.fixedTimetable[fixedKey] && !state.timetable[cellK]) {
        state.timetable[cellK] = { ...state.fixedTimetable[fixedKey] };
        applied++;
      }
    });
  });

  if (applied > 0) {
    save(); render();
    showToast(`${applied}コマに固定時間割を適用しました`);
  } else {
    showToast('適用できる空きコマがありません');
  }
}

document.getElementById('applyFixedBtn').addEventListener('click', applyFixedTimetable);

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════

document.getElementById('prevWeek').addEventListener('click', () => {
  animateWeekChange(-1, () => { state.currentWeekStart = addDays(state.currentWeekStart, -7); save(); });
});
document.getElementById('nextWeek').addEventListener('click', () => {
  animateWeekChange(1, () => { state.currentWeekStart = addDays(state.currentWeekStart, 7); save(); });
});
document.getElementById('todayBtn').addEventListener('click', () => {
  const target = getWeekStart(new Date());
  const diff = target - state.currentWeekStart;
  if (diff === 0) return;
  animateWeekChange(diff > 0 ? 1 : -1, () => { state.currentWeekStart = target; save(); });
});
document.getElementById('navWeek').addEventListener('click', () => {
  closeTodoPanel(); closeSettingsPanel(); closeRecordsPanel();
});
