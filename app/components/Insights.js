import { defineComponent, h } from '../../cekirdek/index.js';
import { stats, activitySeries, categoryBreakdown, topics } from '../state.js';
import { formatDate } from '../utils/tarih.js';

const DONUT_RADIUS = 52;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

export default defineComponent(function Insights() {
  const data = stats.value;
  const series = activitySeries.value;
  const categories = categoryBreakdown.value;
  const all = topics.value;

  const breakdown = [
    { id: 'ogrenildi', label: 'Öğrenildi', renk: '#2fd6a5', value: data.learned },
    { id: 'ogreniliyor', label: 'Öğreniliyor', renk: '#ffb454', value: data.studying },
    { id: 'yeni', label: 'Yeni', renk: '#5b8cff', value: data.fresh },
  ];

  const maxCount = Math.max(1, ...series.map((item) => item.count));
  const maxCategory = Math.max(1, ...categories.map((item) => item.count));
  const total = Math.max(1, data.total);

  let offsetAcc = 0;
  const arcs = breakdown.map((item) => {
    const fraction = item.value / total;
    const arc = {
      ...item,
      dasharray: `${(fraction * DONUT_CIRCUMFERENCE).toFixed(2)} ${DONUT_CIRCUMFERENCE.toFixed(2)}`,
      dashoffset: (-offsetAcc * DONUT_CIRCUMFERENCE).toFixed(2),
    };
    offsetAcc += fraction;
    return arc;
  });

  return h(
    'section',
    { class: 'istatistik' },
    h(
      'div',
      { class: 'istatistik__baslik' },
      h('h2', null, 'Öğrenme Analitiği'),
      h(
        'p',
        null,
        'Tüm veriler tarayıcında saklanır; istatistikler anında hesaplanır.'
      )
    ),

    h(
      'div',
      { class: 'izgara' },
      // --- Donut grafik ---
      h(
        'article',
        { class: 'panel' },
        h('h3', { class: 'panel__baslik' }, 'Durum dağılımı'),
        h(
          'div',
          { class: 'donut' },
          h(
            'svg',
            { viewBox: '0 0 130 130', class: 'donut__svg', 'aria-hidden': 'true' },
            h('circle', {
              class: 'donut__iz',
              cx: '65',
              cy: '65',
              r: String(DONUT_RADIUS),
            }),
            arcs.map((arc) =>
              h('circle', {
                key: arc.id,
                class: 'donut__dilim',
                cx: '65',
                cy: '65',
                r: String(DONUT_RADIUS),
                stroke: arc.renk,
                'stroke-dasharray': arc.dasharray,
                'stroke-dashoffset': arc.dashoffset,
              })
            )
          ),
          h(
            'div',
            { class: 'donut__merkez' },
            h('strong', null, String(data.total)),
            h('span', null, 'konu')
          )
        ),
        h(
          'ul',
          { class: 'legend' },
          breakdown.map((item) =>
            h(
              'li',
              { key: item.id, class: 'legend__ogesi' },
              h('span', { class: 'legend__renk', style: { background: item.renk } }),
              h('span', { class: 'legend__etiket' }, item.label),
              h('span', { class: 'legend__deger' }, String(item.value))
            )
          )
        )
      ),

      // --- Sütun grafik ---
      h(
        'article',
        { class: 'panel' },
        h('h3', { class: 'panel__baslik' }, 'Son 14 gün'),
        h(
          'div',
          { class: 'sutunlar' },
          series.map((item) =>
            h(
              'div',
              { key: item.key, class: 'sutunlar__ogesi', title: `${item.key}: ${item.count} tekrar` },
              h('span', {
                class: [
                  'sutunlar__cubuk',
                  item.count === 0 ? 'sutunlar__cubuk--bos' : '',
                ],
                style: { height: `${Math.max(4, (item.count / maxCount) * 100)}%` },
              }),
              h('span', { class: 'sutunlar__etiket' }, item.key.slice(8))
            )
          )
        ),
        h(
          'p',
          { class: 'panel__not' },
          `Toplam ${data.reviews} tekrar · Ortalama zorluk puanı ${data.avgEase.toFixed(2)}`
        )
      ),

      // --- Kategori dağılımı ---
      h(
        'article',
        { class: 'panel' },
        h('h3', { class: 'panel__baslik' }, 'Kategori dağılımı'),
        categories.length === 0
          ? h('p', { class: 'panel__not' }, 'Henüz kategori yok.')
          : h(
              'ul',
              { class: 'yatay' },
              categories.map((item) =>
                h(
                  'li',
                  { key: item.category, class: 'yatay__ogesi' },
                  h('span', { class: 'yatay__etiket' }, item.category),
                  h(
                    'span',
                    { class: 'yatay__ray' },
                    h('span', {
                      class: 'yatay__dolgu',
                      style: { width: `${(item.count / maxCategory) * 100}%` },
                    })
                  ),
                  h('span', { class: 'yatay__deger' }, String(item.count))
                )
              )
            )
      ),

      // --- En zor konular ---
      h(
        'article',
        { class: 'panel' },
        h('h3', { class: 'panel__baslik' }, 'En çok çalışılan konular'),
        all.length === 0
          ? h('p', { class: 'panel__not' }, 'Henüz konu yok.')
          : h(
              'ul',
              { class: 'sira' },
              [...all]
                .sort((a, b) => (b.history || []).length - (a.history || []).length)
                .slice(0, 5)
                .map((topic) =>
                  h(
                    'li',
                    { key: topic.id, class: 'sira__ogesi' },
                    h('span', { class: 'sira__ad' }, topic.title),
                    h(
                      'span',
                      { class: 'sira__deger' },
                      `${(topic.history || []).length} tekrar`
                    ),
                    h('span', { class: 'sira__tarih' }, formatDate(topic.createdAt))
                  )
                )
            )
      )
    )
  );
});
