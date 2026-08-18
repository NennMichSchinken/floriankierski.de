# -*- coding: utf-8 -*-
"""Uebertraegt eine im Szene-Editor gebaute Aufstellung in die Seite.

Der Editor rechnet nur, er schreibt nichts. Bisher musste man die zwei
Ausgabekaesten von Hand in index.html und style.css kopieren - genau daran ist
es mehrfach gescheitert, weil man im Editor schiebt, zufrieden ist und
annimmt, es sei damit erledigt.

Ablauf jetzt:

  1. Im Editor die Requisiten setzen
  2. Knopf "Szene speichern" -> laedt szene.json herunter
  3. Die Datei in den Projekt-Hauptordner legen
  4. python tools/szene-anwenden.py

Geschrieben wird ausschliesslich zwischen den Markierungen:

  index.html   <!-- REQUISITEN ANFANG -->  bis  <!-- REQUISITEN ENDE -->
  style.css    /* REQUISITEN ANFANG */     bis  /* REQUISITEN ENDE */

Alles ausserhalb bleibt unberuehrt. Medienabfragen wie
@media (max-width:1000px){.prop--tree{display:none}} stehen deshalb bewusst
unterhalb der Endmarkierung und ueberleben jeden Durchlauf.

Zusaetzlich wird die Zahl hinter style.css?v= und main.js?v= um eins erhoeht,
damit Browser die Aenderung auch sehen.
"""
import io
import json
import os
import re
import sys

HTML = 'index.html'
CSS = 'assets/css/style.css'
SPRITES = 'assets/img/px'


def lies_szene(pfad):
    with io.open(pfad, encoding='utf-8') as f:
        daten = json.load(f)
    if not isinstance(daten, list) or not daten:
        raise ValueError('szene.json enthaelt keine Requisiten')
    return daten


def masse(datei):
    """Native Groesse aus der PNG-Datei lesen, nicht der JSON glauben."""
    from PIL import Image
    with Image.open(os.path.join(SPRITES, datei)) as im:
        return im.width, im.height


def baue_html(szene):
    zeilen = []
    for r in szene:
        w, h = masse(r['datei'])
        zeilen.append(
            '        <img src="/assets/img/px/%s?v=1" alt="" class="prop %s" '
            'width="%d" height="%d">' % (r['datei'], r['klasse'], w, h))
    return '\n'.join(zeilen)


def baue_css(szene):
    zeilen = []
    for r in szene:
        w, _ = masse(r['datei'])
        breite = int(round(w * r['faktor']))
        if breite % w:
            zeilen.append('/* Achtung: %s ist %.2fx der nativen Breite - kein '
                          'ganzes Vielfaches, die Pixel werden ungleich breit */'
                          % (r['klasse'], r['faktor']))
        zeilen.append('.%s{width:%dpx;%s:%s%%;bottom:%s%%;z-index:6}'
                      % (r['klasse'], breite, r['anker'], r['x'], r['y']))
    return '\n'.join(zeilen)


def ersetze(text, anfang, ende, neu, datei):
    i = text.find(anfang)
    j = text.find(ende)
    if i < 0 or j < 0:
        raise ValueError('Markierungen fehlen in %s - bitte %s und %s wieder '
                         'einsetzen' % (datei, anfang.strip(), ende.strip()))
    return text[:i + len(anfang)] + '\n' + neu + '\n' + text[j:]


def hoch(treffer):
    return '%s%d' % (treffer.group(1), int(treffer.group(2)) + 1)


if __name__ == '__main__':
    quelle = sys.argv[1] if len(sys.argv) > 1 else 'szene.json'
    if not os.path.exists(quelle):
        print('Nicht gefunden: %s' % quelle)
        print('Im Editor auf "Szene speichern" klicken und die Datei in den '
              'Projekt-Hauptordner legen.')
        raise SystemExit(1)

    szene = lies_szene(quelle)

    s = io.open(HTML, encoding='utf-8').read()
    s = ersetze(s, '<!-- REQUISITEN ANFANG -->', '        <!-- REQUISITEN ENDE -->',
                baue_html(szene), HTML)
    s = re.sub(r'(style\.css\?v=)(\d+)', hoch, s)
    s = re.sub(r'(main\.js\?v=)(\d+)', hoch, s)
    io.open(HTML, 'w', encoding='utf-8').write(s)

    c = io.open(CSS, encoding='utf-8').read()
    c = ersetze(c, '/* REQUISITEN ANFANG */', '/* REQUISITEN ENDE */',
                baue_css(szene), CSS)
    io.open(CSS, 'w', encoding='utf-8').write(c)

    print('%d Requisiten uebernommen:' % len(szene))
    for r in szene:
        print('   %-16s %-20s %s:%s%%  bottom:%s%%  %sx'
              % (r['datei'], r['klasse'], r['anker'], r['x'], r['y'], r['faktor']))
    print('\nVersionsnummern erhoeht. Seite neu laden.')
