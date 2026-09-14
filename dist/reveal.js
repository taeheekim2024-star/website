// DMSE Lab — reveal-on-scroll for .reveal elements and a light parallax on research images.
(function () {
  const els = Array.from(document.querySelectorAll('.reveal'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!els.length) return;
  if (reduce || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(e => io.observe(e));
  const imgs = Array.from(document.querySelectorAll('.rimg img'));
  if (!imgs.length) return;
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
})();
