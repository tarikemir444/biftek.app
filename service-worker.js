const CACHE_NAME = 'biftek-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// Kurulum (Install) Aşaması: Varlıkları önbelleğe al
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Önbellek açıldı ve varlıklar ekleniyor...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Aktivasyon (Activate) Aşaması: Eski önbellekleri temizle
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eski önbellek siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// İstek Yakalama (Fetch) Aşaması: Ağdan dene, yoksa önbellekten ver (Network First)
self.addEventListener('fetch', (event) => {
  // RSS beslemesi için özel işlem (dinamik içerik)
  if (event.request.url.includes('/rss.xml')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response('<rss><channel><title>BİFTEK Offline</title></channel></rss>', {
          headers: { 'Content-Type': 'application/xml' }
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı istekleri önbelleğe kopyala
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Ağ hatası olursa önbellekten döndür
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('/index.html');
        });
      })
  );
});

// Arka plan senkronizasyonu (isteğe bağlı, ileride kullanılabilir)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-feedback') {
    event.waitUntil(
      // Çevrimdışı gönderilen geri bildirimleri sunucuya iletme mantığı buraya gelecek
      Promise.resolve()
    );
  }
});