
(function () {
  const menuButton = document.querySelector('.mobile-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
    });
  }

  const chapterGrid = document.querySelector('[data-chapter-grid]');
  if (chapterGrid && window.PO_CONTENT) {
    chapterGrid.innerHTML = window.PO_CONTENT.chapters.map(ch => {
      const available = ch.status === 'available';
      const href = available ? `leitura.html#${ch.slug}` : '#capitulos';
      const status = available ? 'Ler agora' : 'Em preparação';
      return `
        <a class="chapter-card ${available ? 'available' : ''}" 
           href="${href}" style="--card-image:url('${ch.cover}')"
           data-title="${ch.title.toLowerCase()}" aria-label="${available ? 'Ler' : 'Ver'} capítulo ${ch.number}: ${ch.title}">
          <div class="chapter-card-body">
            <span class="chapter-number">${ch.number}</span>
            <span class="chapter-status">${status}</span>
            <h3>${ch.title}</h3>
            <p>${ch.subtitle}</p>
            <span class="chapter-link">${available ? 'Iniciar leitura →' : `Slides ${ch.slides}`}</span>
          </div>
        </a>`;
    }).join('');
  }

  const authorNames = document.querySelector('[data-author-names]');
  if (authorNames && window.PO_CONTENT) {
    authorNames.innerHTML = window.PO_CONTENT.authors
      .map(a => `<div class="author-name">${a.name}</div>`).join('');
  }

  const yearEls = document.querySelectorAll('[data-year]');
  yearEls.forEach(el => el.textContent = new Date().getFullYear());

  document.addEventListener('click', e => {
    const link = e.target.closest('.main-nav a');
    if (link && nav) nav.classList.remove('open');
  });
})();
