// ══════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════

const DEFAULTS = {
  settings: {
    weekStart: 1,
    showWeekend: true,
    weekendPeriods: false,
    showMTST: true,
    notifications: true,
    theme: 'auto',
    periods: [
      { start: '08:45', end: '09:35' },
      { start: '09:45', end: '10:35' },
      { start: '10:45', end: '11:35' },
      { start: '11:45', end: '12:35' },
      { start: '13:25', end: '14:15' },
      { start: '14:25', end: '15:15' },
    ],
    genres: [
      {
        name: '授業', color: '#5448e8',
        items: ['国語', '算数', '理科', '社会', '音楽', '図工', '体育', '英語', '道徳', '総合']
      },
      {
        name: '会議', color: '#1a7fc4',
        items: ['職員会議', '学年会', '研修会']
      },
      {
        name: 'その他', color: '#d94f35',
        items: []
      }
    ]
  },
  timetable: {},
  events: [],
  notes: {},
  todos: [],
  fixedTimetable: {},
  ideaMemos: {},
  cellTasks: {},
  students: [],
  cellStudents: {},
  dayTimeModes: {},
  hiddenSlots: {},
  vacations: []
};

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════

let state = {
  mainView: 'today',
  settings: JSON.parse(JSON.stringify(DEFAULTS.settings)),
  timetable: {},
  events: [],
  notes: {},
  todos: [],
  fixedTimetable: {},
  holidays: {},
  records: {},
  daySchedules: {},
  ideaMemos: {},
  cellTasks: {},
  students: [],
  cellStudents: {},
  dayTimeModes: {},
  hiddenSlots: {},
  vacations: [],
  currentWeekStart: null,
  todayViewDate: null,
  // Subject modal
  selectedCell: null,
  fixedCell: null,
  specialTarget: null,
  selectedGenreIdx: null,
  selectedSubject: null,
  // Note modal
  noteTarget: null,
  // Cell detail sheet
  cellDetailTarget: null,
  // Record modal
  recordTarget: null,
  // Event modal
  eventTargetDate: null,
  // Records panel
  recordsYear: new Date().getFullYear(),
  recordsMonth: new Date().getMonth(),
  recordsFilterGenre: null,
  // Day schedule modal
  dayScheduleDate: null,
  // Day events sheet
  dayEventsDate: null,
  selectedEventDetailIdx: null,
  ideaMemoDate: null,
  cellTasks_target: null
};

// ══════════════════════════════════════════
// STORAGE
// ══════════════════════════════════════════

const STORAGE_KEYS = {
  settings: 'ts_settings',
  timetable: 'ts_timetable',
  events: 'ts_events',
  notes: 'ts_notes',
  todos: 'ts_todos',
  fixedTimetable: 'ts_fixedTimetable',
  records: 'ts_records',
  daySchedules: 'ts_daySchedules',
  ideaMemos: 'ts_ideaMemos',
  cellTasks: 'ts_cellTasks',
  students: 'ts_students',
  cellStudents: 'ts_cellStudents',
  dayTimeModes: 'ts_dayTimeModes',
  hiddenSlots: 'ts_hiddenSlots',
  vacations: 'ts_vacations'
};

const BACKUP_VERSION = 3;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildBackupData() {
  return {
    app: 'teacher-schedule',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    timetable: state.timetable,
    events: state.events,
    notes: state.notes,
    todos: state.todos,
    fixedTimetable: state.fixedTimetable,
    records: state.records,
    daySchedules: state.daySchedules,
    ideaMemos: state.ideaMemos,
    cellTasks: state.cellTasks,
    students: state.students,
    cellStudents: state.cellStudents,
    dayTimeModes: state.dayTimeModes,
    hiddenSlots: state.hiddenSlots,
    vacations: state.vacations
  };
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeBackupData(data) {
  if (!isPlainObject(data)) throw new Error('Invalid backup data.');
  const knownKeys = Object.keys(STORAGE_KEYS);
  if (!knownKeys.some(key => Object.prototype.hasOwnProperty.call(data, key))) {
    throw new Error('Backup file has no schedule data.');
  }

  return {
    settings: isPlainObject(data.settings)
      ? { ...deepClone(DEFAULTS.settings), ...data.settings, genres: Array.isArray(data.settings.genres) ? data.settings.genres : deepClone(DEFAULTS.settings.genres) }
      : deepClone(DEFAULTS.settings),
    timetable: isPlainObject(data.timetable) ? data.timetable : {},
    events: Array.isArray(data.events) ? data.events : [],
    notes: isPlainObject(data.notes) ? data.notes : {},
    todos: Array.isArray(data.todos) ? data.todos : [],
    fixedTimetable: isPlainObject(data.fixedTimetable) ? data.fixedTimetable : {},
    records: isPlainObject(data.records) ? data.records : {},
    daySchedules: isPlainObject(data.daySchedules) ? data.daySchedules : {},
    ideaMemos: isPlainObject(data.ideaMemos) ? data.ideaMemos : {},
    cellTasks: isPlainObject(data.cellTasks) ? data.cellTasks : {},
    students: Array.isArray(data.students) ? data.students : [],
    cellStudents: isPlainObject(data.cellStudents) ? data.cellStudents : {},
    dayTimeModes: isPlainObject(data.dayTimeModes) ? data.dayTimeModes : {},
    hiddenSlots: isPlainObject(data.hiddenSlots) ? data.hiddenSlots : {},
    vacations: Array.isArray(data.vacations) ? data.vacations : []
  };
}

function applyBackupData(data) {
  const normalized = normalizeBackupData(data);
  Object.assign(state, normalized);
}

function readStorageJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch(e) {
    console.warn(`Invalid localStorage data ignored: ${key}`, e);
    localStorage.setItem(`${key}_corrupt_${Date.now()}`, raw);
    localStorage.removeItem(key);
    return fallback;
  }
}

// ══════════════════════════════════════════
// UNDO
// ══════════════════════════════════════════

let undoSnapshot = null;

function saveSnapshot() {
  undoSnapshot = {
    timetable:    deepClone(state.timetable),
    events:       deepClone(state.events),
    records:      deepClone(state.records),
    daySchedules: deepClone(state.daySchedules),
  };
  const btn = document.getElementById('undoBtn');
  btn.disabled = false;
  btn.style.opacity = '1';
  btn.style.cursor  = 'pointer';
}

function clearSnapshot() {
  undoSnapshot = null;
  const btn = document.getElementById('undoBtn');
  btn.disabled = true;
  btn.style.opacity = '0.3';
  btn.style.cursor  = 'default';
}

function save() {
  try {
    Object.entries(STORAGE_KEYS).forEach(([stateKey, storageKey]) => {
      localStorage.setItem(storageKey, JSON.stringify(state[stateKey]));
    });
  } catch(e) {
    console.error('Save failed', e);
    showToast('保存に失敗しました。空き容量を確認してください');
  }
}

function load() {
  try {
    const loaded = {};
    Object.entries(STORAGE_KEYS).forEach(([stateKey, storageKey]) => {
      loaded[stateKey] = readStorageJson(storageKey, DEFAULTS[stateKey] ?? (Array.isArray(state[stateKey]) ? [] : {}));
    });
    applyBackupData(loaded);
  } catch(e) {
    console.error('Load failed', e);
    showToast('保存データの読み込みに失敗しました');
  }
}

function getScheduleGenre(entry) {
  if (!entry) return null;
  const byName = state.settings.genres.find(g => g.items.includes(entry.name));
  if (byName) return byName;
  return entry.color ? state.settings.genres.find(g => g.color === entry.color) || null : null;
}

function getScheduleGenreIndex(entry) {
  if (!entry) return -1;
  const byName = state.settings.genres.findIndex(g => g.items.includes(entry.name));
  if (byName !== -1) return byName;
  return entry.color ? state.settings.genres.findIndex(g => g.color === entry.color) : -1;
}

function getScheduleColor(entry) {
  return getScheduleGenre(entry)?.color || entry?.color || null;
}

function getSolidScheduleTint(color) {
  if (!/^#[0-9a-f]{6}$/i.test(color || '')) return color;
  // ダークテーマでは暗い紙色に向けて濃いめに混色する
  const dark = currentThemeIsDark();
  const ratio = dark ? 0.30 : 0.13;
  const base = dark ? { r: 30, g: 30, b: 37 } : { r: 247, g: 245, b: 240 };
  const rgb = {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16)
  };
  const mix = channel => Math.round(base[channel] * (1 - ratio) + rgb[channel] * ratio);
  return `rgb(${mix('r')}, ${mix('g')}, ${mix('b')})`;
}

// ══════════════════════════════════════════
// THEME
// ══════════════════════════════════════════

function currentThemeIsDark() {
  const t = state.settings.theme || 'auto';
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme() {
  const t = state.settings.theme || 'auto';
  const root = document.documentElement;
  if (t === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = currentThemeIsDark() ? '#16161b' : '#f4f2ec';
  // 初期化前（currentWeekStart 未設定）は描画しない
  if (typeof render === 'function' && state.currentWeekStart) render();
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((state.settings.theme || 'auto') === 'auto') applyTheme();
});

function getScheduleTint(entry) {
  const color = getScheduleColor(entry);
  return color ? getSolidScheduleTint(color) : null;
}

document.getElementById('undoBtn').addEventListener('click', () => {
  if (!undoSnapshot) return;
  state.timetable    = undoSnapshot.timetable;
  state.events       = undoSnapshot.events;
  state.records      = undoSnapshot.records;
  state.daySchedules = undoSnapshot.daySchedules;
  clearSnapshot();
  save();
  render();
  showToast('元に戻しました');
});

// ══════════════════════════════════════════
// DATE UTILS
// ══════════════════════════════════════════

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const ws = state.settings.weekStart;
  const diff = (day - ws + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0,0,0,0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function cellKey(dateStr, period) { return `${dateStr}_p${period}`; }

const DAY_NAMES = ['日','月','火','水','木','金','土'];

// ══════════════════════════════════════════
// DAY TIME MODE（45分授業などの短縮時程）
// ══════════════════════════════════════════

// 短縮時程: 各コマ5分短く、i限目の開始は5×i分繰り上げ
// （休み時間の長さを保ったまま全体が前倒しになる）
const SHORT_LESSON_CUT = 5;

function shiftTimeStr(t, deltaMin) {
  const m = parseTimeToMin(t);
  if (m === null) return t;
  const mm = Math.max(0, m + deltaMin);
  return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
}

function getDayTimeMode(dateStr) {
  return state.dayTimeModes[dateStr] === 'short' ? 'short' : 'normal';
}

function setDayTimeMode(dateStr, mode) {
  if (mode === 'short') {
    state.dayTimeModes[dateStr] = 'short';
  } else {
    delete state.dayTimeModes[dateStr];
  }
  save();
  if (dateStr === dateKey(new Date()) && typeof scheduleNotificationsForToday === 'function') {
    scheduleNotificationsForToday();
  }
}

// その日の時限一覧（短縮日は自動で繰り上げた時刻を返す）
function getPeriodsForDate(dateStr) {
  const base = state.settings.periods;
  if (getDayTimeMode(dateStr) !== 'short') return base;
  return base.map((p, i) => ({
    start: shiftTimeStr(p.start, -SHORT_LESSON_CUT * i),
    end: shiftTimeStr(p.end, -SHORT_LESSON_CUT * (i + 1))
  }));
}

// ══════════════════════════════════════════
// DAY SLOTS（1日のコマ構成 + 現在地判定）
// ══════════════════════════════════════════

function parseTimeToMin(t) {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatMin(min) {
  if (min === null || min === undefined) return '';
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

// ── 長期休み（夏休み・冬休み・春休み）──
// 期間中は平日も時間割（◯限）を表示せず、土日と同じ予定リストになる

function getVacationForDate(dateStr) {
  if (!Array.isArray(state.vacations)) return null;
  return state.vacations.find(v =>
    v && v.start && v.end && v.start <= dateStr && dateStr <= v.end
  ) || null;
}

// ── 空き枠の非表示（5・6限がない日など）──

function slotHideId(slot) {
  return slot.type === 'period' ? `p${slot.index}` : slot.type;
}

function getHiddenSlotIds(dateStr) {
  return state.hiddenSlots[dateStr] || [];
}

function hideSlotForDay(dateStr, slotId) {
  if (!state.hiddenSlots[dateStr]) state.hiddenSlots[dateStr] = [];
  if (!state.hiddenSlots[dateStr].includes(slotId)) state.hiddenSlots[dateStr].push(slotId);
  save();
}

function unhideAllSlotsForDay(dateStr) {
  delete state.hiddenSlots[dateStr];
  save();
}

// その日のコマ（MT/各時限/昼休み/ST/放課後）を時刻付きで順に返す
function buildDaySlots(dateStr) {
  const periods = getPeriodsForDate(dateStr);
  const showMTST = state.settings.showMTST !== false;
  const lunchAfterIdx = Math.min(3, periods.length - 1);
  const slots = [];

  const p0Start = periods.length ? parseTimeToMin(periods[0].start) : null;
  if (showMTST && periods.length) {
    slots.push({
      type: 'mt', key: `${dateStr}_mt`, label: 'MT',
      startMin: p0Start !== null ? p0Start - 15 : null, endMin: p0Start
    });
  }

  periods.forEach((p, i) => {
    slots.push({
      type: 'period', index: i, key: cellKey(dateStr, i), label: `${i + 1}限`,
      startMin: parseTimeToMin(p.start), endMin: parseTimeToMin(p.end)
    });
    if (i === lunchAfterIdx) {
      const next = periods[i + 1];
      slots.push({
        type: 'lunch', key: `${dateStr}_lunch`, label: '昼休み',
        startMin: parseTimeToMin(p.end),
        endMin: next ? parseTimeToMin(next.start) : null
      });
    }
  });

  const last = periods[periods.length - 1];
  const lastEnd = last ? parseTimeToMin(last.end) : null;
  if (showMTST && periods.length) {
    slots.push({
      type: 'st', key: `${dateStr}_st`, label: 'ST',
      startMin: lastEnd, endMin: lastEnd !== null ? lastEnd + 15 : null
    });
  }
  slots.push({
    type: 'after', key: `${dateStr}_after`, label: '放課後',
    startMin: lastEnd !== null ? lastEnd + (showMTST ? 15 : 0) : null, endMin: null
  });
  return slots;
}

// 現在時刻から「いまのコマ」「次のコマ」を返す（今日専用）
function getNowStatus() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const slots = buildDaySlots(dateKey(now)).filter(s => s.startMin !== null);
  let current = null;
  let next = null;
  slots.forEach(s => {
    const end = s.endMin !== null ? s.endMin : 24 * 60;
    if (nowMin >= s.startMin && nowMin < end) current = s;
    if (nowMin < s.startMin && !next) next = s;
  });
  return { nowMin, current, next };
}
