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

  const subheadingTerms = new Set(['maternidades em piquetes']);
  const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  function normalizeSections(sections) {
    const grouped = [];
    sections.forEach(sec => {
      const rawItems = Array.isArray(sec.items)
        ? sec.items
        : (sec.paragraphs || []).map(text => ({
            type: subheadingTerms.has(text.trim().toLowerCase()) ? 'subheading' : 'paragraph',
            text
          }));
      const normalized = {
        id: sec.id,
        title: sec.title,
        sourceSlides: [sec.source_slide],
        items: rawItems
      };
      const previous = grouped[grouped.length - 1];
      if (previous && previous.title.trim().toLowerCase() === normalized.title.trim().toLowerCase()) {
        previous.id = slugify(previous.title);
        previous.sourceSlides.push(...normalized.sourceSlides);
        previous.items.push(...normalized.items);
      } else {
        grouped.push(normalized);
      }
    });
    return grouped;
  }

  function sourceLabel(slides) {
    const clean = slides.filter(v => v !== undefined && v !== null).map(Number);
    if (!clean.length || clean.some(Number.isNaN)) return slides.filter(Boolean).join(', ');
    const min = Math.min(...clean), max = Math.max(...clean);
    const consecutive = clean.length === (max - min + 1) && clean.every((n, i) => n === min + i);
    return consecutive && clean.length > 1 ? `${min}–${max}` : clean.join(', ');
  }

  const sectionsData = normalizeSections(data.chapter_01.sections);

  if (sidebarChapters) {
    sidebarChapters.innerHTML = data.chapters.map(ch => `
      <a href="${ch.status === 'available' ? '#pre-parto-maternidade' : '#'}"
         class="${ch.status === 'available' ? 'active' : ''}"
         ${ch.status !== 'available' ? 'aria-disabled="true"' : ''}>
        <span class="nav-num">${ch.number}</span>
        <span>${ch.title}${ch.status !== 'available' ? ' · em preparação' : ''}</span>
      </a>`).join('');
  }

  if (sidebarSections) {
    sidebarSections.innerHTML = sectionsData.map(sec =>
      `<a href="#${sec.id}">${sec.title}</a>`
    ).join('');
  }

  if (article) {
    const sections = sectionsData.map(sec => {
      const items = sec.items.map(item =>
        `<li class="${item.type === 'subheading' ? 'subheading' : ''}">${item.text}</li>`
      ).join('');
      const searchable = (sec.title + ' ' + sec.items.map(item => item.text).join(' ')).toLowerCase();
      return `
        <section class="content-section" id="${sec.id}" data-searchable="${searchable.replace(/"/g, '&quot;')}">
          <header class="content-section-header">
            <h2>${sec.title}</h2>
            <span class="source-tag">Texto-base · slide ${sourceLabel(sec.sourceSlides)}</span>
          </header>
          <div class="content-section-body">
            <ul class="gold-list">${items}</ul>
          </div>
        </section>`;
    }).join('');
    const next = `
      <div class="reader-next">
        <div>
          <span>Próximo capítulo</span>
          <strong>Cuidados iniciais</strong>
        </div>
        <div class="lock">Conteúdo em preparação para a próxima entrega</div>
      </div>`;
    article.innerHTML = sections + next;
  }

  if (toolbar) {
    toolbar.addEventListener('click', e => {
      if (window.innerWidth <= 820 && !e.target.closest('input')) {
        sidebar && sidebar.classList.toggle('open');
      }
    });
  }
  document.addEventListener('click', e => {
    if (window.innerWidth <= 820 && sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && !toolbar.contains(e.target)) sidebar.classList.remove('open');
    }
  });
  sidebarSections && sidebarSections.addEventListener('click', () => sidebar && sidebar.classList.remove('open'));

  function updateProgress() {
    if (!progress) return;
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - doc.clientHeight;
    const pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
    progress.style.width = pct + '%';
    try { localStorage.setItem('padraoOuroProgress', String(doc.scrollTop)); } catch (e) {}
  }
  document.addEventListener('scroll', updateProgress, {passive:true});
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
  const contentSections = Array.from(document.querySelectorAll('.content-section'));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
        }
      });
    }, {rootMargin:'-35% 0px -55% 0px', threshold:0});
    contentSections.forEach(sec => observer.observe(sec));
  }
})();
