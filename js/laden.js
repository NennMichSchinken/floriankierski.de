// Laden für alle Seiten (Livegang D, vorher in der Gasse, im Atelier, auf der WispUI-Seite und der Reise je eine Kopie):
// GLB-Lader mit Draco und der Ort des Draco-Decoders an einer Stelle (seit Livegang E die eigene Kopie in lib/three/),
// dazu pause() für lange Vorbereitungen in Stücken.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const DRACO_PFAD = 'lib/three/examples/jsm/libs/draco/gltf/';

export function glbLader() {
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_PFAD);
  const lader = new GLTFLoader();
  lader.setDRACOLoader(draco);
  return lader;
}

// Kurz an den Browser abgeben (Livegang C/D): zwischen Stücken einer langen Vorbereitung, damit Bilder und Eingaben
// dazwischen drankommen. Über einen MessageChannel, nicht setTimeout: Das bremst der Browser in Tabs im Hintergrund.
export const pause = () => new Promise(r => { const k = new MessageChannel(); k.port1.onmessage = () => r(); k.port2.postMessage(0); });
