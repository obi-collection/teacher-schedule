// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════

load();
state.currentWeekStart = getWeekStart(new Date());
applyTheme();
syncScroll();
initSwipeWeek();
setMainView('today');
render();
loadHolidays();
requestNotificationPermission();
checkBackupReminder();

window.addEventListener('resize', () => render());

// 「いま」表示を追従させる（今日ビュー表示中のみ）
setInterval(() => {
  if (document.getElementById('app').classList.contains('mode-today')) {
    renderTodayView();
  }
}, 30000);

// 復帰時に日付・現在コマを更新（PWAを開きっぱなしでも古くならない）
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) render();
});
