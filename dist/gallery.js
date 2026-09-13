// DMSE Lab — gallery page: data/gallery.json → figure grid + lightbox. Add pictures to assets/gallery/ and list them in the JSON.
(async function () {
  const host = document.querySelector('[data-gallery]');
  if (!host) return;
  const lang = (document.documentElement.lang || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const pick = (o, k) => (lang === 'ko' && o[k + '_ko']) ? o[k + '_ko'] : o[k];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let items = [];
  try { const r = await fetch('./data/gallery.json', { cache: 'no-store' }); if (r.ok) items = await r.json(); } catch { }
  items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  host.innerHTML = items.map((g, i) => `<figure class="g-item"><a href="${esc(g.src)}" data-i="${i}"><img loading="lazy" src="${esc(g.src)}" alt="${esc(g.alt || '')}"></a><figcaption><span>${esc(pick(g, 'caption'))}</span>${g.date ? `<time>${esc(g.date)}</time>` : ''}</figcaption></figure>`).join('') || `<p class="empty">${lang === 'ko' ? '아직 사진이 없습니다.' : 'No pictures yet.'}</p>`;
  const box = document.getElementById('lightbox');
  if (!box || typeof box.showModal !== 'function') return;
  host.addEventListener('click', e => {
    const a = e.target.closest('a[data-i]'); if (!a) return; e.preventDefault();
    const g = items[+a.dataset.i]; const img = box.querySelector('img');
    img.src = g.src; img.alt = g.alt || ''; box.querySelector('p').textContent = pick(g, 'caption'); box.showModal();
  });
  box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('lb-close')) box.close(); });
})();
