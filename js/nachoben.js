// Knopf „nach oben“ für alle Unterseiten (Runde 95, siehe nachoben.css). Legt den Knopf selbst an; er erscheint, sobald
// die Seite eine Bildschirmhöhe gescrollt ist. Seiten mit Rasten setzen window.NACHOBEN (Atelier: zur ersten Station,
// Reise: erster Halt wie im Fahrplan, der Zug fährt zurück); sonst scrollt er weich nach oben, mit „Bewegung
// reduzieren“ sofort.
(() => {
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nachoben';
  b.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16.5V4M4.5 9.5 10 4l5.5 5.5" fill="none" ' +
    'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
    '<span class="sr" lang="en">Back to top</span><span class="sr" lang="de">Nach oben</span>';
  document.body.append(b);
  b.addEventListener('click', () => {
    if (window.NACHOBEN) window.NACHOBEN();
    else scrollTo({ top: 0, behavior: ruhig.matches ? 'instant' : 'smooth' });
  });
  let da = null;
  function zeige() {
    const jetzt = scrollY > innerHeight;
    if (jetzt === da) return;
    da = jetzt;
    b.classList.toggle('da', jetzt);
    if (!jetzt && document.activeElement === b) b.blur();
  }
  addEventListener('scroll', zeige, { passive: true });
  addEventListener('resize', zeige);
  zeige();
})();
