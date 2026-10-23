// Voxelmodelle der About-Seite (Runden 82–87, bis Runde 91 in atelier.html als baueVoxel): Aus den Voxeldaten eines
// Dings (alle Stufen, grob zuerst; 3d/web/atelier_dinge.py) wird je Stufe ein Netz aus den sichtbaren Flächen. Jede Ecke
// kennt ihre Zellmitte und die ihres Elternvoxels (der Vertex-Shader schiebt sie dazwischen), dazu ihr Licht: Sonne und
// Himmel wie look.py, Verdeckung aus den Nachbarn (wie MagicaVoxel), Schatten per Strahl zur Sonne durchs Raster.
// Livegang C (Runde 92): Das rechnet jetzt ein Worker im Hintergrund (bis 190 ms je Ding, zusammen etwa 0,5 s mitten im
// Aufbau des Ateliers, das stockte). Gleicher Rechenweg, die Seite legt aus den Feldern nur noch die Netze an. Geht kein
// Worker, ruft die Seite rechneVoxel selbst auf.
// Livegang D: Die Daten kommen als Abstände (entpacke, 1,1 MB → 0,3 MB, mit gzip 17 KB). Zellmitte und Elternmitte
// rechnet der Vertex-Shader genau aus Ecke und Lage (vorher je 12 Byte je Ecke), die Ecke liegt als Int8 vor: zusammen
// 44 statt 76 Byte je Ecke, für alle neun Dinge 42 statt 74 MB im Speicher und auf der Grafikkarte.

const AO = [0.5, 0.68, 0.84, 1];
const RICHT = [                                                     // Normale n, Kanten u, v mit u × v = n
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] }];
const ECKEN = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const streu = (x, y, z) => {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// Abstände (3d/web/atelier_dinge.py, abstaende) → je Zelle x, y, z, Material als Int16, Stufe für Stufe, wie bis Runde
// 92 in der .bin: je Stufe n Varints (Abstand − 1 zur vorigen Stelle im Kasten info.boxen), dann n Materialbytes
export function entpacke(info, puffer) {
  const B = new Uint8Array(puffer), D = new Int16Array(info.stufen.reduce((s, n) => s + n, 0) * 4);
  let p = 0, o = 0;
  info.stufen.forEach((n, li) => {
    const [x0, y0, z0, , y1, z1] = info.boxen[li], ny = y1 - y0 + 1, nz = z1 - z0 + 1;
    let stelle = -1;
    for (let j = 0; j < n; j++) {
      let v = 0, s = 1, b;
      do { b = B[p++]; v += (b & 127) * s; s *= 128; } while (b & 128);
      stelle += v + 1;
      const z = stelle % nz, r = (stelle - z) / nz, y = r % ny;
      D[(o + j) * 4] = (r - y) / ny + x0; D[(o + j) * 4 + 1] = y + y0; D[(o + j) * 4 + 2] = z + z0;
    }
    for (let j = 0; j < n; j++) D[(o + j) * 4 + 3] = B[p++];
    o += n;
  });
  return D;
}

// info: Eintrag aus dinge.json, puffer: die .bin (Abstände, siehe entpacke; ältere Daten ohne info.format: je Zelle x, y,
// z, Material als Int16), licht: pal = Palette linear [r, g, b, …], sonne = Richtung zur Sonne (Blender-Achsen), sonneL,
// himmelL = [r, g, b]. Ergebnis: netze je Stufe und, beim Farbfächer, das Netz der Streifen (feine Stufe), je { g, A:
// Felder, I: Index }.
export function rechneVoxel(info, puffer, licht) {
  const D = info.format === 'abstand' ? entpacke(info, puffer) : new Int16Array(puffer);
  const PAL = licht.pal, SONNE = licht.sonne, SONNE_L = licht.sonneL, HIMMEL_L = licht.himmelL;
  let o = 0;
  const L = info.stufen.map(n => {                                   // dichtes Raster je Stufe (grob zuerst)
    const z = D.subarray(o, o + n * 4);
    o += n * 4;
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (let j = 0; j < n; j++) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], z[j * 4 + a]); hi[a] = Math.max(hi[a], z[j * 4 + a]); }
    const dim = [0, 1, 2].map(a => hi[a] - lo[a] + 1), voll = new Int16Array(dim[0] * dim[1] * dim[2]).fill(-1);
    const drin = (x, y, w) => x >= lo[0] && x <= hi[0] && y >= lo[1] && y <= hi[1] && w >= lo[2] && w <= hi[2];
    const stelle = (x, y, w) => ((x - lo[0]) * dim[1] + (y - lo[1])) * dim[2] + (w - lo[2]);
    for (let j = 0; j < n; j++) voll[stelle(z[j * 4], z[j * 4 + 1], z[j * 4 + 2])] = z[j * 4 + 3];
    return { n, z, drin, mat: (x, y, w) => drin(x, y, w) ? voll[stelle(x, y, w)] : -1 };
  });
  let mx = 0, my = 0, mz = 0, rmax = 0;                             // Mitte des Dings (für die Staffelung)
  const G0 = L[0];
  for (let j = 0; j < G0.n; j++) { mx += G0.z[j * 4] + 0.5; my += G0.z[j * 4 + 1] + 0.5; mz += G0.z[j * 4 + 2] + 0.5; }
  mx /= G0.n; my /= G0.n; mz /= G0.n;
  for (let j = 0; j < G0.n; j++) rmax = Math.max(rmax, Math.hypot(G0.z[j * 4] + 0.5 - mx, G0.z[j * 4 + 1] + 0.5 - my, G0.z[j * 4 + 2] + 0.5 - mz));
  function schatten(S, x, y, w) {                                    // Strahl zur Sonne, in Zellen der Stufe
    for (let s = 0.35; s < 600; s += 0.5) {
      const X = Math.floor(x + SONNE[0] * s), Y = Math.floor(y + SONNE[1] * s), Z = Math.floor(w + SONNE[2] * s);
      if (!S.drin(X, Y, Z)) return 1;
      if (S.mat(X, Y, Z) >= 0) return 0;
    }
    return 1;
  }
  const P = info.punkte || {};
  const netz = (S, li, nimm = () => true) => {                      // Netz einer Stufe (nimm: welche Materialien)
    const g = 2 ** -li, E = li ? L[li - 1] : null;                    // Kante in Raum-Voxeln: 1, ½, ¼
    const A = { position: [], aEcke: [], aFarbe: [], aFarbeE: [], aVerz: [] }, I = [];
    for (let j = 0; j < S.n; j++) {
      const x = S.z[j * 4], y = S.z[j * 4 + 1], w = S.z[j * 4 + 2], m = S.z[j * 4 + 3];
      if (!nimm(m)) continue;
      const pm = E ? E.mat(x >> 1, y >> 1, w >> 1) : m;               // Material des Elternvoxels
      const mit = [(x + 0.5) * g, (y + 0.5) * g, (w + 0.5) * g];
      const verz = 0.3 * (0.55 * streu(x, y, w + li * 977) + 0.45 * Math.min(1, Math.hypot(mit[0] - mx, mit[1] - my, mit[2] - mz) / rmax));
      for (const d of RICHT) {
        const nx = x + d.n[0], ny = y + d.n[1], nz = w + d.n[2];
        if (S.mat(nx, ny, nz) >= 0) continue;                        // Nachbar voll: Fläche unsichtbar
        const ndl = Math.max(0, d.n[0] * SONNE[0] + d.n[1] * SONNE[1] + d.n[2] * SONNE[2]), ao = [], basis = A.aVerz.length;
        for (const [su, sv] of ECKEN) {
          const s1 = S.mat(nx + su * d.u[0], ny + su * d.u[1], nz + su * d.u[2]) >= 0;
          const s2 = S.mat(nx + sv * d.v[0], ny + sv * d.v[1], nz + sv * d.v[2]) >= 0;
          const ec = S.mat(nx + su * d.u[0] + sv * d.v[0], ny + su * d.u[1] + sv * d.v[1], nz + su * d.u[2] + sv * d.v[2]) >= 0;
          const a = s1 && s2 ? 0 : 3 - s1 - s2 - ec;
          ao.push(a);
          const b = [0, 1, 2].map(k => d.n[k] * 0.5 + (su * d.u[k] + sv * d.v[k]) * 0.5);   // Ecke, Blender-Achsen
          const sh = ndl > 0 ? schatten(S, x + 0.5 + d.n[0] * 0.52 + b[0] * 0.84 - d.n[0] * 0.42,
            y + 0.5 + d.n[1] * 0.52 + b[1] * 0.84 - d.n[1] * 0.42, w + 0.5 + d.n[2] * 0.52 + b[2] * 0.84 - d.n[2] * 0.42) : 0;
          // Licht = Sonne × (N·L) × Schatten + Himmel × Verdeckung (wie vorher mit THREE.Color, Schritt für Schritt)
          const ks = ndl * sh, kh = AO[a] * (0.86 + 0.14 * d.n[2]);
          const lr = SONNE_L[0] * ks + HIMMEL_L[0] * kh, lg = SONNE_L[1] * ks + HIMMEL_L[1] * kh, lb = SONNE_L[2] * ks + HIMMEL_L[2] * kh;
          A.aFarbe.push(PAL[m * 3] * lr, PAL[m * 3 + 1] * lg, PAL[m * 3 + 2] * lb);
          A.aFarbeE.push(PAL[pm * 3] * lr, PAL[pm * 3 + 1] * lg, PAL[pm * 3 + 2] * lb);
          const ek = [b[0], b[2], -b[1]];                              // Blender → Three.js: (x, z, −y)
          A.aEcke.push(2 * ek[0], 2 * ek[1], 2 * ek[2], 0);            // ±0,5 als ganze Zahl ±1 (Int8, auf 4 Byte)
          A.position.push((mit[0] + ek[0] * g) / 16, (mit[2] + ek[1] * g) / 16, (-mit[1] + ek[2] * g) / 16);
          A.aVerz.push(verz);
        }
        if (ao[0] + ao[2] < ao[1] + ao[3]) I.push(basis + 1, basis + 2, basis + 3, basis + 1, basis + 3, basis);
        else I.push(basis, basis + 1, basis + 2, basis, basis + 2, basis + 3);
      }
    }
    // Zellmitte (bis Livegang D aMitte) und Mitte des Elternvoxels (aEltern) rechnet der Vertex-Shader aus position und
    // aEcke, genau dieselben Zahlen (Zweierpotenzen, siehe vmMaterial in atelier.html)
    for (const k of Object.keys(A)) A[k] = k === 'aEcke' ? new Int8Array(A[k]) : new Float32Array(A[k]);
    return { g, A, I: A.aVerz.length - 1 >= 65535 ? new Uint32Array(I) : new Uint16Array(I) };   // wie setIndex(Array)
  };
  // Runde 86: Farbfächer (Punkte streifen.NN.farbe): die feine Stufe getrennt in Streifen und Rest, damit die
  // Streifen beim Auffächern gegen glatte, drehbare ausgetauscht werden können (fächern, dann wieder Voxel)
  const STREIFEN = Object.keys(P).filter(k => k.startsWith('streifen.'));
  const streifenMat = new Set(STREIFEN.flatMap(k => { const n = k.split('.')[2]; return [n, n + '_1', n + '_2', n + '_3']; })
    .concat(STREIFEN.length ? ['sign_white', 'white'] : []).map(n => info.namen.indexOf(n)).filter(i => i >= 0));
  const netze = L.map((S, li) => netz(S, li, li === L.length - 1 && STREIFEN.length ? m => !streifenMat.has(m) : undefined));
  const streifen = STREIFEN.length ? netz(L[L.length - 1], L.length - 1, m => streifenMat.has(m)) : null;
  return { netze, streifen };
}

// Als Worker: eine Nachricht je Ding ({ nr, info, puffer, licht }), die Felder gehen ohne Kopie zurück
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = ({ data: { nr, info, puffer, licht } }) => {
    const r = rechneVoxel(info, puffer, licht);
    const felder = [...r.netze, r.streifen].filter(Boolean).flatMap(n => [...Object.values(n.A), n.I].map(a => a.buffer));
    self.postMessage({ nr, ...r }, felder);
  };
}
