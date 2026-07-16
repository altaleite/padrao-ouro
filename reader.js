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

  function esc(value) { return String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function sourceLabel(slides) {
    const clean=(slides||[]).filter(v=>v!==undefined&&v!==null).map(Number);
    if(!clean.length) return '';
    const min=Math.min(...clean), max=Math.max(...clean);
    const consecutive=clean.length===(max-min+1)&&clean.every((n,i)=>n===min+i);
    return consecutive&&clean.length>1?`${min}–${max}`:clean.join(', ');
  }
  function searchableText(sec) {
    const parts=[sec.title];
    (sec.items||[]).forEach(item=>{
      if(item.text) parts.push(item.text);
      if(item.caption) parts.push(item.caption);
      if(item.rows) item.rows.flat().forEach(cell=>parts.push(cell));
    });
    return parts.join(' ').toLowerCase();
  }
  function renderTable(item) {
    const rows=item.rows||[]; if(!rows.length) return '';
    const head=rows[0]; const body=rows.slice(1);
    return `<div class="table-scroll"><table class="technical-table"><thead><tr>${head.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function renderItem(item) {
    if(item.type==='subheading') return `<h3 class="content-subheading">${esc(item.text)}</h3>`;
    if(item.type==='table') return renderTable(item);
    if(item.type==='figure') return `<figure class="content-figure"><button class="figure-open" type="button" aria-label="Ampliar figura"><img loading="lazy" src="${esc(item.src)}" alt="${esc(item.alt||item.caption||'Figura técnica')}"></button>${item.caption?`<figcaption>${esc(item.caption)}</figcaption>`:''}</figure>`;
    return `<div class="gold-paragraph"><span aria-hidden="true"></span><p>${esc(item.text)}</p></div>`;
  }

  if(sidebarChapters) sidebarChapters.innerHTML=data.chapters.map(ch=>`<a href="${ch.page}" class="${ch.slug===currentSlug?'active':''}"><span class="nav-num">${ch.number}</span><span>${esc(ch.title)}</span></a>`).join('');
  if(sidebarSections) sidebarSections.innerHTML=(chapterData.sections||[]).map(sec=>`<a href="#${sec.id}">${esc(sec.title)}</a>`).join('');

  if(article){
    const sections=(chapterData.sections||[]).map(sec=>`<section class="content-section" id="${sec.id}" data-searchable="${esc(searchableText(sec))}"><header class="content-section-header"><h2>${esc(sec.title)}</h2><span class="source-tag">Texto-base · slides ${sourceLabel(sec.source_slides)}</span></header><div class="content-section-body">${(sec.items||[]).map(renderItem).join('')}</div></section>`).join('');
    const idx=data.chapters.findIndex(ch=>ch.slug===currentSlug), prev=data.chapters[idx-1], next=data.chapters[idx+1];
    const nav=`<nav class="chapter-pagination" aria-label="Navegação entre capítulos">${prev?`<a class="chapter-pager previous" href="${prev.page}"><span>← Capítulo anterior</span><strong>${esc(prev.title)}</strong></a>`:'<span></span>'}${next?`<a class="chapter-pager next" href="${next.page}"><span>Próximo capítulo →</span><strong>${esc(next.title)}</strong></a>`:`<a class="chapter-pager next" href="index.html#capitulos"><span>Concluir leitura</span><strong>Voltar ao sumário</strong></a>`}</nav>`;
    article.innerHTML=sections+nav;
  }

  if(toolbar) toolbar.addEventListener('click',e=>{if(window.innerWidth<=820&&!e.target.closest('input')) sidebar&&sidebar.classList.toggle('open');});
  document.addEventListener('click',e=>{if(window.innerWidth<=820&&sidebar&&sidebar.classList.contains('open')&&!sidebar.contains(e.target)&&!toolbar.contains(e.target)) sidebar.classList.remove('open');});
  sidebarSections&&sidebarSections.addEventListener('click',()=>sidebar&&sidebar.classList.remove('open'));

  function updateProgress(){if(!progress)return;const doc=document.documentElement, scrollable=doc.scrollHeight-doc.clientHeight;progress.style.width=(scrollable>0?(doc.scrollTop/scrollable)*100:0)+'%';}
  document.addEventListener('scroll',updateProgress,{passive:true}); updateProgress();

  if(searchInput) searchInput.addEventListener('input',()=>{const term=searchInput.value.trim().toLowerCase();let count=0;document.querySelectorAll('.content-section').forEach(sec=>{const hit=!term||sec.dataset.searchable.includes(term);sec.classList.toggle('search-hidden',!hit);if(hit)count++;});if(empty)empty.style.display=count?'none':'block';});

  const links=Array.from(document.querySelectorAll('.section-nav a'));
  const sections=Array.from(document.querySelectorAll('.content-section'));
  if('IntersectionObserver' in window){const obs=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting)links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id));});},{rootMargin:'-35% 0px -55% 0px',threshold:0});sections.forEach(sec=>obs.observe(sec));}

  const dialog=document.createElement('dialog'); dialog.className='figure-dialog'; dialog.innerHTML='<button class="dialog-close" aria-label="Fechar">×</button><img alt="Figura ampliada">'; document.body.appendChild(dialog);
  document.addEventListener('click',e=>{const btn=e.target.closest('.figure-open');if(btn){dialog.querySelector('img').src=btn.querySelector('img').src;dialog.showModal();}if(e.target.closest('.dialog-close'))dialog.close();});
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
})();
