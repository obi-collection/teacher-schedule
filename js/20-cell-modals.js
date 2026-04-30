// ══════════════════════════════════════════
// SUBJECT MODAL (2-step: genre → item)
// ══════════════════════════════════════════

function openSubjectModal(dateStr, periodIdx) {
  state.selectedCell    = { dateStr, periodIdx };
  state.selectedGenreIdx = null;
  state.selectedSubject  = null;

  const key = cellKey(dateStr, periodIdx);
  const existing = state.timetable[key];
  const freeInput = document.getElementById('subjectFreeText');
  freeInput.value = '';

  if (existing) {
    // Try to match to a genre item
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
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('subjectModalTitle').textContent =
    `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）`;
  document.getElementById('subjectModalSub').textContent =
    `${periodIdx+1}限 ${p.start}〜${p.end}`;

  renderModalStep();
  document.getElementById('subjectModal').classList.add('open');
}

function renderModalStep() {
  const showStep2 = state.selectedGenreIdx !== null;
  document.getElementById('genreStep').style.display = showStep2 ? 'none' : '';
  document.getElementById('itemStep').style.display  = showStep2 ? '' : 'none';
  if (showStep2) {
    renderItemGrid();
  } else {
    renderGenreGrid();
  }
}

function renderGenreGrid() {
  const grid = document.getElementById('genreGrid');
  grid.innerHTML = '';
  state.settings.genres.forEach((g, gi) => {
    const btn = document.createElement('button');
    btn.className = 'genre-chip';
    const dot = document.createElement('span');
    dot.className = 'genre-chip-dot';
    dot.style.background = g.color;
    const lbl = document.createElement('span');
    lbl.textContent = g.name;
    btn.appendChild(dot);
    btn.appendChild(lbl);
    btn.style.borderColor = g.color + '55';
    btn.addEventListener('click', () => {
      state.selectedGenreIdx = gi;
      state.selectedSubject  = null;
      renderModalStep();
    });
    grid.appendChild(btn);
  });
}

function renderItemGrid() {
  const genre = state.settings.genres[state.selectedGenreIdx];
  document.getElementById('step2GenreLabel').textContent = genre.name;
  document.getElementById('step2GenreLabel').style.color = genre.color;

  const grid = document.getElementById('itemGrid');
  grid.innerHTML = '';

  if (genre.items.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--text3);font-size:12px;padding:10px 0 14px';
    empty.textContent = '項目がありません。設定画面のジャンル管理から追加できます。';
    grid.appendChild(empty);
  }

  genre.items.forEach(item => {
    const btn = document.createElement('button');
    const isSelected = state.selectedSubject === item;
    btn.className = 'subject-chip' + (isSelected ? ' selected' : '');
    btn.textContent = item;
    if (isSelected) {
      btn.style.borderColor = genre.color;
      btn.style.background  = genre.color + '22';
      btn.style.color       = genre.color;
    }
    btn.addEventListener('click', () => {
      state.selectedSubject = item;
      document.getElementById('subjectFreeText').value = '';
      renderItemGrid();
    });
    grid.appendChild(btn);
  });
}

document.getElementById('backToGenreBtn').addEventListener('click', () => {
  state.selectedGenreIdx = null;
  state.selectedSubject  = null;
  renderModalStep();
});

// 新規追加（step2: ジャンルに項目を追加）
document.getElementById('subjectNewAddBtn').addEventListener('click', () => {
  if (state.selectedGenreIdx === null) return;
  const name = document.getElementById('subjectNewInput').value.trim();
  if (!name) return;
  const genre = state.settings.genres[state.selectedGenreIdx];
  if (genre.items.includes(name)) { showToast('すでに登録されています'); return; }
  genre.items.push(name);
  state.selectedSubject = name;
  document.getElementById('subjectNewInput').value = '';
  document.getElementById('subjectFreeText').value = '';
  save();
  renderItemGrid();
  showToast(`「${name}」を追加しました`);
});

document.getElementById('subjectNewInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('subjectNewAddBtn').click();
});

// 自由入力時は項目選択を解除
document.getElementById('subjectFreeText').addEventListener('input', function() {
  if (this.value) {
    state.selectedSubject = null;
    if (state.selectedGenreIdx !== null) renderItemGrid();
  }
});

document.getElementById('confirmSubjectBtn').addEventListener('click', () => {
  if (!state.selectedCell && !state.fixedCell && !state.specialTarget) return;
  const freeText = document.getElementById('subjectFreeText').value.trim();

  let entry = null;
  if (freeText) {
    entry = { name: freeText, color: null };
  } else if (state.selectedSubject !== null && state.selectedGenreIdx !== null) {
    const genre = state.settings.genres[state.selectedGenreIdx];
    entry = { name: state.selectedSubject, color: genre.color };
  } else {
    showToast('ジャンル→項目を選択するか、自由入力してください');
    return;
  }

  if (state.specialTarget) {
    saveSnapshot();
    state.timetable[`${state.specialTarget.dateStr}_${state.specialTarget.type}`] = entry;
    save(); render(); closeSubjectModal();
  } else if (state.fixedCell) {
    state.fixedTimetable[`${state.fixedCell.dow}_p${state.fixedCell.periodIdx}`] = entry;
    save(); renderFixedTimetableGrid(); closeSubjectModal();
  } else {
    saveSnapshot();
    state.timetable[cellKey(state.selectedCell.dateStr, state.selectedCell.periodIdx)] = entry;
    save(); render(); closeSubjectModal();
  }
});

document.getElementById('clearCellBtn').addEventListener('click', () => {
  if (state.specialTarget) {
    saveSnapshot();
    delete state.timetable[`${state.specialTarget.dateStr}_${state.specialTarget.type}`];
    save(); render(); closeSubjectModal();
  } else if (state.fixedCell) {
    delete state.fixedTimetable[`${state.fixedCell.dow}_p${state.fixedCell.periodIdx}`];
    save(); renderFixedTimetableGrid(); closeSubjectModal();
  } else if (state.selectedCell) {
    saveSnapshot();
    delete state.timetable[cellKey(state.selectedCell.dateStr, state.selectedCell.periodIdx)];
    save(); render(); closeSubjectModal();
  }
});

document.getElementById('cancelSubjectBtn').addEventListener('click', closeSubjectModal);
document.getElementById('subjectModal').addEventListener('click', function(e) {
  if (e.target === this) closeSubjectModal();
});

function closeSubjectModal() {
  document.getElementById('subjectModal').classList.remove('open');
  document.getElementById('subjectFreeText').value = '';
  document.getElementById('subjectNewInput').value = '';
  state.selectedCell     = null;
  state.fixedCell        = null;
  state.specialTarget    = null;
  state.selectedGenreIdx = null;
  state.selectedSubject  = null;
}

function openSpecialSubjectModal(dateStr, type) {
  state.specialTarget    = { dateStr, type };
  state.selectedCell     = null;
  state.fixedCell        = null;
  state.selectedGenreIdx = null;
  state.selectedSubject  = null;

  const existing = state.timetable[`${dateStr}_${type}`];
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
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('subjectModalTitle').textContent =
    `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）`;
  const subLabel = type === 'mt' ? 'MT（朝の会）' : type === 'st' ? 'ST（帰りの会）' : '放課後';
  document.getElementById('subjectModalSub').textContent = subLabel;
  renderModalStep();
  document.getElementById('subjectModal').classList.add('open');
}

// ══════════════════════════════════════════
// CELL DETAIL SHEET
// ══════════════════════════════════════════

function getGenreForEntry(entry) {
  if (!entry) return null;
  return state.settings.genres.find(g =>
    g.items.includes(entry.name) || (entry.color && g.color === entry.color)
  ) || null;
}

function configureCellDetailFields(mode) {
  const isWorkLog = mode === 'worklog';
  document.getElementById('cellDetailBeforeField').style.display = isWorkLog ? 'none' : '';
  document.getElementById('cellDetailAfterField').style.display = isWorkLog ? 'none' : '';
  document.getElementById('cellTaskField').style.display = isWorkLog ? '' : 'none';
  document.getElementById('cellTaskLabel').textContent = '作業ログ';
}

function openCellDetail(dateStr, periodIdx, type) {
  const key = type === 'period' ? cellKey(dateStr, periodIdx) : `${dateStr}_${type}`;

  const d = new Date(dateStr + 'T00:00:00');
  const dateLabel = `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）`;
  const typeLabel = type === 'period'
    ? `${periodIdx+1}限`
    : type === 'mt' ? 'MT（朝の会）'
    : type === 'st' ? 'ST（帰りの会）'
    : type === 'after' ? '放課後'
    : '昼休み';
  const timetableData = type === 'period' || type === 'after' ? state.timetable[key] : null;
  const subjectName = timetableData?.name || '';
  const genre = getGenreForEntry(timetableData);
  const detailMode = genre?.name === 'その他' ? 'worklog' : 'prepost';

  state.cellDetailTarget = { key, dateStr, periodIdx, type, typeLabel, subjectName, detailMode };

  document.getElementById('cellDetailTitle').textContent = dateLabel;
  document.getElementById('cellDetailSub').textContent = typeLabel;
  configureCellDetailFields(detailMode);

  // Subject row
  const subjectRow = document.getElementById('cellDetailSubjectRow');
  if (timetableData) {
    const genreColor = genre?.color || timetableData.color || 'var(--text3)';
    document.getElementById('cellDetailGenreDot').style.background = genreColor;
    document.getElementById('cellDetailSubjectName').textContent = timetableData.name;
    subjectRow.style.display = 'flex';
  } else {
    subjectRow.style.display = 'none';
  }

  document.getElementById('cellDetailMemo').value = state.notes[key] || '';
  document.getElementById('cellDetailRecord').value = state.records[key] || '';
  renderCellTaskList(key);
  document.getElementById('cellDetailSheet').classList.add('open');
}

function closeCellDetail() {
  document.getElementById('cellDetailSheet').classList.remove('open');
  state.cellDetailTarget = null;
}

document.getElementById('cellDetailSaveBtn').addEventListener('click', () => {
  const t = state.cellDetailTarget;
  if (!t) return;
  if (t.detailMode === 'worklog') {
    delete state.notes[t.key];
    delete state.records[t.key];
  } else {
    const memo = document.getElementById('cellDetailMemo').value.trim();
    const record = document.getElementById('cellDetailRecord').value.trim();
    if (memo) { state.notes[t.key] = memo; } else { delete state.notes[t.key]; }
    if (record) { state.records[t.key] = record; } else { delete state.records[t.key]; }
  }
  save(); render();
  closeCellDetail();
});

document.getElementById('cellDetailDeleteBtn').addEventListener('click', () => {
  const t = state.cellDetailTarget;
  if (!t) return;
  saveSnapshot();
  delete state.timetable[t.key];
  delete state.notes[t.key];
  delete state.records[t.key];
  save(); render(); closeCellDetail();
  showToast('削除しました');
});

document.getElementById('cellDetailSheet').addEventListener('click', function(e) {
  if (e.target === this) closeCellDetail();
});

function renderCellTaskList(key) {
  const list = document.getElementById('cellTaskList');
  if (!list) return;
  list.innerHTML = '';
  const tasks = state.cellTasks[key] || [];
  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text3);font-size:12px;padding:8px 0';
    empty.textContent = '作業ログはありません';
    list.appendChild(empty);
    return;
  }
  tasks.forEach((task, i) => {
    const item = document.createElement('div');
    item.className = 'cell-task-item';
    item.style.opacity = task.done ? '0.55' : '1';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'cell-task-check';
    cb.checked = task.done;
    cb.addEventListener('change', function() {
      state.cellTasks[key][i].done = this.checked;
      save(); renderCellTaskList(key);
    });
    const txt = document.createElement('span');
    txt.className = 'cell-task-text' + (task.done ? ' done' : '');
    txt.textContent = task.text;
    const del = document.createElement('button');
    del.className = 'cell-task-del';
    del.textContent = '✕';
    del.addEventListener('click', () => {
      state.cellTasks[key].splice(i, 1);
      if (state.cellTasks[key].length === 0) delete state.cellTasks[key];
      save(); renderCellTaskList(key);
    });
    item.appendChild(cb); item.appendChild(txt); item.appendChild(del);
    list.appendChild(item);
  });
}

document.getElementById('cellTaskAddBtn').addEventListener('click', () => {
  const t = state.cellDetailTarget;
  if (!t) return;
  const text = document.getElementById('cellTaskInput').value.trim();
  if (!text) return;
  if (!state.cellTasks[t.key]) state.cellTasks[t.key] = [];
  state.cellTasks[t.key].push({ id: Date.now(), text, done: false });
  document.getElementById('cellTaskInput').value = '';
  save(); renderCellTaskList(t.key);
});

document.getElementById('cellTaskInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('cellTaskAddBtn').click();
});

// ══════════════════════════════════════════
// NOTE MODAL
// ══════════════════════════════════════════

function openNoteModal(dateStr, type) {
  state.noteTarget = { dateStr, type };
  const key = `${dateStr}_${type}`;
  document.getElementById('noteInput').value = state.notes[key] || '';
  const d = new Date(dateStr + 'T00:00:00');
  const label = type === 'mt' ? 'MT（朝の会）' : type === 'st' ? 'ST（帰りの会）' : type === 'lunch' ? '昼休み' : type === 'after' ? '放課後' : type === 'diary' ? 'アイデアメモ' : type === 'holiday' ? (state.holidays[dateStr] || '祝日') : '終日メモ';
  document.getElementById('noteModalTitle').textContent =
    `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}） ${label}`;
  document.getElementById('noteModalSub').textContent = 'メモを自由に入力できます';
  document.getElementById('noteModal').classList.add('open');
  setTimeout(() => document.getElementById('noteInput').focus(), 300);
}

function closeNoteModal() {
  document.getElementById('noteModal').classList.remove('open');
  state.noteTarget = null;
}

document.getElementById('confirmNoteBtn').addEventListener('click', () => {
  if (!state.noteTarget) return;
  const key = `${state.noteTarget.dateStr}_${state.noteTarget.type}`;
  const text = document.getElementById('noteInput').value.trim();
  if (text) { state.notes[key] = text; } else { delete state.notes[key]; }
  save(); render(); closeNoteModal();
});

document.getElementById('clearNoteBtn').addEventListener('click', () => {
  if (!state.noteTarget) return;
  delete state.notes[`${state.noteTarget.dateStr}_${state.noteTarget.type}`];
  save(); render(); closeNoteModal();
});

document.getElementById('cancelNoteBtn').addEventListener('click', closeNoteModal);
document.getElementById('noteModal').addEventListener('click', function(e) {
  if (e.target === this) closeNoteModal();
});

// ══════════════════════════════════════════
// IDEA MEMO MODAL
// ══════════════════════════════════════════

function openIdeaMemoModal(key, dateStr) {
  state.ideaMemoDate = { key, dateStr };
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('ideaMemoTitle').textContent =
    `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}） アイデアメモ`;
  renderIdeaMemoList(key);
  document.getElementById('ideaMemoModal').classList.add('open');
}

function closeIdeaMemoModal() {
  document.getElementById('ideaMemoModal').classList.remove('open');
  state.ideaMemoDate = null;
}

function renderIdeaMemoList(key) {
  const list = document.getElementById('ideaMemoList');
  list.innerHTML = '';
  const ideas = state.ideaMemos[key] || [];
  if (ideas.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text3);font-size:13px;padding:16px 0 8px';
    empty.textContent = 'アイデアはありません';
    list.appendChild(empty);
    return;
  }
  ideas.forEach((idea, i) => {
    const item = document.createElement('div');
    item.className = 'idea-item';
    const txt = document.createElement('span');
    txt.className = 'idea-item-text';
    txt.textContent = idea.text;
    const del = document.createElement('button');
    del.className = 'idea-item-del';
    del.textContent = '✕';
    del.addEventListener('click', () => {
      state.ideaMemos[key].splice(i, 1);
      if (state.ideaMemos[key].length === 0) delete state.ideaMemos[key];
      save(); render(); renderIdeaMemoList(key);
    });
    item.appendChild(txt); item.appendChild(del);
    list.appendChild(item);
  });
}

document.getElementById('ideaMemoAddBtn').addEventListener('click', () => {
  const target = state.ideaMemoDate;
  if (!target) return;
  const text = document.getElementById('ideaMemoInput').value.trim();
  if (!text) { showToast('内容を入力してください'); return; }
  if (!state.ideaMemos[target.key]) state.ideaMemos[target.key] = [];
  state.ideaMemos[target.key].push({ id: Date.now(), text });
  document.getElementById('ideaMemoInput').value = '';
  save(); render(); renderIdeaMemoList(target.key);
  showToast('追加しました');
});

document.getElementById('ideaMemoInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('ideaMemoAddBtn').click();
});

document.getElementById('closeIdeaMemoBtn').addEventListener('click', closeIdeaMemoModal);
document.getElementById('ideaMemoModal').addEventListener('click', function(e) {
  if (e.target === this) closeIdeaMemoModal();
});

// ══════════════════════════════════════════
// RECORD MODAL
// ══════════════════════════════════════════

function openRecordModal(key, label, subject) {
  state.recordTarget = { key, label, subject };
  document.getElementById('recordInput').value = state.records[key] || '';
  document.getElementById('recordModalTitle').textContent = label;
  document.getElementById('recordModalSub').textContent = subject || '';
  document.getElementById('recordModal').classList.add('open');
  setTimeout(() => document.getElementById('recordInput').focus(), 300);
}

function closeRecordModal() {
  document.getElementById('recordModal').classList.remove('open');
  state.recordTarget = null;
}

document.getElementById('confirmRecordBtn').addEventListener('click', () => {
  if (!state.recordTarget) return;
  const text = document.getElementById('recordInput').value.trim();
  saveSnapshot();
  if (text) { state.records[state.recordTarget.key] = text; } else { delete state.records[state.recordTarget.key]; }
  save(); render(); closeRecordModal();
  showToast('記録を保存しました');
});

document.getElementById('clearRecordBtn').addEventListener('click', () => {
  if (!state.recordTarget) return;
  saveSnapshot();
  delete state.records[state.recordTarget.key];
  save(); render(); closeRecordModal();
  showToast('記録を削除しました');
});

document.getElementById('cancelRecordBtn').addEventListener('click', closeRecordModal);
document.getElementById('recordModal').addEventListener('click', function(e) {
  if (e.target === this) closeRecordModal();
});
