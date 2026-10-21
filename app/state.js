/**
 * Uygulama Durumu
 * ------------------------------------------------------------------
 * Tüm paylaşılan durum Çekirdek "sinyal"leri ile tutulur.
 * Bir bileşen, bir sinyali okuduğu anda o sinyale abone olur; sinyal
 * değiştiğinde yalnızca o bileşen (ve onu okuyanlar) yeniden çizilir.
 */

import { signal, computed, effect } from '../cekirdek/index.js';
import { initialSchedule, scheduleNext, progressOf } from './utils/sm2.js';
import { dayKey, startOfDay, computeStreak } from './utils/tarih.js';

const STORAGE_KEY = 'kodatlasi.veri.v1';
const THEME_KEY = 'kodatlasi.tema.v1';

export const STATUSES = {
  yeni: { label: 'Yeni', renk: 'metin-3' },
  ogreniliyor: { label: 'Öğreniliyor', renk: 'uyari' },
  ogrenildi: { label: 'Öğrenildi', renk: 'basari' },
};

export const CATEGORIES = [
  'JavaScript',
  'TypeScript',
  'React',
  'Node.js',
  'Veritabanı',
  'Algoritma',
  'Sistem Tasarımı',
  'Test & CI',
  'Diğer',
];

/* ------------------------------------------------------------------ */
/* Sinyaller                                                           */
/* ------------------------------------------------------------------ */

export const topics = signal(loadTopics());
export const activeView = signal('konular');
export const searchTerm = signal('');
export const statusFilter = signal('tumu');
export const sortMode = signal('tarih');
export const theme = signal(loadTheme());
export const editorOpen = signal(false);
export const editingId = signal(null);
export const toastMessage = signal(null);

/** Arama kutusuna odaklanmak için paylaşılan DOM referansı. */
export const uiRefs = { searchInput: null };

/* ------------------------------------------------------------------ */
/* Türetilmiş (computed) değerler                                       */
/* ------------------------------------------------------------------ */

export const filteredTopics = computed(() => {
  const list = topics.value;
  const term = searchTerm.value.trim().toLocaleLowerCase('tr');
  const filter = statusFilter.value;
  const sort = sortMode.value;

  const result = list.filter((topic) => {
    const matchesTerm =
      !term ||
      topic.title.toLocaleLowerCase('tr').includes(term) ||
      topic.category.toLocaleLowerCase('tr').includes(term) ||
      (topic.notes || '').toLocaleLowerCase('tr').includes(term);
    const matchesFilter = filter === 'tumu' || topic.status === filter;
    return matchesTerm && matchesFilter;
  });

  result.sort((a, b) => {
    if (sort === 'baslik') return a.title.localeCompare(b.title, 'tr');
    if (sort === 'ilerleme') return progressOf(b) - progressOf(a);
    if (sort === 'sonra') return a.dueAt - b.dueAt;
    return b.createdAt - a.createdAt;
  });

  return result;
});

/** Bugün (ya da gecikmiş) tekrar bekleyen konular. */
export const dueTopics = computed(() => {
  const now = Date.now();
  return topics.value
    .filter((topic) => topic.status !== 'ogrenildi' && topic.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
});

export const stats = computed(() => {
  const list = topics.value;
  const now = Date.now();
  const total = list.length;
  const learned = list.filter((t) => t.status === 'ogrenildi').length;
  const studying = list.filter((t) => t.status === 'ogreniliyor').length;
  const fresh = list.filter((t) => t.status === 'yeni').length;
  const due = list.filter((t) => t.status !== 'ogrenildi' && t.dueAt <= now).length;
  const reviews = list.reduce((sum, t) => sum + (t.history || []).length, 0);
  const avgEase = total
    ? list.reduce((sum, t) => sum + (t.ease || 2.5), 0) / total
    : 2.5;

  const activity = new Set();
  list.forEach((topic) => {
    (topic.history || []).forEach((entry) => activity.add(dayKey(entry.date)));
  });
  const streak = computeStreak(Array.from(activity), now);

  return { total, learned, studying, fresh, due, reviews, avgEase, streak };
});

/** Son 14 günün her gün için tekrar sayısı. */
export const activitySeries = computed(() => {
  const counts = new Map();
  topics.value.forEach((topic) => {
    (topic.history || []).forEach((entry) => {
      const key = dayKey(entry.date);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
  });
  const series = [];
  const today = startOfDay(Date.now());
  for (let i = 13; i >= 0; i -= 1) {
    const timestamp = today - i * 24 * 60 * 60 * 1000;
    const key = dayKey(timestamp);
    series.push({ key, timestamp, count: counts.get(key) || 0 });
  }
  return series;
});

/** Kategoriye göre dağılım. */
export const categoryBreakdown = computed(() => {
  const counts = new Map();
  topics.value.forEach((topic) => {
    counts.set(topic.category, (counts.get(topic.category) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
});

/* ------------------------------------------------------------------ */
/* Eylemler (Actions)                                                  */
/* ------------------------------------------------------------------ */

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `k${Date.now().toString(36)}${idCounter.toString(36)}`;
}

export function addTopic({ title, category, notes, status = 'yeni' }) {
  const now = Date.now();
  const topic = {
    id: makeId(),
    title: title.trim(),
    category,
    notes: (notes || '').trim(),
    status,
    createdAt: now,
    updatedAt: now,
    history: [],
    ...initialSchedule(now),
  };
  topics.value = [topic, ...topics.value];
  return topic;
}

export function updateTopic(id, changes) {
  topics.value = topics.value.map((topic) =>
    topic.id === id ? { ...topic, ...changes, updatedAt: Date.now() } : topic
  );
}

export function deleteTopic(id) {
  topics.value = topics.value.filter((topic) => topic.id !== id);
}

/** Bir konuyu tekrar et ve SM-2 algoritmasına göre yeniden planla. */
export function reviewTopic(id, kalite) {
  const now = Date.now();
  topics.value = topics.value.map((topic) => {
    if (topic.id !== id) return topic;
    const next = scheduleNext(topic, kalite, now);
    const status = kalite <= 2 ? 'ogreniliyor' : topic.status === 'yeni' ? 'ogreniliyor' : topic.status;
    return {
      ...topic,
      ...next,
      status,
      updatedAt: now,
      history: [...(topic.history || []), { date: now, kalite }],
    };
  });
}

export function toggleStatus(id) {
  const topic = topics.value.find((t) => t.id === id);
  if (!topic) return;
  const next = topic.status === 'ogrenildi' ? 'ogreniliyor' : 'ogrenildi';
  updateTopic(id, { status: next });
}

export function clearAll() {
  topics.value = [];
}

export function seedDemoData() {
  const now = Date.now();
  const demo = [
    ['Event Loop ve Asenkron Akış', 'JavaScript', 'Microtask / macrotask sırası çok önemli.'],
    ['Closure ve Lexical Scope', 'JavaScript', 'IIFE ve döngüde değişken yakalama.'],
    ['React Hooks: useEffect', 'React', 'Bağımlılık dizisi ve temizleme fonksiyonu.'],
    ['Bileşen Kalıbı (Component Pattern)', 'React', 'Composition &gt; inheritance.'],
    ['Normalizasyon ve Join Sorguları', 'Veritabanı', '3NF, index kullanımı.'],
    ['Temel Algoritmalar: BFS / DFS', 'Algoritma', 'Big-O karşılaştırmaları.'],
  ].map(([title, category, notes], index) => ({
    id: makeId(),
    title,
    category,
    notes,
    status: index < 2 ? 'ogrenildi' : index < 4 ? 'ogreniliyor' : 'yeni',
    createdAt: now - (index + 1) * 3600 * 1000,
    updatedAt: now,
    history: index < 2 ? [{ date: now - 86400000, kalite: 4 }] : [],
    ease: 2.5,
    interval: index < 2 ? 6 : 0,
    repetitions: index < 2 ? 2 : 0,
    dueAt: index < 2 ? now + 3 * 86400000 : now - index * 3600 * 1000,
    lastReviewedAt: index < 2 ? now - 86400000 : null,
  }));
  topics.value = [...demo, ...topics.value];
}

export function showToast(message) {
  toastMessage.value = message;
}

export function closeToast() {
  toastMessage.value = null;
}

/* ------------------------------------------------------------------ */
/* Kalıcılık                                                            */
/* ------------------------------------------------------------------ */

function loadTopics() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Kayıtlı konular okunamadı:', error);
    return [];
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === 'acik' ? 'acik' : 'koyu';
  } catch (error) {
    return 'koyu';
  }
}

/** Yan etkileri başlatır: durum değişince otomatik kaydet. */
export function startPersistence() {
  effect(() => {
    const data = topics.value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Konular kaydedilemedi:', error);
    }
  });

  effect(() => {
    const value = theme.value;
    document.documentElement.setAttribute('data-theme', value);
    try {
      localStorage.setItem(THEME_KEY, value);
    } catch (error) {
      /* yoksay */
    }
  });
}

/* ------------------------------------------------------------------ */
/* Küçük yardımcı                                                       */
/* ------------------------------------------------------------------ */
