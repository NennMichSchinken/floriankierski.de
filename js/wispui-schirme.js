// WispUI im Fernseher (Runde 72): was die Bildschirme der Retro-Fernseher auf wispui.html zeigen. Gezeichnet wie das
// Plugin, aus Florians Config (pluginConfigs/WispUI.json) und dem Code (Hud/PartyFrames/PartyFramesElement.cs,
// Hud/FrameMark.cs, Hud/QuickDispel/QuickDispelElement.cs, Hud/CombatTracker/CombatTrackerElement.cs,
// Hud/QualityOfLife/SlidecastElement.cs, Data/BarStyles.cs, Data/Jobs.cs, Style/Tokens.cs). Die Balken-Texturen
// stammen aus dem Repo (Textures/bars, MIT). Job-, Leiter- und Status-Symbole kommen im Plugin aus dem Spiel und
// bleiben weg (neutrale Kästchen an ihrer Stelle); Namen ausgedacht; Zahlen im Meter sind Vorführwerte.
// Jeder Bildschirm ist eine Leinwand 400 × 300 (logisch, 4:3 wie die Bildschirme in Voxeln), per matrix3d auf die vier
// Ecken des Bildschirms im gerenderten Gerät gelegt (bilder/wispui/geraete.json).
// Runde 73: Ein Fernseher ist aus (schwarz), bis das Licht im Kabel ankommt, dann geht er mit dem Röhren-Effekt an
// (Punkt → Strich → Bild); der PC am Ende fährt hoch, tippt /wisp und öffnet das Einstellungsfenster (nach
// Interface/ConfigWindow.cs, Widgets/Chrome.cs und Style/Tokens.cs, Beschriftungen aus Localization/Strings.cs).

export const W = 400, H = 300;

// ---------------------------------------------------------------- Leinwand auf ein Viereck legen (Homographie)
const adj = m => [m[4] * m[8] - m[5] * m[7], m[2] * m[7] - m[1] * m[8], m[1] * m[5] - m[2] * m[4],
  m[5] * m[6] - m[3] * m[8], m[0] * m[8] - m[2] * m[6], m[2] * m[3] - m[0] * m[5],
  m[3] * m[7] - m[4] * m[6], m[1] * m[6] - m[0] * m[7], m[0] * m[4] - m[1] * m[3]];
const mm = (a, b) => { const r = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let s = 0; for (let k = 0; k < 3; k++) s += a[3 * i + k] * b[3 * k + j]; r.push(s); } return r; };
const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const basis = p => { const m = [p[0], p[2], p[4], p[1], p[3], p[5], 1, 1, 1], v = mv(adj(m), [p[6], p[7], 1]); return mm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]); };
// ecken: oben links, oben rechts, unten rechts, unten links (Pixel im Bild); s: Maßstab Bild → Anzeige
export function viereck(ecken, s) {
  const [ol, or, ur, ul] = ecken.map(([x, y]) => [x * s, y * s]);
  const t = mm(basis([ol, or, ul, ur].flat()), adj(basis([0, 0, W, 0, 0, H, W, H])));
  for (let i = 0; i < 9; i++) t[i] /= t[8];
  return `matrix3d(${[t[0], t[3], 0, t[6], t[1], t[4], 0, t[7], 0, 0, 1, 0, t[2], t[5], 0, t[8]].join(',')})`;
}

// ---------------------------------------------------------------- Texturen eingefärbt wie BarStyles.Draw
const TEX = {}, GETOENT = new Map();
export function ladeTexturen(pfad = 'bilder/wispui/bars/') {
  return Promise.all(['body', 'lit-bottom', 'smooth'].map(n => new Promise((ok, fehler) => {
    const i = new Image();
    i.onload = () => { TEX[n] = i; ok(); };
    i.onerror = fehler;
    i.src = pfad + n + '.png';
  })));
}
function toene(name, rgb, a = 1) {
  const k = `${name}|${rgb}|${a}`;
  if (GETOENT.has(k)) return GETOENT.get(k);
  const src = TEX[name], o = document.createElement('canvas');
  o.width = src.width; o.height = src.height;
  const g = o.getContext('2d');
  g.drawImage(src, 0, 0);
  const d = g.getImageData(0, 0, o.width, o.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    p[i] = p[i] * rgb[0] / 255; p[i + 1] = p[i + 1] * rgb[1] / 255; p[i + 2] = p[i + 2] * rgb[2] / 255; p[i + 3] *= a;
  }
  g.putImageData(d, 0, 0);
  GETOENT.set(k, o);
  return o;
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
const mische = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const glatt = k => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
function balken(c, x, y, w, h, farbe, stil = 'glow') {     // Glow bottom: body + lit-bottom (35 % Weiß, 0,68)
  if (w <= 0 || h <= 0) return;
  const rgb = hex(farbe);
  if (stil === 'glow') {
    c.drawImage(toene('body', rgb), x, y, w, h);
    c.drawImage(toene('lit-bottom', mische(rgb, [255, 255, 255], 0.35), 0.68), x, y, w, h);
  } else c.drawImage(toene('smooth', rgb), x, y, w, h);
}
function text(c, s, x, y, groesse, { farbe = '#fff', kontur = true, gewicht = 700, schrift = 'Figtree', ausr = 'left' } = {}) {
  c.font = `${gewicht} ${groesse}px ${schrift}, sans-serif`;
  c.textBaseline = 'top'; c.textAlign = ausr;
  if (kontur) { c.lineJoin = 'round'; c.lineWidth = groesse * 0.22; c.strokeStyle = '#000'; c.strokeText(s, x, y); }
  c.fillStyle = farbe; c.fillText(s, x, y);
  c.textAlign = 'left';
}

// ---------------------------------------------------------------- Florians Einstellungen (WispUI.json)
export const CFG = {
  breite: 160.68, hoehe: 70.3, abstand: 2, zeilen: 2, rand: 1, pad: 5, mana: 4, name: 16,
  schild: '#FFBF22', cleanse: '#B382DD', raise: '#5BD98A', slideWarten: '#FF6A5A', slideBereit: '#5BD98A',
  dispel: 28, dispelAbstand: 4, dispelRing: 2,
};
// Jobfarben aus Data/Jobs.cs (nur die Farben), Rollen dazu
const GRUPPE = [
  { name: 'Mira', farbe: '#A8D2E6', rolle: 'tank', hp: 0.92, schild: 0.18 },
  { name: 'Kaya', farbe: '#FFF0DC', rolle: 'heiler', hp: 1, mp: 0.8 },
  { name: 'Juno', farbe: '#D69C00', rolle: 'dd', hp: 0.74 },
  { name: 'Nox', farbe: '#A579D6', rolle: 'dd', hp: 0.58 },
];

// ---------------------------------------------------------------- Gruppenfenster (PartyFramesElement)
// opts: hp, schild, mp, ziel, marke ('cleanse' | 'raise'), tot, buffs, sweep
function fenster(c, m, x, y, w, h, o = {}) {
  const hp = o.hp ?? m.hp;
  c.fillStyle = 'rgba(20, 19, 20, .784)';                    // FrameBg 0xC8141314
  c.fillRect(x, y, w, h);
  const ix = x + CFG.rand, iy = y + CFG.rand, iw = w - 2 * CFG.rand, ih = h - 2 * CFG.rand;
  const mana = m.rolle === 'heiler';                          // Mana nur bei Heilern (Config)
  const hb = mana ? ih - CFG.mana : ih;
  if (hp > 0) {
    c.save(); c.beginPath(); c.rect(ix, iy, Math.round(iw * hp), hb); c.clip();
    balken(c, ix, iy, iw, hb, m.farbe);
    c.restore();
  }
  const schild = o.schild ?? m.schild;
  if (schild && hp > 0) {                                     // Shield.Band
    const spill = Math.max(0, hp + schild - 1), a = Math.max(0, hp - spill), b = Math.min(1, hp + schild);
    c.save(); c.beginPath(); c.rect(ix + iw * a, iy, iw * (b - a), hb); c.clip();
    balken(c, ix, iy, iw, hb, CFG.schild, 'smooth');
    c.restore();
    if (a > 0 && a < hp) { c.fillStyle = CFG.schild; c.fillRect(ix + iw * a, iy, 2, hb); }
  }
  if (mana) { c.fillStyle = '#4C6FD0'; c.fillRect(ix, iy + ih - CFG.mana, Math.round(iw * (o.mp ?? m.mp ?? 1)), CFG.mana); }
  c.strokeStyle = 'rgba(10, 10, 10, .784)'; c.lineWidth = CFG.rand;   // FrameEdge
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  text(c, m.name, ix + CFG.pad, iy + CFG.pad, CFG.name, { farbe: o.tot ? '#9a9a9a' : '#fff' });
  for (let k = 0; k < (o.buffs || 0); k++) {                  // eigene Buffs unten rechts (20 px), neutral
    const s = 20, bx = ix + iw - CFG.pad - (k + 1) * s - k * 2, by = iy + ih - CFG.pad - s;
    c.fillStyle = '#26302b'; c.fillRect(bx, by, s, s);
    c.fillStyle = '#7fd6a2'; c.fillRect(bx + 4, by + 4, s - 8, s - 8);
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(bx, by, s, s * ((o.sweep && o.sweep[k]) || 0));
  }
  if (o.marke) {                                              // FrameMark Stil Full: Färbung oben 35 % → unten voll,
    const f = o.marke === 'raise' ? CFG.raise : CFG.cleanse, st = o.markeStaerke ?? 1;   // Rand 3 px außen
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, rgba(f, 0.35 * st)); g.addColorStop(1, rgba(f, st));
    c.fillStyle = g; c.fillRect(x, y, w, h);
    c.fillStyle = rgba(f, st);
    c.fillRect(x - 3, y - 3, w + 6, 3); c.fillRect(x - 3, y + h, w + 6, 3);
    c.fillRect(x - 3, y, 3, h); c.fillRect(x + w, y, 3, h);
    text(c, m.name, ix + CFG.pad, iy + CFG.pad, CFG.name);   // Name bleibt lesbar (wie im Plugin oben)
  }
  if (o.ziel) {                                               // Ring 2 px außen, FrameHover (Weiß, 0xD2)
    c.fillStyle = 'rgba(255,255,255,.824)';
    const r = 2, e = o.marke ? 3 : 0;
    c.fillRect(x - r - e, y - r - e, w + 2 * (r + e), r); c.fillRect(x - r - e, y + h + e, w + 2 * (r + e), r);
    c.fillRect(x - r - e, y - e, r, h + 2 * e); c.fillRect(x + w + e, y - e, r, h + 2 * e);
  }
}
function block(n, w, h) {
  const pro = Math.ceil(n / CFG.zeilen);
  return { pro, bw: pro * w + (pro - 1) * CFG.abstand, bh: CFG.zeilen * h + (CFG.zeilen - 1) * CFG.abstand };
}
function gruppeZeichnen(c, x, y, w, h, opts) {
  const { pro } = block(GRUPPE.length, w, h);
  GRUPPE.forEach((m, i) => {
    const z = Math.floor(i / pro), p = i - z * pro;
    fenster(c, m, x + p * (w + CFG.abstand), y + z * (h + CFG.abstand), w, h, opts(m, i));
  });
}

// ---------------------------------------------------------------- Quick Dispel (Raster: 4 nebeneinander)
function quickDispel(c, x, y, an, rest) {
  const s = CFG.dispel, g = CFG.dispelAbstand;
  GRUPPE.forEach((m, i) => {
    const qx = x + (i % 4) * (s + g), qy = y + Math.floor(i / 4) * (s + g);
    c.fillStyle = an[i] ? CFG.cleanse : 'rgba(20, 19, 20, .784)';
    c.fillRect(qx, qy, s, s);
    c.fillStyle = m.farbe;                                    // Ring in der Jobfarbe, 2 px
    c.fillRect(qx, qy, s, 2); c.fillRect(qx, qy + s - 2, s, 2); c.fillRect(qx, qy, 2, s); c.fillRect(qx + s - 2, qy, 2, s);
    text(c, an[i] ? String(Math.ceil(rest[i])) : String(i + 1), qx + s / 2, qy + s / 2 - 7, 14, { ausr: 'center' });
  });
}
function zeiger(c, x, y, druck) {                             // Mauszeiger (gezeichnet, nichts aus dem Spiel)
  c.save(); c.translate(x, y); c.scale(druck ? 0.9 : 1, druck ? 0.9 : 1);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 19); c.lineTo(5, 14); c.lineTo(9, 22); c.lineTo(12, 21); c.lineTo(8, 13);
  c.lineTo(14, 13); c.closePath();
  c.fillStyle = '#fff'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#000'; c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- Hintergrund und Röhre
function grund(c) {
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2c3a52'); g.addColorStop(1, '#1b2130');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(120, 160, 200, .08)';
  c.beginPath(); c.arc(80, 70, 90, 0, 7); c.fill(); c.beginPath(); c.arc(330, 230, 110, 0, 7); c.fill();
}
function roehre(c) {
  c.fillStyle = 'rgba(0, 0, 0, .12)';
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  const v = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
}
function glas(c) {                                            // ausgeschaltet: dunkles Glas mit leichtem Schimmer
  c.fillStyle = '#0d0e13'; c.fillRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, W * 0.7, H);
  g.addColorStop(0, 'rgba(160, 190, 220, .13)'); g.addColorStop(0.45, 'rgba(160, 190, 220, .03)');
  g.addColorStop(0.46, 'rgba(160, 190, 220, 0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
}
// Röhren-Effekt beim Einschalten (k 0 … 1): ein Punkt wird zum hellen Strich, der Strich geht zum Bild auf, das Bild
// ist erst überstrahlt und beruhigt sich
const ausLaufen = k => 1 - (1 - clamp(k, 0, 1)) ** 3;
function anschalten(c, k) {
  const schwarz = '#07080b';
  if (k < 0.16) {
    c.fillStyle = schwarz; c.fillRect(0, 0, W, H);
    const b = W * ausLaufen(k / 0.16), h = 2 + 2 * (1 - k / 0.16);
    c.save(); c.shadowColor = '#9ff0ff'; c.shadowBlur = 18;
    c.fillStyle = '#f4feff'; c.fillRect((W - b) / 2, (H - h) / 2, b, h);
    c.restore();
    return;
  }
  if (k < 0.5) {
    const h = Math.max(2, H * ausLaufen((k - 0.16) / 0.34)), y0 = (H - h) / 2;
    c.fillStyle = schwarz; c.fillRect(0, 0, W, y0); c.fillRect(0, y0 + h, W, H - y0 - h);
    c.fillStyle = `rgba(240, 252, 255, ${0.85 * (1 - (k - 0.16) / 0.34)})`; c.fillRect(0, y0, W, h);
    c.fillStyle = 'rgba(244, 254, 255, .9)'; c.fillRect(0, y0, W, 2); c.fillRect(0, y0 + h - 2, W, 2);
    return;
  }
  const n = (k - 0.5) / 0.5, flimmer = n < 0.4 ? 0.06 * Math.sin(n * 60) : 0;
  c.fillStyle = `rgba(240, 252, 255, ${Math.max(0, 0.22 * (1 - n) + flimmer)})`; c.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- Die fünf Module
const MODULE = {
  // Gruppenfenster: wachsen von dünnen Balken auf Florians Größe, Leben schwankt, Ziel wandert
  gruppe(c, t) {
    const z = (t % 10) / 10, k = z < 0.12 ? 0 : z < 0.3 ? (z - 0.12) / 0.18 : 1, e = 1 - (1 - k) ** 3;
    const w = 120 + (CFG.breite - 120) * e, h = 18 + (CFG.hoehe - 18) * e;
    const { bw, bh } = block(GRUPPE.length, w, h), sk = Math.min(1.08, (W * 0.84) / bw);
    c.save(); c.translate((W - bw * sk) / 2, (H - bh * sk) / 2); c.scale(sk, sk);
    gruppeZeichnen(c, 0, 0, w, h, (m, i) => ({
      hp: clamp(m.hp + 0.06 * Math.sin(t * 0.7 + i * 2), 0.2, 1),
      buffs: m.rolle === 'heiler' ? 0 : i === 0 ? 2 : 1,
      sweep: [(t * 0.25 + i * 0.3) % 1, (t * 0.18 + i) % 1],
      ziel: i === Math.floor(t / 2.5) % GRUPPE.length,
    }));
    c.restore();
  },
  // Marken und Quick Dispel: Juno braucht eine Reinigung (Marke + Kästchen mit Sekunden), der Zeiger klickt das
  // Kästchen, das Ziel (Mira) bleibt; danach liegt Nox am Boden, die Wiederbelebungs-Marke zeigt, dass jemand
  // schon dabei ist, Nox steht wieder auf
  marken(c, t) {
    const z = t % 9;
    const cleanse = z > 0.8 && z < 3.4, rest = clamp(4.6 - z, 0, 3.8);
    const tot = z > 4.6 && z < 8.2, raise = z > 5.4 && z < 8.2;
    const w = CFG.breite, h = CFG.hoehe, { bw, bh } = block(GRUPPE.length, w, h);
    const qBreite = 4 * CFG.dispel + 3 * CFG.dispelAbstand, gesamtH = bh + 26 + CFG.dispel;
    const sk = Math.min(1.05, (W * 0.84) / bw, (H * 0.84) / gesamtH);
    c.save(); c.translate((W - bw * sk) / 2, (H - gesamtH * sk) / 2); c.scale(sk, sk);
    gruppeZeichnen(c, 0, 0, w, h, (m, i) => ({
      ziel: i === 0,
      marke: (i === 2 && cleanse) ? 'cleanse' : (i === 3 && raise) ? 'raise' : null,
      hp: i === 3 ? (tot ? 0 : z < 4.6 ? m.hp : clamp((z - 8.2) * 0.8 + 0.2, 0.2, m.hp)) : m.hp,
      tot: i === 3 && tot,
    }));
    const qx = (bw - qBreite) / 2, qy = bh + 26;
    quickDispel(c, qx, qy, GRUPPE.map((m, i) => i === 2 && cleanse), GRUPPE.map(() => rest));
    // Zeiger: kommt von rechts unten, klickt bei 3,3 s auf Junos Kästchen
    const zielX = qx + 2 * (CFG.dispel + CFG.dispelAbstand) + CFG.dispel / 2, zielY = qy + CFG.dispel / 2;
    const k = glatt((z - 1.8) / 1.3), weg = glatt((z - 3.8) / 1.2);
    const px = bw + 10 + (zielX - bw - 10) * k + weg * 60, py = bh + 80 + (zielY - bh - 80) * k + weg * 30;
    if (z > 1.2 && z < 5.2) zeiger(c, px, py, z > 3.2 && z < 3.45);
    c.restore();
  },
  // Damage Meter (CombatTrackerElement): Fenster 360 × 240, Titel 34, Balken 30 + 3, Ränge, kurze Zahlen
  meter(c, t) {
    const mw = 360, mh = 240, sk = Math.min((W * 0.92) / mw, (H * 0.9) / mh);
    c.save(); c.translate((W - mw * sk) / 2, (H - mh * sk) / 2); c.scale(sk, sk);
    const rund = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
    rund(0, 0, mw, mh, 8); c.fillStyle = '#232223'; c.fill();             // Panel
    c.save(); rund(0, 0, mw, mh, 8); c.clip();                              // Titelleiste mit Verlauf
    const g = c.createLinearGradient(0, 0, 0, 34); g.addColorStop(0, '#454445'); g.addColorStop(1, '#232223');
    c.fillStyle = g; c.fillRect(0, 0, mw, 34); c.restore();
    c.fillStyle = 'rgba(58, 56, 58, .9)'; c.fillRect(8, 33, mw - 16, 1);   // Linie unter dem Titel
    const sek = Math.floor(t % 90), dauer = `0${Math.floor(sek / 60)}:${String(sek % 60).padStart(2, '0')}`;
    text(c, 'Damage done', 14, 9, 16, { farbe: '#B5AA92', kontur: false, schrift: 'DM Sans', gewicht: 600 });
    const breiteTitel = c.measureText('Damage done').width;                  // Untertitel dahinter (+ 6, MeterBarInset)
    text(c, `Current · ${dauer}`, 14 + breiteTitel + 6, 9, 16, { farbe: '#C3C3C3', kontur: false, schrift: 'DM Sans', gewicht: 400 });
    c.strokeStyle = '#C3C3C3'; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
    [0, 1, 2, 3].forEach(i => {                                             // vier Knöpfe rechts (Lucide-Linien)
      const x = mw - 30 - i * 26, y = 9;
      c.save(); c.translate(x, y); c.scale(16 / 24, 16 / 24); c.beginPath();
      [['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'], ['M3 6h18', 'M3 12h18', 'M3 18h18'],
       ['m16 3 4 4-4 4', 'M20 7H4', 'm8 21-4-4 4-4', 'M4 17h16'], ['M12 3v3', 'M12 18v3', 'M3 12h3', 'M18 12h3']][i]
        .forEach(p => c.stroke(new Path2D(p)));
      if (i === 3) { c.beginPath(); c.arc(12, 12, 5, 0, 7); c.stroke(); }
      c.restore();
    });
    rund(8, 42, mw - 16, mh - 50, 6); c.fillStyle = '#282728'; c.fill();     // Karte für die Balken
    c.strokeStyle = '#3A383A'; c.lineWidth = 1; c.stroke();
    const leute = [['Juno', '#D69C00', 1], ['Nox', '#A579D6', 0.86], ['Mira', '#A8D2E6', 0.52], ['Kaya', '#FFF0DC', 0.31]];
    const lauf = 0.85 + 0.15 * glatt((t % 12) / 3);
    leute.forEach(([name, farbe, anteil], i) => {
      const y = 48 + i * 33, x = 14, bw = mw - 28;
      rund(x, y, bw, 30, 3); c.fillStyle = '#232223'; c.fill();
      c.save(); rund(x, y, bw * anteil * lauf, 30, 3); c.clip();
      balken(c, x, y, bw, 30, farbe, 'smooth'); c.restore();
      const wert = (anteil * lauf * (42 + (t % 12) * 1.5)).toFixed(1) + 'k';
      text(c, String(i + 1), x + 6, y + 7, 16, { schrift: 'DM Sans', gewicht: 700 });
      text(c, name, x + 26, y + 7, 16, { schrift: 'DM Sans', gewicht: 700 });
      text(c, wert, x + bw - 6, y + 7, 16, { schrift: 'DM Sans', gewicht: 700, ausr: 'right' });
    });
    c.restore();
  },
  // Slidecast: der Zauberbalken des Spiels mit einem Fenster über den letzten 0,5 s; rot, bis man laufen darf,
  // dann grün (SlidecastWaitColour / SlidecastReadyColour, ohne Füllung wie in Florians Config)
  slidecast(c, t) {
    const dauer = 2.5, pause = 0.9, z = t % (dauer + pause), k = clamp(z / dauer, 0, 1);
    const bw = 300, bh = 20, x = (W - bw) / 2, y = H / 2 - 4;
    c.fillStyle = 'rgba(10, 10, 12, .75)'; c.beginPath(); c.roundRect(x - 6, y - 6, bw + 12, bh + 12, 8); c.fill();
    c.fillStyle = '#1c1b1c'; c.fillRect(x, y, bw, bh);
    if (z < dauer) {
      balken(c, x, y, bw * k, bh, '#E8C46A', 'glow');
    }
    const ab = 1 - 0.5 / dauer, frei = z >= dauer * ab && z < dauer + 0.25;
    const fx = x + bw * ab - 3, fw = bw * (1 - ab) + 3;
    c.strokeStyle = frei ? CFG.slideBereit : CFG.slideWarten; c.lineWidth = 3;
    c.strokeRect(fx, y - 1.5, fw, bh + 3);
    // ein Strich-Männchen über dem Balken läuft los, sobald das Fenster grün ist (nur Bild, nicht im Plugin)
    const lauf = frei ? (z - dauer * ab) : 0, mx = x + bw * 0.5 + lauf * 40, my = y - 46;
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round';
    const s = frei ? Math.sin(z * 16) * 6 : 0;
    c.beginPath(); c.arc(mx, my, 6, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(mx, my + 6); c.lineTo(mx, my + 22); c.moveTo(mx, my + 22); c.lineTo(mx - 5 + s, my + 34);
    c.moveTo(mx, my + 22); c.lineTo(mx + 5 - s, my + 34); c.moveTo(mx - 7, my + 13); c.lineTo(mx + 7, my + 13); c.stroke();
  },
  // Profile je Job: Wechsel des Jobs schaltet das Setup um (andere Größe, Mana), dann teilt man es als eine Zeile
  profile(c, t) {
    const z = t % 10, heiler = z < 5;
    const w = heiler ? CFG.breite : 120, h = heiler ? CFG.hoehe : 30;
    const { bw, bh } = block(GRUPPE.length, w, h), sk = Math.min(1.05, (W * 0.84) / bw);
    // Kopf: welches Profil gerade gilt (Schrift wie die Suite: Gold)
    c.fillStyle = 'rgba(35, 34, 35, .92)'; c.beginPath(); c.roundRect(W / 2 - 92, 22, 184, 30, 15); c.fill();
    text(c, heiler ? 'Profile · Healer' : 'Profile · Tank', W / 2, 29, 15, { farbe: '#EFD58F', kontur: false, schrift: 'DM Sans', gewicht: 700, ausr: 'center' });
    c.save(); c.translate((W - bw * sk) / 2, 70 + (130 - bh * sk) / 2); c.scale(sk, sk);
    gruppeZeichnen(c, 0, 0, w, h, (m, i) => ({ hp: clamp(m.hp + 0.04 * Math.sin(t + i), 0.2, 1), ziel: i === 0 }));
    c.restore();
    // unten: das ganze Setup als eine Zeile Text (WISP1:…), wird kopiert
    const kopiert = (z % 5) > 3;
    c.fillStyle = 'rgba(35, 34, 35, .92)'; c.beginPath(); c.roundRect(28, 228, W - 56, 40, 10); c.fill();
    text(c, 'WISP1:H4sIAAAAAAAACq2W' + '…', 44, 240, 14, { farbe: '#C3C3C3', kontur: false, schrift: 'ui-monospace', gewicht: 400 });
    c.fillStyle = kopiert ? '#5BD98A' : '#D8B567'; c.beginPath(); c.roundRect(W - 112, 235, 70, 26, 13); c.fill();
    text(c, kopiert ? 'Copied' : 'Copy', W - 77, 241, 13, { farbe: '#1B1A1B', kontur: false, schrift: 'DM Sans', gewicht: 700, ausr: 'center' });
  },
  // PC am Ende (Runde 74): Mit Strom zeigt er den Fortschritt des Wizards als fünf Felder (erledigte leuchten, das
  // nächste blinkt). Sind alle erledigt (s.boot = Sekunden seitdem), füllt sich der Rest, im Chat wird /wisp getippt,
  // dann geht das Einstellungsfenster auf. s = { anzahl, boot }
  pc(c, t, s = { anzahl: 5, boot: t }) {
    const g = c.createLinearGradient(0, 0, 0, H);                          // Hintergrund: ruhig, nichts aus dem Spiel
    g.addColorStop(0, '#24324a'); g.addColorStop(1, '#151b28');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (s.boot === null || s.boot < 0.7) {                                 // Fortschritt
      const voll = s.boot === null ? s.anzahl : 5, fb = 52, fh = 26, gap = 12, x0 = (W - 5 * fb - 4 * gap) / 2, y0 = 128;
      text(c, 'WispUI', W / 2, 72, 26, { schrift: 'DM Sans', gewicht: 700, kontur: false, farbe: '#d8e6f2', ausr: 'center' });
      for (let i = 0; i < 5; i++) {
        const x = x0 + i * (fb + gap), an = i < voll, naechstes = i === voll && Math.floor(t * 1.6) % 2 === 0;
        c.fillStyle = an ? '#9ff0ff' : 'rgba(159, 240, 255, .08)';
        if (an) { c.save(); c.shadowColor = '#5fd6f5'; c.shadowBlur = 14; }
        c.fillRect(x, y0, fb, fh);
        if (an) c.restore();
        c.strokeStyle = naechstes ? '#9ff0ff' : 'rgba(159, 240, 255, .35)'; c.lineWidth = 2;
        c.strokeRect(x + 1, y0 + 1, fb - 2, fh - 2);
      }
      text(c, `${voll} / 5`, W / 2, y0 + fh + 22, 18, { schrift: 'DM Sans', gewicht: 600, kontur: false, farbe: '#9fb4c8', ausr: 'center' });
      if (s.boot !== null) {                                               // fertig: kurz hell, dann Chat
        c.fillStyle = `rgba(240, 252, 255, ${0.5 * Math.sin(Math.PI * clamp(s.boot / 0.7, 0, 1))})`;
        c.fillRect(0, 0, W, H);
      }
      return;
    }
    t = s.boot - 0.7;
    const AUF = 2.3;
    if (t < AUF + 0.4) {                                                    // Chatzeile unten links
      const a = t < AUF ? 1 : 1 - (t - AUF) / 0.4;
      c.globalAlpha = a;
      c.fillStyle = 'rgba(10, 10, 12, .62)'; c.beginPath(); c.roundRect(18, 246, 230, 34, 8); c.fill();
      const zeichen = '/wisp'.slice(0, clamp(Math.floor((t - 0.9) / 0.13), 0, 5));
      text(c, zeichen, 30, 254, 17, { schrift: 'DM Sans', gewicht: 600, kontur: false, farbe: '#f2f2f2' });
      if (t < AUF && Math.floor(t * 2.4) % 2 === 0) {
        c.font = '600 17px DM Sans, sans-serif';
        c.fillStyle = '#f2f2f2'; c.fillRect(31 + c.measureText(zeichen).width, 255, 2, 19);
      }
      c.globalAlpha = 1;
    }
    if (t >= AUF) einstellungen(c, ausLaufen((t - AUF) / 0.35));
  },
};
export const NAMEN = Object.keys(MODULE);

// Das Einstellungsfenster (ConfigWindow): eine Fläche #232223, Titelleiste mit Verlauf und goldener Linie, links die
// Navigation (gewählt: Gold-Strich und helles Gold), rechts Kopf, Reiter und eine Gruppe. Verkleinert und vereinfacht.
function einstellungen(c, k) {
  const x = 22, y = 20, w = 356, h = 262, r = 8;
  c.save();
  c.globalAlpha = clamp(k * 1.4, 0, 1);
  c.translate(W / 2, H / 2); c.scale(0.92 + 0.08 * k, 0.92 + 0.08 * k); c.translate(-W / 2, -H / 2);
  c.fillStyle = 'rgba(0, 0, 0, .35)'; c.beginPath(); c.roundRect(x + 2, y + 5, w, h, r); c.fill();
  c.fillStyle = '#232223'; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
  c.save(); c.beginPath(); c.roundRect(x, y, w, h, r); c.clip();
  const tb = 30, tg = c.createLinearGradient(0, y, 0, y + tb);               // Titelleiste
  tg.addColorStop(0, '#454445'); tg.addColorStop(0.45, '#232223');
  c.fillStyle = tg; c.fillRect(x, y, w, tb);
  const rg = c.createLinearGradient(x, 0, x + w, 0);                          // goldene Linie, an den Enden weich
  rg.addColorStop(0, 'rgba(216,181,103,0)'); rg.addColorStop(0.08, '#D8B567'); rg.addColorStop(0.92, '#D8B567');
  rg.addColorStop(1, 'rgba(216,181,103,0)');
  c.fillStyle = rg; c.fillRect(x, y + tb - 2, w, 2);
  text(c, 'WISPUI', x + 12, y + 9, 13, { schrift: 'DM Sans', gewicht: 700, kontur: false, farbe: '#C3C3C3' });
  c.strokeStyle = '#8E8E8E'; c.lineWidth = 1.6; c.lineCap = 'round';           // Schließen
  c.beginPath(); c.moveTo(x + w - 22, y + 11); c.lineTo(x + w - 14, y + 19); c.moveTo(x + w - 14, y + 11);
  c.lineTo(x + w - 22, y + 19); c.stroke();
  const nb = 108, ny = y + tb;                                                 // Navigation
  c.fillStyle = '#4A474A'; c.fillRect(x + nb - 1, ny, 1, h - tb);
  const NAV = ['Global', 'Profile', null, 'Party Frames', 'Quick Dispel', 'Combat Tracker', 'Quality of Life'];
  let yy = ny + 6;
  for (const n of NAV) {
    if (!n) { c.fillStyle = '#3A383A'; c.fillRect(x + 8, yy + 5, nb - 16, 1); yy += 10; continue; }
    const an = n === 'Party Frames';
    if (an) { c.fillStyle = '#2E2C2E'; c.fillRect(x, yy, nb - 1, 23); c.fillStyle = '#D8B567'; c.fillRect(x, yy, 2, 23); }
    text(c, n, x + 11, yy + 6, 11, { schrift: 'DM Sans', gewicht: 600, kontur: false, farbe: an ? '#EFD58F' : '#8E8E8E' });
    yy += 23;
  }
  text(c, '0.2.0', x + 11, y + h - 18, 10, { schrift: 'DM Sans', gewicht: 400, kontur: false, farbe: '#6E6E6E' });
  const mx = x + nb + 12, mw = x + w - 12 - mx;                               // Inhalt
  text(c, 'Party Frames', mx, ny + 10, 16, { schrift: 'DM Sans', gewicht: 700, kontur: false, farbe: '#C3C3C3' });
  let tx = mx;                                                                 // Reiter (nur ganze)
  for (const [i, n] of ['Base', 'Text', 'Icons', 'Layout', 'Auras', 'Marks', 'Bindings'].entries()) {
    c.font = '600 10px DM Sans, sans-serif';
    const tw = c.measureText(n).width + 16;
    if (tx + tw > mx + mw) break;
    if (i === 0) {
      const bg = c.createLinearGradient(0, ny + 34, 0, ny + 52);
      bg.addColorStop(0, '#464346'); bg.addColorStop(1, '#353335');
      c.fillStyle = bg; c.beginPath(); c.roundRect(tx, ny + 34, tw, 18, 5); c.fill();
      c.strokeStyle = '#8D7539'; c.lineWidth = 1; c.stroke();
    }
    text(c, n, tx + 8, ny + 38, 10, { schrift: 'DM Sans', gewicht: 600, kontur: false, farbe: i === 0 ? '#EFD58F' : '#8E8E8E' });
    tx += tw + 2;
  }
  const gy = ny + 62, gh = h - tb - 62 - 12;                                    // Gruppe „Health bar“
  c.fillStyle = '#282728'; c.beginPath(); c.roundRect(mx, gy, mw, gh, 6); c.fill();
  c.strokeStyle = '#3A383A'; c.lineWidth = 1; c.stroke();
  text(c, 'Health bar', mx + 10, gy + 9, 12, { schrift: 'DM Sans', gewicht: 700, kontur: false, farbe: '#B5AA92' });
  text(c, 'Fill, colour and opacity.', mx + 10, gy + 25, 10, { schrift: 'DM Sans', gewicht: 400, kontur: false, farbe: '#8E8E8E' });
  const zeile = (i, name) => {
    const zy = gy + 44 + i * 30;
    c.fillStyle = '#383638'; c.fillRect(mx + 8, zy - 4, mw - 16, 1);
    text(c, name, mx + 10, zy + 6, 11, { schrift: 'DM Sans', gewicht: 600, kontur: false, farbe: '#C3C3C3' });
    return zy;
  };
  let zy = zeile(0, 'Bar style');                                              // Pfeilknöpfe statt Dropdown
  const bx = mx + mw - 110;
  c.fillStyle = '#3A383A'; c.beginPath(); c.roundRect(bx, zy + 2, 100, 20, 5); c.fill();
  c.strokeStyle = '#6B676B'; c.stroke();
  text(c, 'Glow bottom', bx + 50, zy + 6, 10, { schrift: 'DM Sans', gewicht: 600, kontur: false, farbe: '#C3C3C3', ausr: 'center' });
  c.fillStyle = '#C3C3C3';
  c.beginPath(); c.moveTo(bx + 8, zy + 12); c.lineTo(bx + 13, zy + 8); c.lineTo(bx + 13, zy + 16); c.fill();
  c.beginPath(); c.moveTo(bx + 92, zy + 12); c.lineTo(bx + 87, zy + 8); c.lineTo(bx + 87, zy + 16); c.fill();
  zy = zeile(1, 'Health bar opacity');                                         // Schieberegler
  const sx = bx + 36;
  c.fillStyle = '#131213'; c.beginPath(); c.roundRect(sx, zy + 9, 64, 6, 3); c.fill();
  c.fillStyle = '#7FA84A'; c.beginPath(); c.roundRect(sx, zy + 9, 56, 6, 3); c.fill();
  c.fillStyle = '#E6E4DE'; c.beginPath(); c.arc(sx + 56, zy + 12, 6, 0, 7); c.fill();
  c.strokeStyle = '#2B2927'; c.stroke();
  zy = zeile(2, 'Smooth bars');                                                // Schalter an
  c.fillStyle = '#4B421F'; c.beginPath(); c.roundRect(bx + 72, zy + 4, 28, 16, 8); c.fill();
  c.fillStyle = '#D8B567'; c.beginPath(); c.arc(bx + 92, zy + 12, 6, 0, 7); c.fill();
  c.restore();
  c.strokeStyle = '#4A474A'; c.lineWidth = 1; c.beginPath(); c.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, r); c.stroke();
  c.restore();
}

// Ein Bildschirm: zeichnet Modul `name` zur Zeit t (s) in die Leinwand (DPR fest 2). k: 0 = aus (dunkles Glas),
// 0 … 1 = schaltet gerade ein (Röhren-Effekt), ab 1 an. s: Zustand für den PC (siehe MODULE.pc).
export function zeichne(leinwand, name, t, k = 1, s) {
  const c = leinwand.getContext('2d');
  c.setTransform(leinwand.width / W, 0, 0, leinwand.height / H, 0, 0);
  if (k <= 0) { glas(c); roehre(c); return; }
  if (name !== 'pc') grund(c);
  MODULE[name](c, t, s);
  if (k < 1) anschalten(c, k);
  roehre(c);
}
