/* =========================================================================
   floriankierski.de — Interaktion
   Reines Vanilla-JS, keine Abhängigkeiten. Die Seite funktioniert auch ohne.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------------------
     Darstellungsmodus: pixel | plain
     -------------------------------------------------------------------- */
  var MODE_KEY = 'fk-mode';

  function setMode(mode, remember) {
    root.setAttribute('data-mode', mode);
    var sw = document.getElementById('modeswitch');
    if (sw) {
      sw.setAttribute('aria-pressed', mode === 'plain' ? 'true' : 'false');
      sw.setAttribute('aria-label',
        mode === 'plain'
          ? 'Darstellung: Klartext. Wechseln zur Pixel-Darstellung.'
          : 'Darstellung: Pixel. Wechseln zur Klartext-Darstellung.');
    }
    if (remember) {
      try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* Privatmodus */ }
    }
  }

  function toggleMode() {
    setMode(root.getAttribute('data-mode') === 'plain' ? 'pixel' : 'plain', true);
  }

  setMode(root.getAttribute('data-mode') || 'pixel', false);

  var modeswitch = document.getElementById('modeswitch');
  if (modeswitch) modeswitch.addEventListener('click', toggleMode);

  var tomode = document.getElementById('tomode');
  if (tomode) tomode.addEventListener('click', toggleMode);

  /* --------------------------------------------------------------------
     Menü (mobil)
     -------------------------------------------------------------------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* --------------------------------------------------------------------
     Himmel: Sterne, Leuchtkäfer, Sonne/Mond nach Tageszeit
     -------------------------------------------------------------------- */
  function fillSky() {
    var stars = document.getElementById('stars');
    var embers = document.getElementById('embers');
    var body = document.getElementById('celestial');
    if (!stars || !body) return;

    // Die Welt ist immer Nacht — das ist die Stimmung, nicht die Uhrzeit.
    body.classList.add('is-moon');

    var frag = document.createDocumentFragment();
    for (var i = 0; i < 70; i++) {
      var s = document.createElement('span');
      s.className = 'star' + (Math.random() < 0.22 ? ' star--big' : '');
      s.style.left = (Math.random() * 100).toFixed(2) + '%';
      s.style.top = (Math.random() * 100).toFixed(2) + '%';
      s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
      frag.appendChild(s);
    }
    stars.appendChild(frag);

    // Aufsteigende Glut. Jede Flocke bekommt eigene Dauer und Verzögerung,
    // damit kein sichtbarer Rhythmus entsteht.
    if (embers && !reduced) {
      var e2 = document.createDocumentFragment();
      for (var j = 0; j < 22; j++) {
        var e = document.createElement('span');
        var cool = Math.random() < 0.25;         // ein Viertel türkis = Magie
        e.className = 'ember' + (Math.random() < 0.3 ? ' ember--big' : '')
                              + (cool ? ' ember--cool' : '');
        e.style.left = (Math.random() * 100).toFixed(2) + '%';
        e.style.animationDuration = (7 + Math.random() * 9).toFixed(1) + 's';
        e.style.animationDelay = (-Math.random() * 16).toFixed(1) + 's';
        e2.appendChild(e);
      }
      embers.appendChild(e2);
    }
  }
  fillSky();

  /* --------------------------------------------------------------------
     Funkenspur am Mauszeiger — nur mit echter Maus, nie bei Touch
     -------------------------------------------------------------------- */
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    var lastSpark = 0;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var now = Date.now();
      if (now - lastSpark < 55) return;          // Drosseln, sonst wird es Konfetti
      lastSpark = now;
      if (root.getAttribute('data-mode') === 'plain') return;

      var s = document.createElement('span');
      s.className = 'spark';
      s.style.left = (e.clientX + (Math.random() * 12 - 6)) + 'px';
      s.style.top = (e.clientY + (Math.random() * 12 - 6)) + 'px';
      document.body.appendChild(s);
      setTimeout(function () { s.remove(); }, 900);
    }, { passive: true });
  }

  /* --------------------------------------------------------------------
     Einblenden beim Scrollen
     -------------------------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    for (var r = 0; r < reveals.length; r++) reveals[r].classList.add('is-in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    for (var q = 0; q < reveals.length; q++) io.observe(reveals[q]);
  }

  /* --------------------------------------------------------------------
     Aktiver Navigationspunkt
     -------------------------------------------------------------------- */
  var sections = document.querySelectorAll('main section[id]');
  var navLinks = {};
  document.querySelectorAll('.nav a').forEach(function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = navLinks[en.target.id];
        if (!link) return;
        if (en.isIntersecting) {
          Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* --------------------------------------------------------------------
     Lightbox
     -------------------------------------------------------------------- */
  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');

  var triggers = Array.prototype.slice.call(document.querySelectorAll('[data-full]'));
  var current = -1;
  var lastFocus = null;

  function show(i) {
    if (i < 0) i = triggers.length - 1;
    if (i >= triggers.length) i = 0;
    current = i;

    var t = triggers[i];
    // Animierte Fassung bevorzugen, wenn vorhanden
    lbImg.src = t.getAttribute('data-anim') || t.getAttribute('data-full');
    lbCap.textContent = t.getAttribute('data-cap') || '';
    var inner = t.querySelector('img');
    lbImg.alt = inner ? inner.alt : (t.getAttribute('data-cap') || '');
  }

  function open(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add('lb-open');
    show(i);
    lbClose.focus();
  }

  function close() {
    lb.hidden = true;
    document.body.classList.remove('lb-open');
    lbImg.src = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (lb && triggers.length) {
    triggers.forEach(function (t, i) {
      t.addEventListener('click', function () { open(i); });
    });
    lbClose.addEventListener('click', close);
    lbPrev.addEventListener('click', function () { show(current - 1); });
    lbNext.addEventListener('click', function () { show(current + 1); });

    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.classList.contains('lb__fig')) close();
    });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowLeft') { show(current - 1); }
      else if (e.key === 'ArrowRight') { show(current + 1); }
      else if (e.key === 'Tab') {
        // Fokus im Dialog halten
        var f = [lbClose, lbPrev, lbNext];
        var idx = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(idx + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    });
  }

  /* --------------------------------------------------------------------
     Begleiter — läuft am unteren Rand mit dem Lesefortschritt mit.
     Reine Dekoration: aus bei reduzierter Bewegung, auf schmalen Displays
     und im Klartext-Modus (dort blendet CSS ihn aus).
     -------------------------------------------------------------------- */
  var buddy = document.getElementById('buddy');

  if (buddy && !reduced) {
    var BREITE = 46;
    var ziel = 0, jetzt = 0, geht = false, richtungWest = false;
    var letzterScroll = window.scrollY;
    var stopUhr = null, laeuft = false;

    function fortschritt() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    }

    function beiScroll() {
      var y = window.scrollY;
      var delta = y - letzterScroll;

      if (Math.abs(delta) > 1) {
        // Runterscrollen = nach rechts, hoch = nach links
        var west = delta < 0;
        if (west !== richtungWest) {
          richtungWest = west;
          buddy.classList.toggle('is-west', west);
        }
        if (!geht) { geht = true; buddy.classList.add('is-walking'); }
        clearTimeout(stopUhr);
        stopUhr = setTimeout(function () {
          geht = false;
          buddy.classList.remove('is-walking');
        }, 380);
      }
      letzterScroll = y;
      ziel = fortschritt() * (window.innerWidth - BREITE);
      starte();
    }

    // Weich nachziehen statt hart springen
    function schritt() {
      jetzt += (ziel - jetzt) * 0.12;
      buddy.style.transform = 'translate3d(' + jetzt.toFixed(1) + 'px,0,0)';
      if (Math.abs(ziel - jetzt) > 0.4) {
        requestAnimationFrame(schritt);
      } else {
        jetzt = ziel;
        buddy.style.transform = 'translate3d(' + jetzt.toFixed(1) + 'px,0,0)';
        laeuft = false;
      }
    }
    function starte() {
      if (!laeuft) { laeuft = true; requestAnimationFrame(schritt); }
    }

    ziel = jetzt = fortschritt() * (window.innerWidth - BREITE);
    buddy.style.transform = 'translate3d(' + jetzt.toFixed(1) + 'px,0,0)';

    window.addEventListener('scroll', beiScroll, { passive: true });
    window.addEventListener('resize', function () {
      ziel = fortschritt() * (window.innerWidth - BREITE);
      starte();
    }, { passive: true });
  }

  /* --------------------------------------------------------------------
     Kleinkram
     -------------------------------------------------------------------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
