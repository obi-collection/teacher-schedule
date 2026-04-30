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
  cellStudents: {}
};

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════

let state = {
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
  currentWeekStart: null,
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
  cellStudents: 'ts_cellStudents'
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
    cellStudents: state.cellStudents
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
    cellStudents: isPlainObject(data.cellStudents) ? data.cellStudents : {}
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
