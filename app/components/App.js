import { defineComponent, h, useEffect } from '../../cekirdek/index.js';
import {
  activeView,
  editorOpen,
  editingId,
  toastMessage,
  uiRefs,
} from '../state.js';
import TopBar from './TopBar.js';
import SummaryCards from './SummaryCards.js';
import TopicList from './TopicList.js';
import ReviewSession from './ReviewSession.js';
import Insights from './Insights.js';
import TopicEditor from './TopicEditor.js';
import Toast from './Toast.js';

export default defineComponent(function App() {
  const view = activeView.value;

  // Klavye kısayolları: / arama, N yeni konu, 1-2-3 sekmeler.
  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (event.key === '/' && !typing) {
        event.preventDefault();
        if (uiRefs.searchInput) uiRefs.searchInput.focus();
        return;
      }
      if (typing) return;

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        editingId.value = null;
        editorOpen.value = true;
        return;
      }
      if (event.key === '1') activeView.value = 'konular';
      if (event.key === '2') activeView.value = 'tekrar';
      if (event.key === '3') activeView.value = 'istatistik';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return h(
    'div',
    { class: 'uygulama' },
    h(TopBar),
    h(
      'main',
      { class: 'icerik' },
      view === 'konular' ? h(SummaryCards) : null,
      view === 'konular' ? h(TopicList) : null,
      view === 'tekrar' ? h(ReviewSession) : null,
      view === 'istatistik' ? h(Insights) : null
    ),
    h(
      'footer',
      { class: 'alt-bar' },
      h('span', null, 'KodAtlası · Çekirdek ile yazılmış bir örnek uygulama'),
      h('span', { class: 'alt-bar__ipucu' }, 'Kısayollar: / arama · N yeni konu · 1-2-3 sekme')
    ),
    editorOpen.value ? h(TopicEditor) : null,
    toastMessage.value ? h(Toast) : null
  );
});
