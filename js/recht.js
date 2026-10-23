// Impressum und Datenschutz (Livegang F, Runde 98): Sprache, Karte über der Gasse, Scrollbalken. Anders als die übrigen
// Unterseiten bleiben diese Seiten direkt aufgerufen allein (lesbar ohne 3D und ohne Gasse). Im Kopf jeder Seite setzt
// ein kleines Skript Sprache und „eingebettet“ vor dem ersten Bild; hier kommt der Rest nach karte.js.
(() => {
  const root = document.documentElement, W = window.KARTE;
  W.setzeSprache(root.lang === 'de' ? 'de' : 'en');
  const b = document.getElementById('balken');
  if (W.eingebettet && b) {                                 // Scrollbalken in der Karte (wie die Unterseiten)
    const clamp = (v, a, c) => Math.min(c, Math.max(a, v));
    const zeigen = () => {
      const weg = root.scrollHeight - innerHeight, h = b.clientHeight, griff = b.firstElementChild;
      const g = Math.max(36, h * innerHeight / (weg + innerHeight));
      griff.style.height = `${g}px`;
      griff.style.top = `${weg > 0 ? (h - g) * clamp(scrollY / weg, 0, 1) : 0}px`;
    };
    let zieht = false;
    const nach = y => {
      const r = b.getBoundingClientRect(), g = b.firstElementChild.offsetHeight;
      scrollTo({ top: clamp((y - r.top - g / 2) / Math.max(1, r.height - g), 0, 1) * (root.scrollHeight - innerHeight),
                 behavior: 'instant' });
    };
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); b.setPointerCapture(e.pointerId); zieht = true; b.classList.add('zieht'); nach(e.clientY);
    });
    b.addEventListener('pointermove', e => { if (zieht) nach(e.clientY); });
    const los = () => { zieht = false; b.classList.remove('zieht'); };
    b.addEventListener('pointerup', los);
    b.addEventListener('pointercancel', los);
    addEventListener('scroll', zeigen, { passive: true });
    addEventListener('resize', zeigen);
    new ResizeObserver(zeigen).observe(document.body);
  }
  requestAnimationFrame(() => { W.melde('bereit'); W.melde('ruhig'); });   // nichts aufzubauen
})();
