const CACHE = 'padrao-ouro-v10';
const CORE = [
  './',
  './404.html',
  './alta-azul.png',
  './alta-branca.png',
  './apple-touch-icon.png',
  './authors.js',
  './autor-alex-lopes.webp',
  './autor-alex-matos.webp',
  './autor-carla-bittar.webp',
  './autor-gabriel-ferreira.webp',
  './autor-joao-costa.webp',
  './autor-jose-eduardo.webp',
  './autor-jose-zambrano.webp',
  './autor-livia-antunes.webp',
  './autor-marcia-salles.webp',
  './autor-mariana-campos.webp',
  './autor-polyana-rotta.webp',
  './autor-rafael-azevedo.webp',
  './autor-rodrigo-meneses.webp',
  './autor-rodrigo-otavio.webp',
  './autor-sandra-coelho.webp',
  './autor-valdir-chiogna.webp',
  './autor-viviani-gomes.webp',
  './autores.html',
  './biosseguridade.html',
  './biosseguridade.jpg',
  './colostragem.html',
  './colostragem.jpg',
  './content.js',
  './conteudo.json',
  './cuidados-iniciais.html',
  './cuidados-iniciais.jpg',
  './desempenho.html',
  './desempenho.jpg',
  './diarreia-agentes.webp',
  './ebook.css',
  './ebook.html',
  './favicon-32.png',
  './favicon-48.png',
  './favicon.ico',
  './fornecimento-1.webp',
  './fornecimento-2.webp',
  './gestao-saude.html',
  './gestao-saude.jpg',
  './hero.jpg',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './idades-reproducao.webp',
  './index.html',
  './instalacoes.html',
  './instalacoes.jpg',
  './leitura.html',
  './manifest.webmanifest',
  './nutricao-fases.webp',
  './nutricao.html',
  './nutricao.jpg',
  './padrao-ouro-sem-alta.png',
  './padrao-ouro.png',
  './pre-parto-maternidade.jpg',
  './qr-site.png',
  './reader.js',
  './reproducao-novilhas.html',
  './reproducao-novilhas.jpg',
  './robots.txt',
  './site.js',
  './sitemap.xml',
  './social-share.jpg',
  './style.css',
  './translate.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(CORE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const exact = await caches.match(event.request, { ignoreSearch: true });
          return exact || caches.match('./index.html', { ignoreSearch: true });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
