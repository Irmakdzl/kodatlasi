import { defineComponent, h, useEffect } from '../../cekirdek/index.js';
import { toastMessage, closeToast } from '../state.js';

export default defineComponent(function Toast() {
  const message = toastMessage.value;

  // 2.4 saniye sonra kendiliğinden kaybol.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      closeToast();
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [message]);

  return h(
    'div',
    { class: 'bildirim', role: 'status', 'aria-live': 'polite' },
    h('span', { class: 'bildirim__ikon', 'aria-hidden': 'true' }, '✓'),
    h('span', null, message),
    h(
      'button',
      {
        class: 'bildirim__kapat',
        type: 'button',
        'aria-label': 'Kapat',
        onClick: () => {
          closeToast();
        },
      },
      '×'
    )
  );
});
