/**
 * ÇEKİRDEK · Reaktif Katman
 * ------------------------------------------------------------------
 * Sinyal (signal) tabanlı reaktiflik. Bir "observer/tracker" nesnesi
 * hangi sinyalleri okuduysa onlara abone olur; sinyal değiştiğinde
 * otomatik olarak haberdar edilir.
 *
 * Buradaki hiçbir şey DOM'a dokunmaz, bu yüzden Node üzerinde de
 * (testlerde) çalıştırılabilir.
 */

/** Şu anda aktif olan tracker (hangi bağımlılıklar okunuyor?). */
let activeTracker = null;

/** Toplu güncelleme (batch) sırasında biriken tracker'lar. */
let batchDepth = 0;
const pendingTrackers = new Set();

/* ------------------------------------------------------------------ */
/* Tracker yönetimi                                                    */
/* ------------------------------------------------------------------ */

/**
 * Bağımlılık takip eden bir gözlemci oluşturur.
 * @param {() => void} onInvalidate Bağımlılık değiştiğinde çağrılacak işlev.
 */
export function createTracker(onInvalidate) {
  return {
    deps: new Set(),
    disposed: false,
    invalidate() {
      if (this.disposed) return;
      releaseDeps(this);
      onInvalidate();
    },
  };
}

/** Tracker'ın tuttuğu bağımlılık kayıtlarını serbest bırakır. */
export function releaseDeps(tracker) {
  if (!tracker) return;
  for (const node of tracker.deps) node.observers.delete(tracker);
  tracker.deps.clear();
}

/** Verilen işlevi tracker bağlamında çalıştırır (bağımlılık toplama). */
export function runTracked(tracker, fn) {
  const previous = activeTracker;
  activeTracker = tracker;
  try {
    return fn();
  } finally {
    activeTracker = previous;
  }
}

/** Bağımlılık toplamayı devre dışı bırakarak işlevi çalıştırır. */
export function untrack(fn) {
  const previous = activeTracker;
  activeTracker = null;
  try {
    return fn();
  } finally {
    activeTracker = previous;
  }
}

/* ------------------------------------------------------------------ */
/* Sinyal                                                              */
/* ------------------------------------------------------------------ */

function trackSignal(node) {
  if (!activeTracker) return;
  node.observers.add(activeTracker);
  activeTracker.deps.add(node);
}

function notify(node) {
  for (const observer of Array.from(node.observers)) {
    if (batchDepth > 0) {
      pendingTrackers.add(observer);
    } else {
      observer.invalidate();
    }
  }
}

/**
 * Okuma/yazma yapılabilen reaktif değer.
 *   const sayac = signal(0);
 *   sayac.value;      // okuma  -> bağımlılık kaydedilir
 *   sayac.value = 5;  // yazma -> bağımlıları uyarılır
 */
export function signal(initialValue) {
  const node = { value: initialValue, observers: new Set() };

  return {
    get value() {
      trackSignal(node);
      return node.value;
    },
    set value(next) {
      if (Object.is(next, node.value)) return;
      node.value = next;
      notify(node);
    },
    /** Bağımlılık kaydı oluşturmadan okur. */
    peek() {
      return node.value;
    },
  };
}

/* ------------------------------------------------------------------ */
/* Türetilmiş değer (computed)                                         */
/* ------------------------------------------------------------------ */

/**
 * Bağımlılıklarından biri değiştiğinde kendini yeniden hesaplayan
 * önbelleklenmiş değer.
 */
export function computed(compute) {
  const source = signal(undefined);
  let ready = false;

  const api = {
    get value() {
      if (!ready) {
        source.value = compute();
        ready = true;
      }
      return source.value;
    },
    peek() {
      return source.value;
    },
  };

  // compute() içeriğini izleyen bir effect, sonucu `source` sinyaline yazar.
  effect(() => {
    const next = compute();
    if (!ready) {
      source.value = next;
      ready = true;
    } else if (!Object.is(next, source.peek())) {
      source.value = next;
    }
  });

  return api;
}

/* ------------------------------------------------------------------ */
/* Yan etkiler                                                         */
/* ------------------------------------------------------------------ */

/**
 * Bağımlılıkları değiştiğinde yeniden çalışan bir yan etki.
 * Dönen işlev, temizleme (cleanup) fonksiyonu olabilir.
 * @returns {() => void} Etkiyi durduran fonksiyon.
 */
export function effect(fn) {
  let cleanup = null;

  const tracker = createTracker(() => {
    if (typeof cleanup === 'function') {
      cleanup();
      cleanup = null;
    }
    runTracked(tracker, () => {
      cleanup = fn();
    });
  });

  runTracked(tracker, () => {
    cleanup = fn();
  });

  return () => {
    tracker.disposed = true;
    releaseDeps(tracker);
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
  };
}

/**
 * Bir sinyali (veya computed'ı) izler; değer değiştiğinde işlevi çağırır.
 */
export function watch(source, callback) {
  return effect(() => {
    callback(source.value);
  });
}

/* ------------------------------------------------------------------ */
/* Toplu güncelleme                                                     */
/* ------------------------------------------------------------------ */

/**
 * Birden fazla yazma işlemini tek turda toplar; bağımlı bileşenler
 * yalnızca bir kez yeniden çizilir.
 */
export function batch(fn) {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0) {
      const trackers = Array.from(pendingTrackers);
      pendingTrackers.clear();
      for (const tracker of trackers) tracker.invalidate();
    }
  }
}
