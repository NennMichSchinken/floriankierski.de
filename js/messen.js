// Messen (Livegang C, Runde 92): nur mit ?messen in der Adresse (bei einer Karte zählt die Adresse der Gasse), sonst
// tut die Datei nichts. Zeichnet auf, was den Hauptthread wann blockiert: lange Tasks, lange Bilder (Chrome/Edge, mit
// dem Skript, das sie lang machte), die Phasen der Seiten (performance.mark „gasse:…“, „atelier:…“, „seite:…“), die
// Ladezeiten der Dateien und jedes Bild (Abstand der requestAnimationFrame). Unten links eine kleine Anzeige; „Bericht“
// zeigt die Auswertung und legt sie in die Zwischenablage (zum Einfügen in den Chat). Die Karte (iframe) misst mit und
// steht im Bericht der Gasse, auf deren Zeitachse (ms seit dem Aufruf der Gasse).
(() => {
  const hat = w => { try { return /[?&]messen(=|&|$)/.test(w.location.search); } catch (e) { return false; } };
  const oben = window.top === window;
  if (!hat(window) && !(!oben && hat(window.top))) return;
  const M = window.__messung = { frames: [], tasks: [], loaf: [], marks: [], res: [] };
  // ?messen=kalt: wie der erste Besuch. Jeder Shader bekommt einen neuen Kommentar, so findet der Browser keine fertig
  // übersetzten Programme in seinem Speicher und muss alles neu übersetzen.
  if (/[?&]messen=kalt\b/.test(location.search + top.location.search)) {
    const neu = Math.random().toString(36).slice(2);
    for (const C of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
      if (!C) continue;
      const alt = C.prototype.shaderSource;
      C.prototype.shaderSource = function (s, q) { return alt.call(this, s, `${q}\n// kalt ${neu}\n`); };
    }
  }
  const po = (type, fn) => {
    try { new PerformanceObserver(l => l.getEntries().forEach(fn)).observe({ type, buffered: true }); } catch (e) { /* fehlt */ }
  };
  const kurz = u => (u || '').split('?')[0].split('/').pop();
  po('longtask', e => M.tasks.push([e.startTime, e.duration]));
  po('long-animation-frame', e => M.loaf.push({
    t: e.startTime, d: e.duration, block: e.blockingDuration,
    render: e.renderStart ? e.startTime + e.duration - e.renderStart : 0,
    stil: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0,
    skripte: e.scripts.map(s => ({ d: s.duration, typ: s.invokerType, wer: s.invoker, fn: s.sourceFunctionName,
      datei: kurz(s.sourceURL), pos: s.sourceCharPosition, layout: s.forcedStyleAndLayoutDuration })) }));
  po('mark', e => M.marks.push([e.name, e.startTime, null]));
  po('measure', e => M.marks.push([e.name, e.startTime, e.duration]));
  po('resource', e => M.res.push([kurz(e.name), e.startTime, e.duration, e.encodedBodySize || e.transferSize || 0]));
  const rf = t => { if (M.frames.length < 30000) M.frames.push(t); requestAnimationFrame(rf); };
  requestAnimationFrame(rf);
  if (!oben) return;

  // ---------------------------------------------------------------- Auswertung (nur in der Gasse bzw. der Seite allein)
  const r0 = x => Math.round(x), r1 = x => Math.round(x * 10) / 10;
  const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };
  function quellen() {                                       // diese Seite und jede Karte, auf eine Zeitachse
    const q = [{ name: kurz(location.pathname) || 'seite', m: M, v: 0 }];
    document.querySelectorAll('iframe').forEach(f => {
      try {
        const w = f.contentWindow;
        if (w && w.__messung) q.push({ name: kurz(w.location.pathname), m: w.__messung,
          v: w.performance.timeOrigin - performance.timeOrigin });
      } catch (e) { /* fremd */ }
    });
    return q;
  }
  function gpu() {
    for (const k of ['__dbg', '__atelier', '__reise', '__tv']) {
      try {
        const r = window[k] && window[k].renderer, gl = r && r.getContext(), x = gl && gl.getExtension('WEBGL_debug_renderer_info');
        if (x) return gl.getParameter(x.UNMASKED_RENDERER_WEBGL);
      } catch (e) { /* weiter */ }
    }
    return '?';
  }
  function bilder(frames, von, bis, takt) {                 // Bildabstände in [von, bis]
    const d = [];
    for (let i = 1; i < frames.length; i++) if (frames[i] >= von && frames[i] <= bis) d.push([frames[i] - frames[i - 1], frames[i]]);
    if (!d.length) return null;
    const ms = d.map(x => x[0]), s = [...ms].sort((a, b) => a - b);
    return { n: d.length, med: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1],
      fps: d.length / ((bis - von) / 1000), verpasst: ms.filter(x => x > takt * 1.5).length,
      ueber50: ms.filter(x => x > 50).length, laengste: d.sort((a, b) => b[0] - a[0]).slice(0, 8) };
  }
  function bericht() {
    const Q = quellen(), z = [];
    const alleMarks = Q.flatMap(q => q.m.marks.map(([n, t, d]) => [n, t + q.v, d])).sort((a, b) => a[1] - b[1]);
    const takt = median(M.frames.slice(1).map((t, i) => t - M.frames[i])) || 16.7;
    const ua = navigator.userAgent, browser = ['Edg', 'OPR', 'Firefox', 'Chrome', 'Safari'].map(n => ua.match(new RegExp(n + '/[\\d.]+')))
      .find(Boolean);
    z.push(`Messung ${new Date().toLocaleString('de-DE')} · ${browser ? browser[0] : ua}`);
    z.push(`Fenster ${innerWidth}×${innerHeight} ×${devicePixelRatio} · Takt ${r1(takt)} ms (${r0(1000 / takt)} Hz) · GPU ${gpu()}`);
    z.push(`Adresse ${location.pathname.split('/').pop()}${location.search}`);
    z.push('', 'PHASEN (ms seit Aufruf; Klammer: Dauer)');
    z.push(alleMarks.map(([n, t, d]) => `${n} ${r0(t)}${d != null ? ` (${r0(d)})` : ''}`).join(' · ') || '–');
    z.push('', 'DATEIEN (Start, Dauer ms, KB), über 20 ms');
    z.push(Q.flatMap(q => q.m.res.map(([n, t, d, b]) => [n, t + q.v, d, b])).filter(x => x[2] > 20)
      .sort((a, b) => a[1] - b[1]).map(([n, t, d, b]) => `${n} ${r0(t)}+${r0(d)} ${r0(b / 1024)}`).join(' · ') || '–');
    for (const q of Q) {
      const T = q.m.tasks.map(([t, d]) => [t + q.v, d]);
      z.push('', `LANGE TASKS ${q.name}: ${T.length}, zusammen ${r0(T.reduce((s, x) => s + x[1], 0))} ms` +
        (T.length ? ` · ${T.sort((a, b) => b[1] - a[1]).slice(0, 12).sort((a, b) => a[0] - b[0]).map(([t, d]) => `${r0(t)}:${r0(d)}`).join(' ')}` : ''));
    }
    // Bildfenster: Aufbau der Gasse, Aufbau der Karte, Öffnen der Karte, alles
    const mark = (n, nach = 0) => { const m = alleMarks.filter(x => x[0] === n); return m.length ? m[m.length - 1][1] + nach : null; };
    const fenster = [
      ['Aufbau Gasse', mark('gasse:auftakt'), mark('gasse:aufbau-ende', 500)],
      ['Karte öffnen', mark('seite:oeffne'), mark('seite:oeffne', 1400)],
      ['Aufbau Atelier', mark('atelier:erstes-bild'), mark('atelier:aufbau-ende', 500)],
      ['bis jetzt', 0, performance.now()],
    ];
    for (const q of Q) {
      const fr = q.m.frames.map(t => t + q.v);
      for (const [name, von, bis] of fenster) {
        if (von == null || bis == null) continue;
        const b = bilder(fr, von, bis, takt);
        if (!b) continue;
        z.push('', `BILDER ${q.name}, ${name} (${r0(von)}–${r0(bis)}): ${b.n} Bilder, ${r0(b.fps)} fps, Median ${r1(b.med)} ms, ` +
          `95 % ${r1(b.p95)}, längstes ${r0(b.max)} · verpasst ${b.verpasst}, über 50 ms ${b.ueber50}`);
        z.push(`  längste: ${b.laengste.map(([d, t]) => `${r0(t)}:${r0(d)}`).join(' ')}`);
      }
    }
    for (const q of Q) {
      const L = q.m.loaf.map(f => ({ ...f, t: f.t + q.v })).sort((a, b) => b.d - a.d).slice(0, 12).sort((a, b) => a.t - b.t);
      if (!L.length) continue;
      z.push('', `LANGE BILDER ${q.name} (Start:Dauer, Zeichnen, Stil; Skripte ms fn@datei:pos)`);
      for (const f of L) {
        const s = f.skripte.sort((a, b) => b.d - a.d).slice(0, 3)
          .map(s => `${r0(s.d)} ${s.fn || s.typ}@${s.datei}:${s.pos}${s.layout > 5 ? ` Layout ${r0(s.layout)}` : ''}`).join(', ');
        z.push(`  ${r0(f.t)}:${r0(f.d)} Z ${r0(f.render)} S ${r0(f.stil)} · ${s || '–'}`);
      }
    }
    return z.join('\n');
  }
  window.__messbericht = bericht;

  // ---------------------------------------------------------------- Anzeige
  addEventListener('DOMContentLoaded', () => {
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483647;max-width:calc(100vw - 24px);' +
      'font:12px/1.4 ui-monospace,Consolas,monospace;color:#fff;background:rgba(30,20,20,.82);border-radius:14px;' +
      'padding:6px 8px 6px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;box-sizing:border-box';
    const text = document.createElement('span');
    const knopf = (t, f) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.style.cssText = 'font:inherit;color:#2a1a14;background:#ffe2cf;border:0;border-radius:10px;padding:3px 9px;cursor:pointer';
      b.onclick = f;
      return b;
    };
    const feld = document.createElement('textarea');
    feld.readOnly = true;
    feld.style.cssText = 'display:none;width:min(760px,calc(100vw - 48px));height:min(60vh,520px);font:11px/1.35 ui-monospace,Consolas,monospace;' +
      'white-space:pre;border-radius:10px;border:0;padding:8px;box-sizing:border-box';
    const zeigen = knopf('Bericht', async () => {
      feld.value = bericht();
      feld.style.display = 'block';
      feld.select();
      try { await navigator.clipboard.writeText(feld.value); zeigen.textContent = 'Kopiert ✓'; }
      catch (e) { zeigen.textContent = 'Markiert: Strg+C'; }
      setTimeout(() => { zeigen.textContent = 'Bericht'; }, 2500);
    });
    const zu = knopf('✕', () => { feld.style.display = 'none'; });
    box.append(text, zeigen, knopf('Neu laden', () => location.reload()), zu, feld);
    document.body.append(box);
    setInterval(() => {                                     // live: letzte Sekunde
      const jetzt = performance.now(), f = M.frames;
      let n = 0, lang = 0;
      for (let i = f.length - 1; i > 0 && f[i] > jetzt - 1000; i--) { n++; if (f[i] - f[i - 1] > 25) lang++; }
      const tasks = quellen().reduce((s, q) => s + q.m.tasks.length, 0);
      text.textContent = `Messen · ${n} fps · ${lang} > 25 ms · ${tasks} lange Tasks`;
    }, 500);
  });
})();
