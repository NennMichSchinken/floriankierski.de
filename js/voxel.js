// Voxel-Shader für die Unterseiten (Runde 50): wie im Web-Test der Gasse (diorama-web-test.html), aber ohne Zug,
// Sonnenschatten, Boden-Nebel und Farbvergleich. Farbe je Ecke aus dem Export (3d/web/diorama.py): farbe = fertiges
// Licht, farbe2 = jedes Teil für sich gebacken (als Differenz in 8 Bit), Alpha = Art (0 fest, 0,25 Laub, 0,3125 Parkett,
// 0,375 Dielen, 0,5/0,75 Kacheln, 1 leuchtend). Uniforms für die Raum-Vignetten:
//   uSchatten  0 = Licht je Teil (beim Aufbau), 1 = fertiges Licht (Schatten der Nachbarn liegen)
//   uLeuchten  Helligkeit alles Leuchtenden (Neonröhren, Bildschirme), zum Anschalten mit Flackern
//   uZeit      Sekunden, für leichtes Flimmern der Bildschirme
//   uSchnitt   nur mit define SCHNITT: alles über dieser Höhe (Welt, m) fällt weg (Wände wachsen Lage für Lage)
//   uHell      nur mit define HELL (Option hell): 0 … 1, das Teil wird leicht heller (About: zeigt man aufs Ding)
// Für die Strecke (Runde 55, strecke-test.html):
//   NEBEL      uNebel = Mitte x, z, Radius Anfang, Ende (m): weich in uNebelFarbe (wie der Boden-Nebel der Gasse)
//   ZUG        uGier = Drehung gegenüber der Lage beim Backen: die Sonne dreht mit (wie die Wagen in der Gasse)

export const VERT = `
  attribute vec4 farbe; attribute vec3 farbe2;
  uniform float uSchatten;
  varying vec4 vCol; varying vec3 vPos;
  void main() {
    vCol = uSchatten >= 1.0 ? farbe :
      vec4(pow(mix(pow(clamp(farbe.rgb + (farbe2 * 255.0 - 128.0) / 127.0, 0.0, 1.0), vec3(2.2)),
                   pow(farbe.rgb, vec3(2.2)), uSchatten), vec3(1.0 / 2.2)), farbe.a);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;

export const FRAG = `
  uniform float uVox; uniform float uAlpha; uniform float uFlach; uniform float uLeuchten; uniform float uZeit;
  varying vec4 vCol; varying vec3 vPos;
  #ifdef SCHNITT
  uniform float uSchnitt;
  #endif
  #ifdef NEBEL
  uniform vec4 uNebel; uniform vec3 uNebelFarbe;
  #endif
  #ifdef ZUG
  uniform float uGier;
  #endif
  #ifdef BLASS
  uniform float uBlass;
  #ifndef NEBEL
  uniform vec3 uBlassFarbe;
  #endif
  #endif
  #ifdef HELL
  uniform float uHell;
  #endif
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  void main() {
    #ifdef SCHNITT
    if (vPos.y > uSchnitt) discard;
    #endif
    vec3 N = normalize(cross(dFdx(vPos), dFdy(vPos)));
    vec3 c = pow(vCol.rgb, vec3(2.2)) * 2.0;
    #ifdef ZUG
    // Sonne und Umgebung wie im Web-Test der Gasse (look.py: 38° hoch aus Südwesten, Umgebung 0,95 im Verhältnis)
    vec3 sonne = normalize(vec3(-0.409, 0.622, 0.6675));
    vec3 n = dot(N, cameraPosition - vPos) < 0.0 ? -N : N;
    float cg = cos(uGier), sg = sin(uGier);
    vec3 n0 = vec3(cg * n.x - sg * n.z, n.y, sg * n.x + cg * n.z);
    c *= (0.95 + max(dot(n, sonne), 0.0)) / (0.95 + max(dot(n0, sonne), 0.0));
    #endif
    float art = vCol.a;
    bool laub = art > 0.1 && art < 0.28, parkett = art > 0.28 && art < 0.34, dielen = art > 0.34 && art < 0.42;
    vec3 q = vPos / uVox;
    float fp = length(fwidth(q));                         // Voxel je Pixel
    if (art > 0.9) {                                      // Leuchtendes: anschalten, Bildschirme flimmern leicht
      float h = hash(floor(q / 4.0));
      c *= uLeuchten * (1.0 + 0.05 * sin(uZeit * (5.0 + 4.0 * h) + h * 6.283));
    } else if (art > 0.42) {                              // Kachelboden (Kachel 32 bzw. 16 Voxel, Fuge 1 Voxel)
      float size = art < 0.6 ? 32.0 : 16.0;
      vec3 t = q / size;
      vec3 f = fract(t); vec3 d = min(f, 1.0 - f) + abs(N) * 9.0;
      float e = min(min(d.x, d.y), d.z) * size;
      float fw = max(fwidth(e), 1e-4);
      float fuge = 1.0 - smoothstep(0.5 - fw, 0.5 + fw, e);
      c *= mix(0.96, 1.04, hash(floor(t + N * 0.5)));
      c = mix(c, c * 0.75, fuge);
    } else if ((dielen || parkett) && uFlach > 0.5) {     // Holz als Bretter (wie look.bretter in Blender)
      float e = 9.0, hell = 1.0;
      if (abs(N.y) > 0.5 && dielen) {                     // Dielen: 6 × 48 Voxel, Stöße je Reihe versetzt
        float reihe = floor(q.z / 6.0);
        float u = q.x + hash(vec3(reihe, 1.0, 7.0)) * 48.0;
        float fu = fract(u / 48.0) * 48.0, fz = fract(q.z / 6.0) * 6.0;
        e = min(min(fu, 48.0 - fu), min(fz, 6.0 - fz));
        hell = mix(0.95, 1.05, hash(vec3(reihe, floor(u / 48.0), 3.0)));
      } else if (abs(N.y) > 0.5) {                        // Würfelparkett: Felder 12 × 12 aus je drei Stäben
        vec2 zelle = floor(q.xz / 12.0), f = q.xz - zelle * 12.0;
        float s = mix(f.y, f.x, mod(zelle.x + zelle.y, 2.0)), k = floor(s / 4.0), fs = s - k * 4.0;
        e = min(min(fs, 4.0 - fs), min(min(f.x, 12.0 - f.x), min(f.y, 12.0 - f.y)));
        hell = mix(0.94, 1.06, hash(vec3(zelle, k + 5.0)));
      } else if (dielen) {                                // Wand: senkrechte Bretter
        float h = abs(N.x) > abs(N.z) ? q.z : q.x, b = floor(h / 6.0), fh = h - b * 6.0;
        e = min(fh, 6.0 - fh);
        hell = mix(0.95, 1.05, hash(vec3(b, 9.0, 1.0)));
      }
      float fw = max(fwidth(e), 1e-4);
      float fuge = (1.0 - smoothstep(0.3 - fw, 0.3 + fw, e)) * (1.0 - smoothstep(1.5, 4.0, fp));
      c *= hell;
      c = mix(c, c * 0.8, fuge);
    } else if (laub || uFlach < 0.5) {                    // Voxelraster: Laub immer, Festes nur im alten Modus
      float jit = laub ? 0.06 : 0.04, kante = laub ? 0.05 : 0.1;
      float fern = smoothstep(0.6, 2.0, fp);
      vec3 f = fract(q); vec3 d = min(f, 1.0 - f) + abs(N);
      float e = min(min(d.x, d.y), d.z);
      float fw = max(fwidth(e), 1e-4);
      float linie = mix(1.0 - smoothstep(0.07 - fw, 0.07 + fw, e), 0.26, fern);
      float h = hash(floor(q - N * 0.5));
      c *= mix(mix(1.0 - jit, 1.0 + jit, h), 1.0, fern) * (1.0 - linie * kante);
    }
    #ifdef HELL
    c = mix(c, c * 1.18 + 0.04, uHell);                 // zeigt man aufs Ding, wird es leicht heller (About, Runde 82)
    #endif
    #ifdef NEBEL
    #ifdef BLASS
    c = mix(c, uNebelFarbe, uBlass);                      // nicht gewählter Ast der Strecke (Runde 56)
    #endif
    c = mix(c, uNebelFarbe, smoothstep(uNebel.z, uNebel.w, length(vPos.xz - uNebel.xy)));
    #elif defined(BLASS)
    c = mix(c, uBlassFarbe, uBlass);                      // ohne Nebel: zur eigenen Farbe (About, Runde 80)
    #endif
    gl_FragColor = vec4(min(c, 1.0), uAlpha);
    #include <colorspace_fragment>
  }`;

// Gemeinsame Uniforms aller Voxel-Materialien einer Szene
export function gemeinsam() {
  return { uSchatten: { value: 1 }, uLeuchten: { value: 1 }, uZeit: { value: 0 }, uFlach: { value: 1 } };
}

// nebel: { uNebel, uNebelFarbe } (gemeinsame Uniforms), zug: true (eigenes uGier), eigen: Uniforms, die G
// überschreiben (z. B. uSchatten 0 für bewegte Teile: ihr Licht für sich, ohne Schatten der Nachbarn)
export function voxelMaterial(THREE, G, { alpha = 1, schnitt = null, nebel = null, zug = false, eigen = {},
                                          blass = null, blassFarbe = null, hell = null } = {}) {
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: alpha < 1, depthWrite: alpha >= 1,
    uniforms: { uVox: { value: 1 / 16 }, uAlpha: { value: alpha }, ...G, ...eigen } });
  m.defines = {};
  if (schnitt) {
    m.defines.SCHNITT = '';
    m.uniforms.uSchnitt = schnitt;
  }
  if (nebel) {
    m.defines.NEBEL = '';
    Object.assign(m.uniforms, nebel);
  }
  if (zug) {
    m.defines.ZUG = '';
    m.uniforms.uGier = { value: 0 };
  }
  if (blass) {                                          // { value: 0 … 1 }, gemeinsam für eine Gruppe; mit nebel
    m.defines.BLASS = '';                               // geht es zur Nebelfarbe, sonst zu blassFarbe ({ value: Color })
    m.uniforms.uBlass = blass;
    if (!nebel) m.uniforms.uBlassFarbe = blassFarbe || { value: new THREE.Color(1, 1, 1) };
  }
  if (hell) {                                           // { value: 0 … 1 }: leicht heller, wenn man aufs Ding zeigt
    m.defines.HELL = '';
    m.uniforms.uHell = hell;
  }
  return m;
}

// Materialien und Attribute wie im Web-Test: web_voxel und web_glas bekommen den Voxel-Shader (farbe, farbe2),
// Pixel-Motive (web_bb_*) eine Fläche mit scharfer kleiner Textur. Gibt die Motiv-Materialien zurück (zum Dimmen).
export function bereite(THREE, gltf, G, opts = {}) {
  const voxel = voxelMaterial(THREE, G, opts), glas = voxelMaterial(THREE, G, { ...opts, alpha: 0.4 }), motive = [];
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material.name;
    if (m === 'web_voxel' || m === 'web_glas') {
      const c = o.geometry.attributes.color, c2 = o.geometry.attributes._farbe2;
      if (c) o.geometry.setAttribute('farbe', c);
      if (c) o.geometry.setAttribute('farbe2', c2 ||
        new THREE.BufferAttribute(new Uint8Array(c.count * 3).fill(128), 3, true));
      o.material = m === 'web_glas' ? glas : voxel;
      if (m === 'web_glas') o.renderOrder = 1;
    } else if (m.startsWith('web_bb_')) {
      const map = o.material.map;
      if (map) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.LinearFilter; }
      o.material = new THREE.MeshBasicMaterial({ map });
      motive.push(o.material);
    }
  });
  return motive;
}
