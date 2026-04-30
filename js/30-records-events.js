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
  document.getElementById('recordsTabBtn').style.color = 'var(--accent)';
  document.getElementById('recordsTabBtn').style.borderBottomColor = 'var(--accent)';
  document.getElementById('studentsTabBtn').style.color = 'var(--text3)';
  document.getElementById('studentsTabBtn').style.borderBottomColor = 'transparent';
  document.getElementById('recordsTabContent').style.display = '';
  document.getElementById('studentsTabContent').style.display = 'none';
}

function closeRecordsPanel() {
  document.getElementById('recordsPanel').classList.remove('open');
  document.getElementById('navRecords').classList.remove('active');
  document.getElementById('navWeek').classList.add('active');
}

function renderRecordsPanel() {
  const y = state.recordsYear;
  const m = state.recordsMonth;
  document.getElementById('recordsMonthLabel').textContent =
    `${y}年${m + 1}月`;

  // Genre filter buttons
  const filterRow = document.getElementById('recordsFilterRow');
  filterRow.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'records-filter-btn' + (state.recordsFilterGenre === null ? ' active' : '');
  allBtn.textContent = 'すべて';
  allBtn.addEventListener('click', () => { state.recordsFilterGenre = null; renderRecordsPanel(); });
  filterRow.appendChild(allBtn);
  state.settings.genres.forEach((g, gi) => {
    const btn = document.createElement('button');
    btn.className = 'records-filter-btn' + (state.recordsFilterGenre === gi ? ' active' : '');
    btn.textContent = g.name;
    btn.style.borderColor = g.color;
    if (state.recordsFilterGenre === gi) btn.style.background = g.color + '30';
    btn.addEventListener('click', () => { state.recordsFilterGenre = gi; renderRecordsPanel(); });
    filterRow.appendChild(btn);
  });

  // Build list of records for this month
  const list = document.getElementById('recordsList');
  list.innerHTML = '';
  const entries = [];

  Object.entries(state.records).forEach(([key, text]) => {
    // key format: YYYY-MM-DD_p0, YYYY-MM-DD_lunch, YYYY-MM-DD_after, YYYY-MM-DD_diary
    const match = key.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
    if (!match) return;
    const dateStr = match[1];
    const periodPart = match[2];
    const d = new Date(dateStr + 'T00:00:00');
    if (d.getFullYear() !== y || d.getMonth() !== m) return;

    let periodLabel = '';
    let subjectName = '';
    let genreIdx = -1;

    if (periodPart.startsWith('p')) {
      const pi = parseInt(periodPart.slice(1));
      periodLabel = `${pi + 1}限`;
      const cellData = state.timetable[key.replace('_' + periodPart, '_p' + pi)] || state.timetable[cellKey(dateStr, pi)];
      if (cellData) {
        subjectName = cellData.name;
        // Find genre index
        state.settings.genres.forEach((g, gi) => {
          if (g.subjects && g.subjects.some(s => s.name === cellData.name)) genreIdx = gi;
        });
      }
    } else if (periodPart === 'mt' || periodPart === 'st' || periodPart === 'after') {
      periodLabel = periodPart === 'mt' ? 'MT' : periodPart === 'st' ? 'ST' : '放課後';
      const cellData = state.timetable[`${dateStr}_${periodPart}`];
      if (cellData) subjectName = cellData.name;
    } else {
      periodLabel = periodPart === 'lunch' ? '昼休み' : 'アイデアメモ';
    }

    if (state.recordsFilterGenre !== null && genreIdx !== state.recordsFilterGenre) return;

    entries.push({ dateStr, d, periodLabel, subjectName, text, key });
  });

  entries.sort((a, b) => a.d - b.d || a.periodLabel.localeCompare(b.periodLabel));

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'records-empty';
    empty.textContent = 'この月の記録はありません';
    list.appendChild(empty);
    return;
  }

  const DAY_JP = ['日','月','火','水','木','金','土'];
  entries.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'record-entry';
    const meta = document.createElement('div');
    meta.className = 'record-entry-meta';
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
    const textEl = document.createElement('div');
    textEl.className = 'record-entry-text';
    textEl.textContent = entry.text;
    el.appendChild(meta);
    el.appendChild(textEl);
    el.addEventListener('click', () => {
      closeRecordsPanel();
      openRecordModal(entry.key, entry.periodLabel, entry.subjectName);
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
