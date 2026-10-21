/**
 * KodAtlası · Test Paketi
 * ------------------------------------------------------------------
 * Harici test kütüphanesi kullanmadan, Node'un yerleşik assert
 * modülüyle yazılmıştır. Çalıştırmak için:  node tests/run.js
 */

import assert from 'node:assert/strict';

import { signal, computed, effect, batch, untrack } from '../cekirdek/reaktif.js';
import { h, TEXT, defineComponent, render, useState, useEffect } from '../cekirdek/motor.js';
import { scheduleNext, initialSchedule, progressOf } from '../app/utils/sm2.js';
import { relativeTime, dayKey, computeStreak, lastDays } from '../app/utils/tarih.js';
import { installDom } from './dom-stub.js';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } catch (error) {
    failed += 1;
    failures.push({ name, error });
    console.log(`  \u2717 ${name}`);
  }
}

function group(title) {
  console.log(`\n${title}`);
}

/* ================================================================== */
group('Reaktif katman');

test('sinyal okuma ve yazma', () => {
  const sayac = signal(0);
  assert.equal(sayac.value, 0);
  sayac.value = 5;
  assert.equal(sayac.value, 5);
});

test('sinyal aynı değere yazılınca bildirim üretmez', () => {
  const sayac = signal(3);
  let bildirim = 0;
  effect(() => {
    sayac.value;
    bildirim += 1;
  });
  assert.equal(bildirim, 1);
  sayac.value = 3;
  assert.equal(bildirim, 1);
  sayac.value = 4;
  assert.equal(bildirim, 2);
});

test('effect bağımlılık değişince yeniden çalışır', () => {
  const a = signal(1);
  const b = signal('x');
  let aSayac = 0;
  let bSayac = 0;
  effect(() => {
    a.value;
    aSayac += 1;
  });
  effect(() => {
    b.value;
    bSayac += 1;
  });
  a.value = 2;
  b.value = 'y';
  assert.equal(aSayac, 2);
  assert.equal(bSayac, 2);
});

test('computed değeri önbelleğe alır ve yeniden hesaplar', () => {
  let hesaplama = 0;
  const taban = signal(2);
  const sonuc = computed(() => {
    hesaplama += 1;
    return taban.value * 3;
  });
  assert.equal(sonuc.value, 6);
  assert.equal(sonuc.value, 6);
  assert.equal(hesaplama, 1, 'aynı okumada yeniden hesaplanmamalı');
  taban.value = 5;
  assert.equal(sonuc.value, 15);
  assert.equal(hesaplama, 2);
});

test('batch içinde bildirimler tek turda toplanır', () => {
  const a = signal(0);
  const b = signal(0);
  let cagri = 0;
  effect(() => {
    a.value;
    b.value;
    cagri += 1;
  });
  batch(() => {
    a.value = 1;
    b.value = 2;
    a.value = 3;
  });
  assert.equal(cagri, 2, 'ilk çalıştırma + tek toplu güncelleme');
});

test('untrack bağımlılık kaydı oluşturmaz', () => {
  const a = signal(0);
  let cagri = 0;
  effect(() => {
    untrack(() => a.value);
    cagri += 1;
  });
  a.value = 9;
  assert.equal(cagri, 1);
});

test('effect temizleme fonksiyonu döndürebilir', () => {
  const a = signal(0);
  let temizlendi = 0;
  effect(() => {
    a.value;
    return () => {
      temizlendi += 1;
    };
  });
  a.value = 1;
  assert.equal(temizlendi, 1);
});

/* ================================================================== */
group('Sanal düğüm (vnode)');

test('h() metin çocuklarını metin düğümüne çevirir', () => {
  const vnode = h('div', null, 'Merhaba');
  assert.equal(vnode.type, 'div');
  assert.equal(vnode.children.length, 1);
  assert.equal(vnode.children[0].type, TEXT);
  assert.equal(vnode.children[0].props.nodeValue, 'Merhaba');
});

test('h() false / null çocukları atar', () => {
  const vnode = h('div', null, null, false, true, 'ok');
  assert.equal(vnode.children.length, 1);
});

test('h() anahtarı props içinden ayırır', () => {
  const vnode = h('li', { key: 'a', class: 'x' });
  assert.equal(vnode.key, 'a');
  assert.equal('key' in vnode.props, false);
  assert.equal(vnode.props.class, 'x');
});

test('h() bileşen çocuklarını props.children içine koyar', () => {
  const Bilesen = { __isComponent: true, render: () => null };
  const cocuk = h('span', null, 'içerik');
  const vnode = h(Bilesen, null, cocuk);
  assert.equal(vnode.props.children.length, 1);
  assert.equal(vnode.props.children[0], cocuk);
});

/* ================================================================== */
group('SM-2 aralıklı tekrar algoritması');

test('kolay cevap ilk tekrarı 1 güne, ikinci tekrarı 6 güne erteler', () => {
  let plan = initialSchedule(0);
  plan = scheduleNext(plan, 5, 0);
  assert.equal(plan.interval, 1);
  assert.equal(plan.repetitions, 1);
  plan = scheduleNext(plan, 5, 0);
  assert.equal(plan.interval, 6);
  assert.equal(plan.repetitions, 2);
});

test('zor cevap sayacı sıfırlar', () => {
  let plan = initialSchedule(0);
  plan = scheduleNext(plan, 5, 0);
  plan = scheduleNext(plan, 5, 0);
  plan = scheduleNext(plan, 2, 0);
  assert.equal(plan.repetitions, 0);
  assert.equal(plan.interval, 1);
});

test('zorluk puanı alt sınırın altına inmez', () => {
  let plan = initialSchedule(0);
  for (let i = 0; i < 12; i += 1) plan = scheduleNext(plan, 0, 0);
  assert.ok(plan.ease >= 1.3);
});

test('ilerleme yüzdesi 0-100 aralığında', () => {
  const yeni = { repetitions: 0, ease: 2.5 };
  const ileri = { repetitions: 9, ease: 2.9 };
  assert.equal(progressOf(yeni), 0);
  assert.ok(progressOf(ileri) <= 100);
  assert.ok(progressOf(ileri) > 0);
});

/* ================================================================== */
group('Tarih yardımcıları');

test('relativeTime bugün / yarın / dün', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);
  assert.equal(relativeTime(now, now), 'bugün');
  assert.equal(relativeTime(now + 86400000, now), 'yarın');
  assert.equal(relativeTime(now - 86400000, now), 'dün');
});

test('relativeTime gün farkını doğru hesaplar', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);
  assert.equal(relativeTime(now + 3 * 86400000, now), '3 gün sonra');
  assert.equal(relativeTime(now - 5 * 86400000, now), '5 gün önce');
});

test('dayKey YYYY-AA-GG biçiminde', () => {
  assert.equal(dayKey(new Date(2026, 9, 21).getTime()), '2026-10-21');
});

test('computeStreak ardışık günleri sayar', () => {
  const now = Date.UTC(2026, 0, 15, 12, 0, 0);
  const gun = 86400000;
  assert.equal(computeStreak([now - 2 * gun, now - gun, now], now), 3);
  assert.equal(computeStreak([now - 3 * gun], now), 0);
  assert.equal(computeStreak([], now), 0);
});

test('lastDays istenen sayıda gün döndürür', () => {
  assert.equal(lastDays(14, Date.now()).length, 14);
});

/* ================================================================== */
group('Render motoru (DOM taklidi ile)');

const dom = installDom();

function mountApp(component, props) {
  const container = dom.document.createElement('div');
  render(component, props || {}, container);
  return container;
}

test('bileşen DOM\'a bağlanır', () => {
  const Bilesen = defineComponent(() => h('p', { class: 'baslik' }, 'Merhaba'));
  const container = mountApp(Bilesen);
  assert.equal(container.childNodes.length, 1);
  assert.equal(container.textContent, 'Merhaba');
  assert.equal(container.childNodes[0].getAttribute('class'), 'baslik');
});

test('sinyal değişince yalnızca ilgili bileşen yeniden çizilir', () => {
  const sayac = signal(0);
  const Bilesen = defineComponent(() => h('p', null, String(sayac.value)));
  const container = mountApp(Bilesen);
  const ilkDugum = container.childNodes[0];

  assert.equal(container.textContent, '0');
  sayac.value = 5;
  dom.flush();

  assert.equal(container.textContent, '5');
  assert.equal(container.childNodes[0], ilkDugum, 'DOM düğümü yerinde güncellenmeli');
});

test('useState ile durum değişimi bileşeni yeniden çizer', () => {
  let setter;
  const Bilesen = defineComponent(() => {
    const [deger, setDeger] = useState('baslangic');
    setter = setDeger;
    return h('span', null, deger);
  });
  const container = mountApp(Bilesen);
  assert.equal(container.textContent, 'baslangic');
  setter('guncel');
  dom.flush();
  assert.equal(container.textContent, 'guncel');
});

test('anahtarlı liste yeniden sıralanır', () => {
  const ogeler = signal(['a', 'b', 'c']);
  const Bilesen = defineComponent(() =>
    h('ul', null, ogeler.value.map((item) => h('li', { key: item }, item)))
  );
  const container = mountApp(Bilesen);
  const oku = () => container.childNodes[0].childNodes.map((li) => li.textContent);

  assert.deepEqual(oku(), ['a', 'b', 'c']);
  ogeler.value = ['c', 'a', 'b'];
  dom.flush();
  assert.deepEqual(oku(), ['c', 'a', 'b']);
});

test('listeden eleman silinince DOM\'dan da silinir', () => {
  const ogeler = signal(['a', 'b', 'c']);
  const Bilesen = defineComponent(() =>
    h('ul', null, ogeler.value.map((item) => h('li', { key: item }, item)))
  );
  const container = mountApp(Bilesen);
  ogeler.value = ['a', 'c'];
  dom.flush();
  assert.deepEqual(
    container.childNodes[0].childNodes.map((li) => li.textContent),
    ['a', 'c']
  );
});

test('koşullu render elemanı kaldırır', () => {
  const goster = signal(true);
  const Bilesen = defineComponent(() =>
    h('div', null, goster.value ? h('span', null, 'gizli') : null)
  );
  const container = mountApp(Bilesen);
  assert.equal(container.textContent, 'gizli');
  goster.value = false;
  dom.flush();
  assert.equal(container.textContent, '');
});

test('üst bileşenin props değişimi alt bileşene aktarılır', () => {
  const etiket = signal('bir');
  const Alt = defineComponent((props) => h('em', null, props.metin));
  const Ust = defineComponent(() => h('div', null, h(Alt, { metin: etiket.value })));
  const container = mountApp(Ust);

  assert.equal(container.textContent, 'bir');
  etiket.value = 'iki';
  dom.flush();
  assert.equal(container.textContent, 'iki');
});

test('useEffect yalnızca bağımlılık değişince çalışır', () => {
  const sayac = signal(0);
  let calisma = 0;
  const Bilesen = defineComponent(() => {
    const [deger] = useState('sabit');
    useEffect(() => {
      calisma += 1;
    }, [deger]);
    return h('span', null, String(sayac.value));
  });
  const container = mountApp(Bilesen);
  dom.flush();
  assert.equal(calisma, 1);

  sayac.value = 1;
  dom.flush();
  assert.equal(calisma, 1, 'bağımlılık değişmediyse etki tekrar çalışmamalı');
});

test('SVG etiketleri doğru ad alanında üretilir', () => {
  const Grafik = defineComponent(() =>
    h('svg', { viewBox: '0 0 10 10' }, h('circle', { cx: '5', cy: '5', r: '4' }))
  );
  const container = mountApp(Grafik);
  const svg = container.childNodes[0];
  assert.equal(svg.namespaceURI, 'http://www.w3.org/2000/svg');
  assert.equal(svg.childNodes[0].tagName, 'CIRCLE');
});

dom.restore();

/* ================================================================== */
console.log('');
console.log('─'.repeat(46));

if (failed === 0) {
  console.log(`  Tüm testler geçti: ${passed}/${passed}`);
  console.log('');
  process.exit(0);
}

console.log(`  ${passed} geçti, ${failed} kaldı`);
console.log('');
for (const item of failures) {
  console.log(`  ✗ ${item.name}`);
  console.log(`    ${item.error.message}`);
}
console.log('');
process.exit(1);
