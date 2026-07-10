// ══════════════════════════════════════════
// SETTINGS PANEL
// ══════════════════════════════════════════

function openSettings() { renderSettings(); document.getElementById('settingsPanel').classList.add('open'); }
function closeSettingsPanel() { document.getElementById('settingsPanel').classList.remove('open'); }

document.getElementById('openSettings').addEventListener('click', openSettings);
document.getElementById('closeSettings').addEventListener('click', closeSettingsPanel);

function renderSettings() {
  document.getElementById('themeSetting').value = state.settings.theme || 'auto';
  document.getElementById('weekStartSetting').value = state.settings.weekStart;
  const sw = document.getElementById('showWeekendSetting');
  sw.checked = state.settings.showWeekend;
  document.getElementById('weekendPeriodsRow').style.display = state.settings.showWeekend ? '' : 'none';
  document.getElementById('weekendPeriodsSetting').checked = state.settings.weekendPeriods;
  document.getElementById('showMTSTSetting').checked = state.settings.showMTST !== false;
  document.getElementById('notificationSetting').checked = state.settings.notifications !== false;
  renderPeriodSettingsList();
  renderVacationList();
  renderGenreMasterList();
  renderFixedTimetableGrid();
}

// ══════════════════════════════════════════
// VACATIONS（長期休み）
// ══════════════════════════════════════════

function renderVacationList() {
  const list = document.getElementById('vacationList');
  if (!list) return;
  list.innerHTML = '';
  if (state.vacations.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;color:var(--text3);font-size:12px;padding:8px 0';
    empty.textContent = '登録された期間はありません';
    list.appendChild(empty);
    return;
  }
  state.vacations.forEach((v, i) => {
    const card = document.createElement('div');
    card.className = 'vacation-card';

    const nameRow = document.createElement('div');
    nameRow.className = 'vacation-name-row';
    const nameInput = document.createElement('input');
    nameInput.className = 'add-input';
    nameInput.value = v.name || '';
    nameInput.placeholder = '例: 夏休み';
    nameInput.addEventListener('change', () => {
      state.vacations[i].name = nameInput.value.trim();
      save(); render();
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'master-item-del';
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', '期間を削除');
    delBtn.addEventListener('click', () => {
      state.vacations.splice(i, 1);
      save(); render(); renderVacationList();
    });
    nameRow.appendChild(nameInput);
    nameRow.appendChild(delBtn);
    card.appendChild(nameRow);

    const dateRow = document.createElement('div');
    dateRow.className = 'vacation-date-row';
    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.className = 'form-input vacation-date-input';
    startInput.value = v.start || '';
    const sep = document.createElement('span');
    sep.className = 'time-sep';
    sep.textContent = '〜';
    const endInput = document.createElement('input');
    endInput.type = 'date';
    endInput.className = 'form-input vacation-date-input';
    endInput.value = v.end || '';
    function onDateChange() {
      let s = startInput.value;
      let e = endInput.value;
      if (s && e && s > e) { const t = s; s = e; e = t; } // 逆順は入れ替え
      state.vacations[i].start = s;
      state.vacations[i].end = e;
      save(); render(); renderVacationList();
    }
    startInput.addEventListener('change', onDateChange);
    endInput.addEventListener('change', onDateChange);
    dateRow.appendChild(startInput);
    dateRow.appendChild(sep);
    dateRow.appendChild(endInput);
    card.appendChild(dateRow);

    list.appendChild(card);
  });
}

document.getElementById('addVacationBtn').addEventListener('click', () => {
  state.vacations.push({ id: Date.now(), name: '', start: '', end: '' });
  save();
  renderVacationList();
  // 追加した行の名前欄にフォーカス
  const inputs = document.querySelectorAll('#vacationList .vacation-name-row .add-input');
  if (inputs.length) inputs[inputs.length - 1].focus();
});

document.getElementById('themeSetting').addEventListener('change', function() {
  state.settings.theme = this.value;
  save();
  applyTheme();
});
document.getElementById('weekStartSetting').addEventListener('change', function() {
  state.settings.weekStart = parseInt(this.value);
  state.currentWeekStart = getWeekStart(new Date());
  save(); render();
});
document.getElementById('showWeekendSetting').addEventListener('change', function() {
  state.settings.showWeekend = this.checked;
  document.getElementById('weekendPeriodsRow').style.display = this.checked ? '' : 'none';
  save(); render();
});
document.getElementById('weekendPeriodsSetting').addEventListener('change', function() {
  state.settings.weekendPeriods = this.checked;
  save(); render();
});
document.getElementById('showMTSTSetting').addEventListener('change', function() {
  state.settings.showMTST = this.checked;
  save(); render();
});

function renderPeriodSettingsList() {
  const list = document.getElementById('periodSettingsList');
  list.innerHTML = '';
  state.settings.periods.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'period-setting-row';
    row.innerHTML = `
      <span class="period-setting-num">${i+1}</span>
      <input class="time-input" type="time" value="${p.start}" data-idx="${i}" data-field="start">
      <span class="time-sep">〜</span>
      <input class="time-input" type="time" value="${p.end}" data-idx="${i}" data-field="end">
      <button class="period-del-btn" data-idx="${i}">✕</button>
    `;
    list.appendChild(row);
  });
  list.querySelectorAll('.time-input').forEach(inp => {
    inp.addEventListener('change', function() {
      state.settings.periods[parseInt(this.dataset.idx)][this.dataset.field] = this.value;
      save(); render();
    });
  });
  list.querySelectorAll('.period-del-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.dataset.idx);
      if (state.settings.periods.length <= 1) return;
      state.settings.periods.splice(idx, 1);
      save(); render(); renderPeriodSettingsList();
    });
  });
}

document.getElementById('addPeriodBtn').addEventListener('click', () => {
  const last = state.settings.periods[state.settings.periods.length - 1];
  state.settings.periods.push({ start: last?.end || '16:00', end: '16:50' });
  save(); render(); renderPeriodSettingsList();
});

// ── Genre master list ──

const GENRE_COLORS = ['#5448e8','#1a7fc4','#d94f35','#2eab6e','#e8a020','#9b59b6','#e84891','#20b2aa'];
let colorIdx = 0;

function renameGenreItem(genre, oldName, newName) {
  if (!newName || newName === oldName) return false;
  if (genre.items.includes(newName)) {
    showToast('すでに登録されています');
    return false;
  }

  const idx = genre.items.indexOf(oldName);
  if (idx === -1) return false;
  genre.items[idx] = newName;

  [state.timetable, state.fixedTimetable].forEach(store => {
    Object.values(store).forEach(entry => {
      if (entry && entry.name === oldName && (!entry.color || entry.color === genre.color)) {
        entry.name = newName;
      }
    });
  });

  save();
  render();
  return true;
}

function renderGenreMasterList() {
  const container = document.getElementById('genreMasterList');
  container.innerHTML = '';

  state.settings.genres.forEach((g, gi) => {
    const block = document.createElement('div');
    block.className = 'genre-block';

    // Header
    const header = document.createElement('div');
    header.className = 'genre-block-header';

    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.className = 'genre-color-input';
    colorPicker.value = g.color;
    colorPicker.title = '色を変更';
    colorPicker.addEventListener('change', function() {
      state.settings.genres[gi].color = this.value;
      save(); renderGenreMasterList();
    });

    const nameLbl = document.createElement('span');
    nameLbl.className = 'genre-block-name';
    nameLbl.textContent = g.name;

    const countLbl = document.createElement('span');
    countLbl.className = 'genre-block-count';
    countLbl.textContent = `${g.items.length}項目`;

    const delBtn = document.createElement('button');
    delBtn.className = 'master-item-del';
    delBtn.textContent = '✕';
    delBtn.title = 'ジャンルを削除';
    delBtn.addEventListener('click', () => {
      if (!confirm(`「${g.name}」を削除しますか？`)) return;
      state.settings.genres.splice(gi, 1);
      save(); renderGenreMasterList();
    });

    header.appendChild(colorPicker);
    header.appendChild(nameLbl);
    header.appendChild(countLbl);
    header.appendChild(delBtn);
    block.appendChild(header);

    // Items panel
    const panel = document.createElement('div');
    panel.className = 'genre-items-panel';

    g.items.forEach((item, ii) => {
      const row = document.createElement('div');
      row.className = 'genre-item-row';

      const dot = document.createElement('span');
      dot.className = 'genre-item-dot';
      dot.style.background = g.color;

      const txt = document.createElement('span');
      txt.className = 'genre-item-name';
      txt.textContent = item;
      txt.style.cursor = 'text';
      txt.title = 'クリックして編集';
      txt.addEventListener('click', () => {
        const input = document.createElement('input');
        input.className = 'todo-edit-input';
        input.value = item;
        row.replaceChild(input, txt);
        input.focus();
        input.select();

        function finishEdit() {
          const newName = input.value.trim();
          renameGenreItem(g, item, newName);
          renderGenreMasterList();
          renderFixedTimetableGrid();
        }

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') {
            input.value = item;
            input.blur();
          }
        });
      });

      const del = document.createElement('button');
      del.className = 'genre-item-del';
      del.textContent = '✕';
      del.addEventListener('click', () => {
        state.settings.genres[gi].items.splice(ii, 1);
        save(); renderGenreMasterList();
      });

      row.appendChild(dot);
      row.appendChild(txt);
      row.appendChild(del);
      panel.appendChild(row);
    });

    // Add item row
    const addRow = document.createElement('div');
    addRow.className = 'genre-add-row';

    const addInput = document.createElement('input');
    addInput.className = 'genre-add-input';
    addInput.placeholder = '項目を追加';

    const addBtn = document.createElement('button');
    addBtn.className = 'genre-add-btn';
    addBtn.textContent = '追加';
    addBtn.addEventListener('click', () => {
      const name = addInput.value.trim();
      if (!name) return;
      if (state.settings.genres[gi].items.includes(name)) { showToast('すでに登録されています'); return; }
      state.settings.genres[gi].items.push(name);
      addInput.value = '';
      save(); renderGenreMasterList();
    });
    addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });

    addRow.appendChild(addInput);
    addRow.appendChild(addBtn);
    panel.appendChild(addRow);

    block.appendChild(panel);
    container.appendChild(block);
  });
}

document.getElementById('addGenreBtn').addEventListener('click', () => {
  const name = document.getElementById('newGenreInput').value.trim();
  if (!name) return;
  const color = GENRE_COLORS[colorIdx % GENRE_COLORS.length];
  colorIdx++;
  state.settings.genres.push({ name, color, items: [] });
  document.getElementById('newGenreInput').value = '';
  save(); renderGenreMasterList();
});

document.getElementById('newGenreInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') document.getElementById('addGenreBtn').click();
});

// ══════════════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════════════

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = buildBackupData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schedule-backup-${dateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  localStorage.setItem('ts_lastExport', new Date().toISOString());
  showToast('バックアップを保存しました');
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});

document.getElementById('importFile').addEventListener('change', function() {
  const file = this.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      normalizeBackupData(data);
      localStorage.setItem('ts_preImportBackup', JSON.stringify(buildBackupData()));
      localStorage.setItem('ts_preImportBackupAt', new Date().toISOString());
      applyBackupData(data);
      save(); render(); renderSettings();
      showToast('データを復元しました');
    } catch(err) {
      console.error('Import failed', err);
      showToast('復元できません。バックアップファイルを確認してください');
    }
  };
  reader.readAsText(file);
  this.value = '';
});
