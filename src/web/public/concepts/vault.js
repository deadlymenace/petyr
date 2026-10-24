// Concept C · Vault — motion layer.
// The hero lens follows the pointer (or glides between tokens on its own)
// and reveals what backs each token. Below: a scan line ticks off the
// eight checks, the premium bars grow, the asset classes orbit the bird,
// and the seal stamps on sign-up. Everything renders complete without it.

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

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
  document.documentElement.classList.add('js');
  observeOnce(reveals.filter((el) => !el.classList.contains('in')),
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 }, (el) => el.classList.add('in'));

  // Run a frame loop only while its element is on screen.
  function loopWhileVisible(el, frame) {
    let raf = 0, last = 0;
    const tick = (now) => {
      frame(now, last ? Math.min(64, now - last) : 16.7);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(tick); }
      if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(el);
  }

  // ---------------------------------------------------------------- lens
  const xr = $('#xray');
  if (xr) {
    const cells = $$('#xr-in .cell');
    const hint = $('#xr-hint');
    let centers = [];
    const measure = () => {
      const box = xr.getBoundingClientRect();
      // Aim at the middle of each token's column (or row on phones) so the
      // lens covers both the picture and the facts underneath.
      centers = cells.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2 };
      });
    };
    measure();
    addEventListener('resize', measure);
    document.fonts?.ready.then(measure);

    let idx = 0, mode = 'idle', until = 0, lastSwitch = performance.now();
    const cur = { ...centers[0] }, target = { ...centers[0] };
    const apply = () => {
      xr.style.setProperty('--x', `${cur.x.toFixed(1)}px`);
      xr.style.setProperty('--y', `${cur.y.toFixed(1)}px`);
    };
    apply();

    const nearest = (x, y) => centers.reduce((best, c, i) =>
      (Math.hypot(c.x - x, c.y - y) < Math.hypot(centers[best].x - x, centers[best].y - y) ? i : best), 0);
    const local = (e) => { const b = xr.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    const pin = (i, ms) => {
      idx = i; mode = 'pinned'; until = performance.now() + ms;
      Object.assign(target, centers[i]);
      if (reduce) { Object.assign(cur, target); apply(); }
    };

    xr.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      Object.assign(target, local(e));
      mode = 'pointer'; until = performance.now() + 2200;
      if (reduce) { Object.assign(cur, target); apply(); }
    });
    xr.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch') return;
      const p = local(e);
      pin(nearest(p.x, p.y), 6000);
    });
    cells.forEach((c, i) => c.addEventListener('focus', () => pin(i, 8000)));
    if (hint && matchMedia('(hover: none)').matches) hint.textContent = 'Tap a token to look inside';

    if (!reduce) {
      loopWhileVisible(xr, (now, dt) => {
        if (mode !== 'idle' && now > until) { mode = 'idle'; lastSwitch = now; idx = nearest(cur.x, cur.y); }
        if (mode === 'idle') {
          if (now - lastSwitch > 2800) { idx = (idx + 1) % centers.length; lastSwitch = now; }
          Object.assign(target, centers[idx]);
        }
        // Frame-rate independent easing toward the target.
        const k = 1 - Math.pow(1 - (mode === 'pointer' ? 0.2 : 0.075), dt / 16.7);
        cur.x += (target.x - cur.x) * k;
        cur.y += (target.y - cur.y) * k;
        apply();
      });
    }
  }

  // ---------------------------------------------------------------- checks scan
  const grid = $('#checks-grid');
  if (grid) {
    const checks = $$('.chk', grid);
    const finish = () => { checks.forEach((c) => c.classList.add('ok')); grid.classList.add('done'); };
    if (reduce) finish();
    else {
      observeOnce([grid], { threshold: 0.35 }, () => {
        const h = grid.offsetHeight, dur = 2400;
        $('.scan', grid).animate([
          { transform: 'translateY(0)', opacity: 0 },
          { opacity: 1, offset: 0.08 },
          { opacity: 1, offset: 0.92 },
          { transform: `translateY(${h}px)`, opacity: 0 },
        ], { duration: dur, easing: 'cubic-bezier(.45,0,.55,1)' });
        // Each check lights up as the line passes its middle, left to right within a row.
        checks.forEach((c) => {
          const at = ((c.offsetTop + c.offsetHeight * 0.5) / h) * dur + (c.offsetLeft / grid.offsetWidth) * 260;
          setTimeout(() => c.classList.add('ok'), at);
        });
        setTimeout(finish, dur + 300);
      });
    }
  }

  // ---------------------------------------------------------------- orbit
  const orbit = $('#orbit');
  if (orbit && !reduce) {
    const orbs = $$('.orb', orbit);
    const RX = 36, RY = 34, SPEED = 0.00012; // percent of the box; radians per ms
    let paused = false, phase = 0;
    orbit.addEventListener('pointerenter', () => { paused = true; });
    orbit.addEventListener('pointerleave', () => { paused = false; });
    loopWhileVisible(orbit, (now, dt) => {
      if (!paused) phase += dt * SPEED;
      orbs.forEach((o, i) => {
        const a = Math.PI / 2 - i * (Math.PI / 3) + phase;
        const depth = (Math.sin(a) + 1) / 2; // 1 = front (bottom of the ellipse)
        o.style.setProperty('--ox', `${(50 + Math.cos(a) * RX).toFixed(2)}%`);
        o.style.setProperty('--oy', `${(50 + Math.sin(a) * RY).toFixed(2)}%`);
        o.style.setProperty('--os', (0.8 + depth * 0.2).toFixed(3));
        o.style.setProperty('--oo', (0.45 + depth * 0.55).toFixed(3));
        o.style.setProperty('--oz', depth > 0.42 ? '6' : '4');
      });
    });
  }

  // ---------------------------------------------------------------- waitlist seal
  document.addEventListener('petyr:waitlist-joined', () => {
    const seal = $('#seal');
    if (!seal) return;
    seal.classList.remove('joined');
    void seal.offsetWidth;
    seal.classList.add('joined');
  });
})();
