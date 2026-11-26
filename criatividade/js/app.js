/* Apresentação "Criatividade é juntar pontos".
   Navegação por páginas, a rede de pontos e linhas, os paredões de capas. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pages = $$('.pg');
  const DECK = window.DECK || {};
  const pad = n => String(n).padStart(2, '0');
  const narrow = () => innerWidth <= 860;

  /* ---------- preenche as páginas que vêm de lista ---------- */
  const el = (tag, attrs = {}, html = '') => {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html) e.innerHTML = html;
    return e;
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* um corte: miniatura parada + o trecho do vídeo tocando mudo por cima.
     Clique abre o vídeo com som, a partir do mesmo trecho. */
  const clipHTML = ([id, label, s, len], poster) =>
    `<button type="button" class="clip" data-yt="${id}" data-s="${s}" data-len="${len}" aria-label="Assistir com som: ${esc(label)}">` +
    `<img class="po" src="${poster || `assets/refs/clips/${id}.jpg`}" alt="" loading="lazy" decoding="async">` +
    `<span class="pl" aria-hidden="true"></span><span class="play"></span><span class="ttl">${esc(label)}</span></button>`;

  $$('[data-wall]').forEach(w => {
    const set = w.dataset.wall;
    const covers = (DECK[set] || []).map(([file, artist, album], i) => {
      const f = el('figure', { style: `--i:${i}` });
      const cap = album ? `${esc(artist)}<br>${esc(album)}` : esc(artist);
      f.innerHTML = `<img src="assets/refs/${set}/${file}.jpg" alt="${esc(artist)}${album ? ' — ' + esc(album) : ''}" loading="lazy" decoding="async"><figcaption>${cap}</figcaption>`;
      return f;
    });
    /* os cortes entram no meio das capas, espalhados, cada um ocupando 2 × 2 */
    const clips = ((DECK.clips || {})[set] || []).map((c, k) => {
      const f = el('figure', { class: 'cell-clip', style: `--i:${k}` }, clipHTML(c));
      return f;
    });
    const step = covers.length / Math.max(1, clips.length);
    const out = [];
    covers.forEach((f, i) => {
      clips.forEach((c, k) => { if (Math.floor(k * step + step / 3) === i) out.push(c); });
      out.push(f);
    });
    out.forEach(f => w.appendChild(f));
  });

  /* livros e quadrinhos: um corte embaixo de cada capa, na ordem das capas */
  $$('[data-clips]').forEach(sh => {
    const list = (DECK.clips || {})[sh.dataset.clips] || [];
    $$('figure', sh).forEach((f, i) => { if (list[i]) f.insertAdjacentHTML('beforeend', clipHTML(list[i])); });
  });

  const mosaic = $('[data-fill="doidera"]');
  if (mosaic) (DECK.doidera || []).forEach(f =>
    mosaic.appendChild(el('img', { src: `assets/refs/doidera/${f}`, alt: '', loading: 'lazy', decoding: 'async' })));

  const shots = $('[data-fill="ffffound"]');
  if (shots) (DECK.ffffound || []).forEach(f =>
    shots.appendChild(el('figure', {}, `<img src="assets/refs/ffffound/${f}" alt="Página do FFFFOUND!" loading="lazy" decoding="async">`)));

  const mags = $('[data-fill="archive"]');
  if (mags) (DECK.archive || []).forEach(([f, cap], i) =>
    mags.appendChild(el('figure', { class: 'rv', style: `--i:${i + 2}` },
      `<img src="assets/refs/archive/${f}" alt="Capa da Lürzer's Archive, ${esc(cap || '')}" loading="lazy" decoding="async"><figcaption>${esc(cap || '')}</figcaption>`)));

  /* grades de vídeo (MTV, documentários, games, TV): a MTV usa as miniaturas da pasta dela */
  $$('.vgrid[data-fill]').forEach(v => {
    const key = v.dataset.fill;
    ((DECK.clips || {})[key] || []).forEach(c => v.insertAdjacentHTML('beforeend', clipHTML(c, key === 'mtv' ? `assets/refs/mtv/${c[0]}.jpg` : '')));
  });

  /* ---------- paredão: acha a grade que dá o maior quadrado ---------- */
  function fitWalls() {
    $$('.wall').forEach(w => {
      const kids = [...w.children]; if (!kids.length) return;
      /* um corte ocupa 2 × 2 casas */
      const n = kids.reduce((s, k) => s + (k.classList.contains('cell-clip') ? 4 : 1), 0);
      const hasClip = n !== kids.length;
      const g = 8, box = w.parentElement;
      const W = box.clientWidth, H = box.clientHeight;
      if (narrow() || H < 80) {
        const c = 4; w.style.setProperty('--cols', c); w.style.setProperty('--t', `${(W - (c - 1) * g) / c}px`); return;
      }
      let best = { t: 0, c: 1 };
      for (let c = hasClip ? 2 : 1; c <= n; c++) {
        const r = Math.ceil(n / c);
        const t = Math.min((W - (c - 1) * g) / c, (H - (r - 1) * g) / r);
        if (t > best.t) best = { t, c };
      }
      w.style.setProperty('--cols', best.c);
      w.style.setProperty('--t', `${Math.floor(best.t)}px`);
      /* as peças 2 × 2 podem deixar buracos e pedir uma fileira a mais: mede e encolhe se passou */
      const rows = getComputedStyle(w).gridTemplateRows.split(' ').filter(Boolean).length;
      if (rows * (best.t + g) - g > H + 1) w.style.setProperty('--t', `${Math.floor((H - (rows - 1) * g) / rows)}px`);
    });
  }
  fitWalls();
  addEventListener('resize', fitWalls);

  /* grade de vídeos 16:9: acha o número de colunas que deixa cada vídeo maior */
  function fitVgrids() {
    $$('.vgrid.fit').forEach(v => {
      const n = v.children.length; if (!n) return;
      const g = 10, W = v.parentElement.clientWidth, H = v.parentElement.clientHeight;
      if (narrow() || H < 80) { v.style.removeProperty('grid-template-columns'); v.style.removeProperty('grid-auto-rows'); return; }
      let best = { w: 0, c: 1 };
      for (let c = 1; c <= n; c++) {
        const r = Math.ceil(n / c);
        const w = Math.min((W - (c - 1) * g) / c, (H - (r - 1) * g) / r * 16 / 9);
        if (w > best.w) best = { w, c };
      }
      v.style.gridTemplateColumns = `repeat(${best.c}, ${Math.floor(best.w)}px)`;
      v.style.gridAutoRows = `${Math.floor(best.w * 9 / 16)}px`;
    });
  }
  fitVgrids();
  addEventListener('resize', fitVgrids);

  /* ---------- colagem solta (games, TV) ---------- */
  const rng = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  $$('[data-collage]').forEach(cg => {
    const key = cg.dataset.collage, R = rng(key === 'tv' ? 911 : 409);
    const list = ((DECK.collage || {})[key] || []).slice();
    for (let i = list.length - 1; i > 0; i--) { const k = Math.floor(R() * (i + 1)); [list[i], list[k]] = [list[k], list[i]]; }
    list.forEach(([f, cap], i) => {
      const fig = el('figure', { class: (R() < .3 ? 'frame ' : '') + (R() < .28 ? 'tape' : ''), 'data-cap': cap });
      fig.innerHTML = `<img src="assets/refs/collage/${key}/${f}" alt="${esc(cap)}" loading="lazy" decoding="async">`;
      fig.dataset.r = ((R() * 2 - 1) * 7).toFixed(1); fig.dataset.s = (1.1 + R() * .5).toFixed(2);
      fig.dataset.jx = (R() * 2 - 1).toFixed(2); fig.dataset.jy = (R() * 2 - 1).toFixed(2);
      fig.style.setProperty('--i', i); fig.style.setProperty('--z', 1 + Math.floor(R() * 30));
      cg.appendChild(fig);
    });
  });
  function layoutCollages() {
    $$('.collage').forEach(cg => {
      const figs = [...cg.children], n = figs.length; if (!n) return;
      const W = cg.clientWidth, H = cg.clientHeight; if (narrow() || H < 80) return;
      const c = Math.max(2, Math.round(Math.sqrt(n * W / H * .62))), r = Math.ceil(n / c);
      const cw = W / c, ch = H / r;
      figs.forEach((f, i) => {
        const col = i % c, row = Math.floor(i / c);
        const w = Math.min(cw * +f.dataset.s, W * .42), h = w * 9 / 16;
        let x = (col + .5) * cw + +f.dataset.jx * cw * .22 - w / 2;
        let y = (row + .5) * ch + +f.dataset.jy * ch * .22 - h / 2;
        x = Math.max(-w * .04, Math.min(W - w * .96, x)); y = Math.max(-h * .04, Math.min(H - h, y));
        f.style.setProperty('--x', `${Math.round(x)}px`); f.style.setProperty('--y', `${Math.round(y)}px`);
        f.style.setProperty('--w', `${Math.round(w)}px`); f.style.setProperty('--r', `${f.dataset.r}deg`);
      });
    });
  }

  /* ---------- livros e quadrinhos: capas e vídeos no maior tamanho que couber ---------- */
  const SHELF_CAP = 76;   // legenda + espaços, em px
  const shelfW = (n, W, H) => {
    let best = { w: 0, c: 1 }; const gx = Math.max(14, W * .025), gy = 22;
    for (let c = 1; c <= n; c++) {
      const r = Math.ceil(n / c);
      const w = Math.min((W - (c - 1) * gx) / c, ((H - (r - 1) * gy) / r - SHELF_CAP) / 2.0625, 420);
      if (w > best.w) best = { w, c, gx, gy };
    }
    return best;
  };
  function fitShelves() {
    $$('.shelf[data-clips]').forEach(sh => {
      const figs = $$('figure', sh), box = sh.parentElement;
      if (narrow()) { sh.removeAttribute('style'); return; }
      const b = shelfW(figs.length, box.clientWidth, box.clientHeight);
      sh.style.cssText = `display:grid;grid-template-columns:repeat(${b.c},${Math.floor(b.w)}px);column-gap:${Math.floor(b.gx)}px;row-gap:${b.gy}px;align-content:center;justify-content:end;align-items:end`;
      figs.forEach(f => { f.style.maxWidth = 'none'; const cv = $('.cv', f); if (cv) cv.style.height = `${Math.floor(b.w * 1.5)}px`; });
    });
  }
  /* título ao lado ou em cima: fica o arranjo que deixa o conteúdo maior */
  function scoreOf(media) {
    const W = media.clientWidth, H = media.clientHeight;
    const sh = $('.shelf[data-clips]', media), wall = $('.wall', media), vg = $('.vgrid.fit', media), cg = $('.collage', media);
    if (sh) return shelfW($$('figure', sh).length, W, H).w;
    if (cg) return Math.sqrt(W * H);
    if (vg || wall) {
      const kids = [...(vg || wall).children]; if (!kids.length) return 0;
      const n = kids.reduce((s, k) => s + (k.classList.contains('cell-clip') ? 4 : 1), 0);
      let best = 0;
      for (let c = 1; c <= n; c++) { const r = Math.ceil(n / c); best = Math.max(best, vg ? Math.min(W / c, H / r * 16 / 9) : Math.min(W / c, H / r)); }
      return best;
    }
    return 0;
  }
  function chooseLayouts() {
    $$('.ref').forEach(ref => {
      const media = $('.media', ref); if (!media) return;
      ref.classList.remove('stack');
      if (narrow() || !$('.shelf[data-clips], .wall, .vgrid.fit, .collage', media)) return;
      const a = scoreOf(media); ref.classList.add('stack'); const b = scoreOf(media);
      if (!(b > a * 1.08)) ref.classList.remove('stack');
    });
  }
  function relayout() { chooseLayouts(); fitWalls(); fitVgrids(); fitShelves(); layoutCollages(); }
  relayout();
  addEventListener('resize', relayout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

  /* ---------- a rede: pontos nascem, linhas se juntam ---------- */
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

  /* os pontos com nome (página "Como enxergo criatividade"): x, y em fração da tela */
  const NAMED = [
    ['Punk', .47, .20], ['Faça você mesmo', .63, .13], ['Straight edge', .80, .22], ['Serigrafia', .92, .36],
    ['Capas de disco', .57, .34], ['Vinil', .73, .37], ['Fotografia', .86, .52], ['MTV', .46, .47],
    ['Sepultura', .62, .53], ['Pantera', .75, .60], ['Metallica', .55, .68], ['King Gizzard', .90, .70],
    ['Quadrinhos', .68, .76], ['FFFFOUND!', .44, .82], ['Archive', .57, .88], ['Flusser', .80, .86],
    ['Han', .93, .88], ['Krenak', .70, .93], ['Bicicleta', .38, .64], ['Board doidera', .34, .34],
    ['Tocar instrumentos', .39, .12], ['Viagem', .87, .11], ['Família', .48, .96]
  ];

  class Net {
    constructor(cv) {
      this.cv = cv; this.ctx = cv.getContext('2d');
      this.mode = cv.dataset.net; this.page = cv.closest('.pg');
      this.nodes = []; this.edges = []; this.raf = 0; this.count = 0; this.nextAt = 0; this.queue = 0;
      this.max = 70;
      this.resize();
      if (this.mode === 'free') cv.addEventListener('click', e => {
        const r = cv.getBoundingClientRect();
        this.add(e.clientX - r.left, e.clientY - r.top, performance.now());
      });
    }
    resize() {
      const d = Math.min(devicePixelRatio || 1, 2);
      this.W = this.cv.clientWidth; this.H = this.cv.clientHeight; this.d = d;
      this.k = Math.max(.8, Math.min(1.6, this.W / 1440));   /* pontos e linhas crescem com a tela (projetor) */
      this.cv.width = Math.round(this.W * d); this.cv.height = Math.round(this.H * d);
    }
    colour() { return getComputedStyle(this.page).color; }
    /* onde não nasce ponto: em cima da frase */
    blocked(x, y) {
      const c = this.cv.getBoundingClientRect();
      return $$('.phrase,.top', this.page).some(p => {
        const r = p.getBoundingClientRect(), m = 26;
        return x > r.left - c.left - m && x < r.right - c.left + m && y > r.top - c.top - m && y < r.bottom - c.top + m;
      });
    }
    reset() {
      this.nodes = []; this.edges = []; this.count = 0; this.queue = 0; this.extra = 0;
      this.nextAt = performance.now() + 700;
      this.fg = this.colour(); this.bg = getComputedStyle(this.page).backgroundColor;
    }
    linked(a, b) { return this.edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a)); }
    add(x, y, now, label) {
      const n = { x, y, r: (label ? 5.5 : 4.5 + Math.random() * 4.5) * this.k, born: now, seed: Math.random() * 100, label, die: 0 };
      const near = this.nodes.filter(o => !o.die).map(o => ({ o, d: Math.hypot(o.x - x, o.y - y) })).sort((p, q) => p.d - q.d);
      const k = this.nodes.length < 2 ? 1 : (Math.random() < .2 ? 3 : Math.random() < .6 ? 2 : 1);
      near.slice(0, k).forEach((p, i) => this.edges.push({ a: p.o, b: n, born: now + 260 + i * 240 }));
      this.nodes.push(n); this.count++;
      return n;
    }
    spawn(now) {
      if (this.mode === 'named') {
        const p = NAMED[this.count]; if (!p) {
          /* todos no lugar: de tempo em tempo, mais uma linha cruza a rede */
          /* no máximo 10 linhas extras, para a rede não virar um emaranhado com o slide parado */
          if ((this.extra = (this.extra || 0) + 1) <= 10) this.cross(now, .6);
          this.nextAt = now + 1500; return;
        }
        this.add(p[1] * this.W, p[2] * this.H, now, p[0]);
        this.nextAt = now + Math.max(240, 620 * Math.pow(.94, this.count));
        return;
      }
      const diag = Math.hypot(this.W, this.H), minD = Math.max(54, Math.sqrt(this.W * this.H / (this.max * 1.7)));
      const mx = Math.max(28, this.W * .03), top = 84, bot = 40;
      for (let i = 0; i < 60; i++) {
        const x = mx + Math.random() * (this.W - 2 * mx), y = top + Math.random() * (this.H - top - bot);
        if (this.blocked(x, y)) continue;
        if (this.nodes.some(o => !o.die && Math.hypot(o.x - x, o.y - y) < minD)) continue;
        this.add(x, y, now); break;
      }
      if (this.count > 8 && this.count % 4 === 0) this.cross(now, .36);
      const live = this.nodes.filter(o => !o.die);
      if (live.length > this.max) live[0].die = now;
      /* começa devagar, um ponto de cada vez, e vai acelerando */
      this.nextAt = now + (live.length >= this.max ? 620 : Math.max(170, 1000 * Math.pow(.92, this.count)));
      void diag;
    }
    cross(now, reach) {
      const live = this.nodes.filter(o => !o.die); if (live.length < 4) return;
      const diag = Math.hypot(this.W, this.H);
      for (let i = 0; i < 20; i++) {
        const a = live[Math.floor(Math.random() * live.length)], b = live[Math.floor(Math.random() * live.length)];
        if (a === b || this.linked(a, b)) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) > diag * reach) continue;
        this.edges.push({ a, b, born: now + 200 }); return;
      }
    }
    pos(n, now) {
      if (reduce) return [n.x, n.y];
      const t = now / 1000;
      return [n.x + Math.sin(t * .5 + n.seed) * 4, n.y + Math.cos(t * .42 + n.seed * 1.7) * 4];
    }
    alpha(n, now) { return n.die ? 1 - clamp((now - n.die) / 900) : 1; }
    draw(now) {
      const { ctx, d } = this;
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, this.W, this.H);
      ctx.strokeStyle = ctx.fillStyle = this.fg;
      ctx.lineCap = 'round';
      /* limpa o que já sumiu */
      if (this.nodes.some(n => n.die && now - n.die > 900)) {
        this.nodes = this.nodes.filter(n => !(n.die && now - n.die > 900));
        this.edges = this.edges.filter(e => this.nodes.includes(e.a) && this.nodes.includes(e.b));
      }
      for (const e of this.edges) {
        const p = easeIO(clamp((now - e.born) / 700)); if (p <= 0) continue;
        const [ax, ay] = this.pos(e.a, now), [bx, by] = this.pos(e.b, now);
        const x = ax + (bx - ax) * p, y = ay + (by - ay) * p;
        ctx.globalAlpha = .42 * Math.min(this.alpha(e.a, now), this.alpha(e.b, now));
        ctx.lineWidth = 1.3 * this.k;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(x, y); ctx.stroke();
        if (p < 1) { ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill(); }
      }
      if (this.mode === 'named') {
        ctx.font = `500 ${Math.max(11, Math.min(17, this.W / 105))}px "Pacaembu", system-ui, sans-serif`;
        ctx.textBaseline = 'middle';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '1.6px';
      }
      for (const n of this.nodes) {
        const age = now - n.born, a = this.alpha(n, now), [x, y] = this.pos(n, now);
        const s = age < 0 ? 0 : easeBack(clamp(age / 460));
        const rp = clamp(age / 1000);
        if (rp < 1 && !reduce) {
          ctx.globalAlpha = (1 - rp) * .5 * a; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, n.r + rp * 30, 0, 7); ctx.stroke();
        }
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, n.r * s), 0, 7); ctx.fill();
        if (n.label) {
          /* uma tarja da cor do fundo atrás do nome, para a linha não riscar a palavra */
          const txt = n.label.toUpperCase(), la = clamp((age - 180) / 420) * a;
          const tw = ctx.measureText(txt).width, fs = parseFloat(ctx.font.split('px')[0].split(' ').pop());
          let lx = x + n.r + 10;
          if (lx + tw > this.W - 14) lx = x - n.r - 10 - tw;
          ctx.globalAlpha = la; ctx.fillStyle = this.bg;
          ctx.fillRect(lx - 5, y - fs * .8, tw + 10, fs * 1.6);
          ctx.fillStyle = this.fg;
          ctx.fillText(txt, lx, y + 1);
        }
      }
      ctx.globalAlpha = 1;
    }
    tick = (now) => {
      this.raf = requestAnimationFrame(this.tick);
      if (now >= this.nextAt) this.spawn(now);
      this.draw(now);
    };
    start() {
      if (this.raf) return;
      this.resize(); this.reset();
      if (reduce) {
        /* sem movimento: a rede já chega montada */
        const t = performance.now() - 5000;
        if (this.mode === 'named') NAMED.forEach(p => this.add(p[1] * this.W, p[2] * this.H, t, p[0]));
        else for (let i = 0; i < 46; i++) { this.nextAt = 0; this.spawn(t); }
        this.edges.forEach(e => e.born = t);
        this.draw(performance.now()); return;
      }
      this.raf = requestAnimationFrame(this.tick);
    }
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; }
  }
  const nets = $$('canvas.net').map(cv => new Net(cv));
  addEventListener('resize', () => nets.forEach(n => { n.stop(); if (n.page.classList.contains('in')) n.start(); }));

  /* ---------- cortes do YouTube tocando mudos dentro do slide ----------
     Cada página cria os players quando chega perto e destrói quando fica longe
     (dezenas de players abertos pesariam). Na página atual, toca até `max`
     cortes ao mesmo tempo; com mais cortes que isso, eles se revezam. */
  const CUT_MAX = { mtv: 4, punk: 4, metal: 4, kglw: 4, games: 4, tv: 4 };
  const local = location.protocol === 'file:';
  let ytReady = null;
  const loadYT = () => ytReady || (ytReady = new Promise(res => {
    if (window.YT && YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
    document.head.appendChild(el('script', { src: 'https://www.youtube.com/iframe_api' }));
  }));
  const reels = new Map();   // página -> { clips, max, built, on }
  pages.forEach(pg => {
    const clips = $$('.clip', pg).map(b => ({ b, id: b.dataset.yt, s: +b.dataset.s || 0, len: +b.dataset.len || 8, p: null, ok: false, play: false, dead: false }));
    if (!clips.length) return;
    const key = ($('[data-wall]', pg) || {}).dataset?.wall || ($('[data-fill]', pg) || {}).dataset?.fill;
    reels.set(pg, { clips, max: CUT_MAX[key] || clips.length, built: false, on: false, next: 0 });
  });
  function build(r) {
    if (r.built || local) return; r.built = true;
    loadYT().then(() => r.built && r.clips.forEach(c => {
      if (c.p) return;
      const mount = el('div'); $('.pl', c.b).appendChild(mount);
      c.p = new YT.Player(mount, {
        videoId: c.id, host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
        playerVars: { autoplay: 0, mute: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, playsinline: 1, rel: 0, cc_load_policy: 0, start: c.s, origin: location.origin },
        events: {
          onReady: () => { c.ok = true; try { c.p.mute(); c.p.unloadModule && c.p.unloadModule('captions'); } catch (e) {} if (c.play) start(c); },
          onStateChange: e => {
            if (e.data === 1 && c.play && !c.reveal) c.reveal = setTimeout(() => { c.reveal = 0; if (c.play) c.b.classList.add('live'); }, REVEAL);
            if (e.data === 2 || e.data === 5 || e.data === -1) c.b.classList.remove('live');
            if (e.data === 0) { c.b.classList.remove('live'); ended(r, c); }
          },
          onError: () => { c.dead = true; c.play = false; c.b.classList.add('dead'); fill(r); }
        }
      });
    }));
  }
  function teardown(r) {
    if (!r.built) return; r.built = false; r.on = false;
    r.clips.forEach(c => { try { c.p && c.p.destroy(); } catch (e) {} c.p = null; c.ok = false; c.play = false; c.b.classList.remove('live'); $('.pl', c.b).innerHTML = ''; });
  }
  const REVEAL = 3600;
  function start(c) {
    c.play = true;
    clearTimeout(c.reveal); c.reveal = 0; c.b.classList.remove('live');
    if (!c.ok) return;
    try { c.sound ? (c.p.unMute(), c.p.setVolume(100)) : c.p.mute(); c.p.seekTo(c.s, true); c.p.playVideo(); } catch (e) {}
  }
  function stopClip(c) {
    c.play = false; clearTimeout(c.reveal); c.reveal = 0;
    c.b.classList.remove('live');
    try { c.ok && c.p.pauseVideo(); } catch (e) {}
  }
  /* põe cortes para tocar até completar o máximo, na ordem, revezando */
  function fill(r) {
    if (!r.on) return;
    const live = r.clips.filter(c => c.play && !c.dead).length;
    const idle = r.clips.filter(c => !c.play && !c.dead);
    for (let k = 0; k < r.max - live && idle.length; k++) {
      const pick = idle.sort((a, b) => ((r.clips.indexOf(a) - r.next + 999) % r.clips.length) - ((r.clips.indexOf(b) - r.next + 999) % r.clips.length)).shift();
      r.next = (r.clips.indexOf(pick) + 1) % r.clips.length;
      start(pick);
    }
  }
  function ended(r, c) {
    if (!r.on || !c.play) return;
    const waiting = r.clips.some(o => !o.play && !o.dead);
    if (waiting) { stopClip(c); fill(r); } else start(c);
  }
  /* com 'reduzir movimento' ligado, ficam só as miniaturas; o clique continua abrindo o vídeo */
  function setSound(c, on) {
    c.sound = on;
    try { on ? (c.p.unMute(), c.p.setVolume(100)) : c.p.mute(); } catch (e) {}
    const t = $('.snd', c.b); if (t) t.textContent = on ? 'Som ligado' : 'Som desligado';
  }
  function reelOn(r) { if (reduce) return; build(r); r.on = true; fill(r); }
  function reelOff(r) { r.on = false; r.clips.forEach(c => { if (c.sound) setSound(c, false); stopClip(c); }); }
  /* o fim de cada corte é vigiado aqui: o parâmetro `end` do YouTube só vale na primeira volta */
  setInterval(() => reels.forEach(r => {
    if (!r.on) return;
    r.clips.forEach(c => {
      if (!c.play || !c.ok) return;
      let t = 0; try { t = c.p.getCurrentTime(); } catch (e) { return; }
      if (t >= c.s + c.len || t < c.s - 2) ended(r, c);
    });
  }), 250);
  /* constrói a página vizinha antes de chegar nela, destrói a que ficou longe */
  const near = new IntersectionObserver(es => es.forEach(e => {
    const r = reels.get(e.target); if (!r) return;
    if (reduce) return;
    e.isIntersecting ? build(r) : teardown(r);
  }), { rootMargin: '40% 0px 40% 0px' });
  reels.forEach((r, pg) => near.observe(pg));

  /* ---------- momentos que aparecem um por clique (slide "Antes do digital") ---------- */
  const stepsOf = pg => +pg.dataset.steps || 0;
  const stepAt = pg => +pg.dataset.k || 0;
  function setStep(pg, k) {
    const n = stepsOf(pg); k = clamp(k, 0, n); pg.dataset.k = k;
    $$('.mo', pg).forEach((m, i) => m.classList.toggle('on', i < k));
    const line = $('.tl-line span', pg);
    /* a linha anda até o ponto do último momento; no fim, vai até a borda */
    if (line) line.style.setProperty('--p', k >= n ? 11 : Math.max(0, k - 1));
    pg.classList.toggle('done', k >= n);
  }
  /* devolve true se o clique ou a tecla foi usado para mostrar ou esconder um momento */
  function stepKey(dir) {
    const pg = pages[current]; if (!stepsOf(pg) || narrow()) return false;
    const k = stepAt(pg);
    if (dir > 0 && k < stepsOf(pg)) { setStep(pg, k + 1); return true; }
    if (dir < 0 && k > 0) { setStep(pg, k - 1); return true; }
    return false;
  }
  pages.filter(stepsOf).forEach(pg => {
    setStep(pg, 0);
    pg.addEventListener('click', e => {
      if (e.target.closest('a,button') || narrow()) return;
      if (!stepKey(1)) go(current + 1);
    });
  });

  /* ---------- página atual: contador, entrada dos elementos, vídeos ---------- */
  const count = $('#count');
  let current = 0;
  const fontsReady = (document.fonts && document.fonts.ready) || Promise.resolve();
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    /* no celular a página pode ser mais alta que a tela: basta ocupar um bom pedaço dela */
    const pg = e.target, i = pages.indexOf(pg),
      on = e.intersectionRatio >= .5 || e.intersectionRect.height >= innerHeight * .35;
    pg.classList.toggle('in', on);
    if (on && i !== current && stepsOf(pg)) {
      /* chegando de trás, os momentos começam do zero; voltando de um slide adiante, já estão todos */
      setStep(pg, i < current ? stepsOf(pg) : 0);
    }
    if (on) { current = i; count.textContent = `${pad(i + 1)} / ${pad(pages.length)}`; }
    nets.filter(n => n.page === pg).forEach(n => on ? fontsReady.then(() => pg.classList.contains('in') && n.start()) : n.stop());
    $$('video', pg).forEach(v => { on ? v.play().catch(() => {}) : v.pause(); });
    /* saindo do slide, o vídeo case volta a ficar sem som */
    if (!on) $$('.film', pg).forEach(f => { $('video', f).muted = true; f.classList.remove('on'); $('.snd', f).textContent = 'Som desligado'; });
    const r = reels.get(pg); if (r) on && !lbOpen() ? reelOn(r) : reelOff(r);
  }), { threshold: [0, .1, .2, .35, .5, .65] });
  pages.forEach(p => io.observe(p));
  count.textContent = `01 / ${pad(pages.length)}`;

  /* ---------- teclado e passador de slides ---------- */
  const go = i => {
    const t = pages[clamp(i, 0, pages.length - 1)];
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ($('#lb').classList.contains('on')) {
      if (e.key === 'Escape') closeLb();
      else if (zoom && ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); stepZoom(1); }
      else if (zoom && ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); stepZoom(-1); }
      return;
    }
    const k = e.key;
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' ', 'Enter'].includes(k)) {
      e.preventDefault(); const d = e.shiftKey && k === ' ' ? -1 : 1;
      if (!stepKey(d)) go(current + d);
    }
    else if (['ArrowUp', 'ArrowLeft', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); if (!stepKey(-1)) go(current - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(pages.length - 1); }
    else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }
  });

  /* ---------- vídeo com som, em tela cheia ---------- */
  const lb = $('#lb'), fr = $('.fr', lb);
  function lbOpen() { return lb.classList.contains('on'); }
  function closeLb() {
    lb.classList.remove('on', 'img'); fr.innerHTML = ''; zoom = null;
    const r = reels.get(pages[current]); if (r) reelOn(r);   /* os cortes voltam a tocar */
  }
  lb.addEventListener('click', e => {
    if (zoom && e.target.closest('.fr img')) { stepZoom(1); return; }   /* clique na imagem passa para a próxima */
    if (e.target === lb || e.target.tagName === 'BUTTON' || zoom) closeLb();
  });
  /* imagem em tamanho grande: capas, revistas, telas e o board. As setas passam para a próxima do mesmo slide */
  const ZOOM = '.wall figure:not(.cell-clip) img, .shelf .cv img, .mags img, .shots img, .grid4 img, .shot img, .mosaic img, .collage img, .pcard img';
  let zoom = null;   // { list, i }
  function showZoom() {
    const im = zoom.list[zoom.i];
    const fig = im.closest('figure');
    const cap = (fig && fig.dataset.cap) || (fig && $('figcaption', fig) && !im.closest('.shelf,.mags') ? $('figcaption', fig).innerText.replace(/\n/g, ' — ') : '') ||
      (fig && $('figcaption', fig) ? $('figcaption', fig).innerText.replace(/\n/g, ' · ') : '') || im.alt || '';
    fr.innerHTML = `<img src="${im.currentSrc || im.src}" alt="${esc(im.alt || '')}"><p class="cap">${esc(cap)}${zoom.list.length > 1 ? `<span>${zoom.i + 1} / ${zoom.list.length}</span>` : ''}</p>`;
  }
  function stepZoom(d) { zoom.i = (zoom.i + d + zoom.list.length) % zoom.list.length; showZoom(); }
  document.addEventListener('click', e => {
    const im = e.target.closest('img');
    if (!im || !im.matches(ZOOM) || lbOpen()) return;
    const pg = im.closest('.pg');
    const list = $$(ZOOM, pg);
    zoom = { list, i: list.indexOf(im) };
    showZoom();
    lb.classList.add('on', 'img');
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-yt]'); if (!b) return;
    const id = b.dataset.yt, s = +b.dataset.s || 0;
    /* vídeo com data-inline: o clique liga e desliga o som ali mesmo, como os vídeo cases */
    if ('inline' in b.dataset && !local) {
      const r = reels.get(b.closest('.pg')), c = r && r.clips.find(x => x.b === b);
      if (!c || !c.ok) return;
      setSound(c, !c.sound);
      if (!c.play) start(c);
      return;
    }
    /* aberto como arquivo local, ou se o vídeo recusou tocar embutido: abre no YouTube */
    if (local || b.classList.contains('dead')) { window.open(`https://www.youtube.com/watch?v=${id}&t=${s}s`, '_blank', 'noopener'); return; }
    const r = reels.get(b.closest('.pg')); if (r) reelOff(r);
    fr.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&start=${s}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="Vídeo"></iframe>`;
    lb.classList.add('on');
  });

  /* ---------- vídeo case: clique liga e desliga o som ---------- */
  $$('.film').forEach(f => f.addEventListener('click', () => {
    const v = $('video', f); v.muted = !v.muted; if (v.paused) v.play().catch(() => {});
    f.classList.toggle('on', !v.muted);
    $('.snd', f).textContent = v.muted ? 'Som desligado' : 'Som ligado';
  }));
  /* ---------- cursor desenhado: só assume depois de seguir o mouse ---------- */
  const cur = $('#cursor');
  if (cur && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    let x = 0, y = 0, rx = 0, ry = 0, on = false;
    const ring = $('.ring', cur), dot = $('.dot', cur);
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      if (!on) { on = true; rx = x; ry = y; document.documentElement.classList.add('cursor-on'); }
      cur.classList.toggle('big', !!e.target.closest('a,button,[data-yt],canvas.net[data-net="free"]') || (e.target.matches && e.target.matches(ZOOM)));
    });
    document.addEventListener('mouseleave', () => { on = false; document.documentElement.classList.remove('cursor-on'); });
    (function loop() {
      requestAnimationFrame(loop);
      rx += (x - rx) * .2; ry += (y - ry) * .2;
      dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    })();
  }
})();
