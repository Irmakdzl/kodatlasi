# KodAtlası

> Yazılım geliştirme dersi ödevi — Sıfırdan yazılmış mini bir reaktif UI
> çerçevesi (**Çekirdek**) üzerine kurulu bir öğrenme takip uygulaması.

**🌐 Canlı Demo:** <https://irmakdzl.github.io/kodatlasi/>

**📦 Kaynak Kod:** <https://github.com/Irmakdzl/kodatlasi>
&nbsp;·&nbsp;**🔁 Yedek adres:** <https://kodatlasi.surge.sh>

> Bağlantıyı hocanıza doğrudan gönderebilirsiniz. Site herkese açıktır,
> HTTPS ile çalışır ve `localStorage` dışında hiçbir veri toplanmaz.

KodAtlası, "öğreneceğim konuları listeleyip aralıklı tekrar ile pekiştirme"
fikrini hayata geçiren bir web uygulamasıdır. Kullanılan reaktiflik, sanal
DOM ve bileşen modeli hazır bir kütüphane değildir; **projenin kendi
`cekirdek/` klasöründe sıfırdan yazılmıştır.**

> 📤 **Yayınlama?** → [YAYINLAMA.md](YAYINLAMA.md) rehberi (Netlify Drop,
> GitHub Pages, Vercel, Cloudflare — 5 dakikada canlı adres).

---

## 1. Hızlı Başlangıç

Harici bir paket kurulumu **gerekmez** (`npm install` yok).

### Windows

```bat
start.bat
```

### macOS / Linux

```bash
sh start.sh
```

### Manuel

```bash
node server.js          # http://localhost:5173
node server.js --open   # tarayıcıyı otomatik açar
```

> **Not:** `index.html` dosyasına çift tıklayarak açmak **çalışmaz**. Tarayıcılar
> `file://` protokolünde ES modüllerini (import/export) güvenlik gereği
> engeller. Bu durumda uygulama size açıklayıcı bir mesaj gösterir. Doğru
> çalıştırma yolu `node server.js` komutudur.

### Testler

```bash
npm test              # birim testler + duman testleri
node tests/run.js     # sadece birim testler (29 test)
node tests/smoke.js   # sadece duman testleri (16 test)
```

45 adet test toplam; reaktif katman, sanal düğüm, render motoru, SM-2
algoritması, tarih yardımcıları ve uygulamanın bütünü (bileşen ağacı,
arama, filtre, modal, kısayollar, kalıcılık) doğrulanır.

Test paketi **hiçbir harici kütüphane kullanmaz** ve uygulamayı tarayıcı
olmadan çalıştırır. `tests/dom-stub.js`, testler için gereken en küçük
DOM yüzeyini taklit eder.

---

## 2. Özellikler

| Alan | Yetenek |
|---|---|
| **Konu takibi** | Başlık, kategori, not, durum (Yeni / Öğreniliyor / Öğrenildi) |
| **Aralıklı tekrar** | SM-2 algoritması; Zor / Orta / Kolay puanlaması |
| **İlerleme halkası** | Her konu için tekrar sayısı ve zorluk puanına dayalı yüzde |
| **İstatistikler** | Durum dağılımı (donut), son 14 gün (sütun), kategori dağılımı |
| **Arama & filtre** | Başlık, kategori ve notlarda anlık arama; duruma göre filtre |
| **Klavye kısayolları** | `/` arama · `N` yeni konu · `1` `2` `3` sekmeler · `Esc` kapat |
| **Tema** | Koyu / açık tema, `localStorage` ile saklanır |
| **Kalıcılık** | Tüm veriler tarayıcıda `localStorage`'da; sunucu yok |
| **Duyarlılık** | Mobil, tablet ve masaüstü için ayrı yerleşimler |
| **Erişilebilirlik** | `aria` etiketleri, klavye ile gezinme, görünür odak halkaları |

---

## 3. Proje Yapısı

```
kodatlasi/
├── index.html              # Tek sayfa iskeleti
├── server.js               # Bağımlılıksız statik sunucu (Node'un yerleşik modülleri)
├── start.bat / start.sh    # Tek tıkla çalıştırma betikleri
├── package.json
│
├── cekirdek/               # ► KENDİ YAZDIĞIMIZ FRAMEWORK
│   ├── reaktif.js          # Sinyal, computed, effect, batch, untrack
│   ├── motor.js            # Sanal DOM, fark bulma (diff), bileşenler, hook'lar
│   └── index.js            # Genel API (dışarıya açılan tek giriş noktası)
│
├── app/
│   ├── main.js             # Uygulama giriş noktası
│   ├── state.js            # Paylaşılan durum (sinyaller) + eylemler + kalıcılık
│   ├── utils/
│   │   ├── sm2.js          # SM-2 aralıklı tekrar algoritması
│   │   └── tarih.js        # Türkçe tarih biçimlendirme, seri hesaplama
│   └── components/
│       ├── App.js          # Kök bileşen + klavye kısayolları
│       ├── TopBar.js       # Marka, sekmeler, arama, tema
│       ├── SummaryCards.js # Özet kartları
│       ├── TopicList.js    # Filtreler + konu ızgarası
│       ├── TopicCard.js    # Tek konu kartı (ilerleme halkası ile)
│       ├── TopicEditor.js  # Modal form
│       ├── ReviewSession.js# Tekrar oturumu
│       ├── Insights.js     # Grafikler
│       └── Toast.js        # Bildirim
│
├── assets/styles/
│   ├── base.css            # Tema değişkenleri, sıfırlama, sayfa iskeleti
│   └── components.css      # Bileşen stilleri
│
├── tests/
│   ├── run.js              # Test paketi
│   └── dom-stub.js         # Testler için minik DOM taklidi
│
└── README.md
```

---

## 4. Çekirdek Nasıl Çalışıyor?

### 4.1 Reaktiflik — `cekirdek/reaktif.js`

Bir **sinyal** okunduğunda, o anda "hangi fonksiyon onu okudu?" sorusu
cevaplanır ve fonksiyon sinyale abone olur. Sinyal değiştiğinde yalnızca
onu okuyanlar yeniden çizilir.

```js
const sayac = signal(0);

effect(() => {
  console.log(sayac.value);   // abone olur
});

sayac.value = 5;               // yalnızca yukarıdaki effect tetiklenir
```

Desteklenenler: `signal`, `computed` (önbellekli türetilmiş değer),
`effect` (temizleme fonksiyonu döndürebilir), `watch`, `batch` (toplu
güncelleme), `untrack` (bağımlılık kaydı oluşturmadan okuma).

### 4.2 Sanal DOM — `cekirdek/motor.js`

Bileşenler bir **ağaç betiği** (vnode) döndürür; motor bunu gerçek DOM'a
bağlar ve sonraki çizimlerde **yalnızca değişen kısımları** yamalar.

```js
h('ul', { class: 'liste' }, ogeler.map((o) => h('li', { key: o.id }, o.ad)));
```

- `key` verilen listelerde sıra değişimlerinde düğümler yeniden
  kullanılır, kaybolmaz.
- Metin değişimlerinde mevcut düğüm **yerinde** güncellenir (DOM
  değişikliği minimumda kalır).
- `props` farkı hesaplanır: eklenen öznitelikler atanır, kaldırılanlar
  silinir, olay dinleyicileri temizlenir.

### 4.3 Bileşenler ve Hook'lar

```js
const Kart = defineComponent((props) => {
  const [acik, setAcik] = useState(false);
  const sayac = useRef(0);

  useEffect(() => {
    document.title = `${props.baslik} (${sayac.current})`;
    return () => console.log('temizlendi');
  }, [props.baslik]);

  return h('article', { class: 'kart' },
    h('h3', null, props.baslik),
    h('button', { onClick: () => setAcik(!acik) }, 'Aç')
  );
});
```

| Hook | İşlev |
|---|---|
| `useState` | Bileşen içi durum; değer değişince bileşen yeniden çizilir |
| `useRef` | Çizimler arasında korunan, değişiklike yol açmayan referans |
| `useMemo` | Bağımlılıklar değişmedikçe yeniden hesaplanmayan değer |
| `useEffect` | Çizim sonrası yan etki; temizleme fonksiyonu döndürebilir |

### 4.4 SM-2 Aralıklı Tekrar — `app/utils/sm2.js`

SuperMemo-2 algoritmasının sadeleştirilmiş hâli. Her konu için **zorluk
puanı**, **tekrar aralığı** ve **tekrar sayısı** tutulur; puanlama
zorluk puanını ve bir sonraki tekrar tarihini belirler.

| Puan | Anlamı | Sonuç |
|---|---|---|
| Zor (2) | Hatırlayamadım | Sayaç sıfırlanır, 1 gün sonra tekrar |
| Orta (4) | Kısmen hatırladım | 1 gün → 6 gün → `aralık × zorluk` |
| Kolay (5) | Rahat hatırladım | Aynı düzen, zorluk puanı artar (min. 1.3) |

---

## 5. Hocanın Sorabileceği Sorular

**"Bu hazır bir kütüphane mi?"**
Hayır. React, Vue, Svelte kullanılmıyor; `cekirdek/` klasöründeki 700
satırlık kod tamamen bu proje için yazıldı.

**"Veriler nereye gidiyor?"**
`localStorage`. Sunucu yok, üyelik yok, istek atılmıyor. Konu verisi
tarayıcıda `kodatlasi.veri.v1` anahtarı altında tutulur.

**"Neden `key` kullanıyorsun?"**
Liste elemanlarının kimliğini korumak için. Anahtarsız listede 2. eleman
silinirse, 3. eleman "2. eleman" sanılır ve bileşen durumları karışır.
`tests/run.js` içinde bu davranışın testi vardır.

**"Performans?"**
Değişmeyen bileşenler yeniden çizilmez; DOM'a yalnızca fark yazılır.
Liste anahtarları sayesinde düğümler yeniden kullanılır.

---

## 6. Öneriler / Sonraki Adımlar

- [ ] Tekrar oturumuna "karıştır" (shuffle) modu
- [ ] Konuları dışa/içe aktarma (JSON dosyası)
- [ ] Takvim görünümü ile planlama
- [ ] Çekirdek'e `Suspense` benzeri asenkron bileşen desteği
- [ ] Birim test sayısını artırma (kapsam yüzdesi)
- [ ] Sunucu tarafı kayıt (opsiyonel)

---

## 7. Lisans

MIT — eğitim amaçlıdır, serbestçe kullanılabilir.
