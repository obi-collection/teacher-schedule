// ══════════════════════════════════════════
// STUDENT PROGRESS
// ══════════════════════════════════════════

document.getElementById('recordsTabBtn').addEventListener('click', () => {
  document.getElementById('recordsTabBtn').style.color = 'var(--accent)';
  document.getElementById('recordsTabBtn').style.borderBottomColor = 'var(--accent)';
  document.getElementById('studentsTabBtn').style.color = 'var(--text3)';
  document.getElementById('studentsTabBtn').style.borderBottomColor = 'transparent';
  document.getElementById('recordsTabContent').style.display = '';
  document.getElementById('studentsTabContent').style.display = 'none';
});

document.getElementById('studentsTabBtn').addEventListener('click', () => {
  document.getElementById('studentsTabBtn').style.color = 'var(--accent)';
  document.getElementById('studentsTabBtn').style.borderBottomColor = 'var(--accent)';
  document.getElementById('recordsTabBtn').style.color = 'var(--text3)';
  document.getElementById('recordsTabBtn').style.borderBottomColor = 'transparent';
  document.getElementById('studentsTabContent').style.display = '';
  document.getElementById('recordsTabContent').style.display = 'none';
  renderStudentList();
});

function getLessonItems() {
  const lessonGenre = state.settings.genres.find(g => g.name === '授業');
  return lessonGenre?.items || [];
}

function renderStudentList() {
  const list = document.getElementById('studentList');
  list.innerHTML = '';
  const lessonItems = getLessonItems();

  if (lessonItems.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'records-empty';
    empty.textContent = '授業ジャンルに名前が登録されていません';
    list.appendChild(empty);
    return;
  }

  lessonItems.forEach(nameText => {
    const entries = collectStudentProgressEntries(nameText);
    const item = document.createElement('div');
    item.className = 'student-item';

    const info = document.createElement('div');
    info.className = 'student-item-info';

    const name = document.createElement('div');
    name.className = 'student-item-name';
    name.textContent = nameText;

    const meta = document.createElement('div');
    meta.className = 'student-item-meta';
    meta.textContent = entries.length ? `${entries.length}件の記録` : '記録なし';

    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(info);
    item.addEventListener('click', () => openStudentDetail(nameText));
    list.appendChild(item);
  });
}

function collectStudentDutyEntries(nameText) {
  const entries = [];
  const labels = { mt: 'MT', lunch: '昼休み', st: 'ST' };
  Object.entries(state.cellStudents).forEach(([key, list]) => {
    if (!Array.isArray(list)) return;
    const match = key.match(/^(\d{4}-\d{2}-\d{2})_(mt|lunch|st)$/);
    if (!match) return;
    const dateStr = match[1];
    const type = match[2];
    const d = new Date(dateStr + 'T00:00:00');
    list.filter(entry => entry.name === nameText && entry.text).forEach(entry => {
      entries.push({
        dateStr,
        d,
        periodLabel: labels[type],
        text: entry.text,
        before: '',
        key,
        type,
        kind: 'studentDuty'
      });
    });
  });
  return entries;
}

function collectStudentProgressEntries(nameText) {
  const entries = [
    ...collectLessonRecordEntries({ subjectName: nameText, includeBefore: true }),
    ...collectStudentDutyEntries(nameText)
  ];
  entries.sort((a, b) => a.d - b.d || a.periodLabel.localeCompare(b.periodLabel));
  return entries;
}

function openStudentDetail(nameText) {
  document.getElementById('studentDetailName').textContent = nameText;
  renderStudentRecords(nameText);
  document.getElementById('studentDetailPanel').classList.add('open');
}

function closeStudentDetail() {
  document.getElementById('studentDetailPanel').classList.remove('open');
}

document.getElementById('closeStudentDetailBtn').addEventListener('click', closeStudentDetail);

function renderStudentRecords(nameText) {
  const list = document.getElementById('studentRecordsList');
  list.innerHTML = '';
  const entries = collectStudentProgressEntries(nameText);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'records-empty';
    empty.textContent = 'この生徒の経過はありません';
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
    el.appendChild(meta);

    if (entry.before) {
      const beforeEl = document.createElement('div');
      beforeEl.style.cssText = 'font-size:12px;color:var(--text3);margin-top:4px;line-height:1.5';
      beforeEl.textContent = '事前: ' + entry.before;
      el.appendChild(beforeEl);
    }

    if (entry.text) {
      const afterEl = document.createElement('div');
      afterEl.className = 'record-entry-text';
      afterEl.textContent = entry.text;
      el.appendChild(afterEl);
    }

    el.addEventListener('click', () => {
      closeStudentDetail();
      closeRecordsPanel();
      if (entry.kind === 'studentDuty') {
        openCellDetail(entry.dateStr, null, entry.type);
      } else {
        openRecordModal(entry.key, entry.periodLabel, nameText);
      }
    });
    list.appendChild(el);
  });
}
