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
  if (getVacationForDate(dk)) return false; // 長期休み中は時間割なし
  const dw = d.getDay();
  const isWeekend = dw === 0 || dw === 6;
  const isHoliday = !isWeekend && !!state.holidays[dk];
  return (!isWeekend && !isHoliday) || (isWeekend && state.settings.weekendPeriods);
}

// 今日ビューで表示中の日付（今日以外の日も閲覧・入力できる）
function getTodayViewDate() {
  return state.todayViewDate
    ? new Date(state.todayViewDate + 'T00:00:00')
    : new Date();
}

function moveTodayView(deltaDays) {
  const next = addDays(getTodayViewDate(), deltaDays);
  const nk = dateKey(next);
  state.todayViewDate = nk === dateKey(new Date()) ? null : nk;
  renderTodayView();
}

function renderTodayView() {
  const container = document.getElementById('todayScroll');
  if (!container) return;
  if (!document.getElementById('app').classList.contains('mode-today')) return;

  const viewDate = getTodayViewDate();
  const dk = dateKey(viewDate);
  const isActualToday = dk === dateKey(new Date());
  container.innerHTML = '';

  container.appendChild(buildTodayHero(viewDate, dk, isActualToday));

  // ★予定（終日）
  const events = state.events.map((ev, idx) => ({ ev, idx })).filter(({ ev }) => ev.date === dk);
  container.appendChild(buildTodaySectionTitle(isActualToday ? '今日の予定' : 'この日の予定', events.length, () => openEventModal(dk), () => openUpcomingSheet()));
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
  container.appendChild(buildTodayTimeline(viewDate, dk, isActualToday));

  const addTimedBtn = tEl('button', 'today-add-btn', '＋ 時刻を決めて予定を追加（面談・出張など）');
  addTimedBtn.addEventListener('click', () => openDayScheduleModal(dk));
  container.appendChild(addTimedBtn);

  // 写真メモ（プリント・板書などをそのまま貼っておける）
  container.appendChild(buildTodaySectionTitle('写真メモ', undefined, () => requestAddDayImage(dk)));
  const photoGrid = tEl('div', 'day-photo-grid');
  photoGrid.style.display = 'none';
  container.appendChild(photoGrid);
  renderDayImageThumbs(photoGrid, dk);

  // To Do
  const pending = state.todos.map((t, i) => ({ t, i })).filter(({ t }) => !t.done);
  container.appendChild(buildTodaySectionTitle('To Do', pending.length));
  container.appendChild(buildTodayTodos(pending));

  // 翌日の予告
  const peek = buildTomorrowPeek(viewDate);
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

function buildTodayHero(viewDate, dk, isActualToday) {
  // 土曜=青系 / 日曜・祝日=朱色系 のグラデーションで判別しやすく
  const dw = viewDate.getDay();
  let heroClass = 'today-hero';
  if (dw === 0 || state.holidays[dk]) heroClass += ' hero-sun';
  else if (dw === 6) heroClass += ' hero-sat';
  const hero = tEl('div', heroClass);

  // 日付行（‹ 日付 ›）
  const top = tEl('div', 'today-hero-top');
  const prevBtn = tEl('button', 'hero-nav-btn', '‹');
  prevBtn.setAttribute('aria-label', '前の日');
  prevBtn.addEventListener('click', () => moveTodayView(-1));
  const dateWrap = tEl('div', 'today-hero-datewrap');
  dateWrap.appendChild(tEl('span', 'today-hero-date', `${viewDate.getMonth() + 1}月${viewDate.getDate()}日`));
  dateWrap.appendChild(tEl('span', 'today-hero-dow', `${DAY_NAMES[viewDate.getDay()]}曜日`));
  const nextBtn = tEl('button', 'hero-nav-btn', '›');
  nextBtn.setAttribute('aria-label', '次の日');
  nextBtn.addEventListener('click', () => moveTodayView(1));
  top.appendChild(prevBtn);
  top.appendChild(dateWrap);
  top.appendChild(nextBtn);
  hero.appendChild(top);

  // チップ行（祝日 / 長期休み / 今日に戻る / 時程切替）
  const chipRow = tEl('div', 'today-hero-chips');
  if (state.holidays[dk]) chipRow.appendChild(tEl('span', 'today-hero-holiday', state.holidays[dk]));
  const heroVacation = getVacationForDate(dk);
  if (heroVacation) chipRow.appendChild(tEl('span', 'today-hero-holiday', heroVacation.name || '長期休み'));
  if (!isActualToday) {
    const backChip = tEl('button', 'hero-mode-chip', '今日に戻る');
    backChip.addEventListener('click', () => {
      state.todayViewDate = null;
      renderTodayView();
    });
    chipRow.appendChild(backChip);
  }
  if (isSchoolDay(viewDate, dk)) {
    const isShort = getDayTimeMode(dk) === 'short';
    const modeChip = tEl('button', 'hero-mode-chip' + (isShort ? ' short' : ''), isShort ? '45分授業' : '通常時程');
    modeChip.addEventListener('click', () => {
      const next = getDayTimeMode(dk) === 'short' ? 'normal' : 'short';
      setDayTimeMode(dk, next);
      render();
      showToast(next === 'short' ? '45分授業に切り替えました' : '通常時程に戻しました');
    });
    chipRow.appendChild(modeChip);
  }
  if (chipRow.childNodes.length > 0) hero.appendChild(chipRow);

  const status = tEl('div', 'today-hero-status');
  const schoolDay = isSchoolDay(viewDate, dk);

  if (isActualToday && schoolDay) {
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
  } else if (isActualToday) {
    const entries = (state.daySchedules[dk] || []);
    const nowLine = tEl('div', 'today-hero-now');
    const restLabel = heroVacation
      ? `${heroVacation.name || '長期休み'}中。ゆっくり過ごしましょう`
      : '今日はお休み。ゆっくり過ごしましょう';
    nowLine.appendChild(tEl('span', '', entries.length > 0
      ? `今日の予定 ${entries.length}件`
      : restLabel));
    status.appendChild(nowLine);
  } else {
    // 今日以外の日: その日の概要を表示
    const filled = state.settings.periods.filter((p, i) => state.timetable[cellKey(dk, i)]).length;
    const evCount = state.events.filter(e => e.date === dk).length;
    const timedCount = (state.daySchedules[dk] || []).length;
    const parts = [];
    if (schoolDay && filled > 0) parts.push(`授業・予定 ${filled}コマ`);
    if (evCount + timedCount > 0) parts.push(`予定 ${evCount + timedCount}件`);
    const nowLine = tEl('div', 'today-hero-now');
    nowLine.appendChild(tEl('span', '', parts.length ? parts.join('　') : 'まだ予定はありません'));
    status.appendChild(nowLine);
  }
  hero.appendChild(status);

  // メタ情報（記録数など）
  let recordCount = 0;
  Object.keys(state.records).forEach(k => { if (k.startsWith(dk + '_')) recordCount++; });
  const meta = tEl('div', 'today-hero-meta');
  meta.appendChild(tEl('span', '', `記録 ${recordCount}件`));
  const pendingTodos = state.todos.filter(t => !t.done).length;
  if (isActualToday && pendingTodos > 0) meta.appendChild(tEl('span', '', `To Do 残り${pendingTodos}件`));
  hero.appendChild(meta);
  return hero;
}

// スロットに何か入力があるか（空でなければ非表示にしない/できない）
function slotHasContent(slot) {
  const key = slot.key;
  if ((slot.type === 'period' || slot.type === 'after') && state.timetable[key]) return true;
  if (state.notes[key] || state.records[key]) return true;
  if ((state.cellTasks[key] || []).length > 0) return true;
  if ((state.cellStudents[key] || []).length > 0) return true;
  return false;
}

function buildTodayTimeline(viewDate, dk, isActualToday) {
  const tl = tEl('div', 'tl');
  const schoolDay = isSchoolDay(viewDate, dk);
  const { nowMin, current } = isActualToday ? getNowStatus() : { nowMin: -1, current: null };
  const hiddenIds = getHiddenSlotIds(dk);
  const hiddenLabels = [];

  const items = [];

  if (schoolDay) {
    buildDaySlots(dk).forEach(slot => {
      // 非表示にした枠はスキップ（後から中身が入った枠は表示に戻す）
      if (hiddenIds.includes(slotHideId(slot)) && !slotHasContent(slot)) {
        hiddenLabels.push(slot.label);
        return;
      }
      items.push({ sortMin: slot.startMin !== null ? slot.startMin : 24 * 60, kind: 'slot', slot });
    });
  }

  (state.daySchedules[dk] || []).forEach(entry => {
    const m = parseTimeToMin(entry.startTime);
    items.push({ sortMin: m !== null ? m + 0.5 : -1, kind: 'timed', entry });
  });

  items.sort((a, b) => a.sortMin - b.sortMin);

  if (items.length === 0) {
    const empty = tEl('div', 'today-empty-note', 'この日はコマがありません。下のボタンから予定を追加できます');
    tl.appendChild(empty);
  }

  items.forEach(item => {
    if (item.kind === 'slot') {
      tl.appendChild(buildSlotCard(item.slot, dk, nowMin, current, isActualToday));
    } else {
      tl.appendChild(buildTimedCard(item.entry, dk, nowMin, isActualToday));
    }
  });

  // 非表示にした枠の復元行
  if (hiddenLabels.length > 0) {
    const row = tEl('div', 'tl-hidden-row');
    row.appendChild(tEl('span', 'tl-hidden-label', `非表示：${hiddenLabels.join('・')}`));
    const restore = tEl('button', 'tl-hidden-restore', '戻す');
    restore.addEventListener('click', () => {
      unhideAllSlotsForDay(dk);
      renderTodayView();
      showToast('非表示にした枠を戻しました');
    });
    row.appendChild(restore);
    tl.appendChild(row);
  }
  return tl;
}

function buildSlotCard(slot, dk, nowMin, current, isActualToday) {
  const isNow = isActualToday && current && current.key === slot.key && current.type === slot.type;
  const isPast = isActualToday && !isNow && slot.endMin !== null && nowMin >= slot.endMin;

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

  // 空き枠は×で非表示にできる（5・6限がない日など）
  const hasContent = !!entry || !!noteText || !!recordText || tasks.length > 0 || students.length > 0;
  if (!hasContent) {
    const hideBtn = tEl('button', 'tl-hide-btn', '×');
    hideBtn.setAttribute('aria-label', `${slot.label}の枠を非表示にする`);
    hideBtn.addEventListener('click', e => {
      e.stopPropagation();
      hideSlotForDay(dk, slotHideId(slot));
      renderTodayView();
      showToast(`${slot.label}の枠を非表示にしました`);
    });
    card.appendChild(hideBtn);
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

function buildTimedCard(entry, dk, nowMin, isActualToday) {
  const startMin = parseTimeToMin(entry.startTime);
  const endMin = parseTimeToMin(entry.endTime);
  const isPast = isActualToday && (endMin !== null ? nowMin >= endMin : (startMin !== null && nowMin >= startMin + 60));

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

function buildTomorrowPeek(viewDate) {
  const tmr = addDays(viewDate, 1);
  const dk = dateKey(tmr);
  const parts = [];

  const filled = state.settings.periods.filter((p, i) => state.timetable[cellKey(dk, i)]).length;
  if (filled > 0) parts.push(`授業・予定 ${filled}コマ`);
  const evs = state.events.filter(e => e.date === dk);
  evs.slice(0, 2).forEach(e => parts.push(e.title));
  const timed = (state.daySchedules[dk] || []);
  timed.slice(0, 2).forEach(e => parts.push(`${e.startTime || ''} ${e.content}`.trim()));
  if (state.holidays[dk]) parts.unshift(state.holidays[dk]);

  const isTomorrowOfToday = dateKey(viewDate) === dateKey(new Date());
  const card = tEl('div', 'tomorrow-card');
  card.appendChild(tEl('span', 'tomorrow-label',
    `${isTomorrowOfToday ? '明日' : '翌日'} ${tmr.getMonth() + 1}/${tmr.getDate()}（${DAY_NAMES[tmr.getDay()]}）`));
  card.appendChild(tEl('span', 'tomorrow-text', parts.length ? parts.join('・') : '予定はまだありません'));
  card.appendChild(tEl('span', 'tomorrow-arrow', '›'));
  card.addEventListener('click', () => moveTodayView(1));
  return card;
}

document.getElementById('navToday').addEventListener('click', () => {
  closeTodoPanel();
  closeSettingsPanel();
  closeRecordsPanel();
  state.todayViewDate = null; // タブを押したら常に「今日」へ
  setMainView('today');
});
