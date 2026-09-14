// DMSE Lab — reveal-on-scroll for .reveal elements, a light parallax on research images,
// and a detail lightbox for the research areas (overview board + each area at full size).
(function () {
  const els = Array.from(document.querySelectorAll('.reveal'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (els.length) {
    if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); }
    else {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
      els.forEach(e => io.observe(e));
    }
  }
  const imgs = Array.from(document.querySelectorAll('.rimg img'));
  if (imgs.length && !reduce) {
    let ticking = false;
    const update = () => {
      const vh = window.innerHeight;
      imgs.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.setProperty('--py', (p * -5).toFixed(2) + '%');
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    addEventListener('resize', update);
    update();
  }

  // Detail lightbox: the overview board and each research area, with prev/next.
  const box = document.getElementById('lightbox');
  if (!box || typeof box.showModal !== 'function') return;
  const items = [];
  const ov = document.querySelector('.fig.overview a');
  if (ov) items.push({ src: ov.getAttribute('href'), title: ov.dataset.title || '', sub: '', desc: ov.dataset.desc || '', el: ov });
  document.querySelectorAll('.rcard').forEach(card => {
    const a = card.querySelector('.rlink'); if (!a) return;
    const h = card.querySelector('h2'); const small = h && h.querySelector('small');
    const title = h ? h.childNodes[0].textContent.trim() : '';
    items.push({ src: a.getAttribute('href'), title: (card.querySelector('.rn') ? card.querySelector('.rn').textContent + ' · ' : '') + title, sub: small ? small.textContent : '', desc: (card.querySelector('.rcap p') || {}).textContent || '', el: a });
  });
  if (!items.length) return;
  const img = box.querySelector('img'), t = box.querySelector('.lb-title'), d = box.querySelector('.lb-desc');
  const prev = box.querySelector('.lb-prev'), next = box.querySelector('.lb-next');
  let cur = 0;
  const show = i => {
    cur = (i + items.length) % items.length; const it = items[cur];
    img.src = it.src; img.alt = it.title;
    t.innerHTML = it.title.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + (it.sub ? '<small>' + it.sub.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '</small>' : '');
    d.textContent = it.desc;
    if (!box.open) box.showModal();
  };
  items.forEach((it, i) => it.el.addEventListener('click', e => { e.preventDefault(); show(i); }));
  if (prev) prev.addEventListener('click', e => { e.stopPropagation(); show(cur - 1); });
  if (next) next.addEventListener('click', e => { e.stopPropagation(); show(cur + 1); });
  box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('lb-close')) box.close(); });
  box.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
})();
