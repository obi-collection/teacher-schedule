// ══════════════════════════════════════════
// TODAY VIEW（今日ビュー）
// 1日のタイムライン + 時刻指定の予定 + To Do
// ══════════════════════════════════════════

function setMainView(view) {
  state.mainView = view;
  document.getElementById('app').classList.toggle('mode-today', view === 'today');
  updateMainNavActive();
  if (view === 'week') {
    render();
  } else {
    renderTodayView();
  }
}

function updateMainNavActive() {
  const overlayOpen =
    document.getElementById('todoPanel').classList.contains('open') ||
    document.getElementById('recordsPanel').classList.contains('open');
  document.getElementById('navToday').classList.toggle('active', !overlayOpen && state.mainView === 'today');
  document.getElementById('navWeek').classList.toggle('active', !overlayOpen && state.mainView === 'week');
}

function tEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

function isSchoolDay(d, dk) {
  const dw = d.getDay();
  const isWeekend = dw === 0 || dw === 6;
  const isHoliday = !isWeekend && !!state.holidays[dk];
  return (!isWeekend && !isHoliday) || (isWeekend && state.settings.weekendPeriods);
}

function renderTodayView() {
  const container = document.getElementById('todayScroll');
  if (!container) return;
  if (!document.getElementById('app').classList.contains('mode-today')) return;

  const today = new Date();
  const dk = dateKey(today);
  container.innerHTML = '';

  container.appendChild(buildTodayHero(today, dk));

  // ★予定（終日）
  const events = state.events.map((ev, idx) => ({ ev, idx })).filter(({ ev }) => ev.date === dk);
  container.appendChild(buildTodaySectionTitle('今日の予定', events.length, () => openEventModal(dk), () => openUpcomingSheet()));
  if (events.length > 0) {
    const wrap = tEl('div', 'today-events');
    events.forEach(({ ev, idx }) => {
      const chip = tEl('div', 'today-event-chip');
      chip.appendChild(tEl('span', 'dot'));
      chip.appendChild(tEl('span', '', ev.title));
      chip.addEventListener('click', () => openEventDetail(ev, idx));
      wrap.appendChild(chip);
    });
    container.appendChild(wrap);
  }

  // タイムライン
  container.appendChild(buildTodaySectionTitle('タイムライン'));
  container.appendChild(buildTodayTimeline(today, dk));

  const addTimedBtn = tEl('button', 'today-add-btn', '＋ 時刻を決めて予定を追加（面談・出張など）');
  addTimedBtn.addEventListener('click', () => openDayScheduleModal(dk));
  container.appendChild(addTimedBtn);

  // To Do
  const pending = state.todos.map((t, i) => ({ t, i })).filter(({ t }) => !t.done);
  container.appendChild(buildTodaySectionTitle('To Do', pending.length));
  container.appendChild(buildTodayTodos(pending));

  // 明日の予告
  const peek = buildTomorrowPeek(today);
  if (peek) container.appendChild(peek);
}

function buildTodaySectionTitle(label, count, onAdd, onList) {
  const el = tEl('div', 'today-section-title', label);
  if (count !== undefined && count > 0) el.appendChild(tEl('span', 'count', String(count)));
  const actionCss = 'background:none;border:none;color:var(--accent);font-size:12px;cursor:pointer;font-family:inherit;padding:4px 6px';
  if (onList) {
    const btn = tEl('button', '', '一覧 ›');
    btn.style.cssText = 'margin-left:auto;' + actionCss;
    btn.addEventListener('click', onList);
    el.appendChild(btn);
  }
  if (onAdd) {
    const btn = tEl('button', '', '＋ 追加');
    btn.style.cssText = (onList ? '' : 'margin-left:auto;') + actionCss;
    btn.addEventListener('click', onAdd);
    el.appendChild(btn);
  }
  return el;
}

function buildTodayHero(today, dk) {
  const hero = tEl('div', 'today-hero');
  const top = tEl('div', 'today-hero-top');
  top.appendChild(tEl('span', 'today-hero-date', `${today.getMonth() + 1}月${today.getDate()}日`));
  top.appendChild(tEl('span', 'today-hero-dow', `${DAY_NAMES[today.getDay()]}曜日`));
  if (state.holidays[dk]) top.appendChild(tEl('span', 'today-hero-holiday', state.holidays[dk]));
  hero.appendChild(top);

  const status = tEl('div', 'today-hero-status');
  const schoolDay = isSchoolDay(today, dk);

  if (schoolDay) {
    const { nowMin, current, next } = getNowStatus();
    const nowLine = tEl('div', 'today-hero-now');
    if (current) {
      nowLine.appendChild(tEl('span', 'now-dot'));
      const name = current.type === 'period' || current.type === 'after'
        ? (state.timetable[current.key]?.name || '')
        : (state.notes[current.key] || '');
      nowLine.appendChild(tEl('span', '', `いま：${current.label}${name ? '　' + name : ''}`));
      status.appendChild(nowLine);
      if (next) {
        const mins = next.startMin - nowMin;
        status.appendChild(tEl('div', 'today-hero-next',
          `次：${next.label} ${formatMin(next.startMin)}〜（あと${mins}分）`));
      }
    } else if (next) {
      const mins = next.startMin - nowMin;
      nowLine.appendChild(tEl('span', '', `今日は ${formatMin(next.startMin)} の${next.label}から`));
      status.appendChild(nowLine);
      if (mins <= 120) {
        status.appendChild(tEl('div', 'today-hero-next', `あと${mins}分`));
      }
    } else {
      nowLine.appendChild(tEl('span', '', '今日の予定は終了。おつかれさまでした'));
      status.appendChild(nowLine);
    }
  } else {
    const entries = (state.daySchedules[dk] || []).slice().sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    const nowLine = tEl('div', 'today-hero-now');
    if (entries.length > 0) {
      nowLine.appendChild(tEl('span', '', `今日の予定 ${entries.length}件`));
    } else {
      nowLine.appendChild(tEl('span', '', '今日はお休み。ゆっくり過ごしましょう'));
    }
    status.appendChild(nowLine);
  }
  hero.appendChild(status);

  // メタ情報（記録数など）
  let recordCount = 0;
  Object.keys(state.records).forEach(k => { if (k.startsWith(dk + '_')) recordCount++; });
  const meta = tEl('div', 'today-hero-meta');
  meta.appendChild(tEl('span', '', `記録 ${recordCount}件`));
  const pendingTodos = state.todos.filter(t => !t.done).length;
  if (pendingTodos > 0) meta.appendChild(tEl('span', '', `To Do 残り${pendingTodos}件`));
  hero.appendChild(meta);
  return hero;
}

function buildTodayTimeline(today, dk) {
  const tl = tEl('div', 'tl');
  const schoolDay = isSchoolDay(today, dk);
  const { nowMin, current } = getNowStatus();

  const items = [];

  if (schoolDay) {
    buildDaySlots(dk).forEach(slot => {
      items.push({ sortMin: slot.startMin !== null ? slot.startMin : 24 * 60, kind: 'slot', slot });
    });
  }

  (state.daySchedules[dk] || []).forEach(entry => {
    const m = parseTimeToMin(entry.startTime);
    items.push({ sortMin: m !== null ? m + 0.5 : -1, kind: 'timed', entry });
  });

  items.sort((a, b) => a.sortMin - b.sortMin);

  if (items.length === 0) {
    const empty = tEl('div', 'today-empty-note', '今日はコマがありません。下のボタンから予定を追加できます');
    tl.appendChild(empty);
    return tl;
  }

  items.forEach(item => {
    if (item.kind === 'slot') {
      tl.appendChild(buildSlotCard(item.slot, dk, nowMin, current));
    } else {
      tl.appendChild(buildTimedCard(item.entry, dk, nowMin));
    }
  });
  return tl;
}

function buildSlotCard(slot, dk, nowMin, current) {
  const isNow = current && current.key === slot.key && current.type === slot.type;
  const isPast = !isNow && slot.endMin !== null && nowMin >= slot.endMin;

  const item = tEl('div', 'tl-item' + (isNow ? ' now' : '') + (isPast ? ' past' : ''));

  const time = tEl('div', 'tl-time');
  time.appendChild(tEl('span', 'tl-time-start', slot.startMin !== null ? formatMin(slot.startMin) : ''));
  if (slot.type === 'period' && slot.endMin !== null) {
    time.appendChild(tEl('span', 'tl-time-end', formatMin(slot.endMin)));
  }
  item.appendChild(time);

  const card = tEl('div', 'tl-card');
  const bar = tEl('div', 'tl-bar');
  const main = tEl('div', 'tl-main');
  const head = tEl('div', 'tl-head');
  head.appendChild(tEl('span', 'tl-label', slot.label));
  if (isNow) head.appendChild(tEl('span', 'now-chip', 'いま'));

  const key = slot.key;
  const entry = (slot.type === 'period' || slot.type === 'after') ? state.timetable[key] : null;
  const noteText = state.notes[key] || '';
  const recordText = state.records[key] || '';
  const tasks = state.cellTasks[key] || [];
  const students = state.cellStudents[key] || [];

  if (slot.type === 'period' || slot.type === 'after') {
    if (entry) {
      const color = getScheduleColor(entry);
      if (color) bar.style.background = color;
      head.appendChild(tEl('span', 'tl-subject', entry.name));
    } else {
      head.appendChild(tEl('span', 'tl-subject empty', slot.type === 'after' ? '放課後の予定なし' : '＋ 予定を入れる'));
    }
  } else {
    // mt / lunch / st
    const studentSummary = students.length
      ? `${students[0].name}、${students[0].text}${students.length > 1 ? `…他${students.length - 1}件` : ''}`
      : '';
    const text = studentSummary || noteText;
    if (text) {
      head.appendChild(tEl('span', 'tl-subject', text));
    } else {
      head.appendChild(tEl('span', 'tl-subject empty', 'メモなし'));
    }
  }
  main.appendChild(head);

  // プレビュー行（事前/事後/作業ログ）
  const previews = [];
  if (slot.type === 'period' || slot.type === 'after') {
    if (noteText) previews.push(['事前', noteText]);
  }
  if (recordText) previews.push(['事後', recordText]);
  const openTasks = tasks.filter(t => !t.done);
  if (tasks.length > 0) previews.push(['作業', openTasks.length ? openTasks.map(t => t.text).join(' / ') : 'すべて完了 ✓']);
  if (previews.length > 0) {
    const pv = tEl('div', 'tl-preview');
    previews.forEach(([labelText, body], i) => {
      if (i > 0) pv.appendChild(document.createTextNode('　'));
      const b = tEl('b', '', labelText + ': ');
      pv.appendChild(b);
      pv.appendChild(document.createTextNode(body));
    });
    main.appendChild(pv);
  }

  card.appendChild(bar);
  card.appendChild(main);

  if (recordText || noteText) {
    const badges = tEl('div', 'tl-badges');
    const dot = tEl('span', 'tl-badge-dot');
    dot.style.background = recordText ? 'var(--good)' : 'var(--border2)';
    badges.appendChild(dot);
    card.appendChild(badges);
  }

  card.addEventListener('click', () => {
    if (slot.type === 'period') {
      if (entry) openCellDetail(dk, slot.index, 'period');
      else openSubjectModal(dk, slot.index);
    } else if (slot.type === 'after') {
      if (entry) openCellDetail(dk, null, 'after');
      else openSpecialSubjectModal(dk, 'after');
    } else {
      openCellDetail(dk, null, slot.type);
    }
  });

  item.appendChild(card);
  return item;
}

function buildTimedCard(entry, dk, nowMin) {
  const startMin = parseTimeToMin(entry.startTime);
  const endMin = parseTimeToMin(entry.endTime);
  const isPast = endMin !== null ? nowMin >= endMin : (startMin !== null && nowMin >= startMin + 60);

  const item = tEl('div', 'tl-item timed' + (isPast ? ' past' : ''));
  const time = tEl('div', 'tl-time');
  time.appendChild(tEl('span', 'tl-time-start', entry.startTime || ''));
  if (entry.endTime) time.appendChild(tEl('span', 'tl-time-end', entry.endTime));
  item.appendChild(time);

  const card = tEl('div', 'tl-card');
  card.appendChild(tEl('div', 'tl-bar'));
  const main = tEl('div', 'tl-main');
  const head = tEl('div', 'tl-head');
  head.appendChild(tEl('span', 'tl-label', '予定'));
  head.appendChild(tEl('span', 'tl-subject', entry.content));
  main.appendChild(head);
  card.appendChild(main);
  card.addEventListener('click', () => openDayScheduleModal(dk));
  item.appendChild(card);
  return item;
}

function buildTodayTodos(pending) {
  const card = tEl('div', 'today-todo-card');
  if (pending.length === 0) {
    card.appendChild(tEl('div', 'today-empty-note', 'やることはありません 🎉'));
    return card;
  }
  const MAX = 4;
  pending.slice(0, MAX).forEach(({ t, i }) => {
    const row = tEl('div', 'today-todo-row');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'todo-check';
    cb.checked = false;
    cb.addEventListener('change', () => {
      state.todos[i].done = cb.checked;
      save();
      setTimeout(() => renderTodayView(), 250);
    });
    row.appendChild(cb);
    row.appendChild(tEl('span', 'today-todo-text', t.text));
    card.appendChild(row);
  });
  const more = tEl('button', 'today-todo-more',
    pending.length > MAX ? `すべて見る（他${pending.length - MAX}件）` : 'To Do リストを開く');
  more.addEventListener('click', () => openTodoPanel());
  card.appendChild(more);
  return card;
}

function buildTomorrowPeek(today) {
  const tmr = addDays(today, 1);
  const dk = dateKey(tmr);
  const parts = [];

  const filled = state.settings.periods.filter((p, i) => state.timetable[cellKey(dk, i)]).length;
  if (filled > 0) parts.push(`授業・予定 ${filled}コマ`);
  const evs = state.events.filter(e => e.date === dk);
  evs.slice(0, 2).forEach(e => parts.push(e.title));
  const timed = (state.daySchedules[dk] || []);
  timed.slice(0, 2).forEach(e => parts.push(`${e.startTime || ''} ${e.content}`.trim()));
  if (state.holidays[dk]) parts.unshift(state.holidays[dk]);

  const card = tEl('div', 'tomorrow-card');
  card.appendChild(tEl('span', 'tomorrow-label', `明日 ${tmr.getMonth() + 1}/${tmr.getDate()}（${DAY_NAMES[tmr.getDay()]}）`));
  card.appendChild(tEl('span', 'tomorrow-text', parts.length ? parts.join('・') : '予定はまだありません'));
  card.appendChild(tEl('span', 'tomorrow-arrow', '›'));
  card.addEventListener('click', () => {
    state.currentWeekStart = getWeekStart(tmr);
    save();
    setMainView('week');
  });
  return card;
}

document.getElementById('navToday').addEventListener('click', () => {
  closeTodoPanel();
  closeSettingsPanel();
  closeRecordsPanel();
  setMainView('today');
});
