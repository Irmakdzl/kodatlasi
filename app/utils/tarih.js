/**
 * Tarih yardımcıları (tamamı Türkçe biçimlendirme).
 */

const GUN_MS = 24 * 60 * 60 * 1000;

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const DAY_MS = GUN_MS;

/** "21 Ekim" biçiminde tarih. */
export function formatDate(timestamp) {
  const date = new Date(timestamp);
  return `${date.getDate()} ${AYLAR[date.getMonth()]}`;
}

/** "Salı, 21 Ekim 2026" biçiminde uzun tarih. */
export function formatLongDate(timestamp) {
  const date = new Date(timestamp);
  return `${GUNLER[date.getDay()]}, ${date.getDate()} ${AYLAR[date.getMonth()]} ${date.getFullYear()}`;
}

/** "YYYY-MM-DD" biçiminde gün anahtarı (grafik ekseni için). */
export function dayKey(timestamp) {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Günün başlangıç zaman damgası. */
export function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** İki zaman arasındaki tam gün farkı. */
export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / GUN_MS);
}

/**
 * "bugün", "yarın", "3 gün sonra", "5 gün önce" gibi göreli ifade.
 */
export function relativeTime(timestamp, now = Date.now()) {
  const diff = daysBetween(now, timestamp);
  if (diff === 0) return 'bugün';
  if (diff === 1) return 'yarın';
  if (diff === -1) return 'dün';
  if (diff > 0) return `${diff} gün sonra`;
  return `${Math.abs(diff)} gün önce`;
}

/** Geçmiş süren süreyi "3 sa 12 dk" gibi biçimlendirir. */
export function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (!hours) return `${minutes} dk`;
  return `${hours} sa ${minutes} dk`;
}

/** Son n günün gün anahtarlarını eskiden yeniye doğru döndürür. */
export function lastDays(count, now = Date.now()) {
  const result = [];
  const today = startOfDay(now);
  for (let i = count - 1; i >= 0; i -= 1) {
    result.push({ timestamp: today - i * GUN_MS, key: dayKey(today - i * GUN_MS) });
  }
  return result;
}

/** İki tarih arasındaki "streak" (ardışık gün) sayısını hesaplar. */
export function computeStreak(timestamps, now = Date.now()) {
  if (!timestamps || timestamps.length === 0) return 0;
  const unique = new Set(timestamps.map(dayKey));
  let streak = 0;
  let cursor = startOfDay(now);
  // Bugün henüz çalışılmadıysa dünden başlat.
  if (!unique.has(dayKey(cursor))) cursor -= GUN_MS;
  while (unique.has(dayKey(cursor))) {
    streak += 1;
    cursor -= GUN_MS;
  }
  return streak;
}
