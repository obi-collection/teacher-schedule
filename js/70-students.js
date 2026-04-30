// ══════════════════════════════════════════
// STUDENT MANAGEMENT
// ══════════════════════════════════════════

let editingStudentId = null;

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

function renderStudentList() {
  const list = document.getElementById('studentList');
  list.innerHTML = '';
  if (state.students.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text3);font-size:13px;padding:24px 0';
    empty.textContent = '生徒が登録されていません';
    list.appendChild(empty);
    return;
  }
  state.students.forEach((s, i) => {
    const item = document.createElement('div');
    item.className = 'student-item';
    const info = document.createElement('div');
    info.className = 'student-item-info';
    const name = document.createElement('div');
    name.className = 'student-item-name';
    name.textContent = s.name;
    const meta = document.createElement('div');
    meta.className = 'student-item-meta';
    meta.textContent = [s.grade, s.klass].filter(Boolean).join(' ') || '学年・クラス未設定';
    info.appendChild(name); info.appendChild(meta);
    const del = document.createElement('button');
    del.className = 'master-item-del';
    del.textContent = '✕';
    del.addEventListener('click', e => {
      e.stopPropagation();
      if (!confirm(`「${s.name}」を削除しますか？`)) return;
      state.students.splice(i, 1);
      save(); renderStudentList();
    });
    item.appendChild(info); item.appendChild(del);
    item.addEventListener('click', () => openStudentModal(s));
    list.appendChild(item);
  });
}

function openStudentModal(student) {
  editingStudentId = student ? student.id : null;
  document.getElementById('studentModalTitle').textContent = student ? '生徒を編集' : '生徒を追加';
  document.getElementById('studentNameInput').value = student?.name || '';
  document.getElementById('studentGradeInput').value = student?.grade || '';
  document.getElementById('studentClassInput').value = student?.klass || '';
  document.getElementById('studentMemoInput').value = student?.memo || '';
  document.getElementById('studentModal').classList.add('open');
}

function closeStudentModal() {
  document.getElementById('studentModal').classList.remove('open');
  editingStudentId = null;
}

document.getElementById('addStudentBtn').addEventListener('click', () => openStudentModal(null));

document.getElementById('confirmStudentBtn').addEventListener('click', () => {
  const name = document.getElementById('studentNameInput').value.trim();
  if (!name) { showToast('名前を入力してください'); return; }
  const grade = document.getElementById('studentGradeInput').value.trim();
  const klass = document.getElementById('studentClassInput').value.trim();
  const memo = document.getElementById('studentMemoInput').value.trim();
  if (editingStudentId !== null) {
    const idx = state.students.findIndex(s => s.id === editingStudentId);
    if (idx !== -1) state.students[idx] = { ...state.students[idx], name, grade, klass, memo };
    showToast('更新しました');
  } else {
    state.students.push({ id: Date.now(), name, grade, klass, memo });
    showToast('生徒を追加しました');
  }
  save(); closeStudentModal(); renderStudentList();
});

document.getElementById('cancelStudentBtn').addEventListener('click', closeStudentModal);
document.getElementById('studentModal').addEventListener('click', function(e) {
  if (e.target === this) closeStudentModal();
});

function openStudentDetail(student) {
  document.getElementById('studentDetailName').textContent = student.name;
  document.getElementById('studentDetailMeta').textContent = [student.grade, student.klass].filter(Boolean).join(' ') || '学年・クラス未設定';
  document.getElementById('studentDetailMemo').textContent = student.memo || '（なし）';
  renderStudentRecords(student.id);
  document.getElementById('studentDetailPanel').classList.add('open');
}

function closeStudentDetail() {
  document.getElementById('studentDetailPanel').classList.remove('open');
}

document.getElementById('closeStudentDetailBtn').addEventListener('click', closeStudentDetail);

function renderStudentRecords(studentId) {
  const list = document.getElementById('studentRecordsList');
  list.innerHTML = '';
  const relatedKeys = Object.entries(state.cellStudents)
    .filter(([k, sid]) => sid === studentId)
    .map(([k]) => k);
  if (relatedKeys.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'records-empty';
    empty.textContent = 'この生徒の授業記録はありません';
    list.appendChild(empty);
    return;
  }
  const entries = [];
  const DAY_JP = ['日','月','火','水','木','金','土'];
  relatedKeys.forEach(key => {
    const match = key.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/);
    if (!match) return;
    const dateStr = match[1];
    const periodPart = match[2];
    const d = new Date(dateStr + 'T00:00:00');
    let periodLabel = periodPart.startsWith('p')
      ? `${parseInt(periodPart.slice(1)) + 1}限`
      : periodPart === 'mt' ? 'MT' : periodPart === 'st' ? 'ST' : periodPart === 'after' ? '放課後' : periodPart;
    const subjectData = state.timetable[key];
    entries.push({ dateStr, d, periodLabel, subjectName: subjectData?.name || '', record: state.records[key] || '', memo: state.notes[key] || '', key });
  });
  entries.sort((a, b) => b.d - a.d);
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
    meta.appendChild(dateLbl); meta.appendChild(periodLbl);
    if (entry.subjectName) {
      const subj = document.createElement('span');
      subj.className = 'record-entry-subject';
      subj.textContent = entry.subjectName;
      meta.appendChild(subj);
    }
    el.appendChild(meta);
    if (entry.memo) {
      const memoEl = document.createElement('div');
      memoEl.style.cssText = 'font-size:12px;color:var(--text3);margin-top:4px;';
      memoEl.textContent = 'メモ: ' + entry.memo;
      el.appendChild(memoEl);
    }
    if (entry.record) {
      const recEl = document.createElement('div');
      recEl.className = 'record-entry-text';
      recEl.textContent = entry.record;
      el.appendChild(recEl);
    }
    el.addEventListener('click', () => {
      closeStudentDetail();
      openRecordModal(entry.key, entry.periodLabel, entry.subjectName);
    });
    list.appendChild(el);
  });
}
