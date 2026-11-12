// DMSE Lab — research-area simulations (sim.html).
// Five small canvas models, one per research area. Each model is a function that returns
// { animated, labels, controls, reset, step, draw, plot, pointer, readouts, status, peek } and works in the
// CSS pixels of the current stage (W x H). The models are simplified on purpose: they show the idea behind
// each research area and are not fitted to measured data.
(function () {
  'use strict';
  const root = document.querySelector('[data-sim]');
  if (!root) return;
  const lang = (document.documentElement.lang || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const pre = lang === 'ko' ? '' : 'en/';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const AREAS = ['ai', 'synthesis', 'capture', 'catalysis', 'energy'];
  const TAU = Math.PI * 2;
  const INK = '#12151a', MUTED = '#5b6575', LINE = 'rgba(18,21,26,.14)', TEAL = '#0e7c88', WATER = '#f3f8fa';
  const FONT = "'DM Sans','Noto Sans KR','Malgun Gothic',sans-serif";

  const T = {
    ko: {
      ui: { start: '▶ 시작', pause: '일시정지', resume: '계속', stage: '시뮬레이션 화면' },
      ai: {
        name: 'AI 기반 소재 설계',
        lead: '조성과 합성 온도에 따라 성능이 달라지는 가상의 소재입니다. 지도를 눌러 실험하면 AI가 결과를 학습해 성능 지도를 다시 그리고, 다음에 실험할 곳을 추천합니다.',
        hint: '색이 진할수록 AI가 예측한 성능이 높고, 흐릴수록 아직 잘 모르는 곳입니다. 실험 횟수를 줄이면서 가장 좋은 조건을 찾아보세요.',
        btnAI: 'AI 추천대로 실험', btnRnd: '무작위로 실험', btnNew: '새 소재',
        labels: ['실험 횟수', '찾은 최고 성능'], unit: '번',
        axisX: '조성 비율', axisY: '합성 온도', sug: 'AI 추천',
        found: '{n}번 실험으로 가장 좋은 조건을 찾았습니다.', go: '지도를 누르거나 AI 추천대로 실험해 보세요.'
      },
      synthesis: {
        name: '나노다공성 소재 합성',
        lead: '용액 속 입자가 떠다니다 서로 붙어 그물 구조를 만듭니다. 졸이 겔로 바뀌는 과정이고, 입자 사이의 빈 곳이 기공이 됩니다.',
        hint: '농도와 결합 속도를 바꾸면 기공 크기가 달라집니다. 겔이 된 뒤에는 건조 방법을 골라 보세요.',
        cConc: '입자 농도', lo1: '낮음', hi1: '높음', cStick: '결합 속도', lo2: '느림', hi2: '빠름',
        bSC: '초임계 건조', bAP: '상압 건조', bReset: '다시 시작',
        labels: ['상태', '기공률', '평균 기공 크기'], pore: '입자 지름의 {v}배',
        states: { sol: '졸', gel: '겔', drying: '건조 중', aerogel: '에어로젤', xerogel: '제로젤' },
        st: { sol: '입자가 뭉치는 중입니다.', gel: '겔이 되었습니다. 건조 방법을 골라 보세요.', drying: '용매가 빠져나가는 중입니다.', aerogel: '초임계 건조: 기공 구조가 그대로 남아 에어로젤이 됩니다.', xerogel: '상압 건조: 모세관력 때문에 구조가 수축합니다.' }
      },
      capture: {
        name: '선택적 흡착과 분리',
        lead: 'CO₂와 N₂가 섞인 기체가 다공성 흡착제를 지나갑니다. 빨간 CO₂는 기공 표면의 흡착 자리에 붙고, 파란 N₂는 그대로 빠져나갑니다.',
        hint: '친화도를 바꿔 보세요. 자리가 다 차면 CO₂가 출구로 새어 나옵니다. 재생을 누르면 붙어 있던 CO₂가 떨어져 나와 따로 모입니다.',
        cAff: 'CO₂ 친화도', lo: '약함', hi: '강함', bRegen: '재생',
        labels: ['출구 기체의 CO₂', '흡착 자리 점유율', '회수한 CO₂'], unit: '개',
        inlet: '유입', outlet: '출구', pY: '출구의 CO₂ 비율', feed: '유입 기체',
        stRegen: '재생 중입니다. 붙어 있던 CO₂가 떨어져 나옵니다.', stFull: '흡착 자리가 다 찼습니다. CO₂가 출구로 새어 나옵니다.'
      },
      catalysis: {
        name: '촉매 소재와 반응',
        lead: '수소 발생 반응을 단순하게 옮긴 모형입니다. 용액 속 수소 이온이 촉매 표면에 붙고, 이웃한 두 개가 만나 H₂가 되어 떨어져 나갑니다.',
        hint: '결합 세기를 바꿔 보세요. 너무 약하면 표면에 붙지 못하고, 너무 강하면 떨어지지 못합니다. 아래 그래프에는 지나간 지점의 반응 속도가 쌓입니다.',
        cBind: '결합 세기', lo: '약함', hi: '강함', bSweep: '자동으로 훑기', bStop: '훑기 멈춤',
        labels: ['수소 발생 속도', '표면 점유율'], rate: '초당 {v}개',
        pX: '결합 세기', pY: '반응 속도', stSweep: '결합 세기를 약한 쪽에서 강한 쪽으로 바꾸는 중입니다.'
      },
      energy: {
        name: '전기화학 소재와 계면',
        lead: '두 전극 사이의 전해질에 양이온과 음이온이 떠 있습니다. 전압을 걸면 이온이 반대 부호의 전극 표면에 모여 전하가 저장됩니다.',
        hint: '전압을 올린 뒤 전극의 기공을 늘려 보세요. 표면이 넓을수록 같은 전압에서 더 많은 전하가 저장됩니다.',
        cV: '전압', lo1: '0', hi1: '최대', cPore: '전극의 기공', lo2: '없음', hi2: '많음',
        labels: ['저장된 전하', '전극 표면적'], pairs: '이온 {v}쌍', area: '평평한 전극의 {v}배',
        pY: '저장된 전하', pMax: '최대', st0: '전압을 올려 보세요.'
      }
    },
    en: {
      ui: { start: '▶ Start', pause: 'Pause', resume: 'Resume', stage: 'simulation' },
      ai: {
        name: 'AI-Guided Materials Design',
        lead: 'An imaginary material whose performance depends on composition and synthesis temperature. Click the map to run an experiment. The AI learns from the result, redraws its performance map, and suggests where to try next.',
        hint: 'Darker colour means higher predicted performance, and paler areas are where the AI is still unsure. Find the best conditions in as few experiments as you can.',
        btnAI: 'Run the AI suggestion', btnRnd: 'Run a random experiment', btnNew: 'New material',
        labels: ['Experiments', 'Best performance found'], unit: '',
        axisX: 'Composition ratio', axisY: 'Synthesis temperature', sug: 'AI suggestion',
        found: 'Best conditions found in {n} experiments.', go: 'Click the map, or run the AI suggestion.'
      },
      synthesis: {
        name: 'Synthesis of Nanoporous Materials',
        lead: 'Particles drift in a solution and stick together into a network. This is how a sol turns into a gel, and the empty space between the particles becomes the pores.',
        hint: 'Concentration and bonding rate change the pore size. Once the gel has formed, choose how to dry it.',
        cConc: 'Particle concentration', lo1: 'Low', hi1: 'High', cStick: 'Bonding rate', lo2: 'Slow', hi2: 'Fast',
        bSC: 'Supercritical drying', bAP: 'Ambient drying', bReset: 'Restart',
        labels: ['State', 'Porosity', 'Mean pore size'], pore: '{v} particle diameters',
        states: { sol: 'Sol', gel: 'Gel', drying: 'Drying', aerogel: 'Aerogel', xerogel: 'Xerogel' },
        st: { sol: 'Particles are aggregating.', gel: 'A gel has formed. Choose a drying method.', drying: 'The solvent is leaving.', aerogel: 'Supercritical drying keeps the pore structure: an aerogel.', xerogel: 'Ambient drying: capillary forces shrink the structure.' }
      },
      capture: {
        name: 'Selective Adsorption & Separation',
        lead: 'A mixture of CO₂ and N₂ flows through a porous adsorbent. Red CO₂ sticks to adsorption sites on the pore surface, while blue N₂ passes through.',
        hint: 'Change the affinity. When the sites fill up, CO₂ starts to leak to the outlet. Regenerate to release the captured CO₂ and collect it.',
        cAff: 'CO₂ affinity', lo: 'Weak', hi: 'Strong', bRegen: 'Regenerate',
        labels: ['CO₂ in outlet gas', 'Sites occupied', 'CO₂ collected'], unit: '',
        inlet: 'Inlet', outlet: 'Outlet', pY: 'CO₂ fraction at outlet', feed: 'Feed',
        stRegen: 'Regenerating: the captured CO₂ is released.', stFull: 'The sites are full. CO₂ is leaking to the outlet.'
      },
      catalysis: {
        name: 'Catalytic Materials & Reactions',
        lead: 'A simple model of the hydrogen evolution reaction. Hydrogen ions from the solution stick to the catalyst surface, and two neighbours combine into H₂ and leave.',
        hint: 'Change the binding strength. Too weak and hydrogen cannot stick, too strong and it cannot leave. The chart below collects the reaction rate at each point you visit.',
        cBind: 'Binding strength', lo: 'Weak', hi: 'Strong', bSweep: 'Sweep automatically', bStop: 'Stop sweep',
        labels: ['Hydrogen production', 'Surface coverage'], rate: '{v} per second',
        pX: 'Binding strength', pY: 'Reaction rate', stSweep: 'Sweeping the binding strength from weak to strong.'
      },
      energy: {
        name: 'Electrochemical Materials & Interfaces',
        lead: 'Cations and anions float in the electrolyte between two electrodes. Apply a voltage and the ions gather on the surface of the oppositely charged electrode, storing charge.',
        hint: 'Raise the voltage, then add pores to the electrodes. A larger surface stores more charge at the same voltage.',
        cV: 'Voltage', lo1: '0', hi1: 'Max', cPore: 'Electrode pores', lo2: 'None', hi2: 'Many',
        labels: ['Stored charge', 'Electrode surface'], pairs: '{v} ion pairs', area: '{v} times a flat electrode',
        pY: 'Stored charge', pMax: 'Max', st0: 'Raise the voltage.'
      }
    }
  }[lang];

  // ---------- helpers ----------
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const gauss = () => { let u = 0; while (!u) u = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random()); };
  const dot = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const abs = p => new URL(p, document.baseURI).href;
  const pct = v => Math.round(v * 100) + '%';
  // light grey to deep teal: the colour scale of the prediction map
  const RAMP = [[238, 242, 246], [150, 205, 208], [14, 124, 136], [9, 70, 79]];
  const ramp = v => { v = clamp(v, 0, 1) * (RAMP.length - 1); const i = Math.min(RAMP.length - 2, v | 0), f = v - i, a = RAMP[i], b = RAMP[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; };
  const rgb = c => 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  const label = (g, s, x, y, align, color, size) => { g.font = (size || 12) + 'px ' + FONT; g.fillStyle = color || MUTED; g.textAlign = align || 'left'; g.fillText(s, x, y); };
  // shared frame for the small charts in the side panel
  function chart(g, w, h, yLabel, xLabel) {
    const m = { l: 14, r: 10, t: 22, b: xLabel ? 24 : 10 };
    g.clearRect(0, 0, w, h); g.textBaseline = 'alphabetic';
    label(g, yLabel, m.l, 14, 'left', MUTED, 11.5);
    if (xLabel) label(g, xLabel, w / 2, h - 7, 'center', MUTED, 11.5);
    g.strokeStyle = LINE; g.lineWidth = 1; g.beginPath(); g.moveTo(m.l, h - m.b + .5); g.lineTo(w - m.r, h - m.b + .5); g.stroke();
    return { x0: m.l, y0: m.t, w: w - m.l - m.r, h: h - m.t - m.b };
  }

  let W = 0, H = 0;      // stage size in CSS pixels, set by the runner before a model is created
  const SIMS = {};

  // ---------- 01 AI-guided design: Bayesian optimisation on a two-variable map ----------
  SIMS.ai = () => {
    const t = T.ai, GX = 40, GY = 25, ELL = 0.18, SF = 28, NOISE = 1.2, KAPPA = 1.5, DONE = 95;
    const off = document.createElement('canvas'); off.width = GX; off.height = GY; const og = off.getContext('2d');
    const M = { l: 44, r: 14, t: 14, b: 36 };
    let peaks, fmax, opt, obs, sug, tries, best;
    const f = (x, y) => { let s = 0; for (const p of peaks) s += p.a * Math.exp(-((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y)) / (2 * p.s * p.s)); return s; };
    const measure = (x, y) => 100 * f(x, y) / fmax;
    function problem() {
      // one best peak and two lower decoys, kept apart from each other
      peaks = [];
      for (let i = 0; i < 3; i++) {
        let x, y, n = 0;
        do { x = rnd(0.14, 0.86); y = rnd(0.14, 0.86); } while (peaks.some(p => Math.hypot(p.x - x, p.y - y) < 0.3) && ++n < 80);
        peaks.push({ x, y, a: i ? rnd(0.4, 0.7) : 1, s: i ? rnd(0.12, 0.18) : rnd(0.13, 0.17) });
      }
      fmax = 0;
      for (let j = 0; j <= 100; j++) for (let i = 0; i <= 100; i++) { const v = f(i / 100, j / 100); if (v > fmax) { fmax = v; opt = { x: i / 100, y: j / 100 }; } }
    }
    // Gaussian-process regression on the experiments so far, then the next point by upper confidence bound
    function learn() {
      const n = obs.length; let m = 0; for (const o of obs) m += o.v; m /= n;
      const L = [];
      for (let i = 0; i < n; i++) { L.push(new Float64Array(n)); for (let j = 0; j <= i; j++) { const d2 = (obs[i].x - obs[j].x) ** 2 + (obs[i].y - obs[j].y) ** 2; L[i][j] = SF * SF * Math.exp(-d2 / (2 * ELL * ELL)) + (i === j ? NOISE * NOISE : 0); } }
      for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = L[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]; L[i][j] = i === j ? Math.sqrt(Math.max(s, 1e-9)) : s / L[j][j]; }
      const z = new Float64Array(n), al = new Float64Array(n), ks = new Float64Array(n), v = new Float64Array(n);
      for (let i = 0; i < n; i++) { let s = obs[i].v - m; for (let k = 0; k < i; k++) s -= L[i][k] * z[k]; z[i] = s / L[i][i]; }
      for (let i = n - 1; i >= 0; i--) { let s = z[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * al[k]; al[i] = s / L[i][i]; }
      const img = og.createImageData(GX, GY); let bestU = -1e9; sug = null;
      for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
        const x = (gx + 0.5) / GX, y = (gy + 0.5) / GY; let mean = m, fresh = true;
        for (let i = 0; i < n; i++) { const d2 = (x - obs[i].x) ** 2 + (y - obs[i].y) ** 2; if (d2 < 0.0016) fresh = false; ks[i] = SF * SF * Math.exp(-d2 / (2 * ELL * ELL)); mean += ks[i] * al[i]; }
        let vv = 0; for (let i = 0; i < n; i++) { let s = ks[i]; for (let k = 0; k < i; k++) s -= L[i][k] * v[k]; v[i] = s / L[i][i]; vv += v[i] * v[i]; }
        const sd = Math.sqrt(Math.max(SF * SF - vv, 0)), u = mean + KAPPA * sd;
        if (fresh && u > bestU) { bestU = u; sug = { x, y }; }
        // colour = predicted performance, paler where the model is unsure
        const c = ramp(mean / 100), w = clamp(sd / SF, 0, 1) * 0.82, p = ((GY - 1 - gy) * GX + gx) * 4;
        img.data[p] = c[0] + (255 - c[0]) * w; img.data[p + 1] = c[1] + (255 - c[1]) * w; img.data[p + 2] = c[2] + (255 - c[2]) * w; img.data[p + 3] = 255;
      }
      og.putImageData(img, 0, 0);
    }
    function run(x, y) { x = clamp(x, 0.01, 0.99); y = clamp(y, 0.01, 0.99); const v = measure(x, y); obs.push({ x, y, v, seed: false }); tries++; if (v > best) best = v; learn(); }
    function reset() {
      problem(); obs = []; tries = 0; best = 0;
      // four earlier experiments to start from, one in each quarter of the map and none of them close to the answer
      for (let i = 0; i < 4; i++) { const qx = i % 2 * 0.5, qy = (i >> 1) * 0.5; let x, y, v, n = 0; do { x = qx + rnd(0.1, 0.4); y = qy + rnd(0.1, 0.4); v = measure(x, y); } while (v > 65 && ++n < 40); obs.push({ x, y, v, seed: true }); if (v > best) best = v; }
      learn();
    }
    function draw(g) {
      const pw = W - M.l - M.r, ph = H - M.t - M.b, X = x => M.l + x * pw, Y = y => M.t + (1 - y) * ph;
      g.clearRect(0, 0, W, H); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(off, M.l, M.t, pw, ph);
      g.strokeStyle = LINE; g.lineWidth = 1; g.strokeRect(M.l + .5, M.t + .5, pw - 1, ph - 1);
      g.textBaseline = 'alphabetic'; label(g, t.axisX, M.l + pw / 2, H - 12, 'center');
      g.save(); g.translate(18, M.t + ph / 2); g.rotate(-Math.PI / 2); label(g, t.axisY, 0, 0, 'center'); g.restore();
      if (sug) {
        const x = X(sug.x), y = Y(sug.y), left = x > W - 120;
        g.setLineDash([4, 3]); g.strokeStyle = INK; g.lineWidth = 1.5; dot(g, x, y, 11); g.stroke(); g.setLineDash([]);
        g.textBaseline = 'middle'; label(g, t.sug, x + (left ? -17 : 17), y, left ? 'right' : 'left', INK, 12);
      }
      for (const o of obs) {
        const x = X(o.x), y = Y(o.y), r = o.seed ? 5 : 6.5;
        dot(g, x, y, r + 1.6); g.fillStyle = '#fff'; g.fill(); dot(g, x, y, r); g.fillStyle = rgb(ramp(o.v / 100)); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
      }
      const lastO = obs[obs.length - 1];
      if (lastO && !lastO.seed) { g.textBaseline = 'alphabetic'; g.font = '600 12px ' + FONT; g.fillStyle = INK; g.textAlign = 'center'; g.fillText(String(Math.round(lastO.v)), X(lastO.x), Y(lastO.y) - 12); }
      if (best >= DONE) { const x = X(opt.x), y = Y(opt.y); g.strokeStyle = '#fff'; g.lineWidth = 3; dot(g, x, y, 15); g.stroke(); g.strokeStyle = INK; g.lineWidth = 1.5; dot(g, x, y, 15); g.stroke(); }
    }
    const controls = [
      { type: 'button', label: t.btnAI, primary: true, on() { if (sug) run(sug.x, sug.y); } },
      { type: 'button', label: t.btnRnd, on() { run(rnd(0.03, 0.97), rnd(0.03, 0.97)); } },
      { type: 'button', label: t.btnNew, on() { reset(); } }
    ];
    return {
      animated: false, labels: t.labels, controls, reset, draw, step() {}, resize() {},   // the map keeps its experiments when the stage is resized
      pointer(px, py) { const pw = W - M.l - M.r, ph = H - M.t - M.b; if (px < M.l || px > M.l + pw || py < M.t || py > M.t + ph) return; run((px - M.l) / pw, 1 - (py - M.t) / ph); },
      readouts: () => [tries + t.unit, Math.round(best) + ' / 100'],
      status: () => best >= DONE ? t.found.replace('{n}', tries) : t.go,
      peek: () => ({ tries, best, sug, opt, n: obs.length })
    };
  };

  // ---------- 02 Synthesis: cluster-cluster aggregation on a lattice (sol to gel), then drying ----------
  SIMS.synthesis = () => {
    const t = T.synthesis, DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
    let cs, cols, rows, grid, list, byId, N, phi = 0.10, stick = 1, state, big, pore, clock, gelClock, dry, dryT, k, wet, frozen, pace;
    const controls = [
      { type: 'range', label: t.cConc, lo: t.lo1, hi: t.hi1, min: 4, max: 16, step: 1, value: 10, on(v) { phi = v / 100; reset(); } },
      { type: 'range', label: t.cStick, lo: t.lo2, hi: t.hi2, min: 4, max: 100, step: 1, value: 100, on(v) { stick = v / 100; reset(); } },
      { type: 'button', label: t.bSC, disabled: true, on() { startDry('sc'); } },
      { type: 'button', label: t.bAP, disabled: true, on() { startDry('ap'); } },
      { type: 'button', label: t.bReset, on() { reset(); } }
    ];
    const dryButtons = on => { for (const c of controls) if (c.type === 'button' && c.label !== t.bReset && c.el) c.el.disabled = !on; };
    function reset() {
      cs = W < 520 ? 5 : 6; cols = Math.floor(W / cs); rows = Math.floor(H / cs);
      grid = new Int32Array(cols * rows).fill(-1); list = []; byId = [];
      N = Math.round(phi * cols * rows);
      for (let placed = 0; placed < N;) { const i = (Math.random() * cols * rows) | 0; if (grid[i] !== -1) continue; const c = { id: placed, cells: [i], n: 1, dead: false }; grid[i] = c.id; list.push(c); byId.push(c); placed++; }
      state = 'sol'; big = null; dry = null; k = 1; wet = 1; clock = 0; gelClock = 0; frozen = false; pace = 0.08; measure(); dryButtons(false);
    }
    // one lattice step in a random direction: -1 moved, -2 stopped by the wall, otherwise the id of the cluster it ran into
    function move(c) {
      const d = (Math.random() * 4) | 0, dx = DX[d], dy = DY[d], cells = c.cells, sh = dx + dy * cols, n = cells.length;
      for (let j = 0; j < n; j++) { const i = cells[j], x = i % cols + dx, y = (i / cols | 0) + dy; if (x < 0 || x >= cols || y < 0 || y >= rows) return -2; const o = grid[i + sh]; if (o !== -1 && o !== c.id) return o; }
      for (let j = 0; j < n; j++) grid[cells[j]] = -1;
      for (let j = 0; j < n; j++) cells[j] += sh;
      for (let j = 0; j < n; j++) grid[cells[j]] = c.id;
      return -1;
    }
    function merge(a, b) {
      if (a.n < b.n) { const s = a; a = b; b = s; }
      const bc = b.cells; for (let j = 0; j < bc.length; j++) { grid[bc[j]] = a.id; a.cells.push(bc[j]); }
      a.n += b.n; b.dead = true; b.cells = []; return a;
    }
    // after a move, each touching neighbour cluster bonds with the sticking probability
    function bond(c) {
      const cells = c.cells; let found = null;
      for (let j = 0; j < cells.length; j++) {
        const i = cells[j], x = i % cols, y = i / cols | 0;
        for (let d = 0; d < 4; d++) { const nx = x + DX[d], ny = y + DY[d]; if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue; const o = grid[ny * cols + nx]; if (o !== -1 && o !== c.id) (found || (found = new Set())).add(o); }
      }
      if (!found) return;
      for (const o of found) { const b = byId[o]; if (b.dead || b === c) continue; if (Math.random() < stick) c = merge(c, b); }
    }
    // mean distance from an empty cell to the nearest particle, doubled: a pore width in particle diameters
    function measure() {
      const n = cols * rows, dist = new Int16Array(n).fill(-1), q = new Int32Array(n); let h = 0, tl = 0, sum = 0, cnt = 0;
      for (let i = 0; i < n; i++) if (grid[i] !== -1) { dist[i] = 0; q[tl++] = i; }
      while (h < tl) {
        const i = q[h++], x = i % cols, d = dist[i] + 1;
        if (x > 0 && dist[i - 1] < 0) { dist[i - 1] = d; q[tl++] = i - 1; sum += d; cnt++; }
        if (x < cols - 1 && dist[i + 1] < 0) { dist[i + 1] = d; q[tl++] = i + 1; sum += d; cnt++; }
        if (i >= cols && dist[i - cols] < 0) { dist[i - cols] = d; q[tl++] = i - cols; sum += d; cnt++; }
        if (i < n - cols && dist[i + cols] < 0) { dist[i + cols] = d; q[tl++] = i + cols; sum += d; cnt++; }
      }
      pore = cnt ? 2 * sum / cnt : 0;
    }
    function startDry(mode) { if (state === 'sol') return; dry = mode; dryT = 0; k = 1; wet = 1; state = 'drying'; frozen = true; }
    function step(dt) {
      clock += dt;
      if (state === 'drying') {
        dryT += dt; const u = clamp(dryT / 2.4, 0, 1), e = u * u * (3 - 2 * u);
        wet = 1 - e; k = dry === 'ap' ? 1 - 0.42 * e : 1;
        if (u >= 1) state = dry === 'sc' ? 'aerogel' : 'xerogel';
        return;
      }
      if (frozen) return;
      // Bigger clusters diffuse more slowly. The clock is a time-lapse: its pace is adjusted so that the number of
      // clusters falls steadily and the gel forms in about fifteen seconds (slower bonding takes a little longer).
      const tau = 2.0 + 1.6 * (1 - stick), frames = dt * 60;
      pace = clamp(pace * (list.length > N * Math.exp(-clock / tau) ? 1.04 : 0.96), 0.03, 80);
      for (let q = 0; q < list.length; q++) {
        const c = list[q]; if (c.dead) continue;
        const a = Math.min(5, pace * Math.pow(c.n, -0.6)) * frames; let tries = (a | 0) + (Math.random() < a - (a | 0) ? 1 : 0);
        while (tries-- > 0 && !c.dead) { const hit = move(c); if (hit === -1) bond(c); else if (hit >= 0 && Math.random() < stick) merge(c, byId[hit]); }
      }
      list = list.filter(c => !c.dead);
      big = list[0]; for (const c of list) if (c.n > big.n) big = c;
      // gel point: one cluster holds most of the particles; the stragglers get a few more seconds to join
      if (state === 'sol' && big.n >= 0.6 * N) { state = 'gel'; gelClock = clock; dryButtons(true); }
      if (state === 'gel' && (list.length <= 1 || clock - gelClock > 12)) frozen = true;
      if (((clock * 3) | 0) !== (((clock - dt) * 3) | 0)) measure();
    }
    function draw(g) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(176,214,235,' + (0.32 * wet).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
      const ox = (W - cols * cs) / 2 + cs / 2, oy = (H - rows * cs) / 2 + cs / 2, r = cs * 0.6, bigId = big && state !== 'sol' ? big.id : (big ? big.id : -1);
      g.save(); g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-W / 2, -H / 2);
      g.fillStyle = '#a9c4d6'; g.beginPath();
      for (const c of list) { if (c.dead || c.id === bigId) continue; const cells = c.cells; for (let j = 0; j < cells.length; j++) { const x = ox + (cells[j] % cols) * cs, y = oy + (cells[j] / cols | 0) * cs; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } }
      g.fill();
      if (big) { g.fillStyle = state === 'sol' ? '#7aa9c4' : '#4b8fb0'; g.beginPath(); const cells = big.cells; for (let j = 0; j < cells.length; j++) { const x = ox + (cells[j] % cols) * cs, y = oy + (cells[j] / cols | 0) * cs; g.moveTo(x + r, y); g.arc(x, y, r, 0, TAU); } g.fill(); }
      g.restore();
    }
    return {
      animated: true, labels: t.labels, controls, reset, step, draw,
      readouts: () => [t.states[state], pct(1 - (N / (cols * rows)) / (k * k)), t.pore.replace('{v}', (pore * k).toFixed(1))],
      status: () => t.st[state],
      peek: () => ({ state, clusters: list.length, N, big: big ? big.n : 0, pore, clock, k })
    };
  };

  // ---------- 03 Adsorption and separation: a CO2/N2 mixture through a bed of adsorption sites ----------
  function co2(g, x, y, a) { const cx = Math.cos(a) * 5, cy = Math.sin(a) * 5; g.fillStyle = '#c4513b'; dot(g, x - cx, y - cy, 3.1); g.fill(); dot(g, x + cx, y + cy, 3.1); g.fill(); g.fillStyle = '#3b4048'; dot(g, x, y, 2.9); g.fill(); }
  function n2(g, x, y, a) { const cx = Math.cos(a) * 2.6, cy = Math.sin(a) * 2.6; g.fillStyle = '#3d6fd6'; dot(g, x - cx, y - cy, 3); g.fill(); dot(g, x + cx, y + cy, 3); g.fill(); }
  SIMS.capture = () => {
    const t = T.capture, FEED = 0.3;
    let mol, sites, nc, nr, aff = 0.65, regen, acc, time, win, hist, got, x0, x1, RATE, DRIFT, lastHist;
    const controls = [
      { type: 'range', label: t.cAff, lo: t.lo, hi: t.hi, min: 0, max: 100, step: 1, value: 65, on(v) { aff = v / 100; } },
      { type: 'button', label: t.bRegen, on() { if (regen <= 0) regen = 3.2; } }
    ];
    function add(x) { mol.push({ x: x === undefined ? -8 : x, y: rnd(8, H - 8), vx: DRIFT, vy: 0, c: Math.random() < FEED, a: rnd(0, TAU), w: rnd(-2, 2), s: null, cool: 0, rec: false }); }
    function reset() {
      x0 = W * 0.25; x1 = W * 0.75; const sp = W < 520 ? 36 : 46;
      nc = Math.max(3, Math.round((x1 - x0) / sp)); nr = Math.max(4, Math.round(H / sp)); sites = [];
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) sites.push({ x: x0 + (i + 0.5) * (x1 - x0) / nc, y: (j + 0.5) * H / nr, m: null });
      RATE = W < 520 ? 11 : 20; DRIFT = W < 520 ? 42 : 56;
      mol = []; win = []; hist = []; got = 0; regen = 0; acc = 0; time = 0; lastHist = 0;
      // gas already on its way in, so the screen does not start empty
      const n = Math.round(RATE * x0 / DRIFT); for (let i = 0; i < n; i++) add(rnd(0, x0));
    }
    const frac = () => { if (!win.length) return 0; let s = 0; for (const v of win) s += v; return s / win.length; };
    const occupied = () => { let n = 0; for (const s of sites) if (s.m) n++; return n / sites.length; };
    function step(dt) {
      time += dt; const on = regen > 0; if (on) regen -= dt;
      if (!on) { acc += RATE * dt; while (acc >= 1) { acc--; add(); } }
      // stronger affinity: sticks more readily and stays much longer; during regeneration everything lets go
      const koff = on ? 2.4 : 0.45 * Math.exp(-6.2 * aff), pon = 1 - Math.exp(-(14 * aff * aff + 0.15) * dt), sq = Math.sqrt(dt);
      for (let i = mol.length - 1; i >= 0; i--) {
        const m = mol[i];
        if (m.s) {
          if (Math.random() < koff * dt) { m.s.m = null; m.s = null; m.cool = 0.7; m.rec = on; m.vx = DRIFT * 0.5; m.vy = rnd(-30, 30); }
          else { m.a += m.w * 0.15 * dt; continue; }
        }
        m.cool -= dt; m.a += m.w * dt;
        m.vx += (DRIFT - m.vx) * 1.6 * dt + gauss() * 34 * sq; m.vy += -m.vy * 1.6 * dt + gauss() * 34 * sq;
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.y < 6) { m.y = 6; m.vy = Math.abs(m.vy); } else if (m.y > H - 6) { m.y = H - 6; m.vy = -Math.abs(m.vy); }
        if (m.x < -12) m.x = -12;
        if (m.c && !on && m.cool <= 0 && m.x > x0 - 12 && m.x < x1 + 12) {
          for (let q = 0; q < sites.length; q++) { const s = sites[q]; if (s.m) continue; const dx = s.x - m.x, dy = s.y - m.y; if (dx * dx + dy * dy < 150 && Math.random() < pon) { s.m = m; m.s = s; m.x = s.x; m.y = s.y; break; } }
        }
        if (m.x > W + 12) { if (m.rec) got++; else if (!on) { win.push(m.c ? 1 : 0); if (win.length > 50) win.shift(); } mol.splice(i, 1); }
      }
      if (time - lastHist > 0.25) { lastHist = time; hist.push({ t: time, f: frac(), r: on }); while (hist.length && time - hist[0].t > 60) hist.shift(); }
    }
    function draw(g) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = regen > 0 ? '#f7ebdf' : '#f1efe9'; g.fillRect(x0, 0, x1 - x0, H);
      g.strokeStyle = 'rgba(18,21,26,.13)'; g.lineWidth = 1; g.beginPath();
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) { const s = sites[j * nc + i]; if (i < nc - 1) { g.moveTo(s.x, s.y); g.lineTo(sites[j * nc + i + 1].x, s.y); } if (j < nr - 1) { g.moveTo(s.x, s.y); g.lineTo(s.x, sites[(j + 1) * nc + i].y); } }
      g.stroke();
      for (const s of sites) { dot(g, s.x, s.y, s.m ? 10 : 6); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = s.m ? TEAL : '#9db0b4'; g.lineWidth = s.m ? 1.8 : 1.3; g.stroke(); }
      for (const m of mol) (m.c ? co2 : n2)(g, m.x, m.y, m.a);
      g.textBaseline = 'top'; label(g, t.inlet, 10, 10, 'left'); label(g, t.outlet, W - 10, 10, 'right');
    }
    function plot(g, w, h) {
      const p = chart(g, w, h, t.pY), top = 0.5, Y = v => p.y0 + (1 - Math.min(v, top) / top) * p.h, X = tt => p.x0 + (1 - (time - tt) / 60) * p.w;
      g.setLineDash([4, 3]); g.strokeStyle = 'rgba(18,21,26,.3)'; g.beginPath(); g.moveTo(p.x0, Y(FEED)); g.lineTo(p.x0 + p.w, Y(FEED)); g.stroke(); g.setLineDash([]);
      g.textBaseline = 'alphabetic'; label(g, t.feed + ' ' + pct(FEED), p.x0 + p.w, Y(FEED) - 4, 'right', MUTED, 11);
      if (hist.length > 1) { g.strokeStyle = '#c4513b'; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath(); hist.forEach((q, i) => { const x = X(q.t), y = Y(q.f); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); }
    }
    return {
      animated: true, labels: t.labels, controls, reset, step, draw, plot,
      readouts: () => [pct(frac()), pct(occupied()), got + t.unit],
      status: () => regen > 0 ? t.stRegen : occupied() > 0.95 ? t.stFull : '',
      peek: () => ({ time, mol: mol.length, sites: sites.length, occ: occupied(), frac: frac(), got, regen })
    };
  };

  // ---------- 04 Catalysis: hydrogen evolution on a row of surface sites (Sabatier volcano) ----------
  SIMS.catalysis = () => {
    const t = T.catalysis, F = 0.9, BINS = 20;
    let n, R, xs, y0, top, occ, lock, pro, bub, s = 0, ev, time, bins, settle, sweep = -1, sweepT = 0, sprite;
    const pads = () => 1 / (1 + Math.exp(-5.5 * s)), kdes = () => 0.9 * Math.exp(-4.4 * s);
    const controls = [
      { type: 'range', label: t.cBind, lo: t.lo, hi: t.hi, min: 0, max: 100, step: 5, value: 50, on(v) { s = v / 50 - 1; settle = 0; if (sweep >= 0) stopSweep(); } },
      { type: 'button', label: t.bSweep, on() { if (sweep >= 0) stopSweep(); else { sweep = 0; sweepT = 0; setS(0); controls[1].el.textContent = t.bStop; } } }
    ];
    function setS(bin) { s = bin / (BINS / 2) - 1; settle = 0; if (controls[0].el) controls[0].el.value = String(bin * 100 / BINS); }
    function stopSweep() { sweep = -1; if (controls[1].el) controls[1].el.textContent = t.bSweep; }
    const free = any => ({ x: rnd(6, W - 6), y: any ? rnd(8, Math.max(20, top - 30)) : -6, vx: rnd(-20, 20), vy: rnd(0, 30), mode: 0, k: -1, t: 0 });
    function reset() {
      R = W < 520 ? 12 : 18; n = Math.floor((W - R) / (2 * R)); y0 = H - R * 3.3; top = y0 - R - 6;
      xs = []; for (let i = 0; i < n; i++) xs.push(W / 2 + (i - (n - 1) / 2) * 2 * R);
      occ = new Uint8Array(n); lock = new Uint8Array(n);
      pro = []; const np = Math.round(n * 1.5); for (let i = 0; i < np; i++) pro.push(free(true));
      bub = []; ev = []; time = 0; settle = 0; bins = []; for (let i = 0; i <= BINS; i++) bins.push({ n: 0, t: 0 });
      // one shaded metal atom, drawn once and stamped for every site
      const d = Math.ceil(R * 2 + 2); sprite = document.createElement('canvas'); sprite.width = sprite.height = d * 2; const sg = sprite.getContext('2d'); sg.scale(2, 2);
      const gr = sg.createRadialGradient(d / 2 - R * 0.3, d / 2 - R * 0.35, R * 0.1, d / 2, d / 2, R); gr.addColorStop(0, '#f6f8fa'); gr.addColorStop(0.55, '#c3cad2'); gr.addColorStop(1, '#8f99a5');
      dot(sg, d / 2, d / 2, R - 0.5); sg.fillStyle = gr; sg.fill(); sg.strokeStyle = 'rgba(60,70,82,.45)'; sg.lineWidth = 1; sg.stroke();
    }
    const rate = () => ev.length / Math.max(1, Math.min(4, time));
    const coverage = () => { let c = 0; for (let i = 0; i < n; i++) c += occ[i]; return c / n; };
    function step(dt) {
      time += dt; settle += dt;
      if (sweep >= 0) { sweepT += dt; if (sweepT > 3) { sweepT = 0; sweep++; if (sweep > BINS) stopSweep(); else setS(sweep); } }
      const pa = pads(), kd = kdes(), sq = Math.sqrt(dt);
      // each empty site calls in a hydrogen ion now and then; it sticks with a probability set by the binding strength
      for (let i = 0; i < n; i++) if (!occ[i] && !lock[i] && Math.random() < F * dt) {
        let bi = -1, bd = 1e9;
        for (let j = 0; j < pro.length; j++) { const p = pro[j]; if (p.mode) continue; const d = Math.abs(p.x - xs[i]) + Math.abs(top - p.y) * 0.4 + Math.random() * 40; if (d < bd) { bd = d; bi = j; } }
        if (bi >= 0) { pro[bi].mode = 1; pro[bi].k = i; lock[i] = 1; }
      }
      for (let j = pro.length - 1; j >= 0; j--) {
        const p = pro[j];
        if (p.mode === 1) {
          const dx = xs[p.k] - p.x, dy = y0 - R - 4 - p.y, d = Math.hypot(dx, dy), v = 260 * dt;
          if (d <= v) { lock[p.k] = 0; if (!occ[p.k] && Math.random() < pa) { occ[p.k] = 1; pro[j] = free(false); } else { p.mode = 2; p.t = 0.45; p.vx = rnd(-70, 70); p.vy = -rnd(120, 190); } }
          else { p.x += dx / d * v; p.y += dy / d * v; }
          continue;
        }
        if (p.mode === 2) { p.t -= dt; if (p.t <= 0) p.mode = 0; }
        p.vx += -p.vx * 1.2 * dt + gauss() * 60 * sq; p.vy += ((p.mode === 2 ? 0 : 6) - p.vy * 1.2) * dt + gauss() * 60 * sq;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 4) { p.x = 4; p.vx = Math.abs(p.vx); } else if (p.x > W - 4) { p.x = W - 4; p.vx = -Math.abs(p.vx); }
        if (p.y < 4 && p.vy < 0) { p.y = 4; p.vy = -p.vy; } else if (p.y > top - 4) { p.y = top - 4; p.vy = -Math.abs(p.vy) * 0.6; }
      }
      // two neighbouring adsorbed hydrogens leave together as H2; strong binding makes this slow
      let made = 0;
      for (let i = 0; i < n - 1; i++) if (occ[i] && occ[i + 1] && Math.random() < kd * dt) { occ[i] = occ[i + 1] = 0; bub.push({ x: (xs[i] + xs[i + 1]) / 2, y: y0 - R - 6, vy: -rnd(50, 80), a: rnd(0, TAU), ph: rnd(0, TAU) }); ev.push(time); made++; i++; }
      while (ev.length && time - ev[0] > 4) ev.shift();
      for (let j = bub.length - 1; j >= 0; j--) { const b = bub[j]; b.y += b.vy * dt; b.ph += 3 * dt; b.x += Math.sin(b.ph) * 12 * dt; b.a += dt; if (b.y < -12) bub.splice(j, 1); }
      if (settle > 1.6) { const b = bins[Math.round((s + 1) * BINS / 2)]; b.t += dt; b.n += made; }
    }
    function draw(g) {
      g.clearRect(0, 0, W, H); g.fillStyle = WATER; g.fillRect(0, 0, W, y0);
      g.fillStyle = '#9aa3ae'; g.fillRect(0, y0, W, H - y0);
      const d = sprite.width / 2;
      for (let row = 2; row >= 0; row--) { const y = y0 + row * R * 1.732, sh = row % 2 ? R : 0; for (let i = -1; i <= n; i++) g.drawImage(sprite, xs[0] + i * 2 * R + sh - d / 2, y - d / 2, d, d); }
      g.lineWidth = 2; g.strokeStyle = TEAL; g.fillStyle = '#fff';
      for (let i = 0; i < n; i++) if (occ[i]) { dot(g, xs[i], y0 - R - R * 0.2, R * 0.34); g.fill(); g.stroke(); }
      g.fillStyle = 'rgba(14,124,136,.85)'; g.beginPath(); for (const p of pro) { g.moveTo(p.x + 2.5, p.y); g.arc(p.x, p.y, 2.5, 0, TAU); } g.fill();
      g.lineWidth = 1.6; g.fillStyle = '#fff';
      for (const b of bub) { const cx = Math.cos(b.a) * 3.6, cy = Math.sin(b.a) * 3.6; dot(g, b.x - cx, b.y - cy, 4.2); g.fill(); g.stroke(); dot(g, b.x + cx, b.y + cy, 4.2); g.fill(); g.stroke(); }
    }
    function plot(g, w, h) {
      const p = chart(g, w, h, t.pY, t.pX); let ymax = 1.5; const pts = [];
      bins.forEach((b, i) => { if (b.t > 1.2) { const v = b.n / b.t; pts.push([i, v]); if (v > ymax) ymax = v; } });
      ymax *= 1.15; const X = i => p.x0 + 8 + (i / BINS) * (p.w - 16), Y = v => p.y0 + (1 - v / ymax) * p.h;
      g.textBaseline = 'alphabetic'; label(g, t.lo, p.x0, h - 7, 'left', MUTED, 11); label(g, t.hi, p.x0 + p.w, h - 7, 'right', MUTED, 11);
      const cur = (s + 1) * BINS / 2; g.setLineDash([3, 3]); g.strokeStyle = 'rgba(18,21,26,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(cur), p.y0); g.lineTo(X(cur), p.y0 + p.h); g.stroke(); g.setLineDash([]);
      if (pts.length > 1) { g.strokeStyle = TEAL; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath(); pts.forEach((q, i) => { if (i) g.lineTo(X(q[0]), Y(q[1])); else g.moveTo(X(q[0]), Y(q[1])); }); g.stroke(); }
      for (const q of pts) { dot(g, X(q[0]), Y(q[1]), 3.2); g.fillStyle = TEAL; g.fill(); }
    }
    return {
      animated: true, labels: t.labels, controls, reset, step, draw, plot,
      readouts: () => [t.rate.replace('{v}', rate().toFixed(1)), pct(coverage())],
      status: () => sweep >= 0 ? t.stSweep : '',
      peek: () => ({ s, n, rate: rate(), cov: coverage(), sweep, bins: bins.map(b => b.t > 1.2 ? +(b.n / b.t).toFixed(2) : null), pro: pro.length })
    };
  };

  // ---------- 05 Electrochemistry: ions forming a double layer on flat or porous electrodes ----------
  SIMS.energy = () => {
    const t = T.energy, r = 4.2, MAXP = W < 520 ? 4 : 6;
    let V = 0.6, pores = 2, eW, d, hs, cy, sitesL, sitesR, S, flat, ions, hist, time, lastH;
    const controls = [
      { type: 'range', label: t.cV, lo: t.lo1, hi: t.hi1, min: 0, max: 100, step: 1, value: 60, on(v) { V = v / 100; } },
      { type: 'range', label: t.cPore, lo: t.lo2, hi: t.hi2, min: 0, max: MAXP, step: 1, value: 2, on(v) { pores = v; reset(); } }
    ];
    const inSlit = y => { for (let i = 0; i < cy.length; i++) if (Math.abs(y - cy[i]) < hs / 2) return true; return false; };
    // true inside electrode material; the slits cut into each electrode are open to the electrolyte
    const solid = (x, y) => x < eW ? !(x > eW - d && inSlit(y)) : x > W - eW ? !(x < W - eW + d && inSlit(y)) : false;
    const blocked = (x, y) => y < r || y > H - r || solid(x - r, y) || solid(x + r, y) || solid(x, y - r) || solid(x, y + r);
    function build(right) {
      const out = [], gap = 10.5;
      for (let y = 8; y < H - 6; y += gap) if (!cy.some(c => Math.abs(y - c) < hs / 2 + r)) out.push({ x: eW + r + 0.5, y });
      for (const c of cy) { for (let x = eW - 6; x > eW - d + r + 6; x -= gap) { out.push({ x, y: c - hs / 2 + r + 0.5 }); out.push({ x, y: c + hs / 2 - r - 0.5 }); } out.push({ x: eW - d + r + 0.5, y: c }); }
      // a random order decides which sites take charge first as the voltage rises
      const order = out.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0, s = order[i]; order[i] = order[j]; order[j] = s; }
      order.forEach((idx, q) => { out[idx].rank = q; });
      for (const s of out) { s.ion = null; if (right) s.x = W - s.x; }
      return out;
    }
    function reset() {
      eW = Math.round(W * 0.27); d = Math.round(eW * 0.8); hs = 22; pores = Math.min(pores, MAXP);
      cy = []; for (let i = 0; i < pores; i++) cy.push(H * (i + 1) / (pores + 1));
      sitesL = build(false); sitesR = build(true); S = sitesL.length; flat = Math.floor((H - 14) / 10.5) + 1;
      // enough ions to fill every site, plus some that always stay in the bulk electrolyte
      const n = Math.max(40, Math.round(S * 1.1)) + (W < 520 ? 22 : 46); ions = [];
      for (let i = 0; i < 2 * n; i++) { let x, y, q = 0; do { x = rnd(eW - d + 6, W - eW + d - 6); y = rnd(6, H - 6); } while (blocked(x, y) && ++q < 300); ions.push({ x, y, q: i < n ? 1 : -1, s: null }); }
      hist = []; time = 0; lastH = 0;
    }
    const stored = () => { let a = 0, b = 0; for (const s of sitesL) if (s.ion) a++; for (const s of sitesR) if (s.ion) b++; return (a + b) / 2; };
    function release(side, act) { for (const s of side) if (s.ion && s.rank >= act) { s.ion.s = null; s.ion = null; } }
    function step(dt) {
      time += dt; const act = Math.round(V * S), sig = Math.sqrt(2 * 80 * dt);
      release(sitesL, act); release(sitesR, act);
      // the pull on the ions fades as the double layer fills and screens the electrode
      let bl = 0, br = 0; for (const s of sitesL) if (s.ion) bl++; for (const s of sitesR) if (s.ion) br++;
      const pull = b => b >= act ? 0 : 150 * V * dt * Math.max(0.25, 1 - b / act), pullL = pull(bl), pullR = pull(br);
      for (const p of ions) {
        if (p.s) continue;
        // random motion plus a pull toward the electrode of opposite sign: cations to the left, anions to the right
        const dx = gauss() * sig + (p.q > 0 ? -pullL : pullR), dy = gauss() * sig;
        if (!blocked(p.x + dx, p.y)) p.x += dx; if (!blocked(p.x, p.y + dy)) p.y += dy;
        if (!act || (p.q > 0 ? p.x > eW + 14 : p.x < W - eW - 14)) continue;
        const side = p.q > 0 ? sitesL : sitesR;
        for (let q = 0; q < side.length; q++) { const s = side[q]; if (s.ion || s.rank >= act) continue; const ex = s.x - p.x, ey = s.y - p.y; if (ex * ex + ey * ey < 90) { s.ion = p; p.s = s; p.x = s.x; p.y = s.y; break; } }
      }
      if (time - lastH > 0.25) { lastH = time; hist.push({ t: time, q: stored() }); while (hist.length && time - hist[0].t > 40) hist.shift(); }
    }
    function draw(g) {
      g.clearRect(0, 0, W, H); g.fillStyle = WATER; g.fillRect(0, 0, W, H);
      g.fillStyle = '#2e333b'; g.fillRect(0, 0, eW, H); g.fillRect(W - eW, 0, eW, H);
      g.fillStyle = WATER; for (const c of cy) { g.fillRect(eW - d, c - hs / 2, d, hs); g.fillRect(W - eW, c - hs / 2, d, hs); }
      if (V > 0.02) { g.globalAlpha = 0.35 + 0.65 * V; g.fillStyle = '#fff'; g.font = '600 19px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('−', 15, 17); g.fillText('+', W - 15, 17); g.globalAlpha = 1; }
      g.lineWidth = 1.3; g.strokeStyle = '#fff';
      for (const p of ions) {
        g.fillStyle = p.q > 0 ? '#1597a0' : '#d8703c'; dot(g, p.x, p.y, r); g.fill();
        g.beginPath(); g.moveTo(p.x - 2, p.y); g.lineTo(p.x + 2, p.y); if (p.q > 0) { g.moveTo(p.x, p.y - 2); g.lineTo(p.x, p.y + 2); } g.stroke();
      }
    }
    function plot(g, w, h) {
      const p = chart(g, w, h, t.pY), Y = v => p.y0 + (1 - v / (S * 1.08)) * p.h, X = tt => p.x0 + (1 - (time - tt) / 40) * p.w;
      g.setLineDash([4, 3]); g.strokeStyle = 'rgba(18,21,26,.3)'; g.beginPath(); g.moveTo(p.x0, Y(S)); g.lineTo(p.x0 + p.w, Y(S)); g.stroke(); g.setLineDash([]);
      g.textBaseline = 'alphabetic'; label(g, t.pMax, p.x0 + p.w, Y(S) + 13, 'right', MUTED, 11);
      if (hist.length > 1) { g.strokeStyle = TEAL; g.lineWidth = 1.8; g.lineJoin = 'round'; g.beginPath(); hist.forEach((q, i) => { const x = X(q.t), y = Y(q.q); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); }
    }
    return {
      animated: true, labels: t.labels, controls, reset, step, draw, plot,
      readouts: () => [t.pairs.replace('{v}', Math.round(stored())), t.area.replace('{v}', (S / flat).toFixed(1))],
      status: () => V < 0.02 ? t.st0 : '',
      peek: () => ({ V, pores, S, flat, stored: stored(), ions: ions.length, time })
    };
  };

  // ---------- runner: tabs, panel, animation loop ----------
  const el = {
    tabs: [...root.querySelectorAll('[data-sim-tab]')], canvas: root.querySelector('.sim-canvas'), start: root.querySelector('.sim-start'),
    title: root.querySelector('.sim-title'), lead: root.querySelector('.sim-lead'), controls: root.querySelector('.sim-controls'),
    read: root.querySelector('.sim-read'), plot: root.querySelector('.sim-plot'), status: root.querySelector('.sim-status'),
    hint: root.querySelector('.sim-hint'), mail: root.querySelector('[data-mail]'), more: root.querySelector('[data-sim-more]')
  };
  const g = el.canvas.getContext('2d'), pg = el.plot.getContext('2d');
  let sim = null, area = '', dpr = 1, PW = 0, PH = 0, raf = 0, last = 0, tick = 0, running = false, vals = [], lastStatus = null, pauseBtn = null, lastW = 0, wasRunning = false;

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = el.canvas.getBoundingClientRect();
    W = Math.max(260, Math.round(r.width)); H = Math.max(190, Math.round(r.height)); lastW = W;
    el.canvas.width = Math.round(W * dpr); el.canvas.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function sizePlot() {
    const r = el.plot.getBoundingClientRect(); PW = Math.max(200, Math.round(r.width)); PH = Math.max(90, Math.round(r.height));
    el.plot.width = Math.round(PW * dpr); el.plot.height = Math.round(PH * dpr); pg.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function info() {
    const r = sim.readouts ? sim.readouts() : [];
    for (let i = 0; i < vals.length; i++) if (vals[i].textContent !== r[i]) vals[i].textContent = r[i];
    if (sim.plot) sim.plot(pg, PW, PH);
    const s = sim.status ? sim.status() : ''; if (s !== lastStatus) { lastStatus = s; el.status.textContent = s; }
  }
  function paint() { sim.draw(g); info(); }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    sim.step(dt); sim.draw(g);
    if (now - tick > 180) { tick = now; info(); }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || !sim || !sim.animated) return; running = true; el.start.hidden = true; if (pauseBtn) pauseBtn.textContent = T.ui.pause; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); if (pauseBtn) pauseBtn.textContent = T.ui.resume; }

  function control(c) {
    if (c.type === 'range') {
      const wrap = document.createElement('label'); wrap.className = 'sim-range';
      wrap.innerHTML = '<span class="sim-label">' + esc(c.label) + '</span><input type="range" min="' + c.min + '" max="' + c.max + '" step="' + (c.step || 1) + '" value="' + c.value + '"><span class="sim-ends"><i>' + esc(c.lo || '') + '</i><i>' + esc(c.hi || '') + '</i></span>';
      const input = wrap.querySelector('input'); c.el = input;
      input.addEventListener('input', () => { c.on(+input.value); if (!running) paint(); });
      return wrap;
    }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sim-btn' + (c.primary ? ' primary' : ''); b.textContent = c.label; b.disabled = !!c.disabled; c.el = b;
    b.addEventListener('click', () => { c.on(); if (!running) paint(); });
    return b;
  }
  function open(a) {
    if (!AREAS.includes(a)) a = AREAS[0];
    stop(); area = a; pauseBtn = null;
    const t = T[a];
    el.tabs.forEach(tab => {
      const on = tab.dataset.simTab === a; tab.setAttribute('aria-selected', String(on));
      // on a narrow screen the tab row scrolls sideways: bring the selected tab into view without moving the page
      if (on && tab.parentElement.scrollWidth > tab.parentElement.clientWidth) tab.parentElement.scrollLeft = tab.offsetLeft - (tab.parentElement.clientWidth - tab.offsetWidth) / 2;
    });
    el.title.innerHTML = '<small>0' + (AREAS.indexOf(a) + 1) + '</small>' + esc(t.name);
    el.lead.textContent = t.lead; el.hint.textContent = t.hint;
    el.canvas.setAttribute('aria-label', t.name + ' ' + T.ui.stage);
    if (el.more) el.more.href = abs(pre + 'research.html#' + a);
    // the language switch keeps the same area open
    document.querySelectorAll('a.lang, .site-foot a[lang]').forEach(l => { if (/sim\.html/.test(l.getAttribute('href') || '')) l.hash = '#' + a; });
    if (el.mail) { el.mail.dataset.topic = t.name; document.dispatchEvent(new Event('dmse:mail')); }
    size(); sim = SIMS[a]();
    el.controls.innerHTML = '';
    const btns = document.createElement('div'); btns.className = 'sim-btns';
    for (const c of sim.controls || []) (c.type === 'range' ? el.controls : btns).appendChild(control(c));
    if (sim.animated) { pauseBtn = document.createElement('button'); pauseBtn.type = 'button'; pauseBtn.className = 'sim-btn'; pauseBtn.textContent = T.ui.pause; pauseBtn.addEventListener('click', () => { if (running) stop(); else start(); }); btns.appendChild(pauseBtn); }
    if (btns.children.length) el.controls.appendChild(btns);
    el.read.innerHTML = (sim.labels || []).map(l => '<dt>' + esc(l) + '</dt><dd></dd>').join(''); vals = [...el.read.querySelectorAll('dd')];
    el.plot.hidden = !sim.plot; if (sim.plot) sizePlot();
    el.canvas.style.cursor = sim.pointer ? 'crosshair' : 'default';
    lastStatus = null; sim.reset(); paint();
    el.start.hidden = true;
    if (sim.animated) { if (reduce) { el.start.hidden = false; if (pauseBtn) pauseBtn.textContent = T.ui.resume; } else start(); }
  }

  el.start.textContent = T.ui.start;
  el.start.addEventListener('click', start);
  el.tabs.forEach((tab, i) => {
    tab.addEventListener('click', e => { e.preventDefault(); open(tab.dataset.simTab); history.replaceState(null, '', '#' + tab.dataset.simTab); });
    tab.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); const next = el.tabs[(i + (e.key === 'ArrowRight' ? 1 : el.tabs.length - 1)) % el.tabs.length]; next.focus(); next.click(); });
  });
  el.canvas.addEventListener('pointerdown', e => { if (!sim || !sim.pointer) return; const r = el.canvas.getBoundingClientRect(); sim.pointer((e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height); paint(); });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (AREAS.includes(h) && h !== area) open(h); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { wasRunning = running; stop(); } else if (wasRunning) start(); });
  if ('ResizeObserver' in window) {
    let timer = 0;
    new ResizeObserver(() => { const w = Math.round(el.canvas.getBoundingClientRect().width); if (!sim || Math.abs(w - lastW) < 2) return; clearTimeout(timer); timer = setTimeout(() => { size(); if (sim.plot) sizePlot(); if (sim.resize) sim.resize(); else sim.reset(); paint(); }, 150); }).observe(el.canvas);
  }
  open(location.hash.slice(1));
  // a small handle for checking the models from the console
  window.dmseSim = {
    open, start, stop, get area() { return area; }, get running() { return running; }, peek: () => (sim && sim.peek ? sim.peek() : null), size: () => ({ W, H }),
    advance(seconds) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) sim.step(1 / 60); paint(); }
  };
})();
