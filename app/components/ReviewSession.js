import { defineComponent, h, useState, untrack } from '../../cekirdek/index.js';
import { dueTopics, reviewTopic } from '../state.js';
import { GRADES, GRADE_ORDER } from '../utils/sm2.js';
import { relativeTime } from '../utils/tarih.js';

export default defineComponent(function ReviewSession() {
  // Oturum boyunca sabit kalan bir kuyruk: konu tekrar edildiğinde
  // "tekrar bekleyenler" listesinden çıksa bile sıra bozulmamalı.
  const [queue] = useState(() => untrack(() => dueTopics.value));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ zor: 0, orta: 0, kolay: 0 });

  if (queue.length === 0) {
    return h(
      'section',
      { class: 'tekrar' },
      h(
        'div',
        { class: 'bos-durum' },
        h('span', { class: 'bos-durum__ikon', 'aria-hidden': 'true' }, '✓'),
        h('h3', { class: 'bos-durum__baslik' }, 'Şu an tekrar yok'),
        h(
          'p',
          { class: 'bos-durum__metin' },
          'Tüm konuların tekrar zamanı dolmamış. Biraz dinlen, sonra tekrar gel!'
        )
      )
    );
  }

  const finished = index >= queue.length;
  const current = finished ? null : queue[index];
  const total = GRADE_ORDER.reduce((sum, key) => sum + results[key], 0);

  function grade(key) {
    setResults((previous) => ({ ...previous, [key]: previous[key] + 1 }));
    reviewTopic(current.id, GRADES[key].kalite);
    setIndex((value) => value + 1);
    setRevealed(false);
  }

  return h(
    'section',
    { class: 'tekrar' },
    h(
      'div',
      { class: 'tekrar__ust' },
      h(
        'div',
        null,
        h('h2', { class: 'tekrar__baslik' }, 'Tekrar Oturumu'),
        h(
          'p',
          { class: 'tekrar__alt' },
          finished
            ? 'Oturum tamamlandı.'
            : `Kalan: ${queue.length - index} / ${queue.length} konu`
        )
      ),
      h(
        'div',
        { class: 'tekrar__sayaclar' },
        GRADE_ORDER.map((key) =>
          h(
            'span',
            { key, class: `sayac sayac--${GRADES[key].renk}` },
            `${GRADES[key].label}: ${results[key]}`
          )
        )
      )
    ),

    h(
      'div',
      { class: 'tekrar__ilerme' },
      h('span', {
        style: { width: `${Math.round((index / queue.length) * 100)}%` },
      })
    ),

    finished
      ? h(
          'div',
          { class: 'bos-durum bos-durum--basari' },
          h('span', { class: 'bos-durum__ikon', 'aria-hidden': 'true' }, '★'),
          h('h3', { class: 'bos-durum__baslik' }, 'Bugünkü tekrar tamam!'),
          h(
            'p',
            { class: 'bos-durum__metin' },
            `${total} konu tekrar edildi. Yeni tekrar tarihleri SM-2 algoritmasına göre planlandı.`
          )
        )
      : h(
          'article',
          { class: 'kart-kart', key: current.id },
          h('span', { class: 'kart-kart__etiket' }, current.category),
          h('h3', { class: 'kart-kart__baslik' }, current.title),
          h(
            'p',
            { class: 'kart-kart__zaman' },
            'Planlanan tekrar: ',
            relativeTime(current.dueAt),
            ' · ',
            `Zorluk ${current.ease.toFixed(2)}`
          ),
          revealed
            ? h(
                'div',
                { class: 'kart-kart__cevap' },
                h('h4', null, 'Notlar'),
                h('p', null, current.notes || 'Bu konu için not eklenmemiş.')
              )
            : null,
          revealed
            ? h(
                'div',
                { class: 'puan-grup' },
                h('span', { class: 'puan-grup__etiket' }, 'Ne kadar hatırladın?'),
                h(
                  'div',
                  { class: 'puan-grup__dugmeler' },
                  GRADE_ORDER.map((key) =>
                    h(
                      'button',
                      {
                        key,
                        type: 'button',
                        class: `puan puan--${GRADES[key].renk}`,
                        onClick: () => grade(key),
                      },
                      GRADES[key].ikon,
                      ' ',
                      GRADES[key].label
                    )
                  )
                )
              )
            : h(
                'button',
                {
                  class: 'dugme dugme--vurgu dugme--genis',
                  type: 'button',
                  onClick: () => setRevealed(true),
                },
                'Cevabı göster'
              )
        )
  );
});
