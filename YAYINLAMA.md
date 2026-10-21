# KodAtlası — Yayınlama Rehberi

> ## ✅ Site yayında
>
> **Canlı adres:** <https://kodatlasi.surge.sh>
>
> Herkese açık, HTTPS, kalıcı. Hocaya bu bağlantıyı gönderebilirsiniz.

Bu proje **tamamen statiktir**: derleme adımı, sunucu tarafı kod ve harici
paket yoktur. Bu yüzden herhangi bir statik barındırma servisine doğrudan
yüklenebilir.

> Tüm yollarda site **HTTPS** ve **kalıcı** bir adres alır.

---

## Yol 1 — Netlify Drop *(30 saniye, en kolay)*

Hesap bile gerekmez, sürükle-bırak.

1. Tarayıcıda **https://app.netlify.com/drop** adresini aç.
2. Proje klasörünü pencereye sürükle bırak:
   `C:\Users\Lenovo\AppData\Local\Temp\opencode\kodatlasi`
3. Site otomatik yüklenir ve şu adresi verir:
   `https://rastgele-ad-1234.netlify.app`
4. **"Claim this site"** ile kendi hesabına bağla, sonra
   **Site configuration → Change site name** ile istediğin adresi seç:
   `https://kodatlasi.netlify.app`

**Not:** `node_modules` yok, `npm install` gerekmez. Klasörün **tamamını**
yükle (içinde `index.html` var).

---

## Yol 2 — GitHub Pages *(ödev için en prestijli)*

Site GitHub profilinde görünür → ödev raporuna bağlantı olarak ekleyebilirsin.

### 1) Depoyu oluştur

- https://github.com/new adresine git
- Repo adı: `kodatlasi`
- **Public** seç (Private da olur, ücretsiz Pages yine çalışır)
- "Add a README" **seçme**, "Add .gitignore" **seçme**

### 2) Kodu gönder

Proje klasöründe şu 3 komutu çalıştır:

```bash
git remote add origin https://github.com/KULLANICI_ADIN/kodatlasi.git
git push -u origin main
```

GitHub giriş isteyecek (tarayıcı açılır, izin ver).

### 3) Pages'i etkinleştir

- Repo → **Settings** → sol menü **Pages**
- **Source:** `Deploy from a branch`
- **Branch:** `main` · **Folder:** `/ (root)`
- **Save**

### 4) Adres

1-2 dakika içinde site yayında:

```
https://KULLANICI_ADIN.github.io/kodatlasi/
```

> **Neden çalışıyor?** Tüm yollar göreli (`./assets/...`, `./app/main.js`)
> yazıldı; bu sayede alt klasörde de doğru çalışır. Ayrıca `.nojekyll`
> dosyası eklendi, GitHub'ın Jekyll'i devre dışı bırakıyor.

---

## Yol 3 — Vercel *(terminalden, 2 komut)*

```bash
npx vercel                 # ilk seferde e-posta ile giriş yapılır
npx vercel --prod          # kalıcı üretim adresi
```

Adres: `https://kodatlasi.vercel.app`

---

## Yol 4 — Cloudflare Pages *(hızlı ve global)*

```bash
npx wrangler login
npx wrangler pages deploy . --project-name=kodatlasi
```

Adres: `https://kodatlasi.pages.dev`

---

## Yol 5 — Surge *(en basit CLI — **şu an bu kullanılıyor**)*

```bash
npx surge . kodatlasi.surge.sh
```

Adres: `https://kodatlasi.surge.sh` ← **yayınlanan adres**

Surge'da hesap tek komutla açılır, ardından gelen e-postadaki doğrulama
bağlantısına tıklanır ve site yayına başlar. Terminalde hesap açmak için:

```bash
npx surge login
```

> **Not:** Surge her yeni hesap için e-posta doğrulaması ister. Doğrulama
> yapılmadan site `403` döner.

---

## Yayınladıktan sonra yapılacaklar

### 1) Canlı bağlantıyı README'ye ekle

README'nin en üstüne şu bloğu ekle (kendi adresinle değiştir):

```markdown
[![Canlı Demo](https://img.shields.io/badge/canlı%20demo-5b8cff?style=for-the-badge)](https://KULLANICI_ADIN.github.io/kodatlasi/)
```

### 2) Ödev raporuna bağlantıyı yaz

> **Canlı Demo:** https://KULLANICI_ADIN.github.io/kodatlasi/
> **Kaynak Kod:** https://github.com/KULLANICI_ADIN/kodatlasi

### 3) Ekran görüntüsü al

README'ye 2-3 ekran görüntüsü eklemek ödevi belirgin şekilde güçlendirir.
Önerilen görüntüler: ana liste, tekrar oturumu, istatistik paneli.

---

## Sık karşılaşılan sorunlar

| Sorun | Çözüm |
|---|---|
| Site açılıyor ama **boş** | Konsolda `file://` hatası varsa klasör yerine **sunucu** kullanılıyor demektir. Netlify/GitHub Pages `https` üzerinden servis eder, sorun olmaz. |
| **404** hatası | `index.html` klasörün **kökünde** olmalı. GitHub Pages'te Branch `main`, Folder `/ (root)` olsun. |
| Stiller yüklenmiyor | `assets/styles/*.css` yolları bozulmuş olabilir. README'deki proje yapısını kontrol et. |
| Veriler **kayboluyor** | Normal davranış: veriler tarayıcının `localStorage`'ında tutulur, sunucuya gitmez. |
| GitHub "Pages cannot be published" | Repo adı `KULLANICI_ADIN.github.io` ise Pages otomatik açılır; normal repo adında Settings → Pages'ten seçmelisin. |

---

## Ek: Kendi alan adın varsa

GitHub Pages veya Netlify'de **Settings → Domains → Add custom domain**
kısmından alan adını ekle. DNS kaydı için:

| Alan | Değer |
|---|---|
| `CNAME` | `www.alanadiniz.com` |
| `A` kaydı (GitHub) | `185.199.108.153` |
| `A` kaydı (GitHub) | `185.199.109.153` |
| `A` kaydı (GitHub) | `185.199.110.153` |
| `A` kaydı (GitHub) | `185.199.111.153` |

Ücretsiz HTTPS sertifikası otomatik olarak verilir.
