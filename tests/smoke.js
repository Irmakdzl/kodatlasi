/**
 * KodAtlası · Uygulama Duman Testi
 * ------------------------------------------------------------------
 * Uygulamayı gerçek bir tarayıcı olmadan başlatır; bileşen ağacını
 * kurar, kullanıcı eylemlerini taklit eder ve sonuçları doğrular.
 *
 *   node tests/smoke.js
 */

import assert from 'node:assert/strict';
import { installDom } from './dom-stub.js';

/* ------------------------------------------------------------------ */
/* Tarayıcı ortamını taklit et                                          */
/* ------------------------------------------------------------------ */

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};

const dom = installDom();

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                          */
/* ------------------------------------------------------------------ */

function walk(node, visit) {
  visit(node);
  node.childNodes.forEach((child) => walk(child, visit));
}

function findAll(root, tagName) {
  const result = [];
  walk(root, (node) => {
    if (node.tagName === tagName.toUpperCase()) result.push(node);
  });
  return result;
}

function findByClass(root, className) {
  const result = [];
  walk(root, (node) => {
    if (node.classList && node.classList.contains(className)) result.push(node);
  });
  return result;
}

function textsOf(root, tagName) {
  return findAll(root, tagName).map((node) => node.textContent);
}

/* ------------------------------------------------------------------ */
/* Testler                                                              */
/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  \u2713 ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`  \u2717 ${name}`);
    console.log(`    ${error.message}`);
  }
}

const { render } = await import('../cekirdek/index.js');
const App = (await import('../app/components/App.js')).default;
const state = await import('../app/state.js');

const container = dom.document.createElement('div');
render(App, {}, container);

// Kalıcılık ve tema uygulamasını da etkinleştir (main.js'in yaptığı gibi).
state.startPersistence();
dom.flush();

console.log('\nUygulama duman testi');

await test('uygulama başlatılır ve üst bar çizilir', () => {
  assert.ok(findAll(container, 'header').length >= 1);
  assert.ok(findByClass(container, 'marka__ad').length === 1);
  assert.equal(findByClass(container, 'marka__ad')[0].textContent, 'KodAtlası');
});

await test('üç sekme bulunur', () => {
  const sekmeler = findByClass(container, 'sekmeler__düğme');
  assert.equal(sekmeler.length, 3);
});

await test('başlangıçta özet kartları görünür', () => {
  const kartlar = findByClass(container, 'ozet__kart');
  assert.equal(kartlar.length, 4);
});

await test('yeni konu eklenince kart listeye girer', () => {
  state.addTopic({ title: 'Test Konusu', category: 'JavaScript', notes: 'not' });
  dom.flush();
  const kartlar = findByClass(container, 'konu');
  assert.equal(kartlar.length, 1);
  assert.ok(findByClass(container, 'konu__baslik')[0].textContent.includes('Test Konusu'));
});

await test('arama terimi listeyi süzer', () => {
  state.searchTerm.value = 'bulunamayacak-bir-kelime';
  dom.flush();
  assert.equal(findByClass(container, 'konu').length, 0);
  state.searchTerm.value = '';
  dom.flush();
  assert.equal(findByClass(container, 'konu').length, 1);
});

await test('durum filtresi çalışır', () => {
  state.statusFilter.value = 'ogrenildi';
  dom.flush();
  assert.equal(findByClass(container, 'konu').length, 0);
  state.statusFilter.value = 'tumu';
  dom.flush();
  assert.equal(findByClass(container, 'konu').length, 1);
});

await test('tekrar oturumu sekmesi çalışır', () => {
  state.activeView.value = 'tekrar';
  dom.flush();
  assert.ok(findByClass(container, 'tekrar').length === 1);
  state.activeView.value = 'konular';
  dom.flush();
});

await test('istatistik sekmesi grafikleri çizer', () => {
  state.activeView.value = 'istatistik';
  dom.flush();
  assert.ok(findAll(container, 'svg').length >= 1);
  assert.ok(findByClass(container, 'panel').length >= 4);
  state.activeView.value = 'konular';
  dom.flush();
});

await test('konu düzenleyici modalı açılıp kapanır', () => {
  state.editingId.value = null;
  state.editorOpen.value = true;
  dom.flush();
  assert.ok(findByClass(container, 'modal').length === 1);
  assert.ok(findByClass(container, 'alan').length >= 3);

  state.editorOpen.value = false;
  dom.flush();
  assert.ok(findByClass(container, 'modal').length === 0);
});

await test('modal açıkken ESC kısayolu çalışır', () => {
  state.editorOpen.value = true;
  dom.flush();
  dom.window.dispatch('keydown', { key: 'Escape' });
  dom.flush();
  assert.ok(findByClass(container, 'modal').length === 0);
});

await test('"N" kısayolu yeni konu penceresini açar', () => {
  dom.window.dispatch('keydown', { key: 'n' });
  dom.flush();
  assert.ok(findByClass(container, 'modal').length === 1);
  state.editorOpen.value = false;
  dom.flush();
});

await test('bildirim (toast) görünür ve zamanlanır', () => {
  state.showToast('Merhaba');
  dom.flush();
  assert.ok(findByClass(container, 'bildirim').length === 1);
  state.closeToast();
  dom.flush();
  assert.ok(findByClass(container, 'bildirim').length === 0);
});

await test('konu silinince listeden çıkar', () => {
  const id = state.topics.value[0].id;
  state.deleteTopic(id);
  dom.flush();
  assert.equal(findByClass(container, 'konu').length, 0);
});

await test('durum localStorage\'a yazılır', () => {
  state.addTopic({ title: 'Kayıt Testi', category: 'React' });
  dom.flush();
  const kayit = storage.get('kodatlasi.veri.v1');
  assert.ok(kayit, 'kayıt oluşmalı');
  const veri = JSON.parse(kayit);
  assert.ok(Array.isArray(veri));
  assert.ok(veri.some((t) => t.title === 'Kayıt Testi'));
});

await test('tema değişimi HTML köküne yansır', () => {
  const setAttributeCalls = [];
  dom.document.documentElement.setAttribute = (name, value) => {
    setAttributeCalls.push([name, value]);
  };
  state.theme.value = 'acik';
  dom.flush();
  assert.ok(
    setAttributeCalls.some(([name, value]) => name === 'data-theme' && value === 'acik'),
    'data-theme="acik" uygulanmalı'
  );
});

await test('SM-2 puanlaması tekrar tarihini ileri alır', () => {
  const konu = state.topics.value[0];
  const eskiTarih = konu.dueAt;
  state.reviewTopic(konu.id, 5);
  dom.flush();
  const guncel = state.topics.value.find((t) => t.id === konu.id);
  assert.ok(guncel.dueAt > eskiTarih, 'tekrar tarihi ileri gitmeli');
  assert.equal(guncel.history.length, 1);
});

console.log('');
console.log('─'.repeat(46));

if (failed === 0) {
  console.log(`  Tüm duman testleri geçti: ${passed}/${passed}`);
  console.log('');
  dom.restore();
  process.exit(0);
}

console.log(`  ${passed} geçti, ${failed} kaldı`);
console.log('');
dom.restore();
process.exit(1);
