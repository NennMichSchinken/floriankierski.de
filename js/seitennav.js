// Seitennavigation für alle Unterseiten (Runde 77, siehe seitennav.css). Erwartet im Dokument:
//   <nav class="seitennav" aria-label="…">
//     <a class="sn-name" href="#oben">Name der Seite</a>
//     <ul class="sn-liste"><li><a href="#abschnitt">Abschnitt</a></li> …</ul>
//     <button class="sn-knopf" type="button" aria-expanded="false"><span class="sn-jetzt"></span>(Pfeil)</button>
//   </nav>
// Aktiv ist der Abschnitt, dessen Anfang über 45 % der Bildhöhe liegt. Schmal zeigt die Pille Name und Abschnitt und
// klappt die Liste auf; ein Klick auf einen Eintrag, daneben oder Esc klappt sie zu.
(() => {
  const nav = document.querySelector('.seitennav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('.sn-liste a')];
  const ziele = links.map(a => document.getElementById(decodeURIComponent(a.hash.slice(1))));
  const name = nav.querySelector('.sn-name'), knopf = nav.querySelector('.sn-knopf'), jetzt = nav.querySelector('.sn-jetzt');
  const ohneSymbol = el => { const k = el.cloneNode(true); k.querySelectorAll('svg').forEach(s => s.remove()); return k.innerHTML; };
  let zuletzt = -2;
  function aktiv() {
    const mitte = innerHeight * 0.45;
    let best = -1;
    ziele.forEach((z, i) => { if (z && z.getBoundingClientRect().top <= mitte) best = i; });
    if (best === zuletzt) return;
    zuletzt = best;
    links.forEach((a, i) => {
      a.classList.toggle('aktiv', i === best);
      if (i === best) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    if (jetzt) jetzt.innerHTML = `<b>${ohneSymbol(name)}</b>` + (best >= 0 ? ` · <span>${ohneSymbol(links[best])}</span>` : '');
  }
  const zu = () => { nav.classList.remove('offen'); if (knopf) knopf.setAttribute('aria-expanded', 'false'); };
  if (knopf) knopf.addEventListener('click', () => {
    const offen = nav.classList.toggle('offen');
    knopf.setAttribute('aria-expanded', String(offen));
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) zu(); });
  document.addEventListener('pointerdown', e => { if (!nav.contains(e.target)) zu(); });
  document.addEventListener('keydown', e => {                  // Esc klappt erst die Liste zu (vor „Karte schließen“)
    if (e.key === 'Escape' && nav.classList.contains('offen')) { zu(); e.stopImmediatePropagation(); }
  }, true);
  addEventListener('scroll', aktiv, { passive: true });
  addEventListener('resize', aktiv);
  aktiv();
})();
