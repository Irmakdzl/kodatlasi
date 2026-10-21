import { defineComponent, h, useState, useEffect, useRef } from '../../cekirdek/index.js';
import {
  addTopic,
  updateTopic,
  editorOpen,
  editingId,
  topics,
  showToast,
  CATEGORIES,
  STATUSES,
} from '../state.js';

export default defineComponent(function TopicEditor() {
  const editing = editingId.value
    ? topics.value.find((topic) => topic.id === editingId.value)
    : null;

  const [title, setTitle] = useState(editing ? editing.title : '');
  const [category, setCategory] = useState(editing ? editing.category : CATEGORIES[0]);
  const [notes, setNotes] = useState(editing ? editing.notes : '');
  const [status, setStatus] = useState(editing ? editing.status : 'yeni');
  const [error, setError] = useState('');

  const titleRef = useRef(null);

  // Modal açıldığında Esc ile kapat ve ilk alana odaklan.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        editorOpen.value = false;
      }
    }

    // Dinleyici önce bağlanır: sonraki satırda hata olsa bile kapatma çalışır.
    window.addEventListener('keydown', onKeyDown);

    const element = titleRef.current;
    if (element && typeof element.focus === 'function') element.focus();

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function close() {
    editorOpen.value = false;
  }

  function submit(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Konu başlığı boş olamaz.');
      return;
    }
    if (editing) {
      updateTopic(editing.id, { title: cleanTitle, category, notes, status });
      showToast('Konu güncellendi.');
    } else {
      addTopic({ title: cleanTitle, category, notes, status });
      showToast('Yeni konu eklendi.');
    }
    close();
  }

  return h(
    'div',
    {
      class: 'perde',
      onClick: (event) => {
        if (event.target === event.currentTarget) close();
      },
    },
    h(
      'form',
      { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Konu düzenleyici' },
      h(
        'header',
        { class: 'modal__ust' },
        h('h2', { class: 'modal__baslik' }, editing ? 'Konuyu düzenle' : 'Yeni konu ekle'),
        h(
          'button',
          {
            class: 'ikon-dugme ikon-dugme--kucuk',
            type: 'button',
            'aria-label': 'Kapat',
            onClick: close,
          },
          '×'
        )
      ),

      h(
        'div',
        { class: 'modal__govde' },
        h(
          'label',
          { class: 'alan' },
          h('span', { class: 'alan__etiket' }, 'Konu başlığı'),
          h('input', {
            class: 'alan__girdi',
            type: 'text',
            value: title,
            placeholder: 'Örn. Event Loop ve Asenkron Akış',
            ref: (element) => {
              titleRef.current = element;
            },
            onInput: (event) => {
              setTitle(event.target.value);
              if (error) setError('');
            },
          })
        ),

        h(
          'label',
          { class: 'alan' },
          h('span', { class: 'alan__etiket' }, 'Kategori'),
          h(
            'select',
            {
              class: 'alan__girdi',
              value: category,
              onChange: (event) => {
                setCategory(event.target.value);
              },
            },
            CATEGORIES.map((item) =>
              h('option', { key: item, value: item, selected: item === category }, item)
            )
          )
        ),

        h(
          'label',
          { class: 'alan' },
          h('span', { class: 'alan__etiket' }, 'Durum'),
          h(
            'div',
            { class: 'segment', role: 'group', 'aria-label': 'Durum seç' },
            Object.entries(STATUSES).map(([id, item]) =>
              h(
                'button',
                {
                  key: id,
                  type: 'button',
                  class: ['segment__dugme', status === id ? 'segment__dugme--aktif' : ''],
                  onClick: () => {
                    setStatus(id);
                  },
                },
                item.label
              )
            )
          )
        ),

        h(
          'label',
          { class: 'alan' },
          h('span', { class: 'alan__etiket' }, 'Notlar'),
          h('textarea', {
            class: 'alan__girdi alan__girdi--uzun',
            rows: '3',
            value: notes,
            placeholder: 'Kısa bir hatırlatma notu…',
            onInput: (event) => {
              setNotes(event.target.value);
            },
          })
        ),

        error ? h('p', { class: 'hata-mesaj' }, error) : null
      ),

      h(
        'footer',
        { class: 'modal__alt' },
        h(
          'button',
          { class: 'dugme dugme--sessiz', type: 'button', onClick: close },
          'Vazgeç'
        ),
        h(
          'button',
          { class: 'dugme dugme--vurgu', type: 'submit' },
          editing ? 'Değişiklikleri kaydet' : 'Konuyu ekle'
        )
      )
    )
  );
});
