# BİFTEK — Bilim, Fen ve Teknoloji Kulübü Haber Sitesi

Modern, Apple tasarım dilini benimseyen, Firebase altyapılı ilerici bir web uygulaması (PWA).

## 🚀 Özellikler

- **Kullanıcı Yönetimi**: E-posta/Şifre ve Google ile giriş/kayıt sistemi
- **Rol Tabanlı Erişim**: Misafir, Üye, Yazar (Author) ve Yönetici (Admin) rolleri
- **Yazar Başvuru Sistemi**: Kullanıcılar yazar olmak için başvuru yapabilir
- **Gelişmiş Editör**: Markdown/HTML desteği, otomatik kaydetme, kelime sayacı
- **Akıllı Görsel Önerisi**: Unsplash/Pexels API entegrasyonu
- **Etkileşim**: Beğeni, Favorilere Kaydetme, Geri Bildirim
- **Sesli Okuma**: Metin okuma özelliği (Text-to-Speech)
- **Karanlık Mod**: Göz dostu tema değiştirme
- **Bildirim Merkezi**: Anlık bildirim takibi
- **Yönetici Paneli**: İstatistikler, haber yönetimi, başvuru onaylama
- **PWA Desteği**: Çevrimdışı çalışma ve mobil uygulama gibi kurulum
- **RSS Beslemesi**: Dinamik RSS XML çıktısı

## 📁 Proje Yapısı

```
/workspace
├── index.html          # Ana HTML dosyası (Tüm modallar dahil)
├── style.css           # Tüm stiller (Dark mode dahil)
├── app.js              # Tüm JavaScript mantığı (Firebase, UI, vs.)
├── manifest.json       # PWA manifest dosyası
├── service-worker.js   # PWA servis işçisi (Önbellekleme)
├── rss.xml             # Dinamik RSS oluşturucu (JS tabanlı)
├── firestore.rules     # Firebase güvenlik kuralları
└── README.md           # Bu dosya
```

## 🔧 Kurulum

### 1. Firebase Projesi Oluşturma

1. [Firebase Console](https://console.firebase.google.com/)'a gidin
2. Yeni proje oluşturun
3. **Authentication** bölümünden "Email/Password" ve "Google" sağlayıcılarını aktif edin
4. **Firestore Database** oluşturun ve test modunda başlayın (kuralları sonra yükleyeceksiniz)

### 2. Firebase Bilgilerini Güncelleme

`app.js` dosyasının en başındaki `firebaseConfig` objesini kendi Firebase proje bilgilerinizle güncelleyin:

```javascript
const firebaseConfig = {
    apiKey: "SENİN_API_KEY",
    authDomain: "PROJE_ID.firebaseapp.com",
    projectId: "PROJE_ID",
    storageBucket: "PROJE_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};
```

Aynı bilgileri `rss.xml` dosyasında da güncellemeyi unutmayın.

### 3. Güvenlik Kurallarını Yükleme

Firebase Console'da **Firestore Database > Rules** sekmesine gidin ve `firestore.rules` dosyasının içeriğini yapıştırın. Yayınla (Publish) butonuna basın.

### 4. Yerel Test

Projeyi bir yerel sunucuda çalıştırın (Service Worker ve PWA özellikleri için HTTPS veya localhost gereklidir):

```bash
# Python ile
python -m http.server 8000

# Node.js ile (npx)
npx serve .

# VS Code Live Server eklentisi ile
```

Tarayıcıda `http://localhost:8000` adresini ziyaret edin.

## 🎯 Kullanım Senaryoları

### İlk Yönetici Atama

1. Site üzerinden normal bir kullanıcı olarak kayıt olun
2. Profil menüsünden "Yönetici Kodu Gir" alanına tıklayın
3. Varsayılan kod: `BIFTEK-ADMIN-2024`
4. Kod doğrulandıktan sonra hesabınız admin rolüne yükseltilir

### Yazar Olma Süreci

1. Üye girişi yapın
2. Profil menüsünden "Yazar Ol (Başvuru Yap)" seçeneğine tıklayın
3. Formu doldurun ve gönderin
4. Admin panele düşen başvurunuz onaylandığında `author` rolüne sahip olursunuz
5. Profil menüsünde "Yazar Paneli" seçeneği belirecek

### Makale Yazma

1. Yazar rolüne sahipseniz, profil menüsünden "Yazar Paneli"ne girin
2. Başlık, kategori, içerik girin (Markdown veya HTML)
3. Kapak görseli için 3 seçenekten birini kullanın:
   - Dosya yükleme
   - URL ekleme
   - Akıllı öneri (kategoriye göre otomatik)
4. Otomatik kaydetme her 30 saniyede bir çalışır
5. "Yayınla" butonu ile makalenizi yayınlayın

## 🔐 Güvenlik

- **Admin**: Tüm koleksiyonlarda tam yetki (okuma, yazma, silme)
- **Yazar**: Sadece kendi makalelerini düzenleyebilir, yeni makale oluşturabilir
- **Üye**: Kendi profilini düzenleyebilir, beğeni ve favorileri yönetebilir
- **Misafir**: Sadece okuma yapabilir, geri bildirim gönderebilir

Detaylı kurallar için `firestore.rules` dosyasını inceleyin.

## 🌐 PWA ve Çevrimdışı Çalışma

Site ilk ziyarette temel dosyaları (HTML, CSS, JS) önbelleğe alır. İnternet bağlantısı kesilse bile daha önce ziyaret edilen sayfalar çalışır. Yeni içerikler için ağ bağlantısı gereklidir.

Mobil cihazlarda tarayıcı menüsünden "Ana Ekrana Ekle" seçeneği ile uygulama gibi kurulabilir.

## 📡 RSS Beslemesi

`/rss.xml` adresinden son 20 haberin RSS akışına ulaşabilirsiniz. Bu dosya dinamik olarak Firestore'dan veri çeker ve XML formatında sunar.

```xml
https://biftek-haberleri.com/rss.xml
```

## 🛠️ Teknolojiler

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Firebase Authentication, Firestore Database
- **Tasarım**: Apple Human Interface Guidelines esintili özel CSS
- **PWA**: Service Worker, Web App Manifest
- **API**: Unsplash, Pexels (görsel önerisi için)

## 📝 Lisans

Bu proje BİFTEK (Bilim, Fen ve Teknoloji Kulübü) için geliştirilmiştir.

## 👥 Katkıda Bulunma

Yazar olmak için site üzerinden başvuru yapabilirsiniz. Teknik katkı için GitHub deposunu inceleyin.

---

**Not**: Bu proje eğitim ve kulüp amaçlı geliştirilmiştir. Production ortamında Firebase güvenlik kurallarını ve API anahtarlarını dikkatlice yönetin.