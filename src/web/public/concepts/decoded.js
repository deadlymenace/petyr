// Concept B · Decoded — motion layer.
// The hero stack shuffles through three example documents and Petyr
// highlights each one, with notes pinned in the margin beside their
// passage. Below: jargon struck through and rewritten on scroll, a 10-K
// contents page that draws itself, a before/after slider, a printing
// receipt and a stamp on sign-up. Everything renders complete without it.

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- reveals
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight * 0.92 && r.bottom > 0;
  };
  function observeOnce(els, cls, options, onEnter) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        e.target.classList.add(cls);
        onEnter?.(e.target);
      }
    }, options);
    els.forEach((el) => io.observe(el));
  }
  const reveals = $$('[data-reveal]');
  reveals.forEach((el) => { if (inView(el)) el.classList.add('in'); });
  document.documentElement.classList.add('js');
  observeOnce(reveals.filter((el) => !el.classList.contains('in')), 'in', { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });

  // Jargon rows rewrite as they cross the middle of the screen.
  observeOnce($$('.jr'), 'on', { rootMargin: '-32% 0px -32% 0px' });
  observeOnce($$('.toc-row'), 'in', { rootMargin: '0px 0px -12% 0px', threshold: 0.4 });
  observeOnce([$('#feed')].filter(Boolean), 'in', { threshold: 0.35 });
  const quoteHl = $('#quote-hl');
  if (quoteHl) observeOnce([quoteHl], 'on', { threshold: 1 });

  // ---------------------------------------------------------------- margin notes
  // Pin each note beside its highlighted passage, pushing down to avoid overlap.
  const wide = matchMedia('(min-width: 641px)');
  function placeNotes(sheet) {
    const body = $('.sh-body', sheet);
    const list = $('.notes', body);
    body.classList.toggle('placed', wide.matches);
    if (!wide.matches) { list.style.height = ''; return; }
    let bottom = 0;
    for (const li of $$('li', list)) {
      const mark = $(`mark[data-n="${li.dataset.n}"]`, body);
      const top = Math.max(mark ? mark.offsetTop : 0, bottom ? bottom + 12 : 0);
      li.style.top = `${top}px`;
      bottom = top + li.offsetHeight;
    }
    list.style.height = `${bottom}px`;
  }
  const sheets = $$('.sheet').sort((a, b) => a.dataset.i - b.dataset.i);
  const layout = () => sheets.forEach(placeNotes);
  layout();
  document.fonts?.ready.then(layout);
  let resizeRaf = 0;
  addEventListener('resize', () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(layout); });

  // ---------------------------------------------------------------- sheet stack
  const stack = $('#stack');
  if (stack && sheets.length) {
    const tabs = $$('.stack-tabs button', stack);
    const HOLD_FIRST = 5200, CYCLE = 9800;
    let order = sheets.map((_, i) => i); // order[pos] = sheet index
    let epoch = 0, progress = null, hovering = false, visible = true;

    function startProgress(i, duration) {
      progress?.cancel();
      $$('.prog', stack).forEach((p) => { p.style.transform = 'scaleX(0)'; });
      if (reduce) return;
      progress = $('.prog', tabs[i]).animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration, fill: 'forwards' });
      if (hovering || !visible || document.hidden) progress.pause();
      progress.onfinish = () => show((i + 1) % sheets.length);
    }

    function shuffleTo(i) {
      const out = sheets[order[0]];
      // New order: chosen sheet to the front, the rest keep their relative order.
      order = [i, ...order.filter((n) => n !== i)];
      if (reduce) { order.forEach((n, pos) => { sheets[n].dataset.pos = String(pos); }); return; }
      const from = getComputedStyle(out).transform;
      order.forEach((n, pos) => { if (sheets[n] !== out) sheets[n].dataset.pos = String(pos); });
      out.style.transition = 'none';
      out.classList.add('leaving');
      out.dataset.pos = String(order.indexOf(Number(out.dataset.i)));
      const to = getComputedStyle(out).transform;
      out.animate([
        { transform: from, zIndex: 3 },
        { transform: 'translate(38%, 34px) rotate(7deg)', zIndex: 3, offset: 0.45 },
        { transform: 'translate(38%, 34px) rotate(7deg)', zIndex: 0, offset: 0.5 },
        { transform: to, zIndex: 0 },
      ], { duration: 1050, easing: 'cubic-bezier(.55,0,.25,1)' }).finished
        .catch(() => {})
        .finally(() => { out.style.transition = ''; out.classList.remove('leaving'); });
    }

    async function show(i) {
      const my = ++epoch;
      tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
      startProgress(i, CYCLE);
      if (order[0] !== i) shuffleTo(i);
      const sheet = sheets[i];
      const marks = $$('mark', sheet), notes = $$('.notes li', sheet);
      if (reduce) { marks.concat(notes).forEach((el) => el.classList.add('on')); return; }
      marks.concat(notes).forEach((el) => el.classList.remove('on'));
      await wait(700);
      for (let n = 0; n < marks.length; n++) {
        if (my !== epoch) return;
        marks[n].classList.add('on');
        await wait(620);
        if (my !== epoch) return;
        notes[n]?.classList.add('on');
        await wait(420);
      }
    }

    tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
    stack.addEventListener('pointerenter', () => { hovering = true; progress?.pause(); });
    stack.addEventListener('pointerleave', () => { hovering = false; if (visible && !document.hidden) progress?.play(); });
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!progress) return;
      if (visible && !hovering && !document.hidden) progress.play(); else progress.pause();
    }).observe(stack);
    document.addEventListener('visibilitychange', () => {
      if (!progress) return;
      if (document.hidden) progress.pause(); else if (visible && !hovering) progress.play();
    });

    // The first sheet is already marked up in the HTML; hold it, then cycle.
    startProgress(0, HOLD_FIRST);
  }

  // ---------------------------------------------------------------- compare slider
  const compare = $('#compare');
  if (compare) {
    const range = $('.cmp-range', compare);
    let touched = false;
    const set = (v) => { compare.style.setProperty('--pos', `${v}%`); };
    range.addEventListener('input', () => { touched = true; set(range.value); });
    // One demo sweep the first time it comes into view, unless the reader got there first.
    if (!reduce) {
      observeOnce([compare], 'seen', { threshold: 0.5 }, () => {
        const keys = [[0, 50], [0.35, 86], [0.75, 18], [1, 50]];
        const t0 = performance.now(), dur = 2600;
        const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
        const tick = (now) => {
          if (touched) return;
          const t = Math.min(1, (now - t0) / dur);
          let k = 1;
          while (k < keys.length - 1 && t > keys[k][0]) k++;
          const [ta, va] = keys[k - 1], [tb, vb] = keys[k];
          const v = va + (vb - va) * ease((t - ta) / (tb - ta));
          set(v.toFixed(2));
          range.value = String(Math.round(v));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }
  }

  // ---------------------------------------------------------------- waitlist stamp
  document.addEventListener('petyr:waitlist-joined', (e) => {
    if (e.detail.formId !== 'waitlist-form-foot') return;
    const form = $('#waitlist-form-foot');
    form.classList.remove('stamped');
    void form.offsetWidth;
    form.classList.add('stamped');
  });
})();
