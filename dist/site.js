// DMSE Lab — shared page script: nav state, site config, publications, news, people. Bilingual (en/ko).
// Content lives in ./data/*.json so pages can be edited without touching HTML. Paths resolve against the
// document base, so the Korean pages under /ko/ use <base href="../"> and share the same data and assets.
(async function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const lang = (document.documentElement.lang || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const T = {
    en: { selected: 'SELECTED', lead: 'LEAD AUTHOR', none: 'No publications match.', open: 'Positions are open — see', join: 'Join', alumni: 'No alumni yet.', since: 'since', all: 'All' },
    ko: { selected: '대표 논문', lead: '주저자·교신', none: '조건에 맞는 논문이 없습니다.', open: '모집 중입니다 — ', join: '참여 안내', alumni: '아직 졸업생이 없습니다.', since: '', all: '전체' }
  }[lang];
  const pick = (o, k) => (lang === 'ko' && o[k + '_ko']) ? o[k + '_ko'] : o[k];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const load = async p => { try { const r = await fetch(p, { cache: 'no-store' }); return r.ok ? await r.json() : null; } catch { return null; } };

  // Active navigation item (compare file names so ko/ pages match too)
  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  $$('nav a[href]').forEach(a => { const h = (a.getAttribute('href').split('#')[0].split('/').pop() || '').toLowerCase(); if (h && h === here && !a.classList.contains('lang')) a.setAttribute('aria-current', 'page'); });

  // Site configuration → [data-site="key"]; rows with empty values are hidden
  const site = (await load('./data/site.json')) || {};
  $$('[data-site]').forEach(el => {
    const k = el.dataset.site, v = pick(site, k);
    const row = el.closest('[data-site-row]');
    if (!v) { if (row) row.hidden = true; else el.hidden = true; return; }
    if (el.tagName === 'A') el.href = k === 'email' ? 'mailto:' + v : v;
    if (!el.hasAttribute('data-label')) el.textContent = v;
  });

  // Publications
  const pubHosts = $$('[data-pubs]');
  const mark = a => { const m = a.match(/^(.*?)([*§]+)$/); return m ? [m[1].trim(), m[2]] : [a.trim(), '']; };
  const author = a => { const [name, marks] = mark(a); const me = /taehee\s*kim/i.test(name); return (me ? '<b>' : '') + esc(name) + (me ? '</b>' : '') + (marks ? '<sup>' + esc(marks) + '</sup>' : ''); };
  const pubHTML = p => `<article class="pub">
    <p class="t">${esc(p.title)}</p>
    <p class="a">${(p.authors || []).map(author).join(', ')}</p>
    <p class="j"><i>${esc(p.journal)}</i> ${p.year}${p.volume ? ', ' + esc(p.volume) : ''}${p.pages ? ', ' + esc(p.pages) : ''}</p>
    <div class="meta">${p.featured ? `<span class="tag f">${T.selected}</span>` : ''}${p.lead ? `<span class="tag">${T.lead}</span>` : ''}${p.doi ? `<a class="doi" href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>` : ''}</div>
  </article>`;
  if (pubHosts.length) {
    const pubs = (await load('./data/publications.json')) || [];
    pubs.sort((a, b) => (b.year - a.year) || (b.lead - a.lead) || a.title.localeCompare(b.title));
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
        let q = '', year = 0, leadOnly = false;
        const render = () => {
          const f = pubs.filter(p => (!year || p.year === year) && (!leadOnly || p.lead) && (!q || (p.title + ' ' + (p.authors || []).join(' ') + ' ' + p.journal).toLowerCase().includes(q)));
          const ys = [...new Set(f.map(p => p.year))].sort((a, b) => b - a);
          host.innerHTML = ys.map(y => `<section class="pub-year"><h3>${y}</h3><div>${f.filter(p => p.year === y).map(pubHTML).join('')}</div></section>`).join('') || `<p class="empty">${T.none}</p>`;
        };
        if (tools) {
          const input = tools.querySelector('input'); if (input) input.addEventListener('input', () => { q = input.value.trim().toLowerCase(); render(); });
          const chips = tools.querySelector('.chips');
          if (chips) {
            chips.innerHTML = `<button class="chip" aria-pressed="true" data-y="0">${T.all}</button>` + years.map(y => `<button class="chip" aria-pressed="false" data-y="${y}">${y}</button>`).join('');
            chips.addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; year = +b.dataset.y; chips.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b)); render(); });
          }
          const leadBtn = tools.querySelector('[data-lead]');
          if (leadBtn) leadBtn.addEventListener('click', () => { leadOnly = !leadOnly; leadBtn.setAttribute('aria-pressed', leadOnly); render(); });
        }
        render();
      }
    }
  }

  // News
  const newsHosts = $$('[data-news]');
  if (newsHosts.length) {
    const news = ((await load('./data/news.json')) || []).sort((a, b) => b.date.localeCompare(a.date));
    const fmt = d => lang === 'ko' ? d.replace(/-/g, '.') : new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' });
    for (const host of newsHosts) {
      const limit = parseInt(host.dataset.limit || '0', 10);
      host.innerHTML = (limit ? news.slice(0, limit) : news).map(n => `<div class="item"><time datetime="${esc(n.date)}">${fmt(n.date)}</time><div><h3>${n.link ? `<a href="${lang === 'ko' ? 'ko/' : ''}${esc(n.link)}">${esc(pick(n, 'title'))}</a>` : esc(pick(n, 'title'))}</h3><p>${esc(pick(n, 'body'))}</p></div></div>`).join('');
    }
  }

  // People groups
  const peopleHost = $('[data-people]');
  if (peopleHost) {
    const data = (await load('./data/people.json')) || { groups: [] };
    const joinHref = lang === 'ko' ? 'ko/join.html' : 'join.html';
    peopleHost.innerHTML = data.groups.map(g => `<section class="group" id="${esc(g.id)}"><h3>${esc(pick(g, 'title'))}</h3>${g.members.length ? `<div class="people-grid">${g.members.map(m => `<div class="person">${m.photo ? `<img class="ph" src="${esc(m.photo)}" alt="">` : '<div class="ph"></div>'}<h4>${esc(lang === 'ko' && m.name_ko ? m.name_ko : m.name)}${(lang === 'ko' ? m.name : m.name_ko) ? ` <small>${esc(lang === 'ko' ? m.name : m.name_ko)}</small>` : ''}</h4><p>${esc(pick(m, 'role'))}${m.since ? (lang === 'ko' ? ' · ' + esc(m.since) + '~' : ' · since ' + esc(m.since)) : ''}</p>${pick(m, 'topic') ? `<p>${esc(pick(m, 'topic'))}</p>` : ''}${m.email ? `<p><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></p>` : ''}</div>`).join('')}</div>` : `<div class="empty">${g.id === 'alumni' ? T.alumni : `${T.open} <a href="${joinHref}">${T.join}</a>`}</div>`}</section>`).join('');
  }
})();
