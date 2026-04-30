// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════

load();
state.currentWeekStart = getWeekStart(new Date());
syncScroll();
initSwipeWeek();
render();
loadHolidays();
requestNotificationPermission();
checkBackupReminder();

window.addEventListener('resize', () => render());
