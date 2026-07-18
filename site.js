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
      const href = available ? (ch.page || 'leitura.html') : '#capitulos';
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

  // PWA: registro e instalação com identidade do Padrão Ouro.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=10').catch(() => {}));
  }

  let deferredInstallPrompt = null;
  const installButtons = Array.from(document.querySelectorAll('[data-install-app]'));
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  const dialog = document.createElement('dialog');
  dialog.className = 'install-dialog';
  dialog.innerHTML = `
    <button class="dialog-close" type="button" aria-label="Fechar">×</button>
    <img src="icon-192.png" alt="Ícone do Padrão Ouro">
    <h2>Instalar Padrão Ouro</h2>
    <p class="install-copy"></p>
  `;
  document.body.appendChild(dialog);
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });

  const updateInstallVisibility = visible => installButtons.forEach(btn => {
    btn.hidden = !visible;
    btn.setAttribute('aria-hidden', String(!visible));
  });

  if (isStandalone) {
    updateInstallVisibility(false);
  } else if (isIos) {
    updateInstallVisibility(true);
  } else {
    updateInstallVisibility(false);
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallVisibility(true);
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallVisibility(false);
  });

  installButtons.forEach(button => button.addEventListener('click', async event => {
    event.preventDefault();
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      updateInstallVisibility(false);
      return;
    }
    dialog.querySelector('.install-copy').innerHTML = isIos
      ? 'No Safari, toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.'
      : 'Abra o menu do navegador e escolha <strong>Instalar aplicativo</strong> ou <strong>Criar atalho</strong>.';
    dialog.showModal();
  }));


  // Acesso rápido ao topo em páginas longas.
  const backToTop = document.createElement('button');
  backToTop.type = 'button';
  backToTop.className = 'back-to-top';
  backToTop.setAttribute('aria-label', 'Voltar ao topo');
  backToTop.textContent = '↑';
  backToTop.hidden = true;
  document.body.appendChild(backToTop);
  const updateBackToTop = () => { backToTop.hidden = window.scrollY < 700; };
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateBackToTop();
})();
