// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ══════════════════════════════════════════
// PWA
// ══════════════════════════════════════════

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ══════════════════════════════════════════
// HOLIDAYS
// ══════════════════════════════════════════

async function loadHolidays() {
  const CACHE_KEY = 'ts_holidays';
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

  function applyHolidays(data) {
    state.holidays = data;
    render();
  }

  // Check cache validity
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { data, cachedAt } = JSON.parse(raw);
      if (Date.now() - cachedAt < CACHE_TTL) {
        applyHolidays(data);
        return;
      }
    }
  } catch(e) {}

  // Fetch fresh data
  try {
    const res = await fetch('https://holidays-jp.github.io/api/v1/date.json');
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
      applyHolidays(data);
    }
  } catch(e) {
    // Offline fallback: use expired cache if available
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) applyHolidays(JSON.parse(raw).data);
    } catch(e2) {}
  }
}

// ══════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════

let notificationTimers = [];

function clearNotificationTimers() {
  notificationTimers.forEach(id => clearTimeout(id));
  notificationTimers = [];
}

function scheduleNotificationsForToday() {
  clearNotificationTimers();
  if (state.settings.notifications === false) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const today = new Date();
  const todayStr = dateKey(today);
  const now = Date.now();
  const periods = state.settings.periods;
  const showMTST = state.settings.showMTST !== false;

  function todayAt(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d;
  }

  const slots = [];

  if (showMTST && periods.length > 0) {
    const mtStart = todayAt(periods[0].start);
    mtStart.setMinutes(mtStart.getMinutes() - 15);
    const mtKey = `${todayStr}_mt`;
    if (state.timetable[mtKey]) {
      slots.push({ time: mtStart, label: 'MT', name: state.timetable[mtKey].name || '' });
    }
  }

  periods.forEach((p, i) => {
    const key = cellKey(todayStr, i);
    if (state.timetable[key]) {
      slots.push({ time: todayAt(p.start), label: `${i + 1}限`, name: state.timetable[key].name || '' });
    }
  });

  if (showMTST && periods.length > 0) {
    const stStart = todayAt(periods[periods.length - 1].end);
    stStart.setMinutes(stStart.getMinutes() + 5);
    const stKey = `${todayStr}_st`;
    if (state.timetable[stKey]) {
      slots.push({ time: stStart, label: 'ST', name: state.timetable[stKey].name || '' });
    }
  }

  slots.forEach(slot => {
    const notifyAt = new Date(slot.time.getTime() - 5 * 60 * 1000);
    const delay = notifyAt.getTime() - now;
    if (delay <= 0) return;
    const body = slot.name
      ? `次の予定：${slot.name}（${slot.label}）`
      : `次の予定：${slot.label}`;
    const id = setTimeout(() => {
      new Notification('時間割', { body, icon: '/icon-192.png' });
    }, delay);
    notificationTimers.push(id);
  });
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
  scheduleNotificationsForToday();
}

document.getElementById('notificationSetting').addEventListener('change', async function() {
  state.settings.notifications = this.checked;
  save();
  if (this.checked) {
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    scheduleNotificationsForToday();
  } else {
    clearNotificationTimers();
  }
});

// ══════════════════════════════════════════
// BACKUP REMINDER
// ══════════════════════════════════════════

function checkBackupReminder() {
  const lastExport = localStorage.getItem('ts_lastExport');
  if (!lastExport) return;
  const daysSince = (Date.now() - new Date(lastExport).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince >= 7) {
    document.getElementById('backupReminderModal').classList.add('open');
  }
}

document.getElementById('backupNowBtn').addEventListener('click', () => {
  document.getElementById('backupReminderModal').classList.remove('open');
  document.getElementById('exportBtn').click();
});

document.getElementById('backupLaterBtn').addEventListener('click', () => {
  document.getElementById('backupReminderModal').classList.remove('open');
});
