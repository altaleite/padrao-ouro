(function () {
  const supported = ['pt', 'en', 'es'];
  const params = new URLSearchParams(location.search);
  const requested = params.get('lang');
  const initialLang = supported.includes(requested) ? requested : 'pt';
  const langTags = { pt: 'pt-BR', en: 'en', es: 'es' };
  const labels = {
    pt: {
      name: 'Português',
      notice: 'Versão original em português.'
    },
    en: {
      name: 'English',
      translating: 'Translating content…',
      notice: 'Automatic translation. The Portuguese version is the official technical reference; text embedded in images may remain in Portuguese.',
      fallback: 'Your browser cannot translate this page directly. The translation will open in a new tab; the original page will remain available here.'
    },
    es: {
      name: 'Español',
      translating: 'Traduciendo contenido…',
      notice: 'Traducción automática. La versión en portugués es la referencia técnica oficial; el texto integrado en imágenes puede permanecer en portugués.',
      fallback: 'Su navegador no puede traducir esta página directamente. La traducción se abrirá en una nueva pestaña; la página original permanecerá disponible aquí.'
    }
  };

  let activeLang = 'pt';

  function originalUrl() {
    const url = new URL(location.href);
    url.searchParams.delete('lang');
    return url;
  }

  function urlFor(target) {
    const url = originalUrl();
    if (target !== 'pt') url.searchParams.set('lang', target);
    return url.href;
  }

  function setStoredLanguage(lang) {
    try { localStorage.setItem('po-language', lang); } catch (_) {}
  }

  function addLanguageSwitcher() {
    const headerEnd = document.querySelector('.header-end') || document.querySelector('.screen-toolbar');
    if (!headerEnd || document.querySelector('.language-switcher')) return;

    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('aria-label', 'Selecionar idioma / Select language / Seleccionar idioma');
    switcher.innerHTML = supported.map(code => `
      <button type="button" class="${code === activeLang ? 'active' : ''}" data-language="${code}" lang="${langTags[code]}" aria-label="${labels[code].name}">${code.toUpperCase()}</button>
    `).join('');

    switcher.addEventListener('click', event => {
      const button = event.target.closest('[data-language]');
      if (!button) return;
      const target = button.dataset.language;
      if (target === 'pt') {
        setStoredLanguage('pt');
        location.replace(urlFor('pt'));
        return;
      }
      requestTranslation(target);
    });

    const toggle = headerEnd.querySelector('.mobile-toggle');
    headerEnd.insertBefore(switcher, toggle || null);
  }

  function markActiveLanguage(lang) {
    activeLang = lang;
    document.querySelectorAll('.language-switcher [data-language]').forEach(button => {
      button.classList.toggle('active', button.dataset.language === lang);
      button.setAttribute('aria-pressed', String(button.dataset.language === lang));
    });
  }

  function updateInternalLinks(lang) {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:') || link.hasAttribute('download')) return;
      try {
        const url = new URL(href, location.href);
        if (url.origin !== location.origin || !(/\.html$|\/$/.test(url.pathname))) return;
        if (lang === 'pt') url.searchParams.delete('lang');
        else url.searchParams.set('lang', lang);
        link.href = url.href;
      } catch (_) {}
    });
  }

  function showStatus(message, busy, persistent) {
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
    if (!persistent) window.setTimeout(() => { status.hidden = true; }, 4200);
    return status;
  }

  function shouldTranslateNode(node) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue || !node.nodeValue.trim()) return false;
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
    try { return JSON.parse(localStorage.getItem(`po-translation-${target}-v101`) || '{}'); }
    catch (_) { return {}; }
  }

  function saveCache(target, cache) {
    try { localStorage.setItem(`po-translation-${target}-v101`, JSON.stringify(cache)); }
    catch (_) {}
  }

  async function browserTranslate(target) {
    if (!('Translator' in window)) return false;
    const targetLanguage = target === 'en' ? 'en' : 'es';
    let availability;
    try {
      availability = await window.Translator.availability({ sourceLanguage: 'pt', targetLanguage });
    } catch (_) {
      return false;
    }
    if (!availability || availability === 'unavailable') return false;

    const status = showStatus(labels[target].translating, true, true);
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
    } catch (_) {
      return false;
    }

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
      if (completed % 12 === 0 && nodes.length) {
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
      const translatedTitle = cache[titleKey] || await translator.translate(document.title);
      cache[titleKey] = translatedTitle;
      document.title = translatedTitle;
    } catch (_) {}

    saveCache(target, cache);
    document.querySelectorAll('.content-section').forEach(section => {
      section.dataset.searchable = section.innerText.toLowerCase();
    });
    document.documentElement.lang = langTags[target];
    document.body.classList.add('is-translated');
    setStoredLanguage(target);
    markActiveLanguage(target);
    updateInternalLinks(target);
    history.replaceState(null, '', urlFor(target));
    showStatus(labels[target].notice, false, false);
    return true;
  }

  function openExternalTranslation(target) {
    const targetLanguage = target === 'en' ? 'en' : 'es';
    const original = originalUrl();
    const translateUrl = `https://translate.google.com/translate?sl=pt&tl=${targetLanguage}&u=${encodeURIComponent(original.href)}`;
    const opened = window.open(translateUrl, '_blank', 'noopener,noreferrer');
    setStoredLanguage('pt');
    markActiveLanguage('pt');
    history.replaceState(null, '', original.href);
    showStatus(
      opened
        ? labels[target].fallback
        : 'O navegador bloqueou a nova aba. Autorize pop-ups para abrir a tradução automática.',
      false,
      false
    );
  }

  async function requestTranslation(target) {
    if (!supported.includes(target) || target === 'pt') return;
    const translated = await browserTranslate(target);
    if (!translated) openExternalTranslation(target);
  }

  async function init() {
    addLanguageSwitcher();

    if (initialLang === 'pt') {
      setStoredLanguage('pt');
      document.documentElement.lang = 'pt-BR';
      markActiveLanguage('pt');
      updateInternalLinks('pt');
      return;
    }

    const translated = await browserTranslate(initialLang);
    if (!translated) {
      // Nunca redireciona automaticamente para fora do site.
      // Isso evita ciclos de tradução e mantém o original sempre acessível.
      setStoredLanguage('pt');
      markActiveLanguage('pt');
      history.replaceState(null, '', originalUrl().href);
      document.documentElement.lang = 'pt-BR';
      showStatus(
        'A tradução direta não está disponível neste navegador. Clique novamente em EN ou ES para abrir a tradução em uma nova aba. A versão original continuará aberta.',
        false,
        false
      );
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
