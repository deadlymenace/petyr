// Concept A · Verdict — motion layer.
// Hero Ask card cycles through example questions (stock, treasury token,
// gold token, stock token); the bird watches the pointer; the depth stage
// follows scroll; briefs, count-ups and reveals play once on entry.
// Everything renders complete without this script.

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------------------------------------------------------- reveals
  // Mark what is already on screen before hiding the rest, so nothing visible flickers.
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight * 0.92 && r.bottom > 0;
  };
  const onEnter = new Map(); // element -> callback when it first scrolls in
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      e.target.classList.add('in');
      onEnter.get(e.target)?.();
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });

  function whenSeen(el, fn) {
    if (!el) return;
    if (fn) onEnter.set(el, fn);
    if (inView(el)) { el.classList.add('in'); fn?.(); return; }
    io.observe(el);
  }

  $$('[data-reveal]').forEach((el) => { if (inView(el)) el.classList.add('in'); });
  document.documentElement.classList.add('js');
  $$('[data-reveal]').forEach((el) => { if (!el.classList.contains('in')) io.observe(el); });

  // ---------------------------------------------------------------- count-up
  const NUM_RE = /^([^\d]*)(\d[\d,]*(?:\.\d+)?)(.*)$/;
  function countUp(el, { from, to, duration = 900 } = {}) {
    const text = el.textContent.trim();
    const m = NUM_RE.exec(text);
    if (!m || reduce) return;
    const [, pre, num, post] = m;
    const target = to ?? parseFloat(num.replace(/,/g, ''));
    const start = from ?? 0;
    const decimals = (num.split('.')[1] || '').length;
    const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(start + (target - start) * eased) + post;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  $$('[data-count]').forEach((el) => {
    const host = el.closest('[data-reveal]') || el;
    const run = () => countUp(el, { from: Number(el.dataset.countFrom || 0), to: Number(el.dataset.count) });
    if (host === el) whenSeen(el, run);
    else onEnter.set(host, ((prev) => () => { prev?.(); run(); })(onEnter.get(host)));
  });

  // ---------------------------------------------------------------- bird gaze
  const birds = $$('.bird-svg').filter((b) => $('.pupils', b));
  let pointer = null;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    pointer = { x: e.clientX, y: e.clientY };
    requestAnimationFrame(updateGaze);
  }, { passive: true });
  function updateGaze() {
    for (const bird of birds) {
      const pupils = $('.pupils', bird);
      const r = bird.getBoundingClientRect();
      if (!pointer) { pupils.style.transform = 'translate(-3px,3px)'; continue; }
      const cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.48;
      const dx = pointer.x - cx, dy = pointer.y - cy;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, len / 240);
      pupils.style.transform = `translate(${((dx / len) * 4.5 * k).toFixed(2)}px,${((dy / len) * 3.5 * k).toFixed(2)}px)`;
    }
  }
  addEventListener('scroll', () => { if (pointer) requestAnimationFrame(updateGaze); }, { passive: true });
  updateGaze();

  function hop(bird) {
    if (!bird || reduce) return;
    bird.classList.remove('hop');
    void bird.getBoundingClientRect();
    bird.classList.add('hop');
    setTimeout(() => bird.classList.remove('hop'), 700);
  }

  // ---------------------------------------------------------------- Ask card
  // Series are 0..1 values drawn into a 320×58 viewBox. USDY's line is the
  // slow straight climb of a yield-accruing price; xNVDA shows both lines.
  const SCENARIOS = [
    {
      q: 'Is NVDA overvalued at these levels?',
      tools: ['financial_search', 'read_filings', 'skill · dcf'],
      method: 'Petyr · DCF + multiples',
      read: 'Priced for near-perfection, but the growth still backs it.',
      tiles: [['Fwd P/E', '31.4×'], ['Rev growth', '+94%', 'up'], ['Fair value', '$142']],
      series: [0.18, 0.25, 0.32, 0.3, 0.5, 0.58, 0.72, 0.8, 0.89],
      color: '#34D399',
      badges: [['FAIRLY VALUED', 'gold']],
      note: 'Trading ~8% above my base-case DCF.',
      asof: 'basis: base-case DCF · confidence: medium · as of today, 9:14 ET',
    },
    {
      q: 'Is USDY a safe place to park stablecoins?',
      tools: ['issuer_docs', 'onchain_read', 'macro_search'],
      method: 'Petyr · backing + redemption',
      read: 'Backed by short-term Treasuries and bank deposits. Built for holders outside the US.',
      tiles: [['Yield', '4.6%'], ['Last attestation', 'Oct 1', '', false], ['Price vs NAV', '+0.1%']],
      series: [0.12, 0.21, 0.31, 0.4, 0.5, 0.59, 0.69, 0.78, 0.88],
      color: '#86A9FF',
      badges: [['BACKING VERIFIED', 'green'], ['NON-US ONLY', 'azure']],
      note: 'Yield accrues in the price.',
      asof: 'basis: reserve attestation + issuer terms · confidence: high · Oct 1 report',
    },
    {
      q: 'Is PAXG actually backed by gold?',
      tools: ['issuer_docs', 'reference_price', 'dex_liquidity'],
      method: 'Petyr · backing + liquidity',
      read: 'Each token is tied to allocated gold in a vault, and the last audit matches supply.',
      tiles: [['Premium to spot', '+0.3%'], ['Last attestation', 'Sep 30', '', false], ['DEX depth ±2%', '$1.8M']],
      series: [0.3, 0.36, 0.33, 0.45, 0.52, 0.49, 0.63, 0.7, 0.76],
      color: '#E6B860',
      badges: [['BACKING VERIFIED', 'green']],
      note: '1 token = 1 troy ounce, checked monthly.',
      asof: 'basis: monthly attestation vs on-chain supply · confidence: high',
    },
    {
      q: 'Is xNVDA the same as owning NVDA?',
      tools: ['financial_search', 'reference_price', 'dex_liquidity'],
      method: 'Petyr · underlying + wrapper',
      read: 'Same company exposure, different claim. You hold a token backed by shares, not the shares.',
      tiles: [['Premium to NVDA', '+0.6%'], ['DEX depth ±1%', '$420K'], ['Backing', '1 : 1', '', false]],
      series: [0.18, 0.25, 0.32, 0.3, 0.5, 0.58, 0.72, 0.8, 0.86],
      series2: [0.2, 0.28, 0.35, 0.33, 0.54, 0.62, 0.76, 0.85, 0.9],
      color: '#34D399',
      badges: [['FAIRLY VALUED', 'gold'], ['TRADES AT A PREMIUM', 'amber']],
      note: 'The wrapper costs about 0.6% extra today.',
      asof: 'basis: base-case DCF + wrapper premium · confidence: medium',
    },
  ];

  const ask = $('#ask');
  if (ask) {
    const tabs = $$('.ask-tab', ask);
    const qEl = $('#ask-q'), trace = $('#ask-trace'), ans = $('#ask-ans');
    const methodEl = $('#ask-method'), readEl = $('#ask-read'), tilesEl = $('#ask-tiles');
    const spark = $('#ask-spark'), dot = $('#ask-dot'), badgesEl = $('#ask-badges');
    const noteEl = $('#ask-note'), asofEl = $('#ask-asof'), live = $('#ask-live');
    const heroBird = $('#hero-bird');
    const HOLD_FIRST = 4200, CYCLE = 8200;
    let current = 0, epoch = 0, progress = null, hovering = false, visible = true;

    const W = 320, H = 58, PAD = 6;
    const pts = (s) => s.map((v, i) => [(i / (s.length - 1)) * W, PAD + (1 - v) * (H - PAD * 2)]);
    const toPath = (p) => 'M' + p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');

    function paint(s) {
      methodEl.textContent = s.method;
      readEl.textContent = s.read;
      tilesEl.innerHTML = '';
      for (const [k, v, tone = '', count = true] of s.tiles) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.innerHTML = `<div class="k"></div><div class="v ${tone}"></div>`;
        tile.firstChild.textContent = k;
        tile.lastChild.textContent = v;
        tile.lastChild.dataset.count = count ? '1' : '';
        tilesEl.append(tile);
      }
      const p = pts(s.series);
      const line = toPath(p);
      $('.line', spark).setAttribute('d', line);
      $('.line', spark).setAttribute('stroke', s.color);
      $('.area', spark).setAttribute('d', `${line} L${W},${H} L0,${H} Z`);
      $$('#spark-fill stop').forEach((st) => st.setAttribute('stop-color', s.color));
      $('.line2', spark).setAttribute('d', s.series2 ? toPath(pts(s.series2)) : '');
      const [ex, ey] = p[p.length - 1];
      dot.style.left = `${(ex / W) * 100}%`;
      dot.style.top = `${(ey / H) * 100}%`;
      dot.style.setProperty('--dot', s.color);
      badgesEl.innerHTML = '';
      for (const [label, tone] of s.badges) {
        const b = document.createElement('span');
        b.className = `badge ${tone}`;
        b.textContent = label;
        badgesEl.append(b);
      }
      noteEl.textContent = s.note;
      asofEl.textContent = s.asof;
    }

    function selectTab(i) {
      tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
    }

    function startProgress(i, duration) {
      progress?.cancel();
      $$('.prog', ask).forEach((p) => { p.style.transform = 'scaleX(0)'; });
      if (reduce) return;
      progress = $('.prog', tabs[i]).animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration, fill: 'forwards' });
      if (hovering || !visible || document.hidden) progress.pause();
      progress.onfinish = () => run((i + 1) % SCENARIOS.length);
    }

    async function run(i, { announce = false } = {}) {
      const my = ++epoch;
      const s = SCENARIOS[i];
      current = i;
      selectTab(i);
      startProgress(i, CYCLE);
      const stale = () => my !== epoch;

      if (reduce) {
        qEl.textContent = s.q;
        trace.innerHTML = s.tools.map((t) => `<span class="done">${t}</span>`).join('');
        paint(s);
        if (announce) live.textContent = `${s.read} Verdict: ${s.badges.map((b) => b[0].toLowerCase()).join(', ')}.`;
        return;
      }

      // 1. answer fades, question erases
      ans.classList.add('out');
      trace.innerHTML = '';
      let text = qEl.textContent;
      while (text.length) {
        text = text.slice(0, -3);
        qEl.textContent = text;
        await wait(14);
        if (stale()) return;
      }
      // 2. type the new question
      for (let n = 1; n <= s.q.length; n++) {
        qEl.textContent = s.q.slice(0, n);
        await wait(22 + Math.random() * 26);
        if (stale()) return;
      }
      await wait(220);
      // 3. the agent runs its tools
      for (const tool of s.tools) {
        const span = document.createElement('span');
        span.textContent = tool;
        trace.append(span);
        await wait(360);
        if (stale()) return;
        span.classList.add('done');
      }
      // 4. the card assembles
      paint(s);
      dot.classList.add('wait');
      $$('[data-step]', ans).forEach((el, n) => { el.style.transitionDelay = `${n * 90}ms`; });
      ans.classList.remove('out');
      spark.classList.remove('draw');
      void spark.getBoundingClientRect();
      spark.classList.add('draw');
      $$('.tile .v', tilesEl).forEach((v) => { if (v.dataset.count) countUp(v, { duration: 800 }); });
      $$('.badge', badgesEl).forEach((b, n) => { b.style.animationDelay = `${720 + n * 140}ms`; b.classList.add('stamp'); });
      await wait(900);
      if (stale()) return;
      dot.classList.remove('wait');
      hop(heroBird);
      $$('[data-step]', ans).forEach((el) => { el.style.transitionDelay = ''; });
      if (announce) live.textContent = `${s.read} Verdict: ${s.badges.map((b) => b[0].toLowerCase()).join(', ')}.`;
    }

    tabs.forEach((t, i) => t.addEventListener('click', () => run(i, { announce: true })));
    ask.addEventListener('pointerenter', () => { hovering = true; progress?.pause(); });
    ask.addEventListener('pointerleave', () => { hovering = false; if (visible && !document.hidden) progress?.play(); });
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (!progress) return;
      if (visible && !hovering && !document.hidden) progress.play(); else progress.pause();
    }).observe(ask);
    document.addEventListener('visibilitychange', () => {
      if (!progress) return;
      if (document.hidden) progress.pause(); else if (visible && !hovering) progress.play();
    });

    // The first answer is already painted in the HTML; hold it, then cycle.
    startProgress(0, HOLD_FIRST);
  }

  // ---------------------------------------------------------------- marquee
  if (!reduce) {
    $$('.marquee .track').forEach((track) => {
      for (const child of Array.from(track.children)) {
        const clone = child.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.append(clone);
      }
    });
  }

  // ---------------------------------------------------------------- depths
  const ds = $('#ds');
  if (ds) {
    const tabs = $$('.ds-tabs button', ds);
    const steps = $$('.step');
    const wide = matchMedia('(min-width: 981px)');
    const setDepth = (d) => {
      ds.dataset.depth = String(d);
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.go === String(d))));
      steps.forEach((s) => s.classList.toggle('on', !wide.matches || s.dataset.depth === String(d)));
    };
    const stepIo = new IntersectionObserver((entries) => {
      if (!wide.matches) return;
      for (const e of entries) if (e.isIntersecting) setDepth(e.target.dataset.depth);
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => stepIo.observe(s));
    tabs.forEach((t) => t.addEventListener('click', () => {
      setDepth(t.dataset.go);
      if (wide.matches) steps.find((s) => s.dataset.depth === t.dataset.go)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }));
    wide.addEventListener('change', () => setDepth(ds.dataset.depth));
    setDepth(1);
  }

  // ---------------------------------------------------------------- briefs
  const notes = $('#notes');
  whenSeen(notes, () => notes.classList.add('play'));

  // ---------------------------------------------------------------- waitlist success
  document.addEventListener('petyr:waitlist-joined', (e) => {
    if (e.detail.formId === 'waitlist-form') hop($('#hero-bird'));
    const cta = $('#cta-bird');
    if (cta && e.detail.formId !== 'waitlist-form' && !reduce) {
      cta.classList.add('celebrate');
      setTimeout(() => cta.classList.remove('celebrate'), 2600);
    }
  });
})();
