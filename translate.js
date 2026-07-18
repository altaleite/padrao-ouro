(function () {
  const params = new URLSearchParams(location.search);
  const supported = ['pt', 'en', 'es'];
  const stored = localStorage.getItem('po-language');
  const requested = params.get('lang');
  const lang = supported.includes(requested) ? requested : (supported.includes(stored) ? stored : 'pt');
  const langTags = { pt: 'pt-BR', en: 'en', es: 'es' };
  const labels = {
    pt: { name: 'Português', translating: 'Traduzindo conteúdo…', notice: 'Versão original em português.', fallback: 'Abrindo tradução automática…' },
    en: { name: 'English', translating: 'Translating content…', notice: 'Automatic translation. The Portuguese version is the official technical reference; text embedded in images may remain in Portuguese.', fallback: 'Opening automatic translation…' },
    es: { name: 'Español', translating: 'Traduciendo contenido…', notice: 'Traducción automática. La versión en portugués es la referencia técnica oficial; el texto integrado en imágenes puede permanecer en portugués.', fallback: 'Abriendo traducción automática…' }
  };

  localStorage.setItem('po-language', lang);

  function urlFor(target) {
    const url = new URL(location.href);
    if (target === 'pt') url.searchParams.delete('lang');
    else url.searchParams.set('lang', target);
    return url.href;
  }

  function addLanguageSwitcher() {
    const headerEnd = document.querySelector('.header-end') || document.querySelector('.screen-toolbar');
    if (!headerEnd || document.querySelector('.language-switcher')) return;
    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Selecionar idioma / Select language / Seleccionar idioma');
    switcher.innerHTML = supported.map(code => `
      <a href="${urlFor(code)}" class="${code === lang ? 'active' : ''}" data-language="${code}" lang="${langTags[code]}" aria-label="${labels[code].name}">${code.toUpperCase()}</a>
    `).join('');
    const toggle = headerEnd.querySelector('.mobile-toggle');
    headerEnd.insertBefore(switcher, toggle || null);
  }

  function updateInternalLinks() {
    if (lang === 'pt') return;
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || link.hasAttribute('download')) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin === location.origin && /\.html$|\/$/.test(url.pathname)) {
          url.searchParams.set('lang', lang);
          link.href = url.href;
        }
      } catch (_) {}
    });
  }

  function showStatus(message, busy) {
    let status = document.querySelector('.translation-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'translation-status';
      status.setAttribute('role', 'status');
      document.body.appendChild(status);
    }
    status.innerHTML = `${busy ? '<span class="translation-spinner" aria-hidden="true"></span>' : ''}<span>${message}</span>`;
    status.classList.toggle('is-busy', !!busy);
    status.hidden = false;
    return status;
  }

  function hideStatus(delay = 2200) {
    const status = document.querySelector('.translation-status');
    if (status) window.setTimeout(() => { status.hidden = true; }, delay);
  }

  function shouldTranslateNode(node) {
    const parent = node.parentElement;
    if (!parent) return false;
    if (!node.nodeValue || !node.nodeValue.trim()) return false;
    if (/^[\d\s.,%<>≥≤–—+\-/:()]+$/.test(node.nodeValue.trim())) return false;
    if (parent.closest('script,style,noscript,code,pre,svg,.language-switcher,.translation-status,[data-no-translate]')) return false;
    return true;
  }

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function loadCache(target) {
    try { return JSON.parse(localStorage.getItem(`po-translation-${target}-v10`) || '{}'); }
    catch (_) { return {}; }
  }

  function saveCache(target, cache) {
    try { localStorage.setItem(`po-translation-${target}-v10`, JSON.stringify(cache)); }
    catch (_) {}
  }

  async function browserTranslate(target) {
    if (!('Translator' in window)) return false;
    const targetLanguage = target === 'en' ? 'en' : 'es';
    let availability;
    try {
      availability = await window.Translator.availability({ sourceLanguage: 'pt', targetLanguage });
    } catch (_) { return false; }
    if (!availability || availability === 'unavailable') return false;

    const status = showStatus(labels[target].translating, true);
    let translator;
    try {
      translator = await window.Translator.create({
        sourceLanguage: 'pt',
        targetLanguage,
        monitor(monitor) {
          monitor.addEventListener('downloadprogress', event => {
            const pct = Math.round((event.loaded || 0) * 100);
            status.querySelector('span:last-child').textContent = `${labels[target].translating} ${pct}%`;
          });
        }
      });
    } catch (_) { return false; }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (shouldTranslateNode(walker.currentNode)) nodes.push(walker.currentNode);
    const cache = loadCache(target);
    let completed = 0;

    async function translateNode(node) {
      const original = node.nodeValue;
      const trimmed = original.trim();
      const key = hash(trimmed);
      let translated = cache[key];
      if (!translated) {
        translated = await translator.translate(trimmed);
        cache[key] = translated;
      }
      node.nodeValue = original.replace(trimmed, translated);
      completed += 1;
      if (completed % 12 === 0) {
        status.querySelector('span:last-child').textContent = `${labels[target].translating} ${Math.round((completed / nodes.length) * 100)}%`;
      }
    }

    const concurrency = 4;
    let cursor = 0;
    async function worker() {
      while (cursor < nodes.length) {
        const node = nodes[cursor++];
        try { await translateNode(node); } catch (_) {}
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));

    const attrs = [
      ...document.querySelectorAll('[placeholder]'),
      ...document.querySelectorAll('[title]')
    ];
    for (const element of attrs) {
      for (const attr of ['placeholder', 'title']) {
        const value = element.getAttribute(attr);
        if (!value || /^[\d\s.,%<>≥≤–—+\-/:()]+$/.test(value)) continue;
        const key = hash(value);
        try {
          const translated = cache[key] || await translator.translate(value);
          cache[key] = translated;
          element.setAttribute(attr, translated);
        } catch (_) {}
      }
    }

    try {
      const titleKey = hash(document.title);
      document.title = cache[titleKey] || await translator.translate(document.title);
      cache[titleKey] = document.title;
    } catch (_) {}

    saveCache(target, cache);
    document.querySelectorAll('.content-section').forEach(section => {
      section.dataset.searchable = section.innerText.toLowerCase();
    });
    document.documentElement.lang = langTags[target];
    document.body.classList.add('is-translated');
    updateInternalLinks();
    showStatus(labels[target].notice, false);
    hideStatus(4200);
    return true;
  }

  function fallbackTranslate(target) {
    const targetLanguage = target === 'en' ? 'en' : 'es';
    showStatus(labels[target].fallback, true);
    const original = new URL(location.href);
    original.searchParams.delete('lang');
    if (/^https?:$/.test(location.protocol)) {
      location.href = `https://translate.google.com/translate?sl=pt&tl=${targetLanguage}&u=${encodeURIComponent(original.href)}`;
    } else {
      showStatus('A tradução automática estará disponível após a publicação do site.', false);
    }
  }

  async function init() {
    addLanguageSwitcher();
    updateInternalLinks();
    if (lang === 'pt') {
      document.documentElement.lang = 'pt-BR';
      return;
    }
    const translated = await browserTranslate(lang);
    if (!translated) fallbackTranslate(lang);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
