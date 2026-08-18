# -*- coding: utf-8 -*-
"""Palettentausch Nacht -> Tag.

Die Sprites in assets/img/px/ sind fuer die Nachtszene gezeichnet. Statt sie im
Browser per CSS-Filter aufzuhellen (das hebt Licht und Schatten gleichmaessig an
und nimmt der Flaeche die Tiefe), werden hier die Farben selbst umgerechnet:
Helligkeit ueber eine Gammakurve, damit Mitteltoene staerker steigen als die
Konturen, und der Farbton vom Nacht-Tuerkis ins Tagesgruen gedreht.

Das Pixelraster bleibt dabei unberuehrt - es wird kein Pixel neu gesetzt, nur
seine Farbe ersetzt. Zwischenloesung, bis echte Tag-Kacheln aus PixelLab da sind.

Aufruf aus dem Projekt-Hauptordner:   python tools/tag-palette.py
Die Nacht-Originale werden nicht angefasst.
"""
import colorsys
import os
from PIL import Image

QUELLE = 'assets/img/px'


def grade(pfad, ziel, regel):
    im = Image.open(os.path.join(QUELLE, pfad)).convert('RGBA')
    px = im.load()
    cache = {}
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            key = (r, g, b)
            if key not in cache:
                h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
                h, s, v = regel(h * 360, s, v)
                rr, gg, bb = colorsys.hsv_to_rgb((h % 360) / 360,
                                                 min(max(s, 0), 1),
                                                 min(max(v, 0), 1))
                cache[key] = (round(rr * 255), round(gg * 255), round(bb * 255))
            px[x, y] = cache[key] + (a,)
    im.save(os.path.join(QUELLE, ziel))
    print('%-22s -> %-22s %d Farben' % (pfad, ziel, len(cache)))


def wiese(h, s, v):
    """Nachtgras: H~170 (tuerkis), V~0.19. Ziel: Wiese bei Tageslicht.
       Die vereinzelten blauen Pixel (Wasserglanz) bleiben, wie sie sind."""
    if 150 <= h <= 190:
        h = h - 66                 # Tuerkis -> Gras-Gruen
        s = s * 0.72               # Nachtgruen ist uebersaettigt fuers Tageslicht
        v = 0.22 + v * 1.75        # linear anheben - eine Gammakurve wuerde die
                                   # ohnehin flache Kachel vollends platt machen
    return h, s, v


def erdkante(h, s, v):
    """Rotbraune Erde. Bleibt rotbraun, wird nur sonnig und eine Spur waermer."""
    if s > 0.12:
        h = h + 12 if h < 180 else h
        v = 0.14 + v * 1.55
        s = s * 0.92
    else:
        v = 0.14 + v * 1.55
    return h, s, v


if __name__ == '__main__':
    grade('ground-grass.png', 'ground-grass-day.png', wiese)
    grade('ground-edge.png', 'ground-edge-day.png', erdkante)
