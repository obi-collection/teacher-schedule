// ══════════════════════════════════════════
// RENDER
// ══════════════════════════════════════════

function getDaysToShow() {
  const ws = state.currentWeekStart;
  const total = state.settings.showWeekend ? 7 : 5;
  return Array.from({length: total}, (_, i) => addDays(ws, i));
}

function getColWidth() {
  const days = getDaysToShow();
  const bodyW = document.getElementById('daysScrollBody').clientWidth || (window.innerWidth - 44);
  // Always fit 5 weekday columns in the viewport.
  // Weekend columns (when shown) are accessible via horizontal scroll.
  const fitCols = state.settings.showWeekend ? 5 : days.length;
  return Math.floor(bodyW / fitCols);
}

function getPeriodHeight() {
  const scroll = document.getElementById('daysBodyOuter');
  const periods = state.settings.periods;
  const available = scroll.clientHeight || 400;
  const extra = state.settings.showMTST ? 5 : 3; // lunch + after + diary [+ mt + st]
  return Math.max(36, Math.floor(available / (periods.length + extra)));
}

function render() {
  const ph = getPeriodHeight();
  document.getElementById('eventGutter').style.height = (ph + 1) + 'px';
  renderWeekLabel();
  renderHeaders();
  renderEventBanners();
  renderPeriodLabels();
  renderBody();
}

function renderWeekLabel() {
  const ws = state.currentWeekStart;
  const we = addDays(ws, 6);
  document.getElementById('weekLabel').textContent =
    `${ws.getMonth()+1}/${ws.getDate()} – ${we.getMonth()+1}/${we.getDate()}`;
}

function renderHeaders() {
  const days = getDaysToShow();
  const colW = getColWidth();
  const today = dateKey(new Date());
  const inner = document.getElementById('daysHeaderInner');
  inner.innerHTML = '';
  days.forEach(d => {
    const dk = dateKey(d);
    const dw = d.getDay();
    const el = document.createElement('div');
    el.className = 'day-col-header' +
      (dk === today ? ' today' : '') +
      (dw === 6 ? ' sat' : '') +
      (dw === 0 ? ' sun' : '') +
      (state.holidays[dk] && dw !== 0 ? ' holiday' : '');
    el.style.width = colW + 'px';
    el.innerHTML = `<span class="day-name">${DAY_NAMES[dw]}</span><span class="day-num">${d.getDate()}</span>`;
    if (state.holidays[dk]) {
      const hn = document.createElement('span');
      hn.className = 'day-holiday-name';
      hn.textContent = state.holidays[dk];
      el.appendChild(hn);
    }
    inner.appendChild(el);
  });
}

function renderEventBanners() {
  const days = getDaysToShow();
  const colW = getColWidth();
  const ph   = getPeriodHeight();
  const inner = document.getElementById('daysEventsInner');
  inner.innerHTML = '';
  const todayKey = dateKey(new Date());
  days.forEach(d => {
    const dk = dateKey(d);
    const dw = d.getDay();
    const cell = document.createElement('div');
    cell.className = 'day-events-cell' +
      (dw === 6 ? ' sat-col' : dw === 0 ? ' sun-col' : '') +
      (state.holidays[dk] && dw !== 0 && dw !== 6 ? ' holiday-col' : '') +
      (dk === todayKey ? ' today-col' : '');
    cell.style.width  = colW + 'px';
    cell.style.height = ph + 'px';
    // User events — text-only display; tapping the row opens the day events sheet.
    state.events.map((ev, idx) => ({ev, idx})).filter(({ev}) => ev.date === dk).forEach(({ev, idx}) => {
      const chip = document.createElement('div');
      chip.className = `event-chip ${ev.category}`;
      chip.textContent = ev.title;
      cell.appendChild(chip);
    });
    cell.addEventListener('click', () => openDayEventsSheet(dk));
    inner.appendChild(cell);
  });
}

// ══════════════════════════════════════════
// LONG PRESS HELPER
// ══════════════════════════════════════════

function addLongPress(el, cb) {
  let timer = null;
  let startX = 0, startY = 0;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    timer = setTimeout(() => { timer = null; cb(e); }, 600);
  }, { passive: true });
  el.addEventListener('touchmove', e => {
    if (timer && (Math.abs(e.touches[0].clientX - startX) > 10 || Math.abs(e.touches[0].clientY - startY) > 10)) {
      clearTimeout(timer); timer = null;
    }
  }, { passive: true });
  el.addEventListener('touchend', () => { clearTimeout(timer); timer = null; }, { passive: true });
  el.addEventListener('touchcancel', () => { clearTimeout(timer); timer = null; }, { passive: true });
  el.addEventListener('contextmenu', e => { e.preventDefault(); cb(e); });
}

function renderPeriodLabels() {
  const periods = state.settings.periods;
  const ph = getPeriodHeight();
  const showMTST = state.settings.showMTST !== false;
  const labels = document.getElementById('periodLabels');
  labels.innerHTML = '';
  const lunchAfterIdx = Math.min(3, periods.length - 1);

  if (showMTST) {
    const mt = document.createElement('div');
    mt.className = 'period-label special';
    mt.style.height = ph + 'px';
    mt.innerHTML = `<span class="period-num" style="font-size:11px;font-weight:700">MT</span>`;
    labels.appendChild(mt);
  }

  periods.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'period-label';
    el.style.height = ph + 'px';
    el.innerHTML = `<span class="period-num">${i+1}</span>`;
    labels.appendChild(el);
    if (i === lunchAfterIdx) {
      const lunch = document.createElement('div');
      lunch.className = 'period-label special';
      lunch.style.height = ph + 'px';
      lunch.innerHTML = `<span class="period-num" style="font-size:9px">昼<br>休み</span>`;
      labels.appendChild(lunch);
    }
  });

  if (showMTST) {
    const st = document.createElement('div');
    st.className = 'period-label special';
    st.style.height = ph + 'px';
    st.innerHTML = `<span class="period-num" style="font-size:11px;font-weight:700">ST</span>`;
    labels.appendChild(st);
  }

  const after = document.createElement('div');
  after.className = 'period-label special';
  after.style.height = ph + 'px';
  after.innerHTML = `<span class="period-num" style="font-size:8px">放<br>課<br>後</span>`;
  labels.appendChild(after);

  const diary = document.createElement('div');
  diary.className = 'period-label special';
  diary.style.height = ph + 'px';
  diary.innerHTML = `<span class="period-num" style="font-size:8px">アイデア<br>メモ</span>`;
  labels.appendChild(diary);
}

function renderBody() {
  const days = getDaysToShow();
  const periods = state.settings.periods;
  const colW = getColWidth();
  const ph   = getPeriodHeight();
  const inner = document.getElementById('daysBodyInner');
  inner.innerHTML = '';
  const lunchAfterIdx = Math.min(3, periods.length - 1);
  const todayKey = dateKey(new Date());

  days.forEach(d => {
    const dk = dateKey(d);
    const dw = d.getDay();
    const isWeekend = dw === 0 || dw === 6;
    const isHoliday = !isWeekend && !!state.holidays[dk];
    const showPeriods = !isWeekend && !isHoliday || (isWeekend && state.settings.weekendPeriods);

    const col = document.createElement('div');
    col.className = 'day-col-body' +
      (dw === 6 ? ' sat-col' : dw === 0 ? ' sun-col' : '') +
      (state.holidays[dk] && dw !== 0 && dw !== 6 ? ' holiday-col' : '') +
      (dk === todayKey ? ' today-col' : '');
    col.style.width = colW + 'px';

    const showMTST = state.settings.showMTST !== false;
    if (showPeriods) {
      if (showMTST) col.appendChild(makeSpecialCell(dk, 'mt', ph));
      periods.forEach((p, i) => {
        const key = cellKey(dk, i);
        const subjectData = state.timetable[key];
        const cell = document.createElement('div');
        cell.className = 'period-cell' + (subjectData ? ' filled' : '');
        cell.style.height = ph + 'px';

        if (subjectData) {
          const lbl = document.createElement('div');
          lbl.className = 'subject-label';
          lbl.textContent = subjectData.name;
          if (subjectData.color) {
            cell.style.background = subjectData.color + '20';
          }
          cell.appendChild(lbl);
        } else {
          const icon = document.createElement('div');
          icon.className = 'empty-cell-icon';
          icon.textContent = '+';
          cell.appendChild(icon);
        }
        if (state.records[key]) {
          const badge = document.createElement('div');
          badge.className = 'record-badge';
          cell.appendChild(badge);
        }
        if (subjectData) {
          cell.addEventListener('click', () => openCellDetail(dk, i, 'period'));
        } else {
          cell.addEventListener('click', () => openSubjectModal(dk, i));
        }
        const periodLabel = `${i+1}限`;
        const subjectName = subjectData ? subjectData.name : '';
        addLongPress(cell, () => openRecordModal(key, periodLabel, subjectName));
        col.appendChild(cell);

        if (i === lunchAfterIdx) col.appendChild(makeSpecialCell(dk, 'lunch', ph));
      });
      if (showMTST) col.appendChild(makeSpecialCell(dk, 'st', ph));
      col.appendChild(makeSpecialCell(dk, 'after', ph));
      col.appendChild(makeSpecialCell(dk, 'diary', ph));
    } else {
      // Weekend / holiday: day schedule cell
      const cell = document.createElement('div');
      cell.className = 'weekend-cell';
      cell.style.height = (ph * (periods.length + (showMTST ? 4 : 2))) + 'px';
      const dayEntries = (state.daySchedules[dk] || []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
      if (dayEntries.length > 0) {
        cell.style.alignItems = 'flex-start';
        cell.style.flexDirection = 'column';
        cell.style.padding = '4px 3px';
        cell.style.justifyContent = 'flex-start';
        cell.style.overflowY = 'hidden';
        dayEntries.forEach(entry => {
          const block = document.createElement('div');
          block.className = 'ds-entry-block';
          if (entry.startTime || entry.endTime) {
            const timeLine = document.createElement('div');
            timeLine.className = 'ds-entry-time-line';
            timeLine.textContent = (entry.startTime || '')
              + (entry.endTime ? '\u301c' + entry.endTime : '');
            block.appendChild(timeLine);
          }
          const contentEl = document.createElement('div');
          contentEl.className = 'ds-entry-content';
          contentEl.textContent = entry.content;
          block.appendChild(contentEl);
          cell.appendChild(block);
        });
      } else if (isHoliday) {
        const hint = document.createElement('div');
        hint.className = 'note-empty-label';
        hint.textContent = state.holidays[dk] || '祝日';
        cell.appendChild(hint);
      }
      cell.addEventListener('click', () => openDayScheduleModal(dk));
      col.appendChild(cell);
      col.appendChild(makeSpecialCell(dk, 'diary', ph));
    }
    inner.appendChild(col);
  });
}

function makeSpecialCell(dateStr, type, ph) {
  const key = `${dateStr}_${type}`;
  const cell = document.createElement('div');
  cell.className = 'period-cell special-cell';
  if (type === 'mt' || type === 'lunch' || type === 'st') {
    cell.classList.add('left-note-cell');
  }
  cell.style.height = ph + 'px';

  if (type === 'after') {
    // Subject modal (2-step genre select)
    const data = state.timetable[`${dateStr}_${type}`];
    const emptyLabel = '放課後';
    if (data) {
      const lbl = document.createElement('div');
      lbl.className = 'subject-label';
      lbl.textContent = data.name;
      if (data.color) cell.style.background = data.color + '20';
      cell.appendChild(lbl);
      cell.addEventListener('click', () => openCellDetail(dateStr, null, type));
    } else {
      const lbl = document.createElement('div');
      lbl.className = 'note-empty-label';
      lbl.textContent = emptyLabel;
      cell.appendChild(lbl);
      cell.addEventListener('click', () => openSpecialSubjectModal(dateStr, type));
    }
  } else {
    if ((type === 'mt' || type === 'st') && state.timetable[key] && !state.notes[key]) {
      state.notes[key] = state.timetable[key].name;
      delete state.timetable[key];
      save();
    }
    const noteText = state.notes[key] || '';
    if (type === 'diary') {
      // Migrate old note text to idea memo list
      if (noteText && !(state.ideaMemos[key] && state.ideaMemos[key].length > 0)) {
        if (!state.ideaMemos[key]) state.ideaMemos[key] = [];
        state.ideaMemos[key].push({ id: Date.now(), text: noteText });
        delete state.notes[key];
        save();
      }
      const ideas = state.ideaMemos[key] || [];
      if (ideas.length > 0) {
        const txt = document.createElement('div');
        txt.className = 'note-text';
        txt.textContent = ideas.length === 1 ? ideas[0].text : `${ideas[0].text}…他${ideas.length - 1}件`;
        cell.appendChild(txt);
      } else {
        const lbl = document.createElement('div');
        lbl.className = 'note-empty-label';
        lbl.textContent = 'アイデアメモ';
        cell.appendChild(lbl);
      }
      cell.addEventListener('click', () => openIdeaMemoModal(key, dateStr));
    } else if ((type === 'mt' || type === 'st' || type === 'lunch') && noteText) {
      const txt = document.createElement('div');
      txt.className = 'note-text';
      txt.textContent = noteText;
      cell.appendChild(txt);
      cell.addEventListener('click', () => openCellDetail(dateStr, null, type));
    } else {
      if (noteText) {
        const txt = document.createElement('div');
        txt.className = 'note-text';
        txt.textContent = noteText;
        cell.appendChild(txt);
      } else {
        const lbl = document.createElement('div');
        lbl.className = 'note-empty-label';
        lbl.textContent = type === 'mt' ? 'MT' : type === 'st' ? 'ST' : type === 'lunch' ? '昼休み' : 'アイデアメモ';
        cell.appendChild(lbl);
      }
      cell.addEventListener('click', () => openNoteModal(dateStr, type));
    }
  }

  if (state.records[key]) {
    const badge = document.createElement('div');
    badge.className = 'record-badge';
    cell.appendChild(badge);
  }
  const typeLabel = type === 'mt' ? 'MT' : type === 'st' ? 'ST' : type === 'after' ? '放課後' : type === 'lunch' ? '昼休み' : 'アイデアメモ';
  const subjectHint = type === 'after' ? (state.timetable[`${dateStr}_${type}`]?.name || '') : '';
  addLongPress(cell, () => openRecordModal(key, typeLabel, subjectHint));
  return cell;
}

function syncScroll() {
  // Header, events, and body are all in the same horizontal scroll container,
  // so horizontal scroll is always in sync natively.
  // Only period labels (fixed gutter) need to follow vertical scroll.
  document.getElementById('daysBodyOuter').addEventListener('scroll', function() {
    document.getElementById('periodLabelsClip').scrollTop = this.scrollTop;
  });
}

function initSwipeWeek() {
  const el        = document.getElementById('daysScrollBody'); // days-h-scroll outer
  const bodyOuter = document.getElementById('daysBodyOuter');
  let startX = 0, startY = 0, startScrollTop = 0;
  let swipeHandled = false;

  el.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    startScrollTop = bodyOuter.scrollTop;
    swipeHandled = false;
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    if (isAnimating) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dy) <= Math.abs(dx)) return; // horizontal dominates — ignore
    // Vertical swipe: take control only when body is at the relevant boundary
    const maxScroll = bodyOuter.scrollHeight - bodyOuter.clientHeight;
    const atTop    = startScrollTop <= 0;
    const atBottom = startScrollTop >= maxScroll - 1;
    if (maxScroll <= 0 || (dy > 0 && atTop) || (dy < 0 && atBottom)) {
      e.preventDefault();
      swipeHandled = true;
    }
  }, { passive: false });

  el.addEventListener('touchend', e => {
    if (!swipeHandled) return;
    swipeHandled = false;
    if (isAnimating) return;
    const t  = e.changedTouches[0];
    const dy = t.clientY - startY;
    const dx = t.clientX - startX;
    if (Math.abs(dy) < 50 || Math.abs(dy) <= Math.abs(dx)) return;
    const dir = dy < 0 ? 1 : -1;
    animateWeekChange(dir, () => { state.currentWeekStart = addDays(state.currentWeekStart, dir * 7); save(); });
  }, { passive: true });
}

// ══════════════════════════════════════════
// WEEK CHANGE WITH ANIMATION
// ══════════════════════════════════════════

let isAnimating = false;

function animateWeekChange(direction, applyState) {
  // direction: 1 = forward (next week), -1 = backward (prev week)
  if (isAnimating) return;
  isAnimating = true;
  applyState();
  render();
  const wrapper = document.querySelector('#daysScrollBody .days-content-wrapper');
  const cls = direction > 0 ? 'week-anim-forward' : 'week-anim-back';
  wrapper.classList.add(cls);
  wrapper.addEventListener('animationend', () => {
    wrapper.classList.remove(cls);
    isAnimating = false;
  }, { once: true });
}
