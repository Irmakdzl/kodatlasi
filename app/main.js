/**
 * KodAtlası · Giriş noktası
 * ------------------------------------------------------------------
 * Uygulamayı başlatır, durum kayıtlarını açar ve kök bileşeni
 * "uygulama" kapsayıcısına bağlar.
 */

import { render } from '../cekirdek/index.js';
import App from './components/App.js';
import { startPersistence, topics } from './state.js';

const container = document.getElementById('uygulama');

if (!container) {
  throw new Error('KodAtlası: #uygulama kapsayıcısı bulunamadı.');
}

// Kalıcılık (localStorage) ve tema uygulamasını başlat.
startPersistence();

render(App, {}, container);

// Konsoldan hızlı kontrol: `kodatlasi.durum()` ile durumu görebilirsin.
window.kodatlasi = {
  durum: () => topics.value,
  sifirla: () => {
    localStorage.removeItem('kodatlasi.veri.v1');
  },
};
