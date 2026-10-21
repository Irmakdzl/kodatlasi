/**
 * SM-2 Aralıklı Tekrar Algoritması
 * ------------------------------------------------------------------
 * SuperMemo-2 algoritmasının sadeleştirilmiş ve anlaşılır hâli.
 * Her konu için "zorluk puanı" (ease), "tekrar aralığı" (interval gün)
 * ve "tekrar sayısı" (repetitions) tutulur.
 */

export const MIN_EASE = 1.3;

/** Arayüzdeki üç seçeneğin SM-2 kalite puanları. */
export const GRADES = {
  zor: { label: 'Zor', kalite: 2, renk: 'hata', ikon: '×' },
  orta: { label: 'Orta', kalite: 4, renk: 'uyari', ikon: '~' },
  kolay: { label: 'Kolay', kalite: 5, renk: 'basari', ikon: '✓' },
};

export const GRADE_ORDER = ['zor', 'orta', 'kolay'];

/** Yeni bir konunun başlangıç zaman çizelgesi. */
export function initialSchedule(now = Date.now()) {
  return {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    dueAt: now,
    lastReviewedAt: null,
  };
}

/**
 * Bir tekrar puanına göre bir sonraki tekrar tarihini hesaplar.
 * @param {{ease:number, interval:number, repetitions:number}} schedule
 * @param {number} kalite 0-5 arası puan (5 = kolay, 0 = hiç bilmiyorum)
 * @param {number} now
 */
export function scheduleNext(schedule, kalite, now = Date.now()) {
  let { ease, interval, repetitions } = schedule;

  if (kalite < 3) {
    // Hatırlanamadı: sayaç sıfırlanır, konu yarın tekrar sorulur.
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease);
    interval = Math.max(interval, 1);
  }

  // Zorluk puanı güncellenir (üst sınır yok, alt sınır 1.3).
  ease = ease + (0.1 - (5 - kalite) * (0.08 + (5 - kalite) * 0.02));
  ease = Math.max(MIN_EASE, Math.round(ease * 100) / 100);

  return {
    ease,
    interval,
    repetitions,
    dueAt: now + interval * 24 * 60 * 60 * 1000,
    lastReviewedAt: now,
  };
}

/** Konunun öğrenme ilerlemesi (0-100). */
export function progressOf(topic) {
  const { repetitions = 0, ease = 2.5 } = topic;
  // Tekrar sayısı ana ağırlığı taşır; zorluk puanı bonus olarak eklenir.
  const base = Math.min(repetitions / 5, 1) * 75;
  const easeBonus =
    Math.min(Math.max((ease - 1.3) / 1.5, 0), 1) * 25 * Math.min(repetitions / 3, 1);
  return Math.round(Math.min(base + easeBonus, 100));
}

/** Konunun seviyesi: başlangıç / gelişiyor / sağlam / ustalaştı. */
export function levelOf(topic) {
  const progress = progressOf(topic);
  if (progress >= 90) return { id: 'ustalastim', label: 'Ustalaştım', renk: 'basari' };
  if (progress >= 60) return { id: 'saglam', label: 'Sağlam', renk: 'vurgu' };
  if (progress >= 25) return { id: 'gelisiyor', label: 'Gelişiyor', renk: 'uyari' };
  return { id: 'baslangic', label: 'Başlangıç', renk: 'metin-3' };
}
