import { defineComponent, h } from '../../cekirdek/index.js';
import {
  activeView,
  searchTerm,
  statusFilter,
  theme,
  editorOpen,
  editingId,
  uiRefs,
  stats,
  dueTopics,
} from '../state.js';

const TABS = [
  { id: 'konular', label: 'Konular', hint: '1' },
  { id: 'tekrar', label: 'Tekrar', hint: '2' },
  { id: 'istatistik', label: 'İstatistik', hint: '3' },
];

export default defineComponent(function TopBar() {
  const view = activeView.value;
  const term = searchTerm.value;
  const currentTheme = theme.value;
  const dueCount = dueTopics.value.length;

  function openEditor() {
    editingId.value = null;
    editorOpen.value = true;
  }

  return h(
    'header',
    { class: 'ust-bar' },
    h(
      'div',
      { class: 'marka' },
      h('span', { class: 'marka__simge', 'aria-hidden': 'true' }, '◈'),
      h(
        'span',
        { class: 'marka__yazi' },
        h('strong', { class: 'marka__ad' }, 'KodAtlası'),
        h('span', { class: 'marka__alt' }, 'Yazılım Öğrenme Takipçisi')
      )
    ),

    h(
      'nav',
      { class: 'sekmeler', 'aria-label': 'Sekmeler' },
      TABS.map((tab) =>
        h(
          'button',
          {
            key: tab.id,
            class: ['sekmeler__düğme', view === tab.id ? 'sekmeler__düğme--aktif' : ''],
            type: 'button',
            'aria-current': view === tab.id ? 'page' : null,
            onClick: () => {
              activeView.value = tab.id;
            },
          },
          tab.label,
          tab.id === 'tekrar' && dueCount > 0
            ? h('span', { class: 'sekmeler__rozet' }, String(dueCount))
            : null,
          h('kbd', { class: 'sekmeler__kbd' }, tab.hint)
        )
      )
    ),

    h(
      'div',
      { class: 'ust-bar__sag' },
      h(
        'label',
        { class: 'arama' },
        h('span', { class: 'arama__ikon', 'aria-hidden': 'true' }, '⌕'),
        h('input', {
          class: 'arama__girdi',
          type: 'search',
          placeholder: 'Konu ara…',
          value: term,
          'aria-label': 'Konularda ara',
          onInput: (event) => {
            searchTerm.value = event.target.value;
          },
          ref: (element) => {
            uiRefs.searchInput = element;
          },
        })
      ),
      h(
        'button',
        {
          class: 'ikon-dugme',
          type: 'button',
          title: currentTheme === 'koyu' ? 'Açık temaya geç' : 'Koyu temaya geç',
          'aria-label': 'Tema değiştir',
          onClick: () => {
            theme.value = currentTheme === 'koyu' ? 'acik' : 'koyu';
          },
        },
        currentTheme === 'koyu' ? '☀' : '☾'
      ),
      h(
        'button',
        { class: 'dugme dugme--vurgu', type: 'button', onClick: openEditor },
        '+ Yeni Konu'
      )
    )
  );
});
