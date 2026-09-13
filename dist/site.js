// DMSE Lab — shared page script: nav state, site config, publications, news, people.
// Data lives in ./data/*.json so the site can be edited without touching HTML.
(async function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = async p => { try { const r = await fetch(p, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; } };

  // Active navigation item
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('nav a[href]').forEach(a => { const h = a.getAttribute('href').split('#')[0].toLowerCase(); if (h && h === here) a.setAttribute('aria-current', 'page'); });

  // Site configuration → [data-site="key"]; rows with empty values are hidden
  const site = (await load('./data/site.json')) || {};
  $$('[data-site]').forEach(el => {
    const k = el.dataset.site, v = site[k];
    const row = el.closest('[data-site-row]');
    if (!v) { if (row) row.hidden = true; else el.hidden = true; return; }
    if (el.tagName === 'A') el.href = k === 'email' ? 'mailto:' + v : v;
    if (!el.hasAttribute('data-label')) el.textContent = v;
  });

  // Publications
  const pubHosts = $$('[data-pubs]');
  let pubs = null;
  if (pubHosts.length || $('[data-count="pubs"]')) {
    pubs = (await load('./data/publications.json')) || [];
    pubs.sort((a, b) => (b.year - a.year) || a.title.localeCompare(b.title));
    $$('[data-count="pubs"]').forEach(el => el.textContent = pubs.length);
  }
  const author = a => { const star = /\*$/.test(a); const name = a.replace(/\*+$/, ''); const me = /taehee\s*kim/i.test(name); return (me ? '<b>' : '') + esc(name) + (me ? '</b>' : '') + (star ? '*' : ''); };
  const pubHTML = p => `<article class="pub">
    <p class="t">${esc(p.title)}</p>
    <p class="a">${(p.authors || []).map(author).join(', ')}</p>
    <p class="j"><i>${esc(p.journal)}</i> ${p.year}${p.volume ? ', ' + esc(p.volume) : ''}${p.pages ? ', ' + esc(p.pages) : ''}</p>
    <div class="meta">${p.featured ? '<span class="tag f">SELECTED</span>' : ''}${p.if ? `<span class="tag">IF ${p.if}</span>` : ''}${p.doi ? `<a class="doi" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>` : ''}</div>
  </article>`;
  for (const host of pubHosts) {
    const mode = host.dataset.pubs, limit = parseInt(host.dataset.limit || '0', 10);
    if (mode === 'featured') {
      let list = pubs.filter(p => p.featured);
      for (const p of pubs) { if (limit && list.length >= limit) break; if (!list.includes(p)) list.push(p); }
      if (limit) list = list.slice(0, limit);
      host.innerHTML = list.map(pubHTML).join('');
    } else {
      const years = [...new Set(pubs.map(p => p.year))].sort((a, b) => b - a);
      const tools = host.previousElementSibling && host.previousElementSibling.classList.contains('pub-tools') ? host.previousElementSibling : null;
      let q = '', year = 0;
      const render = () => {
        const f = pubs.filter(p => (!year || p.year === year) && (!q || (p.title + ' ' + (p.authors || []).join(' ') + ' ' + p.journal).toLowerCase().includes(q)));
        const ys = [...new Set(f.map(p => p.year))].sort((a, b) => b - a);
        host.innerHTML = ys.map(y => `<section class="pub-year"><h3>${y}</h3><div>${f.filter(p => p.year === y).map(pubHTML).join('')}</div></section>`).join('') || '<p class="empty">No publications match.</p>';
        const c = $('[data-count="filtered"]'); if (c) c.textContent = f.length;
      };
      if (tools) {
        const input = tools.querySelector('input'); if (input) input.addEventListener('input', () => { q = input.value.trim().toLowerCase(); render(); });
        const chips = tools.querySelector('.chips');
        if (chips) {
          chips.innerHTML = `<button class="chip" aria-pressed="true" data-y="0">All</button>` + years.map(y => `<button class="chip" aria-pressed="false" data-y="${y}">${y}</button>`).join('');
          chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; year = +b.dataset.y; chips.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b)); render(); });
        }
      }
      render();
    }
  }

  // News
  const newsHosts = $$('[data-news]');
  if (newsHosts.length) {
    const news = ((await load('./data/news.json')) || []).sort((a, b) => b.date.localeCompare(a.date));
    const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
    for (const host of newsHosts) {
      const limit = parseInt(host.dataset.limit || '0', 10);
      host.innerHTML = (limit ? news.slice(0, limit) : news).map(n => `<div class="item"><time datetime="${esc(n.date)}">${fmt(n.date)}</time><div><h3>${n.link ? `<a href="${esc(n.link)}">${esc(n.title)}</a>` : esc(n.title)}</h3><p>${esc(n.body)}</p></div></div>`).join('');
    }
  }

  // People groups
  const peopleHost = $('[data-people]');
  if (peopleHost) {
    const data = (await load('./data/people.json')) || { groups: [] };
    peopleHost.innerHTML = data.groups.map(g => `<section class="group" id="${esc(g.id)}"><h3>${esc(g.title)}</h3>${g.members.length ? `<div class="people-grid">${g.members.map(m => `<div class="person">${m.photo ? `<img class="ph" src="${esc(m.photo)}" alt="">` : '<div class="ph"></div>'}<h4>${esc(m.name)}${m.name_ko ? ` <small>${esc(m.name_ko)}</small>` : ''}</h4><p>${esc(m.role)}${m.since ? ' · since ' + esc(m.since) : ''}</p>${m.topic ? `<p>${esc(m.topic)}</p>` : ''}${m.email ? `<p><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></p>` : ''}</div>`).join('')}</div>` : `<div class="empty">${g.id === 'alumni' ? 'No alumni yet.' : 'Positions are open — see <a href="join.html">Join</a>.'}</div>`}</section>`).join('');
  }
})();
