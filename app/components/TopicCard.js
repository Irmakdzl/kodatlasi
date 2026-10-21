import { defineComponent, h } from '../../cekirdek/index.js';
import {
  deleteTopic,
  editingId,
  editorOpen,
  toggleStatus,
  showToast,
  STATUSES,
} from '../state.js';
import { progressOf, levelOf } from '../utils/sm2.js';
import { relativeTime, formatDate } from '../utils/tarih.js';

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default defineComponent(function TopicCard(props) {
  const topic = props.topic;
  const progress = progressOf(topic);
  const level = levelOf(topic);
  const status = STATUSES[topic.status] || STATUSES.yeni;
  const offset = CIRCUMFERENCE * (1 - progress / 100);
  const dueIn = relativeTime(topic.dueAt);
  const isOverdue = topic.dueAt <= Date.now() && topic.status !== 'ogrenildi';

  function openEditor() {
    editingId.value = topic.id;
    editorOpen.value = true;
  }

  function remove(event) {
    event.stopPropagation();
    if (window.confirm(`"${topic.title}" silinsin mi?`)) {
      deleteTopic(topic.id);
      showToast('Konu silindi.');
    }
  }

  return h(
    'article',
    { class: 'konu', tabindex: '0' },
    h(
      'div',
      { class: 'konu__halka' },
      h(
        'svg',
        { viewBox: '0 0 48 48', class: 'halka', 'aria-hidden': 'true' },
        h('circle', { class: 'halka__iz', cx: '24', cy: '24', r: String(RADIUS) }),
        h('circle', {
          class: 'halka__dolgu',
          cx: '24',
          cy: '24',
          r: String(RADIUS),
          'stroke-dasharray': CIRCUMFERENCE.toFixed(2),
          'stroke-dashoffset': offset.toFixed(2),
        })
      ),
      h('span', { class: 'konu__yuzde' }, `${progress}%`)
    ),

    h(
      'div',
      { class: 'konu__govde' },
      h('h3', { class: 'konu__baslik' }, topic.title),
      h(
        'div',
        { class: 'konu__meta' },
        h('span', { class: 'etiket etiket--kategori' }, topic.category),
        h('span', { class: `etiket etiket--${status.renk}` }, status.label),
        h('span', { class: `etiket etiket--${level.renk}` }, level.label)
      ),
      topic.notes ? h('p', { class: 'konu__not' }, topic.notes) : null,
      h(
        'div',
        { class: 'konu__alt' },
        h(
          'span',
          { class: ['konu__tarih', isOverdue ? 'konu__tarih--gecikmis' : ''] },
          isOverdue ? '⏱ Tekrar zamanı' : 'Tekrar: ',
          isOverdue ? 'gecikmiş' : dueIn
        ),
        h('span', { class: 'konu__tarih' }, 'Son: ', formatDate(topic.createdAt)),
        h('span', { class: 'konu__tarih' }, `Zorluk: ${topic.ease.toFixed(2)}`)
      )
    ),

    h(
      'div',
      { class: 'konu__eylemler' },
      h(
        'button',
        {
          class: 'ikon-dugme ikon-dugme--kucuk',
          type: 'button',
          title: topic.status === 'ogrenildi' ? 'Öğreniliyor yap' : 'Öğrenildi işaretle',
          'aria-label': 'Durumu değiştir',
          onClick: () => {
            toggleStatus(topic.id);
          },
        },
        topic.status === 'ogrenildi' ? '◌' : '✓'
      ),
      h(
        'button',
        {
          class: 'ikon-dugme ikon-dugme--kucuk',
          type: 'button',
          title: 'Düzenle',
          'aria-label': 'Düzenle',
          onClick: openEditor,
        },
        '✎'
      ),
      h(
        'button',
        {
          class: 'ikon-dugme ikon-dugme--kucuk ikon-dugme--tehlike',
          type: 'button',
          title: 'Sil',
          'aria-label': 'Sil',
          onClick: remove,
        },
        '×'
      )
    )
  );
});
