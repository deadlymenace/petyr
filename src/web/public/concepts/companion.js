// Concept · Companion — motion layer.
// Petyr's dock (bird, speech bubble, clock) follows the reader through a
// day: whichever section crosses the middle of the screen sets what Petyr
// says, the time on the clock and whether the sky is day or night. Below
// that: old-way cards flip to their tokenized version, the afternoon chat
// builds in a sticky phone, stars twinkle over the night watch, and the
// weekend bars fill in. Everything renders complete without this script.

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const root = document.documentElement;

  // ---------------------------------------------------------------- reveals
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight * 0.92 && r.bottom > 0;
  };
  function observeOnce(els, options, onEnter) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        onEnter(e.target);
      }
    }, options);
    els.forEach((el) => io.observe(el));
  }
  const reveals = $$('[data-reveal]');
  reveals.forEach((el) => { if (inView(el)) el.classList.add('in'); });
  root.classList.add('js');
  observeOnce(reveals.filter((el) => !el.classList.contains('in')),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }, (el) => el.classList.add('in'));

  // ---------------------------------------------------------------- the dock
  const bubble = $('#bubble'), sayEl = $('#b-say'), timeEl = $('#b-time');
  const clock = $('#clock'), clockT = $('#clock-t'), bird = $('#bird');
  const narrow = matchMedia('(max-width: 640px)');
  let current = null, closed = false, tuckTimer = 0;

  function replay(el, cls, ms) {
    if (reduce || !el) return;
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
    if (ms) setTimeout(() => el.classList.remove(cls), ms);
  }
  function showBubble() {
    bubble.classList.remove('hide');
    replay(bubble, 'pop');
    // The bubble tucks away after a moment so it never sits on the content
    // for long; it comes back with each new section, or on a tap of the bird.
    clearTimeout(tuckTimer);
    tuckTimer = setTimeout(() => bubble.classList.add('hide'), narrow.matches ? 5000 : 9000);
  }
  function speak(el, line = el.dataset.say) {
    current = el;
    // Read the tone from the page, never from <html>, which carries the current one.
    root.dataset.tone = el.dataset.tone || el.closest('section, header')?.dataset.tone || 'day';
    if (clockT.textContent !== el.dataset.time) {
      clockT.textContent = el.dataset.time;
      replay(clock, 'tick');
    }
    timeEl.textContent = el.dataset.time;
    sayEl.textContent = line;
    if (!closed) showBubble();
    replay(bird, 'fly', 750);
  }

  const speakers = $$('[data-say]');
  const speakerIo = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.target !== current) speak(e.target);
  }, { rootMargin: '-46% 0px -53% 0px' });
  speakers.forEach((el) => speakerIo.observe(el));
  current = speakers[0];
  tuckTimer = setTimeout(() => bubble.classList.add('hide'), narrow.matches ? 6000 : 10000);

  $('#b-x').addEventListener('click', () => { closed = true; bubble.classList.add('hide'); });
  $('#dock-bird').addEventListener('click', () => {
    const opening = bubble.classList.contains('hide');
    closed = !opening;
    if (opening) showBubble(); else bubble.classList.add('hide');
    replay(bird, 'fly', 750);
  });

  // The bird's eyes follow the mouse.
  const pupils = $('.pupils', bird);
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = bird.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height * 0.48);
    const len = Math.hypot(dx, dy) || 1, k = Math.min(1, len / 200);
    pupils.style.transform = `translate(${((dx / len) * 4.5 * k).toFixed(2)}px,${((dy / len) * 3.5 * k).toFixed(2)}px)`;
  }, { passive: true });

  // ---------------------------------------------------------------- flips
  const flips = $$('.flip');
  const setFlip = (f, tokenized) => {
    f.classList.toggle('old', !tokenized);
    f.setAttribute('aria-pressed', String(tokenized));
  };
  flips.forEach((f) => {
    const toggle = () => setFlip(f, f.classList.contains('old'));
    f.addEventListener('click', toggle);
    f.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  const grid = $('#flips');
  if (grid && !reduce && !inView(grid)) {
    // Start on "the old way", then flip one by one when the grid scrolls in.
    flips.forEach((f) => setFlip(f, false));
    observeOnce([grid], { threshold: 0.35 }, () => {
      flips.forEach((f, i) => setTimeout(() => setFlip(f, true), 250 + i * 160));
    });
  }

  // ---------------------------------------------------------------- the day (sticky phone)
  const steps = $$('.step'), groups = $$('#thread .grp');
  const wide = matchMedia('(min-width: 1001px)');
  function setStep(n) {
    steps.forEach((s) => s.classList.toggle('on', !wide.matches || Number(s.dataset.step) === n));
    groups.forEach((g) => {
      const k = Number(g.dataset.step);
      g.classList.toggle('later', k > n);
      g.classList.toggle('now', k === n);
    });
  }
  if (steps.length) {
    const stepIo = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setStep(Number(e.target.dataset.step));
    }, { rootMargin: '-46% 0px -53% 0px' });
    steps.forEach((s) => stepIo.observe(s));
    wide.addEventListener('change', () => setStep(Number($('.step.on')?.dataset.step || 1)));
    setStep(1);
  }

  // ---------------------------------------------------------------- night sky
  const canvas = $('#stars');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const section = canvas.parentElement;
    let stars = [], w = 0, h = 0, dpr = 1, raf = 0, meteor = null, nextMeteor = 0;
    const build = () => {
      const r = section.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(320, Math.round((w * h) / 6500));
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: 0.3 + Math.pow(Math.random(), 3) * 1.5,
        a: 0.35 + Math.random() * 0.65,
        s: 0.4 + Math.random() * 1.8, p: Math.random() * Math.PI * 2,
        gold: Math.random() < 0.12,
      }));
    };
    const draw = (t) => {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin((t / 1000) * s.s + s.p);
        ctx.globalAlpha = s.a * tw;
        ctx.fillStyle = s.gold ? '#F3D08A' : '#FFFFFF';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce) {
        if (!meteor && t > nextMeteor) {
          meteor = { x: w * (0.1 + Math.random() * 0.6), y: h * (0.3 + Math.random() * 0.3), t0: t };
          nextMeteor = t + 6000 + Math.random() * 6000;
        }
        if (meteor) {
          const k = (t - meteor.t0) / 900;
          if (k >= 1) meteor = null;
          else {
            const x = meteor.x + k * 260, y = meteor.y + k * 120;
            const g = ctx.createLinearGradient(x - 110, y - 50, x, y);
            g.addColorStop(0, 'rgba(243,208,138,0)'); g.addColorStop(1, 'rgba(255,244,214,.9)');
            ctx.globalAlpha = 1 - k; ctx.strokeStyle = g; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(x - 110, y - 50); ctx.lineTo(x, y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    const loop = (t) => { draw(t); raf = requestAnimationFrame(loop); };
    build();
    draw(0);
    new ResizeObserver(() => { build(); draw(performance.now()); }).observe(section);
    if (!reduce) {
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !raf) raf = requestAnimationFrame(loop);
        if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
      }).observe(section);
    }
  }

  // ---------------------------------------------------------------- night log, weekend bars
  observeOnce($$('#nlog, #week'), { threshold: 0.4 }, (el) => el.classList.add('in'));

  // ---------------------------------------------------------------- waitlist
  document.addEventListener('petyr:waitlist-joined', () => {
    closed = false;
    if (current) speak(current, 'See you soon. I saved you a seat.');
    replay(bird, 'celebrate', 2600);
  });
})();
