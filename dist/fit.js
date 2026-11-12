// DMSE Lab — research-area finder. fit.html asks five questions; fit-<area>.html shows the matching area.
// Every question lists one option per area, in the order of AREAS. The options are shuffled on screen.
(function () {
  const lang = (document.documentElement.lang || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const pre = lang === 'ko' ? '' : 'en/';
  const AREAS = ['ai', 'synthesis', 'capture', 'catalysis', 'energy'];
  const NAMES = {
    ko: { ai: 'AI 기반 소재 설계', synthesis: '나노다공성 소재 합성', capture: '선택적 흡착과 분리', catalysis: '촉매 소재와 반응', energy: '전기화학 소재와 계면' },
    en: { ai: 'AI-Guided Materials Design', synthesis: 'Synthesis of Nanoporous Materials', capture: 'Selective Adsorption & Separation', catalysis: 'Catalytic Materials & Reactions', energy: 'Electrochemical Materials & Interfaces' }
  }[lang];
  const T = {
    ko: { back: '← 이전 질문', take: '나도 해 보기', copied: '주소를 복사했습니다', share: '나와 맞는 연구 분야: {name}' },
    en: { back: '← Previous question', take: 'Take the quiz', copied: 'Link copied', share: 'My research area: {name}' }
  }[lang];
  const Q = {
    ko: [
      { q: '과제를 할 때 더 끌리는 일은?', o: ['코드를 짜서 데이터를 정리한다', '재료를 직접 섞고 만들어 본다', '섞인 것에서 필요한 것만 골라낸다', '반응이 왜 그렇게 되는지 따져 본다', '장치를 조립해 직접 돌려 본다'] },
      { q: '풀어 보고 싶은 문제는?', o: ['실험 전에 좋은 소재를 미리 골라내기', '지금까지 없던 구조의 소재 만들기', '공기나 물에서 원하는 성분만 잡아내기', '물에서 수소를 더 적은 전기로 만들기', '전기를 더 많이, 더 오래 저장하기'] },
      { q: '재미있게 들은 수업은?', o: ['프로그래밍, 통계', '합성 실험, 재료 공정', '열역학, 물리화학', '반응속도, 표면 화학', '전기화학, 전지'] },
      { q: '연구실에서 하루를 보낸다면?', o: ['노트북으로 계산을 돌리고 결과를 본다', '실험대에서 겔을 만들고 말린다', '분석 장비로 기공과 흡착량을 잰다', '전해 셀에서 기체가 나오는 것을 본다', '전극을 만들어 충전과 방전을 반복한다'] },
      { q: '가장 뿌듯할 것 같은 순간은?', o: ['모델의 예측이 실험과 맞았을 때', '처음 만든 소재가 깨지지 않고 나왔을 때', '원하는 분자만 골라 붙잡았을 때', '반응이 눈에 띄게 빨라졌을 때', '셀이 오래 돌려도 성능을 지켰을 때'] }
    ],
    en: [
      { q: 'Which task draws you in?', o: ['Writing code to organize data', 'Mixing things and making a material by hand', 'Picking out just what you need from a mixture', 'Working out why a reaction goes the way it does', 'Assembling a device and running it'] },
      { q: 'Which problem would you like to solve?', o: ['Picking good materials before running experiments', 'Making a material with a structure no one has made', 'Capturing one component from air or water', 'Making hydrogen from water with less electricity', 'Storing more electricity for longer'] },
      { q: 'Which class did you enjoy?', o: ['Programming, statistics', 'Synthesis labs, materials processing', 'Thermodynamics, physical chemistry', 'Reaction kinetics, surface chemistry', 'Electrochemistry, batteries'] },
      { q: 'How would you spend a day in the lab?', o: ['Running calculations on a laptop and reading the results', 'Making gels at the bench and drying them', 'Measuring pores and uptake on an analyzer', 'Watching gas evolve in an electrolysis cell', 'Building electrodes and cycling charge and discharge'] },
      { q: 'Which moment would feel best?', o: ['A model prediction matches the experiment', 'A first sample comes out in one piece', 'Only the target molecule gets captured', 'A reaction gets visibly faster', 'A cell keeps its performance after long cycling'] }
    ]
  }[lang];
  const store = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { } } };
  const abs = p => new URL(p, document.baseURI).href;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Questions: one tap answers and moves on; the last answer opens the result page.
  const host = document.querySelector('[data-fit]');
  if (host) {
    const answers = [];
    const order = Q.map(() => AREAS.map((_, i) => i).sort(() => Math.random() - 0.5));
    let cur = 0, busy = false;
    const finish = () => {
      const score = {}; AREAS.forEach(a => { score[a] = 0; }); answers.forEach(a => { score[a] += 1; });
      // Most picked first; a tie goes to the area picked in the later question.
      const ranked = AREAS.filter(a => score[a] > 0).sort((a, b) => (score[b] - score[a]) || (answers.lastIndexOf(b) - answers.lastIndexOf(a)));
      store.set('dmse-fit', ranked[0]);
      location.href = abs(pre + 'fit-' + ranked[0] + '.html') + (ranked[1] ? '#' + ranked[1] : '');
    };
    const render = () => {
      const q = Q[cur];
      host.innerHTML = `<div class="fit-card"><div class="fit-top"><span class="fit-step">${cur + 1} / ${Q.length}</span><div class="fit-bar"><i style="width:${(cur + 1) / Q.length * 100}%"></i></div></div><h2 class="fit-q" tabindex="-1">${esc(q.q)}</h2><div class="fit-opts">${order[cur].map(i => `<button type="button" data-a="${AREAS[i]}" aria-pressed="${answers[cur] === AREAS[i]}">${esc(q.o[i])}</button>`).join('')}</div>${cur ? `<button type="button" class="text-action fit-back">${T.back}</button>` : ''}</div>`;
      busy = false;
    };
    host.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || busy) return;
      if (b.classList.contains('fit-back')) { cur -= 1; render(); host.querySelector('.fit-q').focus({ preventScroll: true }); return; }
      if (!b.dataset.a) return;
      busy = true; answers[cur] = b.dataset.a;
      host.querySelectorAll('.fit-opts button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      setTimeout(() => {
        if (cur < Q.length - 1) { cur += 1; render(); host.querySelector('.fit-q').focus({ preventScroll: true }); }
        else finish();
      }, 180);
    });
    render();
  }

  // Result page: the person who just took the quiz sees the second-best area; a visitor from a shared link sees an invitation to take it.
  const res = document.querySelector('[data-fit-result]');
  if (res) {
    const area = res.dataset.fitResult;
    const taker = store.get('dmse-fit') === area;
    const shared = res.querySelector('[data-fit-shared]'); if (shared && taker) shared.hidden = true;
    const retake = res.querySelector('[data-fit-retake]'); if (retake && !taker) retake.textContent = T.take;
    const second = (location.hash || '').slice(1);
    const box = res.querySelector('[data-fit-second]');
    if (box && taker && AREAS.includes(second) && second !== area) {
      const a = box.querySelector('a'); a.textContent = NAMES[second]; a.href = abs(pre + 'research.html#' + second); box.hidden = false;
    }
    const share = res.querySelector('[data-fit-share]');
    if (share) share.addEventListener('click', async () => {
      const url = location.href.split('#')[0];
      const text = T.share.replace('{name}', NAMES[area]);
      if (navigator.share) { try { await navigator.share({ title: text, text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
      try { await navigator.clipboard.writeText(url); const old = share.textContent; share.textContent = T.copied; setTimeout(() => { share.textContent = old; }, 1800); } catch { }
    });
  }
})();
