// Unterseiten als Karte über der Gasse (Runde 62; Livegang D: vorher in Atelier, WispUI und Reise je eine Kopie, so
// kommen auch Impressum und Datenschutz ohne weitere aus). Die Gasse zeigt die Seite in einem Blatt (iframe mit
// ?eingebettet, die Klasse setzt das kleine Skript im Kopf jeder Seite). Meldungen an die Gasse: bereit (erstes Bild),
// ruhig (fertig aufgebaut, Runde 92), schliessen (✕ Home oder Esc), sprache, seite (Verweis auf eine andere Unterseite:
// Links mit data-seite, wahlweise data-halt). Von ihr: pause/weiter (Blatt zu/auf) und sprache.
// Ein klassisches Skript (window.KARTE), damit es auch das Skript der WispUI-Seite nutzen kann, das beim Lesen der Seite
// läuft. Die Seite hängt sich mit KARTE.verbinde({ sprache, pause }) an.
window.KARTE = (() => {
  const root = document.documentElement, eingebettet = root.classList.contains('eingebettet');
  const melde = (typ, wert) => { if (eingebettet) parent.postMessage({ nullAlley: true, typ, wert }, location.origin); };
  let beiSprache = () => {}, beiPause = () => {}, landen;
  // Runde 93: gelandet() wartet, bis die Karte über der Gasse fertig hochgeflogen ist (die Gasse antwortet auf
  // „landung?“); so fällt teure Vorbereitung nicht ins Hochfliegen. Allein, direkt geöffnet oder ohne Antwort nach 2 s:
  // gleich weiter.
  const gelandetP = new Promise(r => { landen = r; });
  if (!eingebettet) landen();
  function setzeSprache(s) {
    if (s === 'de') root.dataset.sprache = 'de'; else delete root.dataset.sprache;
    root.lang = s === 'de' ? 'de' : 'en';
    document.querySelectorAll('.sprache button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sprache === root.lang)));
    beiSprache(root.lang);
  }
  if (eingebettet) {
    addEventListener('message', e => {
      const d = e.data;
      if (e.origin !== location.origin || e.source !== parent || !d || !d.nullAlley) return;
      if (d.typ === 'pause') beiPause(true);
      else if (d.typ === 'weiter') beiPause(false);
      else if (d.typ === 'sprache') setzeSprache(d.wert);
      else if (d.typ === 'gelandet') landen();
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') melde('schliessen'); });
  }
  document.addEventListener('click', e => {
    const z = e.target.closest('a, button');
    if (!z) return;
    if (z.matches('.sprache button')) {
      setzeSprache(z.dataset.sprache);
      try { localStorage.setItem('nullAlleySprache', z.dataset.sprache); } catch (err) { /* egal */ }
      melde('sprache', z.dataset.sprache);                     // die Gasse schaltet mit um
    } else if (eingebettet && z.matches('a.heim')) {           // ✕ Home: die Karte fällt (die Gasse schließt sie)
      e.preventDefault();
      melde('schliessen');
    } else if (eingebettet && z.dataset.seite) {               // andere Unterseite: die Gasse tauscht die Karte
      e.preventDefault();
      melde('seite', z.dataset.halt ? { seite: z.dataset.seite, halt: z.dataset.halt } : { seite: z.dataset.seite });
    }
  });
  // Wischen nach rechts schließt die Karte (Runde 102, Florian am Handy): deutlich waagerecht nach rechts gezogen folgt
  // die Karte dem Finger (wisch, dx in px), beim Loslassen entscheidet die Gasse: fallen lassen oder zurückfedern.
  // Nicht vom linken Rand (dort ist die Zurück-Geste des Browsers, sie schließt die Karte über den Verlauf ohnehin),
  // nicht auf Dingen, die selbst waagerecht gezogen werden (Raum im Kopf, Scrollbalken, waagerecht scrollende Zeilen).
  if (eingebettet) {
    const EIGEN = '.raum, .balken, .nachoben, input, textarea, select';
    const scrolltQuer = el => {
      for (; el && el !== document.body; el = el.parentElement) if (el.scrollWidth > el.clientWidth + 1 &&
        /auto|scroll/.test(getComputedStyle(el).overflowX)) return true;
      return false;
    };
    let w = null;                                            // laufende Geste: Start, Richtung, letzte Bewegung
    addEventListener('touchstart', e => {
      const t = e.touches[0];
      w = e.touches.length === 1 && t.clientX > 24 && !e.target.closest(EIGEN) && !scrolltQuer(e.target)
        ? { x: t.clientX, y: t.clientY, quer: null, dx: 0, zeit: e.timeStamp, v: 0 } : null;
    }, { passive: true });
    addEventListener('touchmove', e => {
      if (!w) return;
      const t = e.touches[0], dx = t.clientX - w.x, dy = t.clientY - w.y;
      if (w.quer === null) {
        if (Math.hypot(dx, dy) < 12) return;
        w.quer = dx > 0 && Math.abs(dx) > 1.5 * Math.abs(dy);
        if (!w.quer) { w = null; return; }                   // senkrecht: normal scrollen
      }
      e.preventDefault();
      const neu = Math.max(0, dx);
      w.v = (neu - w.dx) / Math.max(1, e.timeStamp - w.zeit);
      w.dx = neu; w.zeit = e.timeStamp;
      melde('wisch', { dx: w.dx });
    }, { passive: false });
    const los = () => {
      if (w && w.quer) melde('wisch', { dx: w.dx, v: w.v, los: true });
      w = null;
    };
    addEventListener('touchend', los);
    addEventListener('touchcancel', () => { if (w && w.quer) melde('wisch', { dx: 0, v: 0, los: true }); w = null; });
  }
  return {
    eingebettet, melde, setzeSprache,
    gelandet() { melde('landung?'); setTimeout(landen, 2000); return gelandetP; },
    verbinde({ sprache, pause } = {}) { if (sprache) beiSprache = sprache; if (pause) beiPause = pause; },
  };
})();
