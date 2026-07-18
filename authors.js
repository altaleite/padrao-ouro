(function () {
  const container = document.querySelector('[data-author-cards]');
  if (!container || !window.PO_CONTENT) return;
  const initials = name => name.split(/\s+/).slice(0,2).map(x => x[0]).join('');
  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  container.innerHTML = window.PO_CONTENT.authors.map(a => `
    <article class="author-card${a.photo ? ' has-photo' : ''}">
      <div class="author-media">
        ${a.photo
          ? `<img class="author-photo" src="${esc(a.photo)}" alt="Retrato de ${esc(a.name)}" loading="lazy">`
          : `<div class="author-avatar" aria-hidden="true">${esc(initials(a.name))}</div>`}
      </div>
      <div class="author-content">
        <h2>${esc(a.name)}</h2>
        <p>${esc(a.bio)}</p>
        <a href="mailto:${esc(a.email)}">${esc(a.email)}</a>
      </div>
    </article>`).join('');
})();
