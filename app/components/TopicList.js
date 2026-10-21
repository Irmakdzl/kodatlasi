import { defineComponent, h } from '../../cekirdek/index.js';
import {
  filteredTopics,
  searchTerm,
  statusFilter,
  sortMode,
  clearAll,
  seedDemoData,
} from '../state.js';
import TopicCard from './TopicCard.js';

const FILTERS = [
  { id: 'tumu', label: 'Tümü' },
  { id: 'yeni', label: 'Yeni' },
  { id: 'ogreniliyor', label: 'Öğreniliyor' },
  { id: 'ogrenildi', label: 'Öğrenildi' },
];

const SORTS = [
  { id: 'tarih', label: 'Son eklenen' },
  { id: 'baslik', label: 'Başlığa göre' },
  { id: 'ilerleme', label: 'İlerlemeye göre' },
  { id: 'sonra', label: 'Yaklaşan tekrar' },
];

function EmptyState(term) {
  if (term) {
    return h(
      'div',
      { class: 'bos-durum' },
      h('span', { class: 'bos-durum__ikon', 'aria-hidden': 'true' }, '◌'),
      h('h3', { class: 'bos-durum__baslik' }, 'Eşleşen konu yok'),
      h(
        'p',
        { class: 'bos-durum__metin' },
        `"${term}" aramasıyla eşleşen bir konu bulunamadı. Farklı bir kelime dene.`
      )
    );
  }

  return h(
    'div',
    { class: 'bos-durum' },
    h('span', { class: 'bos-durum__ikon', 'aria-hidden': 'true' }, '◌'),
    h('h3', { class: 'bos-durum__baslik' }, 'Henüz konu yok'),
    h(
      'p',
      { class: 'bos-durum__metin' },
      'Öğrenmek istediğin konuları ekleyerek takip sistemini kullanmaya başla.'
    ),
    h(
      'div',
      { class: 'bos-durum__eylemler' },
      h(
        'button',
        {
          class: 'dugme dugme--vurgu',
          type: 'button',
          onClick: () => {
            seedDemoData();
          },
        },
        'Örnek verilerle doldur'
      ),
      h(
        'button',
        {
          class: 'dugme dugme--sessiz',
          type: 'button',
          onClick: () => {
            clearAll();
          },
        },
        'Temizle'
      )
    )
  );
}

function FooterActions() {
  return h(
    'div',
    { class: 'liste__alt' },
    h(
      'button',
      {
        class: 'bagli-dugme',
        type: 'button',
        onClick: () => {
          seedDemoData();
        },
      },
      'Örnek veri ekle'
    ),
    h(
      'button',
      {
        class: 'bagli-dugme bagli-dugme--tehlike',
        type: 'button',
        onClick: () => {
          if (window.confirm('Tüm konular silinsin mi?')) clearAll();
        },
      },
      'Tümünü sil'
    )
  );
}

export default defineComponent(function TopicList() {
  const list = filteredTopics.value;
  const filter = statusFilter.value;
  const sort = sortMode.value;
  const term = searchTerm.value;

  const toolbar = h(
    'div',
    { class: 'liste__arac' },
    h(
      'div',
      { class: 'filtreler', role: 'group', 'aria-label': 'Duruma göre filtrele' },
      FILTERS.map((item) =>
        h(
          'button',
          {
            key: item.id,
            type: 'button',
            class: ['filtre', filter === item.id ? 'filtre--aktif' : ''],
            onClick: () => {
              statusFilter.value = item.id;
            },
          },
          item.label
        )
      )
    ),
    h(
      'div',
      { class: 'liste__arac-sag' },
      h(
        'label',
        { class: 'secim' },
        h('span', null, 'Sırala'),
        h(
          'select',
          {
            class: 'secim__girdi',
            value: sort,
            onChange: (event) => {
              sortMode.value = event.target.value;
            },
          },
          SORTS.map((item) =>
            h(
              'option',
              { key: item.id, value: item.id, selected: item.id === sort },
              item.label
            )
          )
        )
      ),
      h('span', { class: 'liste__sayi' }, `${list.length} konu`)
    )
  );

  const content =
    list.length === 0
      ? EmptyState(term)
      : h(
          'div',
          { class: 'kartlar' },
          list.map((topic) => h(TopicCard, { key: topic.id, topic }))
        );

  return h(
    'section',
    { class: 'liste' },
    toolbar,
    content,
    list.length > 0 ? FooterActions() : null
  );
});
