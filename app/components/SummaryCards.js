import { defineComponent, h } from '../../cekirdek/index.js';
import { stats } from '../state.js';

export default defineComponent(function SummaryCards() {
  const data = stats.value;

  const cards = [
    {
      label: 'Toplam Konu',
      value: data.total,
      detail: `${data.fresh} yeni · ${data.studying} öğreniliyor`,
      renk: 'vurgu',
      ikon: '◱',
    },
    {
      label: 'Öğrenilen',
      value: data.learned,
      detail: data.total ? `Konuların %${Math.round((data.learned / data.total) * 100)}'i` : 'Henüz veri yok',
      renk: 'basari',
      ikon: '✓',
    },
    {
      label: 'Tekrar Bekleyen',
      value: data.due,
      detail: data.due ? 'Bugün çalış' : 'Sıra sende',
      renk: 'uyari',
      ikon: '↻',
    },
    {
      label: 'Seri',
      value: `${data.streak} gün`,
      detail: `${data.reviews} toplam tekrar`,
      renk: 'vurgu-2',
      ikon: '⚡',
    },
  ];

  return h(
    'section',
    { class: 'ozet', 'aria-label': 'Genel bakış' },
    cards.map((card) =>
      h(
        'article',
        { key: card.label, class: `ozet__kart ozet__kart--${card.renk}` },
        h('span', { class: 'ozet__ikon', 'aria-hidden': 'true' }, card.ikon),
        h(
          'div',
          { class: 'ozet__govde' },
          h('span', { class: 'ozet__etiket' }, card.label),
          h('strong', { class: 'ozet__deger' }, String(card.value)),
          h('span', { class: 'ozet__detay' }, card.detail)
        )
      )
    )
  );
});
