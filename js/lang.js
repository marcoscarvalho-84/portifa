/* ============================================================
   LANGUAGE — EN / PT, every page
   ============================================================
   The site ships in English. Every element with a Portuguese version
   carries it beside the English: data-pt for the content, data-pt-label for
   an aria-label, data-pt-content for a <meta>. One file per page, so the two
   versions cannot drift apart.

   Which language: ?lang=pt|en in the URL (and remembered), else the choice
   remembered from a previous visit, else the browser's language. /apresentacao
   is always Portuguese (presentation.html).

   This is a classic script placed before the other scripts at the end of
   <body>, so the swap happens before main.js splits words and before the
   catalogs and cases render. A tiny inline script in <head> marks <html>
   with .lang-pt early, so the English never flashes (see main.css).

   Switching reloads the page: catalogs and cases are built from JSON, and a
   reload is the one path that rebuilds all of them in the new language.

   Case content in Portuguese lives in data/projects.pt.json, keyed by
   project, chapter and block id; window.__ptMerge lays it over
   data/projects.json. Anything missing there falls back to the English.
   ============================================================ */
(function () {
  'use strict';
  var KEY = 'site-lang';
  var q = new URLSearchParams(location.search).get('lang');
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (q === 'pt' || q === 'en') { try { localStorage.setItem(KEY, q); } catch (e) {} }
  var lang = /^\/apresentacao\/?$/.test(location.pathname) ? 'pt'
    : (q === 'pt' || q === 'en') ? q
    : (stored === 'pt' || stored === 'en') ? stored
    : (/^pt\b/i.test(navigator.language || '') ? 'pt' : 'en');
  var PT = lang === 'pt';
  window.__lang = lang;

  var root = document.documentElement;
  root.lang = PT ? 'pt-BR' : 'en';
  root.classList.toggle('lang-pt', PT);

  if (PT) {
    document.querySelectorAll('[data-pt]').forEach(function (el) { el.innerHTML = el.getAttribute('data-pt'); });
    document.querySelectorAll('[data-pt-label]').forEach(function (el) { el.setAttribute('aria-label', el.getAttribute('data-pt-label')); });
    document.querySelectorAll('[data-pt-content]').forEach(function (el) { el.setAttribute('content', el.getAttribute('data-pt-content')); });
  }
  root.classList.add('lang-done');

  /* the EN / PT switch in the nav: both shown, the current one marked */
  document.querySelectorAll('[data-lang-pick]').forEach(function (a) {
    var to = a.getAttribute('data-lang-pick');
    a.setAttribute('aria-current', to === lang ? 'true' : 'false');
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (to === lang) return;
      try { localStorage.setItem(KEY, to); } catch (err) {}
      var u = new URL(location.href);
      u.searchParams.delete('lang');
      location.replace(u.toString());
    });
  });

  /* presentation.html keeps its own single link to the other language */
  var sw = document.querySelector('[data-lang-switch]');
  if (sw) {
    var local = /\.html$/.test(location.pathname);
    var to = PT ? 'en' : 'pt';
    sw.textContent = to.toUpperCase();
    sw.lang = sw.hreflang = to === 'pt' ? 'pt-BR' : 'en';
    sw.setAttribute('aria-label', PT ? 'Read in English' : 'Ler em português');
    sw.href = local
      ? (to === 'pt' ? 'presentation.html?lang=pt' : 'presentation.html?lang=en')
      : (to === 'pt' ? '/apresentacao' : '/presentation?lang=en');
  }

  /* small strings that scripts build at runtime */
  var T = {
    'Video case': 'Vídeo case', 'Read more': 'Ler mais', 'Read less': 'Ler menos',
    'All projects': 'Todos os projetos', 'View on Behance ↗': 'Ver no Behance ↗',
    'Watch on YouTube ↗': 'Ver no YouTube ↗', 'Product': 'Produto', 'Craft': 'Craft',
    'Work': 'Trabalho', 'product work': 'trabalho de produto', 'craft': 'craft',
    'Back to': 'Voltar para', 'Previous': 'Anterior', 'Next': 'Próximo'
  };
  window.__t = function (s) { return PT && T[s] ? T[s] : s; };

  /* lay the Portuguese case content over the English JSON */
  window.__ptMerge = function (data, pt) {
    if (!PT || !data || !pt || !pt.projects || !Array.isArray(data.projects)) return data;
    var over = function (dst, src, keys) {
      keys.forEach(function (k) { if (src && typeof src[k] === 'string' && src[k].trim()) dst[k] = src[k]; });
    };
    var blocks = function (list, src) {
      if (!src || !Array.isArray(list)) return;
      list.forEach(function (b) { if (b && b.id && src[b.id]) over(b, src[b.id], ['text', 'caption', 'alt', 'label']); });
    };
    data.projects.forEach(function (p) {
      var s = pt.projects[p.id];
      if (!s) return;
      over(p, s, ['meta', 'eyebrow', 'summary']);
      blocks(p.blocks, s.blocks);
      (p.subprojects || []).forEach(function (c) {
        var sc = s.subprojects && s.subprojects[c.id];
        if (!sc) return;
        over(c, sc, ['title']);
        if (Array.isArray(sc.stats) && Array.isArray(c.stats) && sc.stats.length === c.stats.length) {
          c.stats = c.stats.map(function (t, i) {
            var o = {}; for (var k in t) o[k] = t[k];
            over(o, sc.stats[i], ['value', 'label']); return o;
          });
        }
        if (sc.highlight && c.highlight) over(c.highlight, sc.highlight, ['big', 'small']);
        blocks(c.blocks, sc.blocks);
      });
    });
    return data;
  };

  /* fetch the sidecar only when it is needed */
  window.__ptFetch = function () {
    if (!PT) return Promise.resolve(null);
    return (window.__ptP = window.__ptP || fetch('data/projects.pt.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; }));
  };
})();
