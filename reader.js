
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
    sidebarSections.innerHTML = data.chapter_01.sections.map(sec =>
      `<a href="#${sec.id}">${sec.title}</a>`
    ).join('');
  }

  if (article) {
    const intro = `
      <div class="article-intro">
        Este capítulo apresenta o conteúdo aprovado no PowerPoint-base da 4ª edição, mantendo a ordem e a redação original. A estrutura foi adaptada exclusivamente para leitura digital.
      </div>`;
    const sections = data.chapter_01.sections.map(sec => {
      const items = sec.paragraphs.map((p, idx) => {
        const isSub = sec.source_slide === 6 && idx === 0;
        return `<li class="${isSub ? 'subheading' : ''}">${p}</li>`;
      }).join('');
      return `
        <section class="content-section" id="${sec.id}" data-searchable="${(sec.title + ' ' + sec.paragraphs.join(' ')).toLowerCase()}">
          <header class="content-section-header">
            <h2>${sec.title}</h2>
            <span class="source-tag">Texto-base · slide ${sec.source_slide}</span>
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
    article.innerHTML = intro + sections + next;
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
