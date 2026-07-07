// ══════════════════════════════════════════
// RECORDS PANEL
// ══════════════════════════════════════════

function openRecordsPanel() {
  state.recordsYear = new Date().getFullYear();
  state.recordsMonth = new Date().getMonth();
  state.recordsFilterGenre = null;
  renderRecordsPanel();
  document.getElementById('recordsPanel').classList.add('open');
  document.getElementById('navRecords').classList.add('active');
  document.getElementById('navWeek').classList.remove('active');
  document.getElementById('navTodo').classList.remove('active');
  // Reset tabs
  document.getElementById('recordsTabBtn').classList.add('active');
  document.getElementById('studentsTabBtn').classList.remove('active');
  document.getElementById('recordsTabContent').style.display = '';
  document.getElementById('studentsTabContent').style.display = 'none';
}

function closeRecordsPanel() {
  document.getElementById('recordsPanel').classList.remove('open');
  document.getElementById('navRecords').classList.remove('active');
  document.getElementById('navWeek').classList.add('active');
}

function getRecordGenreIndex(entry) {
  return getScheduleGenreIndex(entry);
}

function getLessonGenreIndex() {
  return state.settings.genres.findIndex(g => g.name === '授業');
}

function isLessonEntry(entry) {
  const lessonGenreIdx = getLessonGenreIndex();
  return lessonGenreIdx !== -1 && getRecordGenreIndex(entry) === lessonGenreIdx;
}

function collectLessonRecordEntries({ year = null, month = null, subjectName = null, includeBefore = false } = {}) {
  const entries = [];
  Object.keys({ ...state.records, ...(includeBefore ? state.notes : {}) }).forEach(key => {
    const match = key.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
    if (!match) return;
    const dateStr = match[1];
    const periodPart = match[2];
    if (!periodPart.startsWith('p')) return;

    const d = new Date(dateStr + 'T00:00:00');
    if (year !== null && d.getFullYear() !== year) return;
    if (month !== null && d.getMonth() !== month) return;

    const pi = parseInt(periodPart.slice(1));
    const cellData = state.timetable[cellKey(dateStr, pi)];
    if (!cellData || !isLessonEntry(cellData)) return;
    if (subjectName && cellData.name !== subjectName) return;

    const before = state.notes[key] || '';
    const after = state.records[key] || '';
    if (!before && !after) return;

    entries.push({
      dateStr,
      d,
      periodLabel: `${pi + 1}限`,
      subjectName: cellData.name,
      text: after,
      before,
      key
    });
  });
  entries.sort((a, b) => a.d - b.d || a.periodLabel.localeCompare(b.periodLabel));
  return entries;
}

// 記録一覧: 授業だけでなく、会議・その他・MT・昼休み・ST・放課後の
// 記録/メモ/作業ログもすべて集めて振り返れるようにする（読み取りのみ）。
const RECORD_SLOT_LABELS = { mt: 'MT', lunch: '昼休み', st: 'ST', after: '放課後' };
const RECORD_SLOT_ORDER  = { mt: -1, lunch: 3.5, st: 900, after: 990 };

function collectAllRecordEntries({ year, month, filter = null }) {
  const entries = [];
  const keys = new Set([
    ...Object.keys(state.records),
    ...Object.keys(state.notes),
    ...Object.keys(state.cellTasks)
  ]);

  keys.forEach(key => {
    const match = key.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
    if (!match) return;
    const dateStr = match[1];
    const part = match[2];
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getFullYear() !== year || d.getMonth() !== month) return;

    let periodIdx = null;
    let type = null;
    let periodLabel, slotOrder;
    if (part.startsWith('p')) {
      periodIdx = parseInt(part.slice(1), 10);
      if (Number.isNaN(periodIdx)) return;
      periodLabel = `${periodIdx + 1}限`;
      slotOrder = periodIdx;
    } else if (RECORD_SLOT_LABELS[part]) {
      type = part;
      periodLabel = RECORD_SLOT_LABELS[part];
      slotOrder = RECORD_SLOT_ORDER[part];
    } else {
      return; // アイデアメモなどは対象外
    }

    const before = state.notes[key] || '';
    const after = state.records[key] || '';
    const tasks = (state.cellTasks[key] || []).filter(t => t.text);
    if (!before && !after && tasks.length === 0) return;

    const cellData = state.timetable[key] || null;
    const genreIdx = cellData ? getScheduleGenreIndex(cellData) : -1;
    if (filter !== null) {
      if (filter === 'special') {
        if (!type) return;
      } else if (genreIdx !== filter) {
        return;
      }
    }

    entries.push({
      key, dateStr, d, periodIdx, type, periodLabel, slotOrder,
      subjectName: cellData?.name || '',
      genreColor: cellData ? getScheduleColor(cellData) : null,
      before, text: after, tasks
    });
  });

  entries.sort((a, b) => a.d - b.d || a.slotOrder - b.slotOrder);
  return entries;
}

function renderRecordsFilterRow() {
  const row = document.getElementById('recordsFilterRow');
  row.innerHTML = '';
  row.style.display = '';
  const chips = [{ value: null, label: 'すべて' }];
  state.settings.genres.forEach((g, gi) => chips.push({ value: gi, label: g.name }));
  chips.push({ value: 'special', label: 'MT・STなど' });
  chips.forEach(chip => {
    const btn = document.createElement('button');
    btn.className = 'records-filter-btn' + (state.recordsFilterGenre === chip.value ? ' active' : '');
    btn.textContent = chip.label;
    btn.addEventListener('click', () => {
      state.recordsFilterGenre = chip.value;
      renderRecordsPanel();
    });
    row.appendChild(btn);
  });
}

function renderRecordsPanel() {
  const y = state.recordsYear;
  const m = state.recordsMonth;
  document.getElementById('recordsMonthLabel').textContent =
    `${y}年${m + 1}月`;

  renderRecordsFilterRow();

  const list = document.getElementById('recordsList');
  list.innerHTML = '';
  const entries = collectAllRecordEntries({ year: y, month: m, filter: state.recordsFilterGenre });

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'records-empty';
    empty.textContent = 'この月の記録はありません';
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:12px;color:var(--text3);margin-top:8px;line-height:1.6';
    hint.textContent = 'コマをタップして「事前」「事後」に入力すると、ここに表示されます';
    empty.appendChild(hint);
    list.appendChild(empty);
    return;
  }

  const DAY_JP = ['日','月','火','水','木','金','土'];
  entries.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'record-entry';
    const meta = document.createElement('div');
    meta.className = 'record-entry-meta';
    if (entry.genreColor) {
      const dot = document.createElement('span');
      dot.className = 'record-entry-dot';
      dot.style.background = entry.genreColor;
      meta.appendChild(dot);
    }
    const dateLbl = document.createElement('span');
    dateLbl.className = 'record-entry-date';
    dateLbl.textContent = `${entry.d.getMonth()+1}/${entry.d.getDate()}（${DAY_JP[entry.d.getDay()]}）`;
    const periodLbl = document.createElement('span');
    periodLbl.className = 'record-entry-period';
    periodLbl.textContent = entry.periodLabel;
    meta.appendChild(dateLbl);
    meta.appendChild(periodLbl);
    if (entry.subjectName) {
      const subjLbl = document.createElement('span');
      subjLbl.className = 'record-entry-subject';
      subjLbl.textContent = entry.subjectName;
      meta.appendChild(subjLbl);
    }
    el.appendChild(meta);
    if (entry.before) {
      const beforeEl = document.createElement('div');
      beforeEl.className = 'record-entry-before';
      beforeEl.textContent = '事前: ' + entry.before;
      el.appendChild(beforeEl);
    }
    if (entry.text) {
      const textEl = document.createElement('div');
      textEl.className = 'record-entry-text';
      textEl.textContent = entry.text;
      el.appendChild(textEl);
    }
    if (entry.tasks.length > 0) {
      const tasksEl = document.createElement('div');
      tasksEl.className = 'record-entry-tasks';
      tasksEl.textContent = '作業ログ: ' + entry.tasks.map(t => (t.done ? '✓' : '') + t.text).join(' / ');
      el.appendChild(tasksEl);
    }
    el.addEventListener('click', () => {
      closeRecordsPanel();
      if (entry.type) {
        openCellDetail(entry.dateStr, null, entry.type);
      } else {
        openCellDetail(entry.dateStr, entry.periodIdx, 'period');
      }
    });
    list.appendChild(el);
  });
}

document.getElementById('closeRecordsPanelBtn').addEventListener('click', closeRecordsPanel);
document.getElementById('recordsPrevMonth').addEventListener('click', () => {
  state.recordsMonth--;
  if (state.recordsMonth < 0) { state.recordsMonth = 11; state.recordsYear--; }
  renderRecordsPanel();
});
document.getElementById('recordsNextMonth').addEventListener('click', () => {
  state.recordsMonth++;
  if (state.recordsMonth > 11) { state.recordsMonth = 0; state.recordsYear++; }
  renderRecordsPanel();
});
document.getElementById('navRecords').addEventListener('click', openRecordsPanel);

// ══════════════════════════════════════════
// DAY SCHEDULE MODAL (休日・土日の複数予定)
// ══════════════════════════════════════════

function openDayScheduleModal(dateStr) {
  state.dayScheduleDate = dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('dayScheduleTitle').textContent =
    `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）`;
  document.getElementById('dsStartTime').value = '';
  document.getElementById('dsEndTime').value   = '';
  document.getElementById('dsContent').value   = '';
  renderDayScheduleList(dateStr);
  document.getElementById('dayScheduleModal').classList.add('open');
}

function closeDayScheduleModal() {
  document.getElementById('dayScheduleModal').classList.remove('open');
  state.dayScheduleDate = null;
}

function renderDayScheduleList(dateStr) {
  const list = document.getElementById('dayScheduleList');
  list.innerHTML = '';
  const entries = (state.daySchedules[dateStr] || []).slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text3);font-size:12px;padding:12px 0 8px';
    empty.textContent = '予定はありません';
    list.appendChild(empty);
    return;
  }
  entries.forEach(entry => {
    const origArr = state.daySchedules[dateStr];
    const origIdx = origArr.findIndex(e => e.id === entry.id);
    const item = document.createElement('div');
    item.className = 'ds-item';
    const timeEl = document.createElement('span');
    timeEl.className = 'ds-item-time';
    timeEl.textContent = entry.startTime
      ? entry.startTime + (entry.endTime ? '–' + entry.endTime : '')
      : '–';
    const contentEl = document.createElement('span');
    contentEl.className = 'ds-item-content';
    contentEl.textContent = entry.content;
    const delBtn = document.createElement('button');
    delBtn.className = 'ds-item-del';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
      saveSnapshot();
      origArr.splice(origIdx, 1);
      if (origArr.length === 0) delete state.daySchedules[dateStr];
      save(); render(); renderDayScheduleList(dateStr);
    });
    item.appendChild(timeEl);
    item.appendChild(contentEl);
    item.appendChild(delBtn);
    list.appendChild(item);
  });
}

document.getElementById('dsAddBtn').addEventListener('click', () => {
  const dateStr = state.dayScheduleDate;
  if (!dateStr) return;
  const content = document.getElementById('dsContent').value.trim();
  if (!content) { showToast('内容を入力してください'); return; }
  saveSnapshot();
  if (!state.daySchedules[dateStr]) state.daySchedules[dateStr] = [];
  state.daySchedules[dateStr].push({
    id: Date.now(),
    startTime: document.getElementById('dsStartTime').value,
    endTime:   document.getElementById('dsEndTime').value,
    content
  });
  document.getElementById('dsStartTime').value = '';
  document.getElementById('dsEndTime').value   = '';
  document.getElementById('dsContent').value   = '';
  save(); render(); renderDayScheduleList(dateStr);
  showToast('追加しました');
});

document.getElementById('closeDayScheduleBtn').addEventListener('click', closeDayScheduleModal);
document.getElementById('dayScheduleModal').addEventListener('click', function(e) {
  if (e.target === this) closeDayScheduleModal();
});

// ══════════════════════════════════════════
// EVENT DETAIL POPUP (⭐チップのフルテキスト)
// ══════════════════════════════════════════

function openEventDetail(ev, evIdx) {
  state.selectedEventDetailIdx = evIdx;
  const catLabel = ev.category === 'gyoji' ? '行事' : ev.category === 'task' ? 'タスク・締切' : '業務・校務';
  const d = new Date(ev.date + 'T00:00:00');
  document.getElementById('eventDetailTitle').textContent = ev.title;
  document.getElementById('eventDetailMeta').textContent =
    `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}） ${catLabel}`;
  document.getElementById('eventDetailModal').classList.add('open');
}

function closeEventDetail() {
  document.getElementById('eventDetailModal').classList.remove('open');
  state.selectedEventDetailIdx = null;
}

document.getElementById('deleteEventDetailBtn').addEventListener('click', () => {
  if (state.selectedEventDetailIdx === null) return;
  saveSnapshot();
  state.events.splice(state.selectedEventDetailIdx, 1);
  save(); render(); closeEventDetail();
  showToast('削除しました');
});

document.getElementById('closeEventDetailBtn').addEventListener('click', closeEventDetail);
document.getElementById('eventDetailModal').addEventListener('click', function(e) {
  if (e.target === this) closeEventDetail();
});

// ══════════════════════════════════════════
// DAY EVENTS SHEET (⭐行の空きエリアタップ)
// ══════════════════════════════════════════

function openDayEventsSheet(dateStr) {
  const dayEvents = state.events.filter(ev => ev.date === dateStr);
  if (dayEvents.length === 0) {
    openEventModal(dateStr);
    return;
  }

  state.dayEventsDate = dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('dayEventsTitle').textContent =
    `${d.getMonth()+1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}） の予定`;
  renderDayEventsSheet(dateStr);
  document.getElementById('dayEventsSheet').classList.add('open');
}

function closeDayEventsSheet() {
  document.getElementById('dayEventsSheet').classList.remove('open');
  state.dayEventsDate = null;
}

function renderDayEventsSheet(dateStr) {
  const list = document.getElementById('dayEventsList');
  list.innerHTML = '';
  const dayEvents = state.events.map((ev, idx) => ({ev, idx})).filter(({ev}) => ev.date === dateStr);
  if (dayEvents.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text3);font-size:13px;padding:16px 0 8px';
    empty.textContent = 'この日の予定はありません';
    list.appendChild(empty);
    return;
  }
  const catColors = { gyoji: 'var(--event)', task: 'var(--task)', 'kōmu': 'var(--accent)' };
  dayEvents.forEach(({ev, idx}) => {
    const item = document.createElement('div');
    item.className = 'day-event-item';
    const dot = document.createElement('span');
    dot.className = 'day-event-cat-dot';
    dot.style.background = catColors[ev.category] || 'var(--text3)';
    const text = document.createElement('span');
    text.className = 'day-event-item-text';
    text.textContent = ev.title;
    item.appendChild(dot);
    item.appendChild(text);
    item.addEventListener('click', () => {
      closeDayEventsSheet();
      openEventDetail(ev, idx);
    });
    list.appendChild(item);
  });
}

document.getElementById('dayEventsAddBtn').addEventListener('click', () => {
  const dateStr = state.dayEventsDate;
  closeDayEventsSheet();
  openEventModal(dateStr);
});

document.getElementById('closeDayEventsBtn').addEventListener('click', closeDayEventsSheet);
document.getElementById('dayEventsSheet').addEventListener('click', function(e) {
  if (e.target === this) closeDayEventsSheet();
});

// ══════════════════════════════════════════
// EVENT MODAL
// ══════════════════════════════════════════

function openEventModal(dateStr) {
  state.eventTargetDate = dateStr || dateKey(new Date());
  document.getElementById('eventTitle').value = '';
  document.getElementById('eventModal').classList.add('open');
}

document.getElementById('eventGutter').addEventListener('click', () => openEventModal(dateKey(new Date())));

document.getElementById('confirmEventBtn').addEventListener('click', () => {
  const title = document.getElementById('eventTitle').value.trim();
  const date  = state.eventTargetDate;
  if (!title || !date) { showToast('タイトルを入力してください'); return; }
  saveSnapshot();
  state.events.push({ title, date, category: 'gyoji' });
  save(); render();
  state.eventTargetDate = null;
  document.getElementById('eventModal').classList.remove('open');
  showToast('予定を追加しました');
});

document.getElementById('cancelEventBtn').addEventListener('click', () => {
  state.eventTargetDate = null;
  document.getElementById('eventModal').classList.remove('open');
});
document.getElementById('eventModal').addEventListener('click', function(e) {
  if (e.target === this) {
    state.eventTargetDate = null;
    this.classList.remove('open');
  }
});
