// ══════════════════════════════════════════
// DAY IMAGES（写真メモ）
// 写真は容量が大きいため localStorage ではなく IndexedDB に保存する。
// 既存のスケジュールデータ（localStorage）には一切触れない。
// ══════════════════════════════════════════

const IMG_DB_NAME = 'teacher-schedule-images';
const IMG_STORE = 'dayImages';
let imgDbPromise = null;
let imageTargetDate = null;
let viewingImage = null;

function openImageDb() {
  if (imgDbPromise) return imgDbPromise;
  imgDbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(IMG_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMG_STORE)) {
        const store = db.createObjectStore(IMG_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return imgDbPromise;
}

async function idbAddImage(date, blob) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMG_STORE, 'readwrite');
    tx.objectStore(IMG_STORE).add({ date, blob, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetImagesForDate(date) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMG_STORE, 'readonly');
    const req = tx.objectStore(IMG_STORE).index('date').getAll(date);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbDeleteImage(id) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMG_STORE, 'readwrite');
    tx.objectStore(IMG_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 写真がある日付の一覧（週ビューの📷マーク用。blobは読み込まない）
async function idbGetDatesWithImages() {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const dates = new Set();
    const tx = db.transaction(IMG_STORE, 'readonly');
    const req = tx.objectStore(IMG_STORE).index('date').openKeyCursor();
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { dates.add(cur.key); cur.continue(); } else { resolve(dates); }
    };
    req.onerror = () => reject(req.error);
  });
}

// 長辺 maxDim に縮小して JPEG 圧縮（時間割のプリント程度なら十分読める）
function compressImageFile(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('compress failed')),
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

function requestAddDayImage(dateStr) {
  imageTargetDate = dateStr;
  document.getElementById('dayImageInput').click();
}

document.getElementById('dayImageInput').addEventListener('change', async function() {
  const file = this.files[0];
  this.value = '';
  const dateStr = imageTargetDate;
  if (!file || !dateStr) return;
  try {
    showToast('写真を保存中…');
    const blob = await compressImageFile(file);
    await idbAddImage(dateStr, blob);
    showToast('写真を保存しました');
    refreshImageViews(dateStr);
  } catch (e) {
    console.error('Image save failed', e);
    showToast('写真を保存できませんでした');
  }
});

function refreshImageViews(dateStr) {
  if (typeof renderTodayView === 'function') renderTodayView();
  const sheet = document.getElementById('dayEventsSheet');
  if (sheet.classList.contains('open') && state.dayEventsDate === dateStr) {
    renderDayImageThumbs(document.getElementById('dayEventsPhotos'), dateStr);
  }
  renderWeekImageChips();
}

// サムネイル一覧を container に描画（共通）
async function renderDayImageThumbs(container, dateStr) {
  if (!container) return;
  let images = [];
  try { images = await idbGetImagesForDate(dateStr); } catch (e) { return; }
  container.innerHTML = '';
  if (images.length === 0) { container.style.display = 'none'; return; }
  container.style.display = '';
  images.forEach(rec => {
    const url = URL.createObjectURL(rec.blob);
    const img = document.createElement('img');
    img.className = 'day-photo-thumb';
    img.alt = '写真メモ';
    img.addEventListener('load', () => URL.revokeObjectURL(url));
    img.src = url;
    img.addEventListener('click', () => openImageViewer(rec, dateStr));
    container.appendChild(img);
  });
}

// ── 拡大ビューア ──

function openImageViewer(rec, dateStr) {
  viewingImage = { id: rec.id, dateStr };
  const img = document.getElementById('imageViewerImg');
  img.src = URL.createObjectURL(rec.blob);
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('imageViewerTitle').textContent =
    `${d.getMonth() + 1}/${d.getDate()}（${DAY_NAMES[d.getDay()]}）の写真`;
  document.getElementById('imageViewerModal').classList.add('open');
}

function closeImageViewer() {
  const img = document.getElementById('imageViewerImg');
  if (img.src) { URL.revokeObjectURL(img.src); img.removeAttribute('src'); }
  document.getElementById('imageViewerModal').classList.remove('open');
  viewingImage = null;
}

document.getElementById('deleteImageBtn').addEventListener('click', async () => {
  if (!viewingImage) return;
  if (!confirm('この写真を削除しますか？')) return;
  const { id, dateStr } = viewingImage;
  try {
    await idbDeleteImage(id);
    closeImageViewer();
    refreshImageViews(dateStr);
    showToast('写真を削除しました');
  } catch (e) {
    console.error('Image delete failed', e);
    showToast('削除できませんでした');
  }
});

document.getElementById('closeImageViewerBtn').addEventListener('click', closeImageViewer);
document.getElementById('imageViewerModal').addEventListener('click', function(e) {
  if (e.target === this) closeImageViewer();
});

// ── 週ビューの📷マーク ──

async function renderWeekImageChips() {
  let dates;
  try { dates = await idbGetDatesWithImages(); } catch (e) { return; }
  document.querySelectorAll('#daysEventsInner .day-events-cell').forEach(cell => {
    const dk = cell.dataset.date;
    const existing = cell.querySelector('.photo-chip');
    if (dk && dates.has(dk)) {
      if (!existing) {
        const chip = document.createElement('div');
        chip.className = 'event-chip photo-chip';
        chip.textContent = '📷';
        cell.appendChild(chip);
      }
    } else if (existing) {
      existing.remove();
    }
  });
}
