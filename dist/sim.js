import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

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
  function areaLine(g, points, frame, color, fillColor) {
    if (points.length < 2) return;
    const bottom = frame.y0 + frame.h;
    g.save(); g.beginPath(); g.rect(frame.x0, frame.y0, frame.w, frame.h); g.clip();
    const fill = g.createLinearGradient(0, frame.y0, 0, bottom);
    fill.addColorStop(0, fillColor); fill.addColorStop(1, 'rgba(255,255,255,0)');
    g.beginPath(); points.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.lineTo(points[points.length - 1][0], bottom); g.lineTo(points[0][0], bottom); g.closePath();
    g.fillStyle = fill; g.fill();
    g.beginPath(); points.forEach(([x, y], i) => { if (i) g.lineTo(x, y); else g.moveTo(x, y); });
    g.lineWidth = 2; g.lineJoin = g.lineCap = 'round'; g.strokeStyle = color; g.stroke(); g.restore();
  }

  let W = 0, H = 0;      // stage size in CSS pixels, set by the runner before a model is created
  const SIMS = {};

  // ---------- 01 AI-guided design: Bayesian optimisation on a two-variable map ----------
  SIMS.ai = () => {
    const t = T.ai, GX = 40, GY = 25, ELL = 0.18, SF = 28, NOISE = 1.2, KAPPA = 1.5, DONE = 95;
    const off = document.createElement('canvas'); off.width = GX; off.height = GY; const og = off.getContext('2d');
    const M = { l: 44, r: 14, t: 14, b: 36 };
    let peaks, fmax, opt, obs, sug, tries, best;
    let meanGrid, uncertaintyGrid, revision = 0;
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
      meanGrid = new Float32Array(GX * GY); uncertaintyGrid = new Float32Array(GX * GY);
      for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
        const x = (gx + 0.5) / GX, y = (gy + 0.5) / GY; let mean = m, fresh = true;
        for (let i = 0; i < n; i++) { const d2 = (x - obs[i].x) ** 2 + (y - obs[i].y) ** 2; if (d2 < 0.0016) fresh = false; ks[i] = SF * SF * Math.exp(-d2 / (2 * ELL * ELL)); mean += ks[i] * al[i]; }
        let vv = 0; for (let i = 0; i < n; i++) { let s = ks[i]; for (let k = 0; k < i; k++) s -= L[i][k] * v[k]; v[i] = s / L[i][i]; vv += v[i] * v[i]; }
        const sd = Math.sqrt(Math.max(SF * SF - vv, 0)), u = mean + KAPPA * sd;
        if (fresh && u > bestU) { bestU = u; sug = { x, y }; }
        meanGrid[gy * GX + gx] = mean; uncertaintyGrid[gy * GX + gx] = clamp(sd / SF, 0, 1);
        // colour = predicted performance, paler where the model is unsure
        const c = ramp(mean / 100), w = clamp(sd / SF, 0, 1) * 0.82, p = ((GY - 1 - gy) * GX + gx) * 4;
        img.data[p] = c[0] + (255 - c[0]) * w; img.data[p + 1] = c[1] + (255 - c[1]) * w; img.data[p + 2] = c[2] + (255 - c[2]) * w; img.data[p + 3] = 255;
      }
      og.putImageData(img, 0, 0); revision++;
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
      animated: false, labels: t.labels, controls, reset, draw, step() {}, resize() {},
      experiment: (x, y) => run(x, y),
      view: () => ({ width: W, height: H, cols: GX, rows: GY, mean: meanGrid, uncertainty: uncertaintyGrid, obs, sug, opt, best, DONE, revision }),   // the map keeps its experiments when the stage is resized
      pointer(px, py) { const pw = W - M.l - M.r, ph = H - M.t - M.b; if (px < M.l || px > M.l + pw || py < M.t || py > M.t + ph) return; run((px - M.l) / pw, 1 - (py - M.t) / ph); },
      readouts: () => [tries + t.unit, Math.round(best) + ' / 100'],
      status: () => best >= DONE ? t.found.replace('{n}', tries) : t.go,
      peek: () => ({ tries, best, sug, opt, n: obs.length })
    };
  };
  // ---------- 02 Synthesis: cluster-cluster aggregation on a lattice (sol to gel), then drying ----------
  SIMS.synthesis = (width = W, height = H) => {
    // Keep the physical lattice and particle identities through ordinary resizes.
    let W = width, H = height, generation = 0;
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
      generation++;
      cs = W < 520 ? 5 : 6; cols = Math.floor(W / cs); rows = Math.floor(H / cs);
      grid = new Int32Array(cols * rows).fill(-1); list = []; byId = [];
      N = Math.round(phi * cols * rows);
      for (let placed = 0; placed < N;) { const i = (Math.random() * cols * rows) | 0; if (grid[i] !== -1) continue; const c = { id: placed, cells: [i], ids: [placed], n: 1, dead: false }; grid[i] = c.id; list.push(c); byId.push(c); placed++; }
      state = 'sol'; big = null; dry = null; dryT = 0; k = 1; wet = 1; clock = 0; gelClock = 0; frozen = false; pace = 0.08; measure(); dryButtons(false);
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
      const bc = b.cells; for (let j = 0; j < bc.length; j++) { grid[bc[j]] = a.id; a.cells.push(bc[j]); a.ids.push(b.ids[j]); }
      a.n += b.n; b.dead = true; b.cells = []; b.ids = []; return a;
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
      resize(width = W, height = H) {
        if (Math.abs(width / W - 1) >= .25 || Math.abs(height / H - 1) >= .25) { W = width; H = height; reset(); }
      },
      // Cells and ids are parallel arrays. The view must not mutate model data.
      view: () => ({ width: W, height: H, clusters: list, cols, rows, cs, N, bigId: big ? big.id : -1, time: clock, state, dry, dryT, k, wet, generation }),
      readouts: () => [t.states[state], pct(1 - (N / (cols * rows)) / (k * k)), t.pore.replace('{v}', (pore * k).toFixed(1))],
      status: () => t.st[state],
      peek: () => ({ state, clusters: list.length, N, big: big ? big.n : 0, pore, clock, k })
    };
  };

  // ---------- 03 Adsorption and separation: a CO2/N2 mixture through a bed of adsorption sites ----------
  function co2(g, x, y, a) { const cx = Math.cos(a) * 5, cy = Math.sin(a) * 5; g.fillStyle = '#c4513b'; dot(g, x - cx, y - cy, 3.1); g.fill(); dot(g, x + cx, y + cy, 3.1); g.fill(); g.fillStyle = '#3b4048'; dot(g, x, y, 2.9); g.fill(); }
  function n2(g, x, y, a) { const cx = Math.cos(a) * 2.6, cy = Math.sin(a) * 2.6; g.fillStyle = '#3d6fd6'; dot(g, x - cx, y - cy, 3); g.fill(); dot(g, x + cx, y + cy, 3); g.fill(); }
﻿  SIMS.capture = (width = W, height = H) => {
    // Project a stable physical domain into either renderer. A major width change
    // starts a correctly scaled sample; small layout changes keep its history.
    let W = width, H = height;
    const t = T.capture, FEED = 0.3;
    let serial = 0;
    let mol, sites, nc, nr, aff = 0.65, regen, acc, time, win, hist, got, x0, x1, RATE, DRIFT, lastHist;
    const controls = [
      { type: 'range', label: t.cAff, lo: t.lo, hi: t.hi, min: 0, max: 100, step: 1, value: 65, on(v) { aff = v / 100; } },
      { type: 'button', label: t.bRegen, on() { if (regen <= 0) regen = 3.2; } }
    ];
    function add(x) { mol.push({ id: serial++, x: x === undefined ? -8 : x, y: rnd(8, H - 8), vx: DRIFT, vy: 0, c: Math.random() < FEED, a: rnd(0, TAU), w: rnd(-2, 2), s: null, cool: 0, rec: false }); }
    function reset() {
      x0 = W * 0.25; x1 = W * 0.75;
      nc = W < 520 ? 4 : 5; nr = 6; sites = [];
      for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) sites.push({ x: x0 + (i + 0.5) * (x1 - x0) / nc, y: (j + 0.5) * H / nr, m: null });
      // The lower molecular flux and 24/30-site bed keep individual molecules
      // readable while retaining the finite-capacity breakthrough timescale.
      RATE = W < 520 ? 6.2 : 8.5; DRIFT = (W + 20) / (W < 520 ? 6.6 : 8.2);
      serial = 0; mol = []; win = []; hist = []; got = 0; regen = 0; acc = 0; time = 0; lastHist = 0;
      // gas already on its way in, so the screen does not start empty
      const n = Math.round(RATE * x0 / DRIFT); for (let i = 0; i < n; i++) add(rnd(0, x0));
    }
    const frac = () => { if (!win.length) return 0; let s = 0; for (const v of win) s += v; return s / win.length; };
    const occupied = () => { let n = 0; for (const s of sites) if (s.m) n++; return n / sites.length; };
    function step(dt) {
      time += dt; const on = regen > 0; if (on) regen -= dt;
      if (!on) { acc += RATE * dt; while (acc >= 1) { acc--; add(); } }
      // stronger affinity: sticks more readily and stays much longer; during regeneration everything lets go
      const koff = on ? 2.4 : 0.45 * Math.exp(-8 * aff), pon = 1 - Math.exp(-(14 * aff * aff + 0.15) * dt), sq = Math.sqrt(dt);
      for (let i = mol.length - 1; i >= 0; i--) {
        const m = mol[i];
        if (m.s) {
          if (Math.random() < koff * dt) { m.s.m = null; m.s = null; m.cool = 0.7; m.rec = on; m.vx = DRIFT * 0.5; m.vy = rnd(-30, 30); }
          else { m.a += m.w * 0.15 * dt; continue; }
        }
        m.cool -= dt; m.a += m.w * dt;
        m.vx += (DRIFT - m.vx) * 1.6 * dt + gauss() * DRIFT * .36 * sq; m.vy += -m.vy * 1.6 * dt + gauss() * DRIFT * .36 * sq;
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.y < 6) { m.y = 6; m.vy = Math.abs(m.vy); } else if (m.y > H - 6) { m.y = H - 6; m.vy = -Math.abs(m.vy); }
        if (m.x < -12) m.x = -12;
        // Regenerated gas goes to the recovery stream, so it cannot re-adsorb.
        if (m.c && !m.rec && !on && m.cool <= 0 && m.x > x0 - 12 && m.x < x1 + 12) {
          for (let q = 0; q < sites.length; q++) { const s = sites[q]; if (s.m) continue; const dx = s.x - m.x, dy = s.y - m.y; if (dx * dx + dy * dy < (H / nr * .72) ** 2 && Math.random() < pon) { s.m = m; m.s = s; m.x = s.x; m.y = s.y; break; } }
        }
        if (m.x > W + 12) { if (m.rec) got++; else if (!on) { win.push(m.c ? 1 : 0); if (win.length > 35) win.shift(); } mol.splice(i, 1); }
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
      areaLine(g, hist.map(q => [X(q.t), Y(q.f)]), p, '#c4513b', 'rgba(196,81,59,.15)');
    }
    return {
      animated: true, labels: t.labels, controls, reset, step, draw, plot,
      resize(width, height) {
        if (width > 0 && height > 0 && Math.abs(width / W - 1) >= .25) { W = width; H = height; reset(); }
      },
      view: () => ({ width: W, height: H, mol, sites, nc, nr, time, regen }),
      readouts: () => [pct(frac()), pct(occupied()), got + t.unit],
      status: () => regen > 0 ? t.stRegen : occupied() > 0.95 ? t.stFull : '',
      peek: () => ({ time, mol: mol.length, sites: sites.length, occ: occupied(), frac: frac(), got, regen })
    };
  };

  // ---------- 04 Catalysis: hydrogen evolution on a row of surface sites (Sabatier volcano) ----------
  SIMS.catalysis = (width = W, height = H) => {
    let W = width, H = height, cols, nextId = 0;
    const t = T.catalysis, F = 0.9, BINS = 20;
    let n, R, xs, y0, top, occ, lock, pro, bub, s = 0, ev, time, bins, settle, sweep = -1, sweepT = 0, sprite;
    const pads = () => 1 / (1 + Math.exp(-5.5 * s)), kdes = () => 0.9 * Math.exp(-4.4 * s);
    const controls = [
      { type: 'range', label: t.cBind, lo: t.lo, hi: t.hi, min: 0, max: 100, step: 5, value: 50, on(v) { s = v / 50 - 1; settle = 0; if (sweep >= 0) stopSweep(); } },
      { type: 'button', label: t.bSweep, on() { if (sweep >= 0) stopSweep(); else { sweep = 0; sweepT = 0; setS(0); controls[1].el.textContent = t.bStop; } } }
    ];
    function setS(bin) { s = bin / (BINS / 2) - 1; settle = 0; if (controls[0].el) controls[0].el.value = String(bin * 100 / BINS); }
    function stopSweep() { sweep = -1; if (controls[1].el) controls[1].el.textContent = t.bSweep; }
    const free = any => ({ id: ++nextId, x: rnd(6, W - 6), y: any ? rnd(8, Math.max(20, top - 30)) : -6, vx: rnd(-20, 20), vy: rnd(0, 30), mode: 0, k: -1, t: 0 });
    function reset() {
      cols = W < 520 ? 6 : 8; n = cols * 4; nextId = 0;
      // The legacy 2D cross-section flattens the row-major surface sites.
      R = Math.min(18, (W - 12) / (2 * n + 1)); y0 = H - Math.max(52, R * 3.3); top = y0 - R - 6;
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
      for (let i = 0; i < n - 1; i++) if (i % cols !== cols - 1 && occ[i] && occ[i + 1] && Math.random() < kd * dt) { occ[i] = occ[i + 1] = 0; bub.push({ id: ++nextId, k: i, born: time, age: 0, originX: (xs[i] + xs[i + 1]) / 2, x: (xs[i] + xs[i + 1]) / 2, y: y0 - R - 6, vy: -rnd(50, 80), a: rnd(0, TAU), ph: rnd(0, TAU) }); if (bub.length > 32) bub.shift(); ev.push(time); made++; i++; }
      while (ev.length && time - ev[0] > 4) ev.shift();
      for (let j = bub.length - 1; j >= 0; j--) { const b = bub[j]; b.age += dt; b.y += b.vy * dt; b.ph += 3 * dt; b.x += Math.sin(b.ph) * 12 * dt; b.a += dt; if (b.y < -12) bub.splice(j, 1); }
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
      areaLine(g, pts.map(q => [X(q[0]), Y(q[1])]), p, TEAL, 'rgba(14,124,136,.15)');
      for (const q of pts) { dot(g, X(q[0]), Y(q[1]), 3.2); g.fillStyle = TEAL; g.fill(); }
    }
    return {
      animated: true, labels: t.labels, controls, reset, step, draw, plot,
      resize(width = W, height = H) {
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || Math.abs(width / W - 1) < .25) return false;
        W = width; H = height; reset(); return true;
      },
      view: () => ({ width: W, height: H, cols, rows: 4, n, R, xs, y0, top, occ, pro, bub, s, time }),
      readouts: () => [t.rate.replace('{v}', rate().toFixed(1)), pct(coverage())],
      status: () => sweep >= 0 ? t.stSweep : '',
      peek: () => ({ s, n, rate: rate(), cov: coverage(), sweep, bins: bins.map(b => b.t > 1.2 ? +(b.n / b.t).toFixed(2) : null), pro: pro.length })
    };
  };

  // ---------- 05 Electrochemistry: ions forming a double layer on flat or porous electrodes ----------
  SIMS.energy = (width = W, height = H) => {
    let W = width, H = height;
    const t = T.energy, r = 4.2;
    let MAXP = W < 520 ? 4 : 6, generation = 0;
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
      generation++;
      eW = Math.round(W * 0.27); d = Math.round(eW * 0.8); hs = 22; pores = Math.min(pores, MAXP);
      cy = []; for (let i = 0; i < pores; i++) cy.push(H * (i + 1) / (pores + 1));
      sitesL = build(false); sitesR = build(true); S = sitesL.length; flat = Math.floor((H - 14) / 10.5) + 1;
      // enough ions to fill every site, plus some that always stay in the bulk electrolyte
      const n = Math.max(40, Math.round(S * 1.1)) + (W < 520 ? 22 : 46); ions = [];
      for (let i = 0; i < 2 * n; i++) { let x, y, q = 0; do { x = rnd(eW - d + 6, W - eW + d - 6); y = rnd(6, H - 6); } while (blocked(x, y) && ++q < 300); ions.push({ id: i, x, y, q: i < n ? 1 : -1, s: null }); }
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
      areaLine(g, hist.map(q => [X(q.t), Y(q.q)]), p, TEAL, 'rgba(14,124,136,.15)');
    }
    return {
      animated: true, labels: t.labels, controls, reset, step, draw, plot,
      resize(width = W, height = H) {
        if (Math.abs(width / W - 1) < .25 && Math.abs(height / H - 1) < .25) return;
        W = width; H = height; MAXP = W < 520 ? 4 : 6; controls[1].max = MAXP;
        pores = Math.min(pores, MAXP); controls[1].value = pores;
        if (controls[1].el) { controls[1].el.max = String(MAXP); controls[1].el.value = String(pores); }
        reset();
      },
      view: () => ({ width: W, height: H, V, pores, eW, d, hs, cy, sitesL, sitesR, S, flat, ions, time, r, generation }),
      readouts: () => [t.pairs.replace('{v}', Math.round(stored())), t.area.replace('{v}', (S / flat).toFixed(1))],
      status: () => V < 0.02 ? t.st0 : '',
      peek: () => ({ V, pores, S, flat, stored: stored(), ions: ions.length, time })
    };
  };
  // ---------- shared illustration studio ----------
  // All 3D views share this palette, narrow perspective camera, room reflections
  // and warm side light. No postprocessing or independent animation clock.
  // A view only reads model state; visual offsets use a deterministic hash.
  const STUDIO = Object.freeze({
    background: 0xeeeae4, ivory: 0xe0d7c5, silver: 0xa5b1b2,
    metal: 0x4f8589, facet: 0xa3bcbc, carbon: 0x4e5153,
    oxygen: 0xb84f47, nitrogen: 0x477cad,
    exposure: 1.08, smoothing: 0.14
  });
  const visualHash = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

  // Fit projected corners, rather than relying on a particular viewport aspect.
  // This pure camera calculation is also exercised by the Node geometry checks.
  function fitStudioCamera(camera, profile, width, height) {
    camera.aspect = width / height; camera.updateProjectionMatrix();
    const target = new THREE.Vector3(...profile.target), direction = new THREE.Vector3(...profile.eye).normalize();
    const b = profile.bounds, corners = [];
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) for (const z of [b[2], b[5]]) corners.push(new THREE.Vector3(x, y, z));
    const fill = width < 520 && profile.mobileFill ? profile.mobileFill : profile.fill;
    const projected = new THREE.Vector3();
    function fits(distance) {
      camera.position.copy(target).addScaledVector(direction, distance); camera.lookAt(target); camera.updateMatrixWorld();
      for (const corner of corners) {
        projected.copy(corner).project(camera);
        if (Math.abs(projected.x) > fill[0] || Math.abs(projected.y) > fill[1] || projected.z > 1) return false;
      }
      return true;
    }
    let low = 8, high = 100;
    for (let i = 0; i < 28; i++) { const mid = (low + high) / 2; if (fits(mid)) high = mid; else low = mid; }
    fits(high); return high;
  }

  function makeStudio(host, onLost) {
    // Probe before constructing Three: unsupported WebGL is an ordinary 2D path.
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'low-power' });
    if (!context) return null;
    let renderer, environment;
    const scene = new THREE.Scene(), geometries = new Set(), materials = new Set(), textures = new Set();
    const ownGeometry = geometry => (geometries.add(geometry), geometry);
    const ownMaterial = material => (materials.add(material), material);
    const ownTexture = texture => (textures.add(texture), texture);
    const camera = new THREE.PerspectiveCamera(22, 1, .1, 160);
    let stageWidth = 0, stageHeight = 0, floor, contact, groundMaterial, hemisphere, key, fill;
    let profile = { bounds: [-4, -2.6, -1.2, 4, 2.6, 1.2], target: [0, 0, 0], eye: [4.2, 3, 14], fill: [.66, .78], mobileFill: [.82, .76], floorY: -2.66, shadow: [8.8, 3.3, .16] };
    function texture(size, pixel) {
      const data = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) data.set(pixel(x / (size - 1), y / (size - 1)), (y * size + x) * 4);
      const map = ownTexture(new THREE.DataTexture(data, size, size));
      map.colorSpace = THREE.SRGBColorSpace; map.minFilter = map.magFilter = THREE.LinearFilter; map.needsUpdate = true; return map;
    }
    function frameCamera() {
      if (!stageWidth || !stageHeight) return;
      const distance = fitStudioCamera(camera, profile, stageWidth, stageHeight);
      // Profiles opt in; the approved capture/catalysis studio keeps its values.
      renderer.toneMappingExposure = profile.exposure ?? STUDIO.exposure;
      hemisphere.intensity = profile.hemisphere ?? 1.9;
      key.intensity = profile.key ?? 2.6; fill.intensity = profile.fillLight ?? .8;
      scene.environmentIntensity = profile.environmentIntensity ?? .65;
      scene.fog = profile.fog === false ? null : new THREE.Fog(profile.background ?? STUDIO.background, distance - .5, distance + 21);
      if (profile.background !== undefined) scene.background = new THREE.Color(profile.background);
      if (profile.groundColor !== undefined) {
        if (!groundMaterial) groundMaterial = ownMaterial(new THREE.MeshStandardMaterial({ roughness: .98, metalness: 0 }));
        groundMaterial.color.setHex(profile.groundColor); floor.material = groundMaterial;
      }
      floor.position.y = profile.floorY;
      contact.position.y = profile.floorY + .015;
      contact.scale.set(profile.shadow[0], profile.shadow[1], 1); contact.material.opacity = profile.shadow[2];
    }
    const dispose = () => {
      canvas.removeEventListener('webglcontextlost', lost);
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose());
      scene.traverse(object => { if (object.isInstancedMesh) object.dispose(); if (object.shadow) object.shadow.dispose(); });
      if (environment) environment.dispose();
      if (renderer) { renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); }
      else context.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
    function lost(event) { event.preventDefault(); onLost(); }
    try {
      renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = STUDIO.exposure;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      // Static specimen shadows are cached; the soft contact footprint is a tiny texture.
      renderer.shadowMap.autoUpdate = false;
      scene.background = texture(64, (x, y) => {
        const light = Math.exp(-((x - .43) ** 2 * 3 + (y - .55) ** 2 * 2.4));
        return [230 + light * 15, 226 + light * 15, 219 + light * 16, 255];
      });
      const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
      // No extra scene blur: PMREM already filters each roughness level.
      try { environment = pmrem.fromScene(room, 0, .1, 60); }
      finally { room.dispose(); pmrem.dispose(); }
      scene.environment = environment.texture;
      scene.environmentIntensity = .65;
      hemisphere = new THREE.HemisphereLight(0xfffaf2, 0xc6c2b9, 1.9); scene.add(hemisphere);
      key = new THREE.DirectionalLight(0xfff5e7, 2.6);
      key.position.set(-5, 9, 7); key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -7, right: 7, top: 6, bottom: -6, near: .1, far: 30 });
      key.shadow.bias = -.0006; key.shadow.normalBias = .045;
      scene.add(key);
      fill = new THREE.DirectionalLight(0xe2edf2, .8); fill.position.set(5, 3, -4); scene.add(fill);
      floor = new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(200, 200)),
        ownMaterial(new THREE.ShadowMaterial({ color: 0x706a62, opacity: .15, depthWrite: false })));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -2.66; floor.receiveShadow = true; scene.add(floor);
      const contactMap = texture(64, (x, y) => {
        const r = ((x - .5) ** 2 + (y - .5) ** 2) * 4;
        return [89, 90, 84, 255 * Math.exp(-r * 4.5) * Math.max(0, 1 - r)];
      });
      contact = new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(1, 1)), ownMaterial(new THREE.MeshBasicMaterial({ map: contactMap, transparent: true, opacity: .16, depthWrite: false, toneMapped: false })));
      contact.rotation.x = -Math.PI / 2; contact.renderOrder = 1; scene.add(contact);
      canvas.className = 'sim-webgl'; canvas.setAttribute('aria-hidden', 'true');
      canvas.addEventListener('webglcontextlost', lost); host.appendChild(canvas);
      return {
        scene, camera, renderer, ownGeometry, ownMaterial, ownTexture, dispose,
        size() { return { width: stageWidth, height: stageHeight }; },
        project(point) {
          const p = point.clone().project(camera);
          return { x: (p.x + 1) / 2, y: (1 - p.y) / 2, visible: Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && p.z >= -1 && p.z <= 1 };
        },
        setView(config) { profile = { ...profile, ...config, mobileFill: config.mobileFill || config.fill || profile.mobileFill }; frameCamera(); renderer.shadowMap.needsUpdate = true; },
        resize(width, height) {
          renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
          renderer.setSize(width, height, false);
          stageWidth = width; stageHeight = height; frameCamera();
        },
        render() { renderer.render(scene, camera); }
      };
    } catch (error) { dispose(); return null; }
  }

  function captureView(studio) {
    const { scene, ownGeometry, ownMaterial } = studio;
    studio.setView({ bounds: [-3.9, -2.55, -1.15, 3.9, 2.55, 1.15], target: [0, 0, 0], eye: [4.2, 3, 14], fill: [.66, .78], mobileFill: [.82, .76], floorY: -2.64, shadow: [8.5, 3.2, .17] });
    const sphere = ownGeometry(new THREE.SphereGeometry(1, 16, 10));
    const bead = ownGeometry(new THREE.SphereGeometry(1, 10, 8));
    const cylinder = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 10));
    const octahedron = ownGeometry(new THREE.OctahedronGeometry(1));
    const material = (color, metalness, roughness) => ownMaterial(new THREE.MeshStandardMaterial({ color, metalness, roughness }));
    const mats = {
      metal: material(STUDIO.metal, .62, .32), silver: material(STUDIO.silver, .72, .34),
      facet: material(STUDIO.facet, .35, .53), ivory: material(STUDIO.ivory, .12, .46),
      carbon: material(STUDIO.carbon, .24, .42), oxygen: material(STUDIO.oxygen, .24, .34),
      nitrogen: material(STUDIO.nitrogen, .28, .38), bond: material(0xf5f2e9, .05, .58),
      boundOxygen: material(0xba4941, .27, .28), boundCarbon: material(0x44494b, .3, .32)
    };
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    const direction = new THREE.Vector3(), middle = new THREE.Vector3();
    const groups = new Map();
    function atom(kind, point, radius, geometry = radius < .15 ? bead : sphere) {
      const key = kind + (geometry === octahedron ? '-facet' : '-atom');
      if (!groups.has(key)) groups.set(key, { geometry, material: mats[kind], matrices: [] });
      dummy.position.copy(point); dummy.quaternion.identity(); dummy.scale.setScalar(radius); dummy.updateMatrix();
      groups.get(key).matrices.push(dummy.matrix.clone());
    }
    function rod(kind, a, b, radius) {
      const key = kind + '-rod';
      if (!groups.has(key)) groups.set(key, { geometry: cylinder, material: mats[kind], matrices: [] });
      direction.subVectors(b, a); dummy.position.copy(a).add(b).multiplyScalar(.5);
      dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      dummy.scale.set(radius, direction.length(), radius); dummy.updateMatrix();
      groups.get(key).matrices.push(dummy.matrix.clone());
    }
    const xs = [-3.5, -3.5 / 3, 3.5 / 3, 3.5], ys = [-2.15, 0, 2.15], zs = [-.7, .7];
    const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
    function linker(a, b) {
      const axis = b.clone().sub(a).normalize(), mid = a.clone().add(b).multiplyScalar(.5);
      const side = new THREE.Vector3().crossVectors(axis, Math.abs(axis.z) > .9 ? axes[1] : axes[2]).normalize();
      const ring = [], radius = .27;
      for (let i = 0; i < 6; i++) {
        const angle = i * TAU / 6;
        const p = mid.clone().addScaledVector(axis, Math.cos(angle) * radius).addScaledVector(side, Math.sin(angle) * radius);
        ring.push(p); atom('carbon', p, .074);
        if (i !== 0 && i !== 3) {
          const h = mid.clone().add(p.clone().sub(mid).multiplyScalar(1.53));
          rod('ivory', p, h, .022); atom('ivory', h, .048);
        }
      }
      for (let i = 0; i < 6; i++) rod('carbon', ring[i], ring[(i + 1) % 6], .035);
      rod('ivory', a.clone().addScaledVector(axis, .28), ring[3], .048);
      rod('ivory', ring[0], b.clone().addScaledVector(axis, -.28), .048);
    }
    for (let x = 0; x < xs.length; x++) for (let y = 0; y < ys.length; y++) for (let z = 0; z < zs.length; z++) {
      const p = new THREE.Vector3(xs[x], ys[y], zs[z]);
      atom('facet', p, .37, octahedron); atom('metal', p, .205);
      for (const axis of axes) for (const sign of [-1, 1]) {
        const tip = p.clone().addScaledVector(axis, sign * .37);
        atom('silver', tip, .09); rod('silver', p, tip, .033);
      }
      if (x < xs.length - 1) linker(p, new THREE.Vector3(xs[x + 1], ys[y], zs[z]));
      if (y < ys.length - 1) linker(p, new THREE.Vector3(xs[x], ys[y + 1], zs[z]));
      if (z < zs.length - 1) linker(p, new THREE.Vector3(xs[x], ys[y], zs[z + 1]));
    }
    for (const group of groups.values()) {
      const mesh = new THREE.InstancedMesh(group.geometry, group.material, group.matrices.length);
      group.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.instanceMatrix.needsUpdate = true; mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.computeBoundingSphere(); scene.add(mesh);
    }
    groups.clear();

    // Batches grow only if the model needs them. No per-molecule scene nodes.
    let capacity = 0, batches = null, lastTime = -1;
    const positions = new WeakMap(), anchors = new WeakMap();
    function batch(geometry, mat, count) {
      const mesh = new THREE.InstancedMesh(geometry, mat, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
      mesh.count = 0; scene.add(mesh); return mesh;
    }
    function reserve(count) {
      if (batches && count <= capacity) return;
      capacity = Math.max(128, Math.ceil(count / 64) * 64);
      if (batches) for (const mesh of Object.values(batches)) { scene.remove(mesh); mesh.dispose(); }
      batches = {
        oxygen: batch(sphere, mats.oxygen, capacity * 2), carbon: batch(sphere, mats.carbon, capacity),
        nitrogen: batch(sphere, mats.nitrogen, capacity * 2), bond: batch(cylinder, mats.bond, capacity * 10),
        boundOxygen: batch(sphere, mats.boundOxygen, capacity * 2), boundCarbon: batch(sphere, mats.boundCarbon, capacity)
      };
    }
    function put(mesh, point, radius) {
      dummy.position.copy(point); dummy.quaternion.identity(); dummy.scale.setScalar(radius); dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++, dummy.matrix);
    }
    const target = new THREE.Vector3(), end = new THREE.Vector3(), vector = new THREE.Vector3(), attach = new THREE.Vector3(), tip = new THREE.Vector3();
    const quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
    function siteAnchor(s, index, state) {
      if (anchors.has(s)) return anchors.get(s);
      const column = index % state.nc, row = Math.floor(index / state.nc);
      const x = Math.round(column / Math.max(1, state.nc - 1) * (xs.length - 1));
      const y = clamp(2 - Math.floor(row / 2), 0, 2), z = row % 2;
      const node = new THREE.Vector3(xs[x], ys[y], zs[z]);
      // Extra capacity sits on the opposite side of a node, never on top of it.
      const side = state.nc > 4 && column === 2 ? -1 : 1;
      const angle = side * -.5;
      const point = node.clone().add(new THREE.Vector3(side * .54, y === 0 ? .48 : -.48, .5));
      const value = { node, point, angle }; anchors.set(s, value); return value;
    }
    return {
      draw(state, { snap: forceSnap = false } = {}) {
        reserve(state.mol.length);
        for (const mesh of Object.values(batches)) mesh.count = 0;
        const dt = state.time - lastTime, snap = forceSnap || lastTime < 0 || dt > .25 || dt < 0;
        const blend = snap ? 1 : 1 - Math.exp(-Math.max(0, dt) / STUDIO.smoothing);
        for (const m of state.mol) {
          let anchor = null;
          if (m.s) {
            anchor = siteAnchor(m.s, state.sites.indexOf(m.s), state); target.copy(anchor.point);
            euler.set(.12, -.1, anchor.angle);
          } else {
            target.set((m.x / state.width - .5) * 12.3, (.5 - m.y / state.height) * 4.5,
              (visualHash(m.id + 7) - .5) * 1.45 + Math.sin(state.time * .6 + m.id) * .05);
            euler.set(visualHash(m.id + 3) * .7, m.a * .35, m.a);
          }
          quaternion.setFromEuler(euler);
          let p = positions.get(m);
          if (!p) { p = { point: target.clone(), rotation: quaternion.clone() }; positions.set(m, p); }
          else { p.point.lerp(target, blend); p.rotation.slerp(quaternion, blend); }
          vector.set(m.c ? (anchor ? .225 : .19) : .12, 0, 0).applyQuaternion(p.rotation);
          if (m.c) {
            put(anchor ? batches.boundCarbon : batches.carbon, p.point, anchor ? .151 : .124);
            put(anchor ? batches.boundOxygen : batches.oxygen, end.copy(p.point).add(vector), anchor ? .166 : .14);
            put(anchor ? batches.boundOxygen : batches.oxygen, end.copy(p.point).sub(vector), anchor ? .166 : .14);
          } else {
            put(batches.nitrogen, end.copy(p.point).add(vector), .13);
            put(batches.nitrogen, end.copy(p.point).sub(vector), .13);
          }
          // Quiet dashed coordination cue, tied to actual occupied sites only.
          if (anchor) {
            for (const side of [-1, 1]) {
              attach.copy(anchor.node).addScaledVector(vector, side * 1.2); attach.z += .15;
              tip.copy(p.point).addScaledVector(vector, side); direction.subVectors(tip, attach);
              for (let i = 0; i < 5; i++) {
                middle.copy(attach).addScaledVector(direction, .19 + i * .12);
                dummy.position.copy(middle); dummy.quaternion.setFromUnitVectors(up, end.copy(direction).normalize());
                dummy.scale.set(.017, direction.length() * .065, .017); dummy.updateMatrix();
                batches.bond.setMatrixAt(batches.bond.count++, dummy.matrix);
              }
            }
          }
        }
        lastTime = state.time;
        for (const mesh of Object.values(batches)) mesh.instanceMatrix.needsUpdate = true;
        studio.render();
      }
    };
  }

  function synthesisView(studio) {
    const { scene, ownGeometry, ownMaterial, ownTexture } = studio;
    // Clear thin-walled glass on a quiet neutral worktop. The generous specimen
    // area, blue particles and shallow relief carry the scene, not a white rim.
    const glass = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xc8d4d7, roughness: .09, metalness: .025, transparent: true, opacity: .12, depthWrite: false, side: THREE.DoubleSide }));
    const rimMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xdce5e6, roughness: .075, metalness: .08, transparent: true, opacity: .26, depthWrite: false }));
    const liquidMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x8fbfda, roughness: .19, metalness: 0, transparent: true, opacity: .3, depthWrite: false }));
    const particleMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .56, metalness: .025 }));
    const neckMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x3c86b0, roughness: .63, metalness: .015 }));
    function texture(width, height, pixel) {
      const bytes = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) bytes.set(pixel(x / (width - 1), y / (height - 1)), (y * width + x) * 4);
      const map = ownTexture(new THREE.DataTexture(bytes, width, height));
      map.colorSpace = THREE.SRGBColorSpace; map.minFilter = map.magFilter = THREE.LinearFilter; map.needsUpdate = true; return map;
    }
    const reflectionMap = texture(64, 32, (x, y) => {
      const edge = Math.sin(Math.PI * x) ** 2 * Math.sin(Math.PI * y) ** 2;
      const stripe = Math.exp(-(((y - .28 - x * .14) / .055) ** 2)) + .4 * Math.exp(-(((y - .44 - x * .14) / .045) ** 2));
      return [255, 255, 255, 255 * Math.min(1, stripe) * edge];
    });
    const reflectionMaterial = ownMaterial(new THREE.MeshBasicMaterial({ map: reflectionMap, transparent: true, opacity: .24, depthWrite: false, toneMapped: false }));
    const shadowMap = texture(32, 32, (x, y) => {
      const r = ((x - .5) ** 2 + (y - .5) ** 2) * 4;
      return [255, 255, 255, 255 * Math.exp(-r * 4.2) * Math.max(0, 1 - r)];
    });
    const shadowMaterial = ownMaterial(new THREE.MeshBasicMaterial({ color: 0x46535b, map: shadowMap, transparent: true, opacity: .3, depthWrite: false, toneMapped: false }));
    glass.forceSinglePass = true;
    function roundedRect(width, depth, radius, path = new THREE.Shape()) {
      const x = -width / 2, y = -depth / 2;
      path.moveTo(x + radius, y); path.lineTo(x + width - radius, y);
      path.quadraticCurveTo(x + width, y, x + width, y + radius);
      path.lineTo(x + width, y + depth - radius);
      path.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
      path.lineTo(x + radius, y + depth);
      path.quadraticCurveTo(x, y + depth, x, y + depth - radius);
      path.lineTo(x, y + radius); path.quadraticCurveTo(x, y, x + radius, y);
      return path;
    }
    function extrusion(shape, depth, bevel = false) {
      const geometry = ownGeometry(new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: bevel, bevelSegments: 2, bevelSize: .025, bevelThickness: .018, curveSegments: 8 }));
      geometry.rotateX(-Math.PI / 2); return geometry;
    }
    const dish = new THREE.Group(); dish.name = 'synthesis-glass-cell'; scene.add(dish);
    const wallShape = roundedRect(8.56, 5.6, .28);
    wallShape.holes.push(roundedRect(8.38, 5.42, .2, new THREE.Path()));
    const walls = new THREE.Mesh(extrusion(wallShape, .56), glass);
    walls.name = 'synthesis-glass-walls'; walls.position.y = -.27; walls.renderOrder = 4; dish.add(walls);
    const lip = new THREE.Mesh(extrusion(wallShape, .038, true), rimMaterial);
    lip.name = 'synthesis-glass-rim'; lip.position.y = .29; lip.renderOrder = 5; dish.add(lip);
    const base = new THREE.Mesh(extrusion(roundedRect(8.56, 5.6, .28), .065), glass);
    base.name = 'synthesis-glass-base'; base.position.y = -.335; base.renderOrder = 0; dish.add(base);
    const liquid = new THREE.Mesh(extrusion(roundedRect(8.32, 5.36, .18), 1), liquidMaterial);
    liquid.name = 'synthesis-solution'; liquid.position.y = -.255; liquid.renderOrder = 1; dish.add(liquid);
    const reflectionGeometry = ownGeometry(new THREE.PlaneGeometry(8.24, 5.28)); reflectionGeometry.rotateX(-Math.PI / 2);
    const reflection = new THREE.Mesh(reflectionGeometry, reflectionMaterial);
    reflection.name = 'synthesis-water-reflection'; reflection.renderOrder = 2; dish.add(reflection);
    const waterlinePoints = roundedRect(8.32, 5.36, .18).getPoints(16).map(p => new THREE.Vector3(p.x, 0, -p.y));
    const waterline = new THREE.LineLoop(ownGeometry(new THREE.BufferGeometry().setFromPoints(waterlinePoints)),
      ownMaterial(new THREE.LineBasicMaterial({ color: 0x5089ad, transparent: true, opacity: .48, depthWrite: false })));
    waterline.name = 'synthesis-waterline'; waterline.renderOrder = 3; dish.add(waterline);
    let layoutColumns = 0, layoutRows = 0;
    function layout(cols, rows) {
      if (cols === layoutColumns && rows === layoutRows) return;
      layoutColumns = cols; layoutRows = rows;
      // The dish follows the physical lattice aspect ratio. On narrow screens
      // it stays close to the specimen instead of leaving broad empty side gutters.
      const depth = 8 * rows / cols + .56;
      dish.scale.z = depth / 5.6;
      studio.setView({ bounds: [-4.32, -.35, -depth / 2 - .025, 4.32, .36, depth / 2 + .025], target: [0, -.05, 0], eye: [.2, 16, 10], fill: [.98, .96], mobileFill: [.98, .96], floorY: -.37, shadow: [8.7, depth + .15, .22], background: 0x898983, groundColor: 0x898983, fog: false });
    }

    const sphere = ownGeometry(new THREE.SphereGeometry(1, 12, 8));
    const cylinder = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 6, 1));
    const shadowGeometry = ownGeometry(new THREE.PlaneGeometry(1, 1)); shadowGeometry.rotateX(-Math.PI / 2);
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    const a = new THREE.Vector3(), b = new THREE.Vector3(), direction = new THREE.Vector3();
    const softBlue = new THREE.Color(0x3c86b0), clusterBlue = new THREE.Color(0x2a6e98);
    // Under the bright studio lights these read as pale sky blue (aerogel) and warm off-white (xerogel).
    const dryBlue = new THREE.Color(0x6ea6d8), white = new THREE.Color(0xd6cdb8);
    const baseColour = new THREE.Color(), majorColour = new THREE.Color(), colour = new THREE.Color();
    let particles = null, necks = null, shadows = null, capacity = 0, positions = null;
    let particleAt = null, clusterAt = null, gridLength = 0;
    let lastGeneration = -1, lastTime = -1, lastK = -1, lastWet = -1, lastState = '';
    function reserve(count, cells) {
      if (!particles || count > capacity) {
        capacity = Math.max(128, Math.ceil(count / 128) * 128);
        if (particles) { scene.remove(particles, necks, shadows); particles.dispose(); necks.dispose(); shadows.dispose(); }
        particles = new THREE.InstancedMesh(sphere, particleMaterial, capacity);
        necks = new THREE.InstancedMesh(cylinder, neckMaterial, capacity * 2);
        shadows = new THREE.InstancedMesh(shadowGeometry, shadowMaterial, capacity);
        particles.name = 'synthesis-particles'; necks.name = 'synthesis-cluster-necks'; shadows.name = 'synthesis-particle-shadows';
        for (const mesh of [particles, necks, shadows]) {
          mesh.count = 0; mesh.frustumCulled = false;
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
        }
        particles.renderOrder = 3; necks.renderOrder = 2; shadows.renderOrder = 0;
        positions = new Float32Array(capacity * 3); lastGeneration = -1;
      }
      if (cells !== gridLength) {
        gridLength = cells; particleAt = new Int32Array(cells); clusterAt = new Int32Array(cells);
      }
    }
    function position(id, target) {
      const offset = id * 3;
      return target.set(positions[offset], positions[offset + 1], positions[offset + 2]);
    }
    return {
      draw(state, { snap: forceSnap = false } = {}) {
        layout(state.cols, state.rows);
        reserve(state.N, state.cols * state.rows);
        const elapsed = state.time - lastTime;
        const controlChanged = state.k !== lastK || state.wet !== lastWet || state.state !== lastState;
        const snap = forceSnap || state.generation !== lastGeneration || lastTime < 0 || elapsed < 0 || elapsed > .25 || (elapsed === 0 && controlChanged);
        const blend = snap ? 1 : 1 - Math.exp(-Math.max(0, elapsed) / STUDIO.smoothing);
        const dryFraction = 1 - state.wet, compact = state.dry === 'ap';
        liquid.scale.y = .21 * state.wet; liquid.visible = state.wet > .008;
        liquidMaterial.opacity = .3 * state.wet;
        reflection.position.y = -.255 + .21 * state.wet + .003;
        reflectionMaterial.opacity = .24 * state.wet; reflection.visible = liquid.visible;
        waterline.position.y = reflection.position.y; waterline.material.opacity = .48 * state.wet; waterline.visible = liquid.visible;
        baseColour.copy(softBlue).lerp(compact ? white : dryBlue, dryFraction);
        majorColour.copy(clusterBlue).lerp(compact ? white : dryBlue, dryFraction);
        const translucent = !compact && dryFraction > .001;
        for (const material of [particleMaterial, neckMaterial]) {
          if (material.transparent !== translucent) { material.transparent = translucent; material.needsUpdate = true; }
          material.depthWrite = !translucent; material.opacity = translucent ? 1 - .25 * dryFraction : 1;
        }
        neckMaterial.color.copy(baseColour); shadowMaterial.opacity = .3 - .1 * dryFraction;
        const spacing = 8 / state.cols;
        // A generous visible diameter joins the colloids into an irregular porous
        // body. Jitter and height are visual only; model cells and bonds stay intact.
        const radius = spacing * .65;
        particles.count = 0; necks.count = 0; shadows.count = 0; particleAt.fill(-1); clusterAt.fill(-1);
        for (const cluster of state.clusters) {
          if (cluster.dead) continue;
          colour.copy(cluster.id === state.bigId ? majorColour : baseColour);
          for (let j = 0; j < cluster.cells.length; j++) {
            const cell = cluster.cells[j], id = cluster.ids[j], offset = id * 3;
            const x = (cell % state.cols + .5 - state.cols / 2) * spacing;
            const z = (Math.floor(cell / state.cols) + .5 - state.rows / 2) * spacing;
            const jitterX = (visualHash(id + 101) - .5) * .32 * spacing;
            const jitterZ = (visualHash(id + 307) - .5) * .32 * spacing;
            const relief = spacing * (.3 + .18 * Math.sin(x * 1.1) + .12 * Math.cos(z * 1.3));
            const px = (x + jitterX) * state.k, py = -.235 + radius + relief * (compact ? state.k : 1), pz = (z + jitterZ) * state.k;
            if (snap) { positions[offset] = px; positions[offset + 1] = py; positions[offset + 2] = pz; }
            else {
              positions[offset] += (px - positions[offset]) * blend;
              positions[offset + 1] += (py - positions[offset + 1]) * blend;
              positions[offset + 2] += (pz - positions[offset + 2]) * blend;
            }
            position(id, dummy.position); dummy.quaternion.identity(); dummy.scale.setScalar(radius); dummy.updateMatrix();
            particles.setMatrixAt(particles.count, dummy.matrix); particles.setColorAt(particles.count++, colour);
            // One instanced soft footprint per sphere gives depth at negligible
            // shadow-map cost. The offset follows the common upper-left key light.
            dummy.position.x += radius * .45; dummy.position.y = -.246; dummy.position.z -= radius * .3;
            dummy.scale.set(radius * 3.1, 1, radius * 2.7); dummy.updateMatrix(); shadows.setMatrixAt(shadows.count++, dummy.matrix);
            particleAt[cell] = id; clusterAt[cell] = cluster.id;
          }
        }
        // Draw a neck only between neighbouring cells in the same actual cluster.
        // The DLCA graph is exposed, not replaced by a decorative random network.
        for (const cluster of state.clusters) {
          if (cluster.dead) continue;
          for (let j = 0; j < cluster.cells.length; j++) {
            const cell = cluster.cells[j], x = cell % state.cols;
            for (let axis = 0; axis < 2; axis++) {
              if ((axis === 0 && x === state.cols - 1) || (axis === 1 && cell + state.cols >= gridLength)) continue;
              const next = cell + (axis === 0 ? 1 : state.cols);
              if (clusterAt[next] !== cluster.id) continue;
              position(cluster.ids[j], a); position(particleAt[next], b);
              direction.subVectors(b, a); const length = direction.length();
              if (length < 1e-7) continue;
              dummy.position.copy(a).add(b).multiplyScalar(.5);
              dummy.quaternion.setFromUnitVectors(up, direction.multiplyScalar(1 / length));
              dummy.scale.set(radius * .28, length, radius * .28); dummy.updateMatrix();
              necks.setMatrixAt(necks.count++, dummy.matrix);
            }
          }
        }
        particles.instanceMatrix.needsUpdate = true; necks.instanceMatrix.needsUpdate = true; shadows.instanceMatrix.needsUpdate = true;
        if (particles.instanceColor) { particles.instanceColor.setUsage(THREE.DynamicDrawUsage); particles.instanceColor.needsUpdate = true; }
        lastGeneration = state.generation; lastTime = state.time; lastK = state.k; lastWet = state.wet; lastState = state.state; studio.render();
      }
    };
  }

  function catalysisView(studio) {
    const { scene, ownGeometry, ownMaterial, ownTexture } = studio;
    const metalGeometry = ownGeometry(new THREE.SphereGeometry(1, 20, 14));
    const hydrogenGeometry = ownGeometry(new THREE.SphereGeometry(1, 14, 10));
    const silver = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xb7bcbd, metalness: .76, roughness: .36 }));
    const paleIon = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x8bc7e2, metalness: .03, roughness: .43, transparent: true, opacity: .75, depthWrite: false }));
    const hydrogen = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x2fa3b5, metalness: .18, roughness: .37 }));
    const dummy = new THREE.Object3D(), tint = new THREE.Color();
    const target = new THREE.Vector3(), axis = new THREE.Vector3(), point = new THREE.Vector3();
    const orientation = new THREE.Quaternion(), euler = new THREE.Euler();
    const positions = new WeakMap();
    let metal = null, columns = 0, surface = [], lastTime = -1;
    function batch(material, count) {
      const mesh = new THREE.InstancedMesh(hydrogenGeometry, material, count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
      mesh.count = 0; scene.add(mesh); return mesh;
    }
    const ions = batch(paleIon, 48), bound = batch(hydrogen, 32);
    const bubbles = [.96, .68, .37, .14].map(opacity => batch(ownMaterial(
      new THREE.MeshStandardMaterial({ color: 0x2fa3b5, metalness: .15, roughness: .37,
        transparent: true, opacity, depthWrite: false })), 64));

    // A softly faded blue wash suggests solution without a glass tank or hard edge.
    const size = 64, rgba = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = (x + .5) / size, py = (y + .5) / size;
      const alpha = Math.pow(Math.sin(Math.PI * px), 2) * Math.pow(Math.sin(Math.PI * py), 1.4);
      const i = (y * size + x) * 4;
      rgba[i] = 175; rgba[i + 1] = 213; rgba[i + 2] = 230; rgba[i + 3] = Math.round(alpha * 70);
    }
    const washTexture = ownTexture(new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat));
    washTexture.colorSpace = THREE.SRGBColorSpace; washTexture.needsUpdate = true;
    const wash = new THREE.Mesh(ownGeometry(new THREE.PlaneGeometry(1, 1)), ownMaterial(
      new THREE.MeshBasicMaterial({ map: washTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide })));
    wash.position.set(0, 1.35, -2.3); wash.renderOrder = -1; scene.add(wash);

    function build(cols) {
      columns = cols; surface = [];
      if (metal) { scene.remove(metal); metal.dispose(); }
      metal = new THREE.InstancedMesh(metalGeometry, silver, cols * 4 * 3);
      let count = 0;
      for (let layer = 0; layer < 3; layer++) for (let row = 0; row < 4; row++) for (let col = 0; col < cols; col++) {
        const x = (col - (cols - 1) / 2) * .96 + (row % 2 ? .24 : -.24) + (layer % 2 ? .48 : 0);
        const y = -layer * .784;
        const z = (row - 1.5) * .832 + (layer % 2 ? .277 : 0);
        dummy.position.set(x, y, z); dummy.quaternion.identity(); dummy.scale.setScalar(.48); dummy.updateMatrix();
        metal.setMatrixAt(count, dummy.matrix);
        tint.setRGB(1 - layer * .045, 1 - layer * .04, 1 - layer * .036);
        metal.setColorAt(count++, tint);
        if (!layer) surface.push(new THREE.Vector3(x, .64, z));
      }
      metal.castShadow = true; metal.receiveShadow = true; metal.instanceMatrix.needsUpdate = true;
      metal.instanceColor.needsUpdate = true; metal.computeBoundingSphere(); scene.add(metal);
      wash.scale.set(cols * .96 + 1.3, 3.4, 1);
      // Frame the metal itself; the gas headroom is left above the specimen.
      studio.setView({ bounds: [-cols * .48 - .26, -2.05, -1.75, cols * .48 + .76, .5, 2.02], target: [.2, -.15, 0],
        eye: [3, 5.7, 14], fill: [.76, .84], mobileFill: [.83, .82], floorY: -2.05,
        shadow: [cols * .96 + 1, 4.15, .17] });
    }
    function put(mesh, center, radius) {
      dummy.position.copy(center); dummy.quaternion.identity(); dummy.scale.setScalar(radius); dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++, dummy.matrix);
    }
    function smoothed(object, destination, blend) {
      let p = positions.get(object);
      if (!p) { p = destination.clone(); positions.set(object, p); }
      else p.lerp(destination, blend);
      return p;
    }
    return {
      draw(state, { snap: forceSnap = false } = {}) {
        if (columns !== state.cols) build(state.cols);
        const dt = state.time - lastTime;
        const blend = forceSnap || lastTime < 0 || dt > .25 || dt < 0 ? 1 : 1 - Math.exp(-Math.max(0, dt) / .09);
        ions.count = bound.count = 0; for (const mesh of bubbles) mesh.count = 0;
        const span = state.cols * .96 + .4, contactY = state.y0 - state.R - 4;
        for (let i = 0; i < state.occ.length; i++) if (state.occ[i]) put(bound, surface[i], .145);
        for (const p of state.pro) {
          const height = .64 + clamp(1 - p.y / contactY, 0, 1.1) * 1.85;
          const x = (p.x / state.width - .5) * span;
          const z = (visualHash(p.id + 83) - .5) * 3.25;
          target.set(x, height, z);
          if (p.k >= 0 && (p.mode === 1 || p.mode === 2)) {
            const site = surface[p.k];
            if (p.mode === 1) {
              const approach = clamp((p.y / contactY - .12) / .88, 0, 1);
              target.x += (site.x - target.x) * approach;
              target.z += (site.z - target.z) * approach;
            } else {
              // Actual rejected-ion state rises rapidly away from the last target.
              target.x = site.x + (p.x - state.xs[p.k]) / state.width * span;
              target.z = site.z + Math.sin(p.id) * .07;
            }
          }
          put(ions, smoothed(p, target, blend), .085);
        }
        for (const b of state.bub) {
          const a = surface[b.k], c = surface[b.k + 1];
          const rise = clamp((state.y0 - state.R - 6 - b.y) / (state.y0 - state.R + 6), 0, 1);
          target.copy(a).add(c).multiplyScalar(.5);
          target.x += (b.x - b.originX) / state.width * span;
          target.y = .68 + rise * 2; target.z += Math.sin(b.ph) * .065;
          const center = smoothed(b, target, blend);
          euler.set(.15, b.a * .3, b.a); orientation.setFromEuler(euler);
          axis.set(.113, 0, 0).applyQuaternion(orientation);
          const mesh = bubbles[Math.min(3, Math.floor(clamp((rise - .48) / .52, 0, .999) * 4))];
          put(mesh, point.copy(center).add(axis), .124);
          put(mesh, point.copy(center).sub(axis), .124);
        }
        for (const mesh of [ions, bound, ...bubbles]) mesh.instanceMatrix.needsUpdate = true;
        lastTime = state.time; studio.render();
      }
    };
  }

  function aiView(studio) {
    const { scene, ownGeometry, ownMaterial } = studio;
    const WIDTH = 8, HEIGHT = 5, NX = 80, NY = 50, DURATION = .4, HEIGHT_SCALE = WIDTH * .24, BASE = .045;
    const plate = new THREE.Group(); plate.rotation.x = -Math.PI / 2; plate.position.y = .42; scene.add(plate);
    const backing = new THREE.Mesh(ownGeometry(new THREE.BoxGeometry(WIDTH + .32, HEIGHT + .32, .38)),
      ownMaterial(new THREE.MeshPhysicalMaterial({ color: 0xa8c0ca, metalness: .06, roughness: .17, transparent: true, opacity: .3, depthWrite: false, clearcoat: .85, clearcoatRoughness: .15 })));
    backing.position.z = -.18; backing.castShadow = true; backing.receiveShadow = true; plate.add(backing);
    backing.name = 'ai-glass-slab';
    const glassEdges = new THREE.LineSegments(ownGeometry(new THREE.EdgesGeometry(backing.geometry)),
      ownMaterial(new THREE.LineBasicMaterial({ color: 0xe4f2f6, transparent: true, opacity: .72, depthWrite: false })));
    glassEdges.position.z = backing.position.z; plate.add(glassEdges);
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const length = i % 5 === 0 ? .17 : .095, x = (i / 10 - .5) * WIDTH, y = (i / 10 - .5) * HEIGHT;
      ticks.push(x, -HEIGHT / 2 - .015, .025, x, -HEIGHT / 2 - length, .025,
        -WIDTH / 2 - .015, y, .025, -WIDTH / 2 - length, y, .025);
    }
    const tickGeometry = ownGeometry(new THREE.BufferGeometry()); tickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(ticks, 3));
    const tickMarks = new THREE.LineSegments(tickGeometry, ownMaterial(new THREE.LineBasicMaterial({ color: 0x536f80, transparent: true, opacity: .8 })));
    tickMarks.name = 'ai-ticks-0.1'; plate.add(tickMarks);
    const count = (NX + 1) * (NY + 1), coordinates = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2), index = [];
    for (let y = 0; y <= NY; y++) for (let x = 0; x <= NX; x++) {
      const i = y * (NX + 1) + x;
      coordinates[i * 3] = (x / NX - .5) * WIDTH; coordinates[i * 3 + 1] = (y / NY - .5) * HEIGHT;
      uv[i * 2] = x / NX; uv[i * 2 + 1] = y / NY;
      if (x < NX && y < NY) { const a = i, b = i + 1, c = i + NX + 1, d = c + 1; index.push(a, b, d, a, d, c); }
    }
    const geometry = ownGeometry(new THREE.BufferGeometry()); geometry.setIndex(index);
    geometry.setAttribute('position', new THREE.BufferAttribute(coordinates, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const surface = new THREE.Mesh(geometry, ownMaterial(new THREE.MeshStandardMaterial({ vertexColors: true,
      metalness: .13, roughness: .52, side: THREE.DoubleSide })));
    surface.userData.aiRelief = true; surface.castShadow = false; surface.receiveShadow = true; plate.add(surface);
    surface.userData.heightScale = HEIGHT_SCALE; surface.userData.heightBase = BASE;
    // Ten-unit isolines follow the displayed triangles throughout the morph.
    const contourPositions = new Float32Array(NX * NY * 36), contourGeometry = ownGeometry(new THREE.BufferGeometry());
    contourGeometry.setAttribute('position', new THREE.BufferAttribute(contourPositions, 3).setUsage(THREE.DynamicDrawUsage));
    contourGeometry.setDrawRange(0, 0);
    const contours = new THREE.LineSegments(contourGeometry, ownMaterial(new THREE.LineBasicMaterial({ color: 0x235b70, transparent: true, opacity: .5, depthWrite: false })));
    contours.name = 'ai-contours-10'; contours.frustumCulled = false; contours.renderOrder = 1; plate.add(contours);
    const headGeometry = ownGeometry(new THREE.SphereGeometry(1, 16, 10));
    const stemGeometry = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 8));
    const pinMaterial = ownMaterial(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: .42, roughness: .25, clearcoat: .7, clearcoatRoughness: .16 }));
    const stemMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xc4d4da, metalness: .8, roughness: .24 }));
    const suggestionMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x256e77, metalness: .3, roughness: .4 }));
    const ringGeometry = ownGeometry(new THREE.TorusGeometry(.22, .012, 8, 64));
    const suggestion = new THREE.Group(); plate.add(suggestion);
    const suggestionRing = new THREE.Mesh(ringGeometry, suggestionMaterial); suggestion.add(suggestionRing);
    const suggestionStem = new THREE.Mesh(stemGeometry, suggestionMaterial); suggestionStem.rotation.x = Math.PI / 2;
    suggestionStem.scale.set(.016, .42, .016); suggestionStem.position.z = .21; suggestion.add(suggestionStem);
    // The elevated satin marker is a projected HTML orb; CSS supplies its slow bob without RAF.
    const optimum = new THREE.Mesh(ringGeometry, ownMaterial(new THREE.MeshStandardMaterial({ color: 0x173f46, metalness: .28, roughness: .4 })));
    optimum.scale.setScalar(1.4); optimum.visible = false; plate.add(optimum);
    optimum.name = 'ai-optimum';
    const highest = new THREE.Mesh(ownGeometry(new THREE.TorusGeometry(.19, .026, 10, 64)), ownMaterial(new THREE.MeshPhysicalMaterial({
      color: 0x167f8d, metalness: .2, roughness: .16, transparent: true, opacity: .82, clearcoat: .9, clearcoatRoughness: .12 })));
    highest.name = 'ai-highest-observed'; plate.add(highest);
    const dummy = new THREE.Object3D(), color = new THREE.Color(), world = new THREE.Vector3();
    const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const fromHeight = new Float32Array(count), targetHeight = new Float32Array(count);
    const fromColor = new Float32Array(count * 3), targetColor = new Float32Array(count * 3);
    const stops = [[205, 217, 227], [111, 176, 204], [18, 121, 138], [10, 85, 96]];
    let heads = null, stems = null, capacity = 0, revision = -1, elapsed = DURATION, stateNow = null, currentLabels = [];
    function reserve(n) {
      if (heads && n <= capacity) return;
      capacity = Math.max(16, Math.ceil(n / 16) * 16);
      if (heads) { plate.remove(heads, stems); heads.dispose(); stems.dispose(); }
      heads = new THREE.InstancedMesh(headGeometry, pinMaterial, capacity); stems = new THREE.InstancedMesh(stemGeometry, stemMaterial, capacity);
      heads.instanceMatrix.setUsage(THREE.DynamicDrawUsage); stems.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      heads.frustumCulled = stems.frustumCulled = false; plate.add(heads, stems);
    }
    function field(values, x, y, cols, rows) {
      const gx = clamp(x * cols - .5, 0, cols - 1), gy = clamp(y * rows - .5, 0, rows - 1);
      const ix = Math.floor(gx), iy = Math.floor(gy), jx = Math.min(ix + 1, cols - 1), jy = Math.min(iy + 1, rows - 1);
      const fx = gx - ix, fy = gy - iy;
      return (values[iy * cols + ix] * (1 - fx) + values[iy * cols + jx] * fx) * (1 - fy) +
        (values[jy * cols + ix] * (1 - fx) + values[jy * cols + jx] * fx) * fy;
    }
    function performanceColor(value, uncertainty = 0) {
      const value3 = clamp(value / 100, 0, 1) * 3, i = Math.min(2, Math.floor(value3)), f = value3 - i;
      const a = stops[i], b = stops[i + 1], desaturate = clamp(uncertainty, 0, 1) * .18;
      const r = a[0] + (b[0] - a[0]) * f, g = a[1] + (b[1] - a[1]) * f, blue = a[2] + (b[2] - a[2]) * f;
      const gray = .2126 * r + .7152 * g + .0722 * blue;
      color.setRGB((r + (gray - r) * desaturate) / 255, (g + (gray - g) * desaturate) / 255,
        (blue + (gray - blue) * desaturate) / 255, THREE.SRGBColorSpace);
      return color;
    }
    function prepare(state) {
      for (let y = 0; y <= NY; y++) for (let x = 0; x <= NX; x++) {
        const i = y * (NX + 1) + x, mean = field(state.mean, x / NX, y / NY, state.cols, state.rows);
        const uncertainty = field(state.uncertainty, x / NX, y / NY, state.cols, state.rows);
        fromHeight[i] = coordinates[i * 3 + 2]; targetHeight[i] = BASE + HEIGHT_SCALE * clamp(mean / 100, 0, 1);
        performanceColor(mean, uncertainty);
        for (let k = 0; k < 3; k++) fromColor[i * 3 + k] = colors[i * 3 + k];
        targetColor[i * 3] = color.r; targetColor[i * 3 + 1] = color.g; targetColor[i * 3 + 2] = color.b;
      }
      elapsed = 0;
    }
    // Same triangle interpolation as the relief index buffer, including while it morphs.
    function heightAt(x, y) {
      const gx = clamp(x, 0, 1) * NX, gy = clamp(y, 0, 1) * NY;
      const ix = Math.min(NX - 1, Math.floor(gx)), iy = Math.min(NY - 1, Math.floor(gy));
      const fx = gx - ix, fy = gy - iy, a = iy * (NX + 1) + ix, b = a + 1, c = a + NX + 1, d = c + 1;
      const z = i => coordinates[i * 3 + 2];
      return fx >= fy ? z(a) * (1 - fx) + z(b) * (fx - fy) + z(d) * fy : z(a) * (1 - fy) + z(d) * fx + z(c) * (fy - fx);
    }
    function updateContours() {
      let written = 0;
      const emit = (a, b, level, out) => {
        const za = coordinates[a * 3 + 2], zb = coordinates[b * 3 + 2];
        if ((za < level && zb >= level) || (zb < level && za >= level)) {
          const f = (level - za) / (zb - za);
          out.push(coordinates[a * 3] + (coordinates[b * 3] - coordinates[a * 3]) * f,
            coordinates[a * 3 + 1] + (coordinates[b * 3 + 1] - coordinates[a * 3 + 1]) * f, level + .009);
        }
      };
      const crossings = [];
      for (let i = 0; i < index.length; i += 3) {
        const a = index[i], b = index[i + 1], c = index[i + 2];
        const low = Math.min(coordinates[a * 3 + 2], coordinates[b * 3 + 2], coordinates[c * 3 + 2]);
        const high = Math.max(coordinates[a * 3 + 2], coordinates[b * 3 + 2], coordinates[c * 3 + 2]);
        const first = Math.max(1, Math.ceil((low - BASE) / HEIGHT_SCALE * 10));
        const last = Math.min(9, Math.floor((high - BASE) / HEIGHT_SCALE * 10));
        for (let j = first; j <= last; j++) {
          crossings.length = 0; const level = BASE + HEIGHT_SCALE * j / 10;
          emit(a, b, level, crossings); emit(b, c, level, crossings); emit(c, a, level, crossings);
          if (crossings.length >= 6 && written + 6 <= contourPositions.length) {
            for (let q = 0; q < 6; q++) contourPositions[written++] = crossings[q];
          }
        }
      }
      contourGeometry.setDrawRange(0, written / 3); contourGeometry.attributes.position.needsUpdate = true;
    }
    function projectLocal(x, y, z) {
      world.set(x, y, z); plate.localToWorld(world); return studio.project(world);
    }
    function screenBounds() {
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      const points = [], glass = [];
      const add = p => { points.push(p); minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); return p; };
      for (let i = 0; i < count; i++) add(projectLocal(coordinates[i * 3], coordinates[i * 3 + 1], coordinates[i * 3 + 2]));
      for (const x of [-WIDTH / 2 - .16, WIDTH / 2 + .16]) for (const y of [-HEIGHT / 2 - .16, HEIGHT / 2 + .16])
        for (const z of [-.37, .01]) glass.push(add(projectLocal(x, y, z)));
      // Exact projected edge clipping leaves room for the rotated Y label along the left silhouette.
      const left = (top, bottom) => {
        let edgeX = 1;
        for (const p of points) if (p.y >= top && p.y <= bottom) edgeX = Math.min(edgeX, p.x);
        const edge = (a, b) => {
          for (const y of [top, bottom]) if ((a.y < y && b.y > y) || (b.y < y && a.y > y))
            edgeX = Math.min(edgeX, a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y));
        };
        for (let i = 0; i < index.length; i += 3) { const a = points[index[i]], b = points[index[i + 1]], c = points[index[i + 2]]; edge(a, b); edge(b, c); edge(c, a); }
        for (let i = 0; i < glass.length; i++) for (let j = i + 1; j < glass.length; j++) edge(glass[i], glass[j]);
        return edgeX;
      };
      return { minX, maxX, minY, maxY, left };
    }
    function updateAnnotations(state) {
      const viewport = studio.size(), mobile = viewport.width < 520;
      reserve(state.obs.length); heads.count = stems.count = state.obs.length;
      let bestObservation = state.obs[0];
      for (let i = 0; i < state.obs.length; i++) {
        const o = state.obs[i], z = heightAt(o.x, o.y), h = o.seed ? .16 : .28;
        if (!bestObservation || o.v > bestObservation.v) bestObservation = o;
        const x = (o.x - .5) * WIDTH, y = (o.y - .5) * HEIGHT;
        const projected = projectLocal(x, y, z + h), unit = projectLocal(x + 1, y, z + h);
        const pixelsPerUnit = Math.max(1, Math.abs(unit.x - projected.x) * viewport.width);
        const radius = Math.max(WIDTH * (o.seed ? .017 : .024) / 2, (o.seed ? 8 : 10) / (2 * pixelsPerUnit));
        dummy.position.set(x, y, z + h / 2 + .012);
        dummy.rotation.set(Math.PI / 2, 0, 0); dummy.scale.set(o.seed ? .014 : .022, h, o.seed ? .014 : .022); dummy.updateMatrix(); stems.setMatrixAt(i, dummy.matrix);
        dummy.position.z = z + h; dummy.quaternion.identity(); dummy.scale.setScalar(radius); dummy.updateMatrix(); heads.setMatrixAt(i, dummy.matrix);
        performanceColor(o.v); if (o.seed) color.lerp(new THREE.Color(0xcdd9e3), .16); heads.setColorAt(i, color);
      }
      heads.name = 'ai-measurement-heads'; stems.name = 'ai-measurement-stems';
      heads.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = true; if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
      suggestion.visible = !!state.sug;
      if (state.sug) suggestion.position.set((state.sug.x - .5) * WIDTH, (state.sug.y - .5) * HEIGHT, heightAt(state.sug.x, state.sug.y) + .035);
      optimum.visible = state.best >= state.DONE;
      if (optimum.visible) optimum.position.set((state.opt.x - .5) * WIDTH, (state.opt.y - .5) * HEIGHT, heightAt(state.opt.x, state.opt.y) + .04);
      highest.visible = !!bestObservation;
      if (bestObservation) highest.position.set((bestObservation.x - .5) * WIDTH, (bestObservation.y - .5) * HEIGHT,
        heightAt(bestObservation.x, bestObservation.y) + .045);
      plate.updateMatrixWorld(true);
      const bounds = screenBounds(), pad = 8, boxes = [];
      const overlap = (a, b) => a.left < b.right + 5 && a.right + 5 > b.left && a.top < b.bottom + 5 && a.bottom + 5 > b.top;
      const make = (key, text, anchor, px, py, width, height, kind, options = {}) => {
        const boxWidth = options.rotation ? height : width, boxHeight = options.rotation ? width : height;
        const margin = kind === 'recommendation-marker' ? 0 : pad;
        px = clamp(px, margin + boxWidth / 2, viewport.width - margin - boxWidth / 2);
        py = clamp(py, margin + boxHeight / 2, viewport.height - margin - boxHeight / 2);
        let rect = { left: px - boxWidth / 2, right: px + boxWidth / 2, top: py - boxHeight / 2, bottom: py + boxHeight / 2 };
        if (options.avoid) {
          const candidates = [px, ...boxes.flatMap(b => [b.left - 7 - width / 2, b.right + 7 + width / 2]),
            viewport.width - pad - width / 2, pad + width / 2].filter(x => x >= pad + width / 2 && x <= viewport.width - pad - width / 2);
          candidates.sort((a, b) => Math.abs(a - px) - Math.abs(b - px));
          for (const x of candidates) {
            const candidate = { left: x - width / 2, right: x + width / 2, top: rect.top, bottom: rect.bottom };
            if (!boxes.some(b => overlap(candidate, b))) { px = x; rect = candidate; break; }
          }
        }
        if (kind !== 'recommendation-marker') boxes.push(rect);
        return { key, text: String(text), x: px / viewport.width, y: py / viewport.height,
          visible: anchor.visible, kind, width, height, align: 'center', fontSize: mobile ? 11 : 12,
          lineHeight: mobile ? 14 : 16, anchorX: anchor.x, anchorY: anchor.y, ...options };
      };
      const axisHeight = mobile ? 32 : 22, axisWidth = mobile ? 98 : 160;
      const axisY = Math.min(viewport.height - pad - axisHeight / 2,
        Math.max(viewport.height * .91, bounds.maxY * viewport.height + 12 + axisHeight / 2));
      const text = value => mobile ? value.replace(' ', '\n') : value;
      const yAnchor = projectLocal(-WIDTH / 2 - .2, 0, .02), yWidth = mobile ? 98 : 160, yHeight = mobile ? 28 : 22;
      const desiredY = clamp(yAnchor.y * viewport.height, 45 + yWidth / 2, viewport.height - pad - yWidth / 2);
      let sideY = desiredY, sideLeft = 0;
      const sideCandidates = [desiredY];
      for (let shift = 6; shift <= viewport.height; shift += 6) sideCandidates.push(desiredY - shift, desiredY + shift);
      for (const y of sideCandidates) {
        if (y < 45 + yWidth / 2 || y > viewport.height - pad - yWidth / 2) continue;
        const left = bounds.left((y - yWidth / 2) / viewport.height, (y + yWidth / 2) / viewport.height) * viewport.width;
        if (left > sideLeft) { sideY = y; sideLeft = left; }
        if (left >= pad + yHeight + 5) break;
      }
      currentLabels = [
        make('axis-y', text(T.ai.axisY), yAnchor, sideLeft - 5 - yHeight / 2, sideY, yWidth, yHeight, 'axis-y', { rotation: -90 }),
        make('axis-x', text(T.ai.axisX), projectLocal(0, -HEIGHT / 2 - .2, .02), viewport.width * .71, axisY, axisWidth, axisHeight, 'axis-x')
      ];
      if (state.sug) {
        const anchor = projectLocal(suggestion.position.x, suggestion.position.y, suggestion.position.z + .42);
        currentLabels.push(make('suggestion-marker', '', anchor, anchor.x * viewport.width, anchor.y * viewport.height, 16, 16, 'recommendation-marker', { bob: true }));
        const labelWidth = mobile ? 106 : 126, labelHeight = 24;
        const y = Math.min(26, anchor.y * viewport.height - 24 - labelHeight / 2);
        currentLabels.push(make('suggestion', T.ai.sug, anchor, anchor.x * viewport.width, y, labelWidth, labelHeight, 'suggestion', { leader: true, avoid: true }));
      }
      if (bestObservation) {
        const anchor = projectLocal(highest.position.x, highest.position.y, highest.position.z + (bestObservation.seed ? .2 : .32));
        currentLabels.push(make('highest-value', Math.round(bestObservation.v), anchor, anchor.x * viewport.width, 26, 42, 24, 'highest-value', { leader: true, avoid: true }));
      }
      const last = state.obs[state.obs.length - 1];
      if (last && !last.seed && last !== bestObservation) {
        const anchor = projectLocal((last.x - .5) * WIDTH, (last.y - .5) * HEIGHT, heightAt(last.x, last.y) + .33);
        currentLabels.push(make('last-value', Math.round(last.v), anchor, anchor.x * viewport.width, 26,
          34, 20, 'value', { leader: true, avoid: true }));
      }
    }

    plate.updateMatrixWorld(true);
    studio.setView({ bounds: [-4.18, 0, -2.68, 4.18, 2.95, 2.68], target: [-.55, .85, 0], eye: [1.2, 10.5, 14.4],
      fill: [.97, .96], mobileFill: [1, .95], floorY: .04, shadow: [8.9, 5.9, .2], fog: false,
      background: 0xbdb8b1, groundColor: 0x898983, exposure: .98, hemisphere: 1.15, key: 2.4, fillLight: .55, environmentIntensity: .48 });
    return {
      draw(state, { dt = 0, snap = false } = {}) {
        const first = revision < 0;
        if (state.revision !== revision) { prepare(state); revision = state.revision; }
        stateNow = state; elapsed = first || snap ? DURATION : Math.min(DURATION, elapsed + Math.max(0, dt));
        const progress = elapsed / DURATION, blend = progress * progress * (3 - 2 * progress);
        for (let i = 0; i < count; i++) coordinates[i * 3 + 2] = fromHeight[i] + (targetHeight[i] - fromHeight[i]) * blend;
        for (let i = 0; i < colors.length; i++) colors[i] = fromColor[i] + (targetColor[i] - fromColor[i]) * blend;
        geometry.attributes.position.needsUpdate = geometry.attributes.color.needsUpdate = true;
        geometry.computeVertexNormals(); geometry.computeBoundingSphere(); geometry.computeBoundingBox();
        updateContours();
        updateAnnotations(state); studio.render(); return elapsed < DURATION;
      },
      hit(px, py, width, height) {
        if (!stateNow || !Number.isFinite(px) || !Number.isFinite(py) || width <= 0 || height <= 0 || px < 0 || py < 0 || px > width || py > height) return null;
        ndc.set(px / width * 2 - 1, 1 - py / height * 2); studio.camera.updateMatrixWorld(); plate.updateMatrixWorld(true);
        raycaster.setFromCamera(ndc, studio.camera); const hit = raycaster.intersectObject(surface, false)[0];
        if (!hit) return null;
        world.copy(hit.point); plate.worldToLocal(world);
        const x = world.x / WIDTH + .5, y = world.y / HEIGHT + .5;
        if (x < -1e-6 || x > 1 + 1e-6 || y < -1e-6 || y > 1 + 1e-6) return null;
        return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
      },
      labels() { return currentLabels; }
    };
  }

  function energyView(studio) {
    const { scene, ownGeometry, ownMaterial, ownTexture } = studio;
    const box = ownGeometry(new THREE.BoxGeometry(1, 1, 1));
    // The bevel removes only the front/back edge. The central section still
    // reaches the unit box bounds, so a slit is never narrowed by decoration.
    const bevelShape = new THREE.Shape();
    bevelShape.moveTo(-.497, -.497); bevelShape.lineTo(.497, -.497);
    bevelShape.lineTo(.497, .497); bevelShape.lineTo(-.497, .497); bevelShape.closePath();
    const graphiteBox = ownGeometry(new THREE.ExtrudeGeometry(bevelShape, { depth: .96, steps: 1, bevelEnabled: true, bevelSize: .003, bevelThickness: .02, bevelSegments: 2, curveSegments: 1 }));
    graphiteBox.translate(0, 0, -.48);
    const sphere = ownGeometry(new THREE.SphereGeometry(1, 14, 10));
    const cylinder = ownGeometry(new THREE.CylinderGeometry(1, 1, 1, 10));
    // Small deterministic pores and granules, generated in memory. No image,
    // canvas, network request or model random draw is needed for this surface.
    function carbonTexture() {
      const size = 128, bytes = new Uint8Array(size * size * 4);
      const hash = (x, y) => { let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263); n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967295; };
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const gx = Math.floor(x / 8), gy = Math.floor(y / 8), px = gx * 8 + 1.4 + hash(gx, gy) * 5.2, py = gy * 8 + 1.4 + hash(gx + 91, gy + 37) * 5.2;
        const radius = 1.15 + hash(gx + 53, gy + 71) * 1.25, distance = Math.hypot(x - px, y - py);
        const pit = Math.max(0, 1 - distance / radius), rim = Math.max(0, 1 - Math.abs(distance - radius) / .75);
        const shade = clamp(219 + (hash(x, y) - .5) * 34 - pit * 105 + rim * 12, 70, 255), index = (y * size + x) * 4;
        bytes[index] = bytes[index + 1] = bytes[index + 2] = shade; bytes[index + 3] = 255;
      }
      const texture = ownTexture(new THREE.DataTexture(bytes, size, size));
      texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 4);
      texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
      return texture;
    }
    const porousCarbon = carbonTexture();
    const graphite = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x1f2427, metalness: .025, roughness: .94, map: porousCarbon, bumpMap: porousCarbon, bumpScale: .045 }));
    const innerCarbon = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x101619, metalness: 0, roughness: .98, map: porousCarbon, bumpMap: porousCarbon, bumpScale: .025 }));
    const glass = ownMaterial(new THREE.MeshPhysicalMaterial({ color: 0xf3f8f8, metalness: 0, roughness: .1, clearcoat: 1, clearcoatRoughness: .08, transparent: true, opacity: .085, depthWrite: false }));
    const faceGlass = ownMaterial(new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .08, clearcoat: 1, clearcoatRoughness: .06, transparent: true, opacity: .025, depthWrite: false }));
    const edgeGlass = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xeaf3f4, metalness: .12, roughness: .18, transparent: true, opacity: .58, depthWrite: false }));
    const electrolyte = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xa7cedd, metalness: 0, roughness: .28, transparent: true, opacity: .20, depthWrite: false }));
    const waterRim = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x88afb9, metalness: .02, roughness: .22, transparent: true, opacity: .62, depthWrite: false }));
    const positive = ownMaterial(new THREE.MeshStandardMaterial({ color: 0x19a3ad, metalness: .12, roughness: .34 }));
    const negative = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xe07a3f, metalness: .1, roughness: .36 }));
    const metal = ownMaterial(new THREE.MeshStandardMaterial({ color: 0xb9bfc0, metalness: .82, roughness: .26 }));
    const wireMaterials = [ownMaterial(new THREE.MeshStandardMaterial({ color: 0x171b1d, metalness: 0, roughness: .56 })), ownMaterial(new THREE.MeshStandardMaterial({ color: 0x993238, metalness: 0, roughness: .54 }))];
    const dummy = new THREE.Object3D(), target = new THREE.Vector3(), along = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const electrode = new THREE.InstancedMesh(graphiteBox, graphite, 20);
    electrode.name = 'energy-electrodes'; electrode.castShadow = true; electrode.receiveShadow = true;
    electrode.instanceMatrix.setUsage(THREE.DynamicDrawUsage); electrode.count = 0; scene.add(electrode);
    const channelBacks = new THREE.InstancedMesh(box, innerCarbon, 16);
    channelBacks.name = 'energy-channel-backs'; channelBacks.count = 0; channelBacks.receiveShadow = true; scene.add(channelBacks);
    const glints = new THREE.InstancedMesh(cylinder, edgeGlass, 12); glints.name = 'energy-glass-glints'; glints.count = 0; glints.renderOrder = 5; scene.add(glints);
    const waterline = new THREE.InstancedMesh(cylinder, waterRim, 4); waterline.name = 'energy-waterline'; waterline.count = 0; waterline.renderOrder = 5; scene.add(waterline);
    const tabs = new THREE.InstancedMesh(graphiteBox, metal, 2); tabs.name = 'energy-metal-tabs'; tabs.count = 2; tabs.castShadow = true; scene.add(tabs);
    const leads = [], collars = [];
    for (let i = 0; i < 2; i++) {
      const sign = i ? 1 : -1;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, .46, -.4), new THREE.Vector3(sign * .02, .85, -.42), new THREE.Vector3(sign * .32, 1.18, -.48), new THREE.Vector3(sign * .75, 1.06, -.54), new THREE.Vector3(sign * 1.15, .48, -.58), new THREE.Vector3(sign * 1.48, -.16, -.54)]);
      const lead = new THREE.Mesh(ownGeometry(new THREE.TubeGeometry(curve, 36, .054, 7, false)), wireMaterials[i]);
      lead.name = i ? 'energy-lead-red' : 'energy-lead-black'; lead.castShadow = true; scene.add(lead); leads.push(lead);
      const collar = new THREE.Mesh(cylinder, wireMaterials[i]); collar.name = 'energy-lead-collar-' + i; scene.add(collar); collars.push(collar);
    }
    const cell = [];
    function pane(material, name, order) {
      const mesh = new THREE.Mesh(box, material); mesh.name = name; mesh.renderOrder = order;
      scene.add(mesh); cell.push(mesh); return mesh;
    }
    const back = pane(glass, 'energy-glass-back', 1);
    const liquid = pane(electrolyte, 'energy-electrolyte', 2);
    const front = pane(faceGlass, 'energy-glass-front', 4);
    const edges = [0, 1, 2, 3].map(i => pane(glass, 'energy-glass-edge-' + i, 4));
    let cations = null, anions = null, capacity = 0, signature = '', scale = 1, worldWidth = 9.4, worldHeight = 6;
    let lastState = null, lastTime = -1, lastGeneration = -1;
    const positions = new WeakMap();
    function arrange(mesh, x, y, z, width, height, depth) {
      mesh.position.set(x, y, z); mesh.scale.set(width, height, depth);
    }
    function solidBlock(x0, y0, x1, y1, state) {
      if (x1 <= x0 || y1 <= y0) return;
      dummy.position.set(((x0 + x1) / 2 - state.width / 2) * scale, (state.height / 2 - (y0 + y1) / 2) * scale, -.56);
      dummy.quaternion.identity(); dummy.scale.set((x1 - x0) * scale, (y1 - y0) * scale, 1.12); dummy.updateMatrix();
      electrode.setMatrixAt(electrode.count++, dummy.matrix);
    }
    function segment(mesh, a, b, radius) {
      along.subVectors(b, a); dummy.position.copy(a).add(b).multiplyScalar(.5);
      dummy.quaternion.setFromUnitVectors(up, along.clone().normalize()); dummy.scale.set(radius, along.length(), radius); dummy.updateMatrix();
      mesh.setMatrixAt(mesh.count++, dummy.matrix);
    }
    function rebuild(state) {
      scale = worldWidth / state.width; worldHeight = state.height * scale;
      electrode.count = 0;
      // This union of rectangular solids is exactly the model's solid(x,y):
      // an outer spine plus the bands between slits. The channels are genuinely
      // absent geometry all the way through the graphite block, not blue masks.
      for (const right of [false, true]) {
        const block = (x0, y0, x1, y1) => right ? solidBlock(state.width - x1, y0, state.width - x0, y1, state) : solidBlock(x0, y0, x1, y1, state);
        block(0, 0, state.eW - state.d, state.height);
        let y0 = 0;
        for (const center of state.cy) { block(state.eW - state.d, y0, state.eW, center - state.hs / 2); y0 = center + state.hs / 2; }
        block(state.eW - state.d, y0, state.eW, state.height);
      }
      electrode.instanceMatrix.needsUpdate = true; electrode.computeBoundingBox(); electrode.computeBoundingSphere();
      channelBacks.count = 0;
      for (const right of [false, true]) for (const center of state.cy) {
        const x = right ? state.width - state.eW + state.d / 2 : state.eW - state.d / 2;
        dummy.position.set((x - state.width / 2) * scale, (state.height / 2 - center) * scale, -1.145);
        dummy.quaternion.identity(); dummy.scale.set(state.d * scale, state.hs * scale, .025); dummy.updateMatrix(); channelBacks.setMatrixAt(channelBacks.count++, dummy.matrix);
      }
      channelBacks.instanceMatrix.needsUpdate = true; channelBacks.computeBoundingSphere();
      arrange(back, 0, 0, -1.19, worldWidth + .22, worldHeight + .22, .055);
      arrange(liquid, 0, -.06, -.59, worldWidth + .04, worldHeight - .08, 1.1);
      arrange(front, 0, 0, .245, worldWidth + .22, worldHeight + .22, .035);
      arrange(edges[0], -worldWidth / 2 - .1, 0, -.46, .07, worldHeight + .22, 1.43);
      arrange(edges[1], worldWidth / 2 + .1, 0, -.46, .07, worldHeight + .22, 1.43);
      arrange(edges[2], 0, -worldHeight / 2 - .1, -.46, worldWidth + .22, .07, 1.43);
      arrange(edges[3], 0, worldHeight / 2 + .1, -.46, worldWidth + .22, .07, 1.43);
      const xEdge = worldWidth / 2 + .11, yEdge = worldHeight / 2 + .11, waterY = worldHeight / 2 - .1;
      glints.count = 0; waterline.count = 0;
      for (const z of [-1.2, .26]) {
        segment(glints, new THREE.Vector3(-xEdge, -yEdge, z), new THREE.Vector3(-xEdge, yEdge, z), .019);
        segment(glints, new THREE.Vector3(xEdge, -yEdge, z), new THREE.Vector3(xEdge, yEdge, z), .019);
        segment(glints, new THREE.Vector3(-xEdge, -yEdge, z), new THREE.Vector3(xEdge, -yEdge, z), .021);
        segment(glints, new THREE.Vector3(-xEdge, yEdge, z), new THREE.Vector3(xEdge, yEdge, z), .023);
        segment(waterline, new THREE.Vector3(-xEdge + .06, waterY, z + .012), new THREE.Vector3(xEdge - .06, waterY, z + .012), .012);
      }
      for (const x of [-xEdge, xEdge]) {
        segment(glints, new THREE.Vector3(x, -yEdge, -1.2), new THREE.Vector3(x, -yEdge, .26), .018);
        segment(glints, new THREE.Vector3(x, yEdge, -1.2), new THREE.Vector3(x, yEdge, .26), .018);
        segment(waterline, new THREE.Vector3(x, waterY, -1.18), new THREE.Vector3(x, waterY, .27), .012);
      }
      for (const mesh of [glints, waterline]) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }
      for (let i = 0; i < 2; i++) {
        const tabX = (i ? state.width - state.eW * .25 : state.eW * .25) * scale - worldWidth / 2;
        dummy.position.set(tabX, worldHeight / 2 + .18, -.4); dummy.quaternion.identity(); dummy.scale.set(.23, .56, .13); dummy.updateMatrix(); tabs.setMatrixAt(i, dummy.matrix);
        leads[i].position.set(tabX, worldHeight / 2, 0); arrange(collars[i], tabX, worldHeight / 2 + .46, -.4, .105, .23, .105);
      }
      tabs.instanceMatrix.needsUpdate = true; tabs.computeBoundingSphere();
      studio.setView({ bounds: [-5.66, -worldHeight / 2 - .18, -1.25, 5.66, worldHeight / 2 + 1.32, .33], target: [0, .47, -.35], eye: [1.25, 3.6, 18], fill: [.88, .92], mobileFill: [.88, .92], floorY: -worldHeight / 2 - .27, shadow: [worldWidth + .5, 2.15, .13], exposure: 1, hemisphere: 1.15, key: 2.4, fillLight: .55, environmentIntensity: .48 });
    }
    function reserve(count) {
      if (cations && count <= capacity) return;
      capacity = Math.max(64, Math.ceil(count / 64) * 64);
      if (cations) { scene.remove(cations, anions); cations.dispose(); anions.dispose(); }
      cations = new THREE.InstancedMesh(sphere, positive, capacity);
      anions = new THREE.InstancedMesh(sphere, negative, capacity);
      cations.name = 'energy-cations'; anions.name = 'energy-anions';
      for (const mesh of [cations, anions]) { mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh); }
    }
    function modelPosition(ion, state, point) {
      // Both free and bound ions use the exact model xy map. A small, fixed
      // depth relief gives the spheres volume without inventing another path.
      return point.set((ion.x - state.width / 2) * scale, (state.height / 2 - ion.y) * scale, ion.s ? .068 : .045 + visualHash(ion.id + 371) * .115);
    }
    function safePoint(point, state) {
      const x = point.x / scale + state.width / 2, y = state.height / 2 - point.y / scale, r = state.r;
      const slit = yy => state.cy.some(c => Math.abs(yy - c) < state.hs / 2);
      const solid = (xx, yy) => xx < state.eW ? !(xx > state.eW - state.d && slit(yy)) : xx > state.width - state.eW ? !(xx < state.width - state.eW + state.d && slit(yy)) : false;
      return y >= r && y <= state.height - r && !solid(x - r, y) && !solid(x + r, y) && !solid(x, y - r) && !solid(x, y + r);
    }
    return {
      draw(state, frame = {}) {
        const next = [state.width, state.height, state.eW, state.d, state.hs, ...state.cy].join('|');
        const geometryChanged = next !== signature;
        if (geometryChanged) { signature = next; rebuild(state); }
        reserve(Math.ceil(state.ions.length / 2));
        const elapsed = state.time - lastTime;
        const snap = frame.snap || geometryChanged || state.generation !== lastGeneration || lastTime < 0 || elapsed < 0 || elapsed > .25;
        const blend = snap ? 1 : 1 - Math.exp(-Math.max(0, frame.dt ?? elapsed) / .075);
        cations.count = anions.count = 0;
        for (const ion of state.ions) {
          modelPosition(ion, state, target);
          let shown = positions.get(ion);
          if (!shown) { shown = target.clone(); positions.set(ion, shown); }
          else if (snap || ion.s) shown.copy(target);
          else {
            shown.lerp(target, blend);
            // An interpolated chord must not cut across a graphite corner.
            // If it does, use the real collision-safe model point immediately.
            if (!safePoint(shown, state)) shown.copy(target);
          }
          dummy.position.copy(shown); dummy.quaternion.identity(); dummy.scale.setScalar(state.r * scale * 1.7); dummy.updateMatrix();
          const mesh = ion.q > 0 ? cations : anions; mesh.setMatrixAt(mesh.count++, dummy.matrix);
        }
        cations.instanceMatrix.needsUpdate = anions.instanceMatrix.needsUpdate = true;
        lastState = state; lastTime = state.time; lastGeneration = state.generation; studio.render();
      },
      labels() {
        if (!lastState) return [];
        const s = lastState, viewport = studio.size();
        return [false, true].map(right => {
          const x = right ? s.width - s.eW * .72 : s.eW * .72;
          target.set((x - s.width / 2) * scale, worldHeight / 2 + .35, -.5);
          const p = studio.project(target);
          target.set((x - s.width / 2) * scale, worldHeight / 2, -1.12);
          const upperEdge = studio.project(target);
          // Above the electrode, with room for a 25px HTML glyph even on mobile.
          const y = Math.min(p.y, upperEdge.y - 17.5 / viewport.height);
          return { key: right ? 'energy-positive' : 'energy-negative', text: right ? '+' : '−', x: p.x, y, visible: p.visible && s.V > 0, kind: 'polarity', opacity: .35 + .65 * s.V };
        });
      }
    };
  }

  const VIEWS = { ai: aiView, capture: captureView, synthesis: synthesisView, catalysis: catalysisView, energy: energyView };

  // ---------- runner: tabs, panel, animation loop ----------
  const el = {
    tabs: [...root.querySelectorAll('[data-sim-tab]')], canvas: root.querySelector('.sim-canvas'), start: root.querySelector('.sim-start'),
    title: root.querySelector('.sim-title'), lead: root.querySelector('.sim-lead'), controls: root.querySelector('.sim-controls'),
    read: root.querySelector('.sim-read'), plot: root.querySelector('.sim-plot'), status: root.querySelector('.sim-status'),
    hint: root.querySelector('.sim-hint'), mail: root.querySelector('[data-mail]'), more: root.querySelector('[data-sim-more]')
  };
  const g = el.canvas.getContext('2d'), pg = el.plot.getContext('2d');
  const stage = el.canvas.parentElement;
  let sim = null, area = '', dpr = 1, PW = 0, PH = 0, raf = 0, last = 0, tick = 0, running = false, vals = [], lastStatus = null, pauseBtn = null, lastW = 0, lastH = 0, wasRunning = false;
  let studio = null, view = null, webglFailed = false, visualRaf = 0, visualLast = 0, viewAnimating = false, labelHost = null, solventLabel = null, wasDecorating = false;
  const projectedLabels = new Map();

  function releaseStudio() {
    cancelAnimationFrame(visualRaf); visualRaf = 0; viewAnimating = false;
    for (const node of projectedLabels.values()) node.remove(); projectedLabels.clear();
    view = null;
    if (studio) { studio.dispose(); studio = null; }
    stage.dataset.renderer = '2d';
  }
  function syncLabels(state) {
    if (solventLabel) solventLabel.hidden = !!state.dry;
    if (!labelHost || !view?.labels) return;
    const active = new Set();
    for (const label of view.labels()) {
      active.add(label.key);
      let node = projectedLabels.get(label.key);
      if (!node) { node = document.createElement('span'); labelHost.appendChild(node); projectedLabels.set(label.key, node); }
      node.className = 'sim-projected-label' + (label.kind ? ' sim-label-' + label.kind : '');
      if (node.textContent !== label.text) node.textContent = label.text;
      node.hidden = !label.visible;
      node.style.left = (label.x * 100).toFixed(3) + '%'; node.style.top = (label.y * 100).toFixed(3) + '%';
      node.style.opacity = String(label.opacity ?? 1);
      const box = Number.isFinite(label.width) && Number.isFinite(label.height);
      node.dataset.layout = box ? 'box' : 'point';
      node.style.width = box ? label.width + 'px' : ''; node.style.height = box ? label.height + 'px' : '';
      node.style.transform = box ? 'translate(-50%,-50%)' + (label.rotation ? ' rotate(' + label.rotation + 'deg)' : '') : '';
      node.style.fontSize = label.fontSize ? label.fontSize + 'px' : '';
      node.style.lineHeight = label.lineHeight ? (label.lineHeight > 3 ? label.lineHeight + 'px' : String(label.lineHeight)) : '';
      node.style.textAlign = label.align || '';
      if (label.leader && Number.isFinite(label.anchorX) && Number.isFinite(label.anchorY)) {
        const key = ':leader:' + label.key; active.add(key);
        let line = projectedLabels.get(key);
        if (!line) { line = document.createElement('span'); line.className = 'sim-label-leader'; labelHost.appendChild(line); projectedLabels.set(key, line); }
        const ax = label.anchorX * W, ay = label.anchorY * H, cx = label.x * W, cy = label.y * H;
        const halfW = (label.width || 0) / 2, halfH = (label.height || 0) / 2;
        const bx = clamp(ax, cx - halfW, cx + halfW), by = clamp(ay, cy - halfH, cy + halfH);
        const dx = bx - ax, dy = by - ay;
        line.hidden = !label.visible;
        line.style.left = (label.anchorX * 100).toFixed(3) + '%'; line.style.top = (label.anchorY * 100).toFixed(3) + '%';
        line.style.width = Math.hypot(dx, dy).toFixed(2) + 'px'; line.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
      }
    }
    for (const [key, node] of projectedLabels) if (!active.has(key)) { node.remove(); projectedLabels.delete(key); }
  }
  function illustration(options) {
    if (!sim || !VIEWS[area] || document.hidden || webglFailed) return false;
    if (!studio) {
      studio = makeStudio(stage, () => { webglFailed = true; releaseStudio(); draw(); });
      if (!studio) { webglFailed = true; return false; }
      try { view = VIEWS[area](studio); studio.resize(W, H); studio.renderer.shadowMap.needsUpdate = true; }
      catch (error) { webglFailed = true; releaseStudio(); return false; }
      stage.dataset.renderer = 'webgl';
    }
    try { const state = sim.view(); viewAnimating = !!view.draw(state, options); syncLabels(state); return true; }
    catch (error) { webglFailed = true; releaseStudio(); return false; }
  }
  function draw(options = {}) {
    if (illustration(options)) return;
    viewAnimating = false;
    // The original 2D drawing stays intact, including in browsers without WebGL.
    g.save();
    if (sim.view) { const state = sim.view(); g.scale(W / state.width, H / state.height); }
    sim.draw(g); g.restore();
  }
  function sceneLabels() {
    stage.querySelector('.sim-scene-labels')?.remove();
    projectedLabels.clear(); labelHost = null; solventLabel = null;
    stage.dataset.area = area;
    if (!VIEWS[area]) return;
    const labels = document.createElement('div'); labels.className = 'sim-scene-labels';
    const ko = lang === 'ko';
    if (area === 'capture') labels.innerHTML = '<div class="sim-flow"><span>' + esc(T.capture.inlet) + ' <b>→</b></span><span>' + esc(T.capture.outlet) + ' <b>→</b></span></div>' +
      '<div class="sim-legend"><span><i class="sim-molecule sim-co2" aria-hidden="true"></i>CO₂ <em>' + (ko ? '흡착' : 'adsorbed') + '</em></span>' +
      '<span><i class="sim-molecule sim-n2" aria-hidden="true"></i>N₂ <em>' + (ko ? '통과' : 'passes through') + '</em></span>' +
      '<span class="sim-framework-key"><i aria-hidden="true"></i>' + (ko ? '다공성 골격' : 'Porous framework') + '</span></div>';
    if (area === 'catalysis') labels.innerHTML = '<div class="sim-legend"><span><i class="sim-ion-key" aria-hidden="true"></i>H⁺ <em>' + (ko ? '용액' : 'solution') + '</em></span><span><i class="sim-h-key" aria-hidden="true"></i>H <em>' + (ko ? '흡착' : 'adsorbed') + '</em></span><span><i class="sim-molecule sim-h2" aria-hidden="true"></i>H₂ <em>' + (ko ? '발생' : 'released') + '</em></span></div>';
    if (area === 'synthesis') {
      const legend = document.createElement('div'); legend.className = 'sim-legend';
      const particles = document.createElement('span'); particles.innerHTML = '<i class="sim-colloid-key" aria-hidden="true"></i>' + (ko ? '입자와 연결 구조' : 'Particles & connections');
      solventLabel = document.createElement('span'); solventLabel.className = 'sim-solvent';
      solventLabel.innerHTML = '<i class="sim-liquid-key" aria-hidden="true"></i>' + (ko ? '용매' : 'Solvent');
      legend.appendChild(particles); legend.appendChild(solventLabel); labels.appendChild(legend);
    }
    if (area === 'energy') labels.innerHTML = '<div class="sim-legend"><span><i class="sim-cation-key" aria-hidden="true"></i>' + (ko ? '양이온' : 'Cation') + '</span><span><i class="sim-anion-key" aria-hidden="true"></i>' + (ko ? '음이온' : 'Anion') + '</span><span><i class="sim-electrode-key" aria-hidden="true"></i>' + (ko ? '전극 (다공성 탄소)' : 'Electrode (porous carbon)') + '</span></div>';
    stage.appendChild(labels); labelHost = labels;
  }

  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = el.canvas.getBoundingClientRect();
    W = Math.max(260, Math.round(r.width)); H = Math.max(190, Math.round(r.height)); lastW = W; lastH = H;
    el.canvas.width = Math.round(W * dpr); el.canvas.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (studio) studio.resize(W, H);
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
  function visualFrame(now) {
    visualRaf = 0;
    if (document.hidden || running || !view) return;
    const dt = Math.min(.05, Math.max(0, (now - visualLast) / 1000)); visualLast = now;
    draw({ dt });
    if (viewAnimating) visualRaf = requestAnimationFrame(visualFrame);
  }
  function paint(snap = false) {
    if (snap || reduce) { cancelAnimationFrame(visualRaf); visualRaf = 0; }
    draw({ dt: 0, snap: snap || reduce }); info();
    if (viewAnimating && !visualRaf && !running && !document.hidden && !reduce) {
      stage.dataset.motion = 'active';
      visualLast = performance.now(); visualRaf = requestAnimationFrame(visualFrame);
    }
  }
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    sim.step(dt); draw();
    if (now - tick > 180) { tick = now; info(); }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (sim && !sim.animated) {
      if (document.hidden) { wasDecorating = !reduce; return; }
      stage.dataset.motion = reduce ? 'paused' : 'active';
      if (viewAnimating && !reduce && !visualRaf) { visualLast = performance.now(); visualRaf = requestAnimationFrame(visualFrame); }
      return;
    }
    if (running || !sim) return;
    if (document.hidden) { wasRunning = true; return; }
    running = true; el.start.hidden = true; if (pauseBtn) pauseBtn.textContent = T.ui.pause; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function stop(preserveResume = false) { running = false; stage.dataset.motion = 'paused'; if (!preserveResume) { wasRunning = false; wasDecorating = false; } cancelAnimationFrame(raf); cancelAnimationFrame(visualRaf); visualRaf = 0; if (pauseBtn) pauseBtn.textContent = T.ui.resume; }

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
    stop(); releaseStudio(); wasRunning = false; area = a; pauseBtn = null;
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
    el.canvas.style.cursor = 'default';
    lastStatus = null; sim.reset(); sceneLabels(); paint();
    stage.dataset.motion = reduce ? 'paused' : 'active';
    if (sim.pointer && !view?.hit) el.canvas.style.cursor = 'crosshair';
    el.start.hidden = true;
    if (sim.animated) { if (reduce) { el.start.hidden = false; if (pauseBtn) pauseBtn.textContent = T.ui.resume; } else start(); }
  }

  el.start.textContent = T.ui.start;
  el.start.addEventListener('click', start);
  el.tabs.forEach((tab, i) => {
    tab.addEventListener('click', e => { e.preventDefault(); open(tab.dataset.simTab); history.replaceState(null, '', '#' + tab.dataset.simTab); });
    tab.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault(); const next = el.tabs[(i + (e.key === 'ArrowRight' ? 1 : el.tabs.length - 1)) % el.tabs.length]; next.focus(); next.click(); });
  });
  function pointerPosition(event) {
    const r = el.canvas.getBoundingClientRect();
    return { x: (event.clientX - r.left) * W / r.width, y: (event.clientY - r.top) * H / r.height };
  }
  el.canvas.addEventListener('pointerdown', e => {
    if (!sim || !sim.pointer) return;
    const p = pointerPosition(e);
    if (view?.hit && sim.experiment) {
      const hit = view.hit(p.x, p.y, W, H); if (!hit) return;
      sim.experiment(hit.x, hit.y);
    } else sim.pointer(p.x, p.y);
    paint();
  });
  el.canvas.addEventListener('pointermove', e => {
    if (!view?.hit) return;
    const p = pointerPosition(e); el.canvas.style.cursor = view.hit(p.x, p.y, W, H) ? 'crosshair' : 'default';
  });
  el.canvas.addEventListener('pointerleave', () => { if (view?.hit) el.canvas.style.cursor = 'default'; });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (AREAS.includes(h) && h !== area) open(h); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { wasRunning = wasRunning || running; wasDecorating = wasDecorating || stage.dataset.motion === 'active'; stop(true); releaseStudio(); }
    else { paint(); if (wasRunning) start(); if (wasDecorating && !reduce) stage.dataset.motion = 'active'; wasRunning = false; wasDecorating = false; }
  });
  addEventListener('pagehide', () => { wasRunning = wasRunning || running; wasDecorating = wasDecorating || stage.dataset.motion === 'active'; stop(true); releaseStudio(); });
  addEventListener('pageshow', event => { if (event.persisted) { paint(); if (wasRunning) start(); if (wasDecorating && !reduce) stage.dataset.motion = 'active'; wasRunning = false; wasDecorating = false; } });
  if ('ResizeObserver' in window) {
    let timer = 0;
    new ResizeObserver(() => { const rect = el.canvas.getBoundingClientRect(); if (!sim || (Math.abs(Math.round(rect.width) - lastW) < 2 && Math.abs(Math.round(rect.height) - lastH) < 2)) return; clearTimeout(timer); timer = setTimeout(() => { size(); if (sim.plot) sizePlot(); if (sim.resize) sim.resize(W, H); else sim.reset(); paint(); }, 150); }).observe(el.canvas);
  }
  open(location.hash.slice(1));
  // a small handle for checking the models from the console
  window.dmseSim = {
    open, start, stop, get area() { return area; }, get running() { return running; }, peek: () => (sim && sim.peek ? sim.peek() : null), size: () => ({ W, H }),
    advance(seconds) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) sim.step(1 / 60); paint(true); }
  };
})();
