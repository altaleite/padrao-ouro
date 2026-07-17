(function () {
  const data = window.PO_CONTENT;
  if (!data) return;

  const sidebar = document.querySelector('.reader-sidebar');
  const sidebarChapters = document.querySelector('[data-reader-chapters]');
  const sidebarSections = document.querySelector('[data-reader-sections]');
  const article = document.querySelector('[data-article]');
  const searchInput = document.querySelector('[data-reader-search]');
  const empty = document.querySelector('[data-search-empty]');
  const progress = document.querySelector('.read-progress');
  const toolbar = document.querySelector('.reader-toolbar');
  const currentSlug = document.body.dataset.chapter || 'pre-parto-maternidade';
  const currentMeta = data.chapters.find(ch => ch.slug === currentSlug) || data.chapters[0];
  const chapterData = data[currentMeta.dataKey];
  if (!chapterData) return;

  function esc(value) {
    return String(value ?? '').replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function smartText(value) {
    let text = String(value ?? '').trim();
    text = text.replace(/(^|[.!?]\s+|:\s+|;\s+)([a-záàâãéèêíìîóòôõúùûç])/giu, (m, prefix, letter) => prefix + letter.toUpperCase());
    return text;
  }

  function sourceLabel(slides) {
    const clean = (slides || []).filter(v => v !== undefined && v !== null).map(Number);
    if (!clean.length) return '';
    const min = Math.min(...clean), max = Math.max(...clean);
    const consecutive = clean.length === (max - min + 1) && clean.every((n, i) => n === min + i);
    return consecutive && clean.length > 1 ? `${min}–${max}` : clean.join(', ');
  }

  function searchableText(sec) {
    const parts = [sec.title];
    (sec.items || []).forEach(item => {
      if (item.title) parts.push(item.title);
      if (item.text) parts.push(item.text);
      if (item.caption) parts.push(item.caption);
      if (item.notes) item.notes.forEach(note => parts.push(note));
      if (item.rows) item.rows.flat().forEach(cell => parts.push(cell));
      if (item.cards) item.cards.forEach(card => {
        parts.push(card.eyebrow || '', card.title || '', card.meta || '', card.text || '');
      });
    });
    return parts.join(' ').toLowerCase();
  }

  function renderNotes(notes) {
    if (!notes || !notes.length) return '';
    return `<div class="item-notes">${notes.map(note => `<p>${esc(smartText(note))}</p>`).join('')}</div>`;
  }

  function renderTable(item) {
    const rows = item.rows || [];
    if (!rows.length) return '';
    const head = rows[0];
    const body = rows.slice(1);
    return `
      <div class="content-block content-table-block${item.center ? ' is-centered' : ''}${item.compact ? ' is-compact' : ''}">
        ${item.title ? `<h3 class="block-title">${esc(item.title)}</h3>` : ''}
        <div class="table-scroll" tabindex="0" aria-label="Tabela técnica; em telas menores, deslize horizontalmente">
          <table class="technical-table${item.highlight_last_row ? ' highlight-last-row' : ''}">
            <thead><tr>${head.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
            <tbody>${body.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
        ${renderNotes(item.notes)}
      </div>`;
  }

  function renderCardGrid(item) {
    const columns = Math.min(Math.max(Number(item.columns || 2), 1), 4);
    return `
      <div class="content-block content-card-block">
        ${item.title ? `<h3 class="block-title">${esc(item.title)}</h3>` : ''}
        <div class="card-grid columns-${columns}">
          ${(item.cards || []).map(card => `
            <article class="info-card">
              ${card.eyebrow ? `<p class="card-eyebrow">${esc(card.eyebrow)}</p>` : ''}
              ${card.title ? `<h4 class="card-title">${esc(card.title)}</h4>` : ''}
              ${card.meta ? `<p class="card-meta">${esc(card.meta)}</p>` : ''}
              ${card.text ? `<p class="card-text">${esc(smartText(card.text))}</p>` : ''}
            </article>
          `).join('')}
        </div>
        ${renderNotes(item.notes)}
      </div>`;
  }

  function renderFigure(item) {
    const cls = item.layout === 'wide' ? 'content-figure wide' : item.layout === 'split' ? 'content-figure split' : 'content-figure';
    return `
      <figure class="${cls}">
        <button class="figure-open" type="button" aria-label="Ampliar figura">
          <img loading="lazy" src="${esc(item.src)}" alt="${esc(item.alt || item.caption || 'Figura técnica')}">
        </button>
        ${item.caption ? `<figcaption>${esc(smartText(item.caption))}</figcaption>` : ''}
      </figure>`;
  }

  function renderItem(item) {
    if (item.type === 'subheading') {
      if (item.variant === 'image-title' && item.image) return `<h3 class="content-subheading image-title" style="--title-image:url('${esc(item.image)}')"><span>${esc(item.text)}</span></h3>`;
      return `<h3 class="content-subheading">${esc(item.text)}</h3>`;
    }
    if (item.type === 'table') return renderTable(item);
    if (item.type === 'card_grid') return renderCardGrid(item);
    if (item.type === 'figure') return renderFigure(item);
    return `<div class="gold-paragraph"><span aria-hidden="true"></span><p>${esc(smartText(item.text))}</p></div>`;
  }

  if (sidebarChapters) {
    sidebarChapters.innerHTML = data.chapters.map(ch => `
      <a href="${ch.page}" class="${ch.slug === currentSlug ? 'active' : ''}">
        <span class="nav-num">${ch.number}</span>
        <span>${esc(ch.title)}</span>
      </a>`).join('');
  }

  if (sidebarSections) {
    sidebarSections.innerHTML = (chapterData.sections || []).map(sec => `<a href="#${sec.id}">${esc(sec.title)}</a>`).join('');
  }

  if (article) {
    const sections = (chapterData.sections || []).map(sec => `
      <section class="content-section" id="${sec.id}" data-searchable="${esc(searchableText(sec))}">
        <header class="content-section-header">
          <h2>${esc(sec.title)}</h2>
        </header>
        <div class="content-section-body">${(sec.items || []).map(renderItem).join('')}</div>
      </section>`).join('');

    const idx = data.chapters.findIndex(ch => ch.slug === currentSlug);
    const prev = data.chapters[idx - 1];
    const next = data.chapters[idx + 1];
    const nav = `<nav class="chapter-pagination" aria-label="Navegação entre capítulos">${prev ? `<a class="chapter-pager previous" href="${prev.page}"><span>← Capítulo anterior</span><strong>${esc(prev.title)}</strong></a>` : '<span></span>'}${next ? `<a class="chapter-pager next" href="${next.page}"><span>Próximo capítulo →</span><strong>${esc(next.title)}</strong></a>` : `<a class="chapter-pager next" href="index.html#capitulos"><span>Concluir leitura</span><strong>Voltar ao sumário</strong></a>`}</nav>`;
    article.innerHTML = sections + nav;
  }

  if (toolbar) {
    toolbar.addEventListener('click', e => {
      if (window.innerWidth <= 820 && !e.target.closest('input')) sidebar && sidebar.classList.toggle('open');
    });
  }

  document.addEventListener('click', e => {
    if (window.innerWidth <= 820 && sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toolbar.contains(e.target)) sidebar.classList.remove('open');
  });
  sidebarSections && sidebarSections.addEventListener('click', () => sidebar && sidebar.classList.remove('open'));

  function updateProgress() {
    if (!progress) return;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    progress.style.width = (scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0) + '%';
  }
  document.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const term = searchInput.value.trim().toLowerCase();
      let count = 0;
      document.querySelectorAll('.content-section').forEach(sec => {
        const hit = !term || sec.dataset.searchable.includes(term);
        sec.classList.toggle('search-hidden', !hit);
        if (hit) count++;
      });
      if (empty) empty.style.display = count ? 'none' : 'block';
    });
  }

  const links = Array.from(document.querySelectorAll('.section-nav a'));
  const sectionEls = Array.from(document.querySelectorAll('.content-section'));
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
    sectionEls.forEach(sec => obs.observe(sec));
  }

  const dialog = document.createElement('dialog');
  dialog.className = 'figure-dialog';
  dialog.innerHTML = '<button class="dialog-close" aria-label="Fechar">×</button><img alt="Figura ampliada">';
  document.body.appendChild(dialog);
  document.addEventListener('click', e => {
    const btn = e.target.closest('.figure-open');
    if (btn) {
      dialog.querySelector('img').src = btn.querySelector('img').src;
      dialog.showModal();
    }
    if (e.target.closest('.dialog-close')) dialog.close();
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
})();
