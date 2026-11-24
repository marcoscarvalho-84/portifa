/* ============================================================
   v3 — the door reels and the "How I work" drawing.
   Both only run while they are on screen, and both settle on a
   still frame under reduced motion.
   ============================================================ */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- door reels: a stack of frames cut like a gif ----------
   Frames carry data-src and only load once the doors come near the screen;
   the first one is the still that shows until then (and for good under
   reduced motion). Hard cuts, no fade: it should read as a gif, not a
   slideshow. */
const HOLD = 700; // ms per frame

document.querySelectorAll('[data-reel]').forEach((reel, ri) => {
  const frames = [...reel.querySelectorAll('img')];
  const first = frames[0];
  if (first && first.dataset.src) first.src = first.dataset.src;
  if (reduce || frames.length < 2) return;

  let i = 0, timer = null, loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    frames.forEach(f => { if (!f.src && f.dataset.src) f.src = f.dataset.src; });
  };
  const tick = () => {
    /* skip a frame that has not arrived yet rather than cutting to a blank */
    let n = (i + 1) % frames.length, tries = 0;
    while (tries++ < frames.length && !(frames[n].complete && frames[n].naturalWidth)) n = (n + 1) % frames.length;
    if (n === i) return;
    frames[i].classList.remove('on');
    frames[n].classList.add('on');
    i = n;
  };
  const play = () => {
    if (timer) return;
    /* the three doors start a beat apart so they never cut in unison */
    timer = setTimeout(function run() { tick(); timer = setTimeout(run, HOLD); }, ri * 230);
  };
  const stop = () => { clearTimeout(timer); timer = null; };

  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { load(); play(); } else stop();
  }, { rootMargin: '300px 0px' }).observe(reel);
});

/* ---------- How I work: one drawing, three disciplines in turn ----------
   Steps: 0 scattered · 1 product (blocks lock into a grid) · 2 AI (hub,
   wires, pulses) · 3 craft (the hand drawn line ties it together) ·
   4 all three, held. Classes p1..p4 are cumulative, so CSS only ever says
   what each discipline adds. */
const method = document.querySelector('[data-method]');
if (method) {
  const svg = method.querySelector('.mt');
  const items = [...method.querySelectorAll('[data-step]')];
  const DUR = { 0: 700, 1: 2600, 2: 2800, 3: 2800, 4: 3400 };
  let step = 0, timer = null, visible = false, held = 0;

  const set = (s, instant) => {
    step = s;
    if (instant) svg.classList.add('mt-instant');
    for (let k = 1; k <= 4; k++) svg.classList.toggle('p' + k, s >= k);
    items.forEach(b => {
      const n = +b.dataset.step;
      b.classList.toggle('is-active', n === s || s === 4);
      b.classList.toggle('is-done', n < s && s !== 4);
      b.style.setProperty('--dur', (DUR[s] || 2600) + 'ms');
    });
    method.classList.toggle('is-all', s === 4);
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove('mt-instant')));
  };

  const next = () => {
    clearTimeout(timer);
    if (!visible) return;
    if (step === 4) {
      /* rewind: fade, snap back to scattered, start over */
      svg.classList.add('mt-fade');
      timer = setTimeout(() => {
        set(0, true);
        svg.classList.remove('mt-fade');
        timer = setTimeout(() => { set(1); timer = setTimeout(next, DUR[1]); }, DUR[0]);
      }, 450);
      return;
    }
    set(step + 1);
    timer = setTimeout(next, DUR[step] + held);
    held = 0;
  };

  if (reduce) {
    set(4);
  } else {
    set(0, true);
    new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      clearTimeout(timer);
      if (visible) timer = setTimeout(next, step === 0 ? 400 : DUR[step]);
    }, { threshold: 0.35 }).observe(method);
  }

  /* tapping an item jumps to its step and holds it a little longer */
  items.forEach(b => b.addEventListener('click', () => {
    clearTimeout(timer);
    set(+b.dataset.step);
    if (!reduce && visible) { held = 2400; timer = setTimeout(next, DUR[step] + held); held = 0; }
  }));
}
