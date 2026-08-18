# -*- coding: utf-8 -*-
"""Nachbearbeitung der mit PixelLab erzeugten Szenenteile.

Erzeugt wurden sie mit fest vorgegebener Palette — aus den Farben der
Erdkante und der Tageswiese, also genau den Sprites, die stehen bleiben
sollten. Ohne diese Vorgabe faellt die Szene stilistisch auseinander.

Die unveraenderten Downloads liegen in tools/pixellab-roh/. Dieses Skript
baut daraus die Dateien in assets/img/px/ und ist beliebig oft wiederholbar.
Beides liegt bewusst im Repo, damit die Kette nachvollziehbar bleibt.

Drei Nacharbeiten sind noetig:

  1. band-hills kam mit einem maronenbraunen Nadelwaldblock. Die Palette
     enthaelt die Erdtoene der Vorderkante, und das Modell hat damit Baeume
     gemalt statt Erde. Wird auf Gruen gezogen. (Zweimal mit reiner
     Gruenpalette neu erzeugt — beide Male deutlich flacher gezeichnet als
     dieser Wurf, deshalb bleibt er und wird nur umgefaerbt.)
  2. Der Baum bringt eine Grundflaeche in der Dunstfarbe mit. Auf gruener
     Wiese sieht das aus wie eine Pfuetze — wird zum Gruenschatten.
  3. Die Baender wiederholen sich waagerecht. Eine gespiegelte Kopie
     anzuhaengen macht beide Nahtstellen unsichtbar und verdoppelt den
     Rapport auf 800 px.

Aufruf aus dem Projekt-Hauptordner:   python tools/szene-generiert.py
"""
import os
from PIL import Image

ROH = 'tools/pixellab-roh'
ZIEL = 'assets/img/px'

DUNST = (0xa3, 0xc4, 0xcc)
SCHATTEN = (0x3a, 0x63, 0x33)

# Maronenbraun und Rotbraun der Erdkanten-Palette -> Nadelbaumgruen
LAUB = {(0x70, 0x4c, 0x5b): (0x3d, 0x6b, 0x36),
        (0x8f, 0x67, 0x5b): (0x53, 0x84, 0x44)}


def lade(name):
    return Image.open(os.path.join(ROH, name)).convert('RGBA')


def tausche(im, karte, ab_zeile=0, alpha=None):
    px = im.load()
    n = 0
    for y in range(ab_zeile, im.height):
        for x in range(im.width):
            p = px[x, y]
            if p[3] > 0 and p[:3] in karte:
                px[x, y] = karte[p[:3]] + (alpha if alpha is not None else p[3],)
                n += 1
    return n


def auf_inhalt(im):
    k = im.getbbox()
    return im.crop(k) if k else im


def gespiegelt_verdoppeln(im):
    out = Image.new('RGBA', (im.width * 2, im.height), (0, 0, 0, 0))
    out.alpha_composite(im, (0, 0))
    out.alpha_composite(im.transpose(Image.FLIP_LEFT_RIGHT), (im.width, 0))
    return out


def sichern(im, name):
    im.save(os.path.join(ZIEL, name))
    print('%-16s %dx%d' % (name, im.width, im.height))


if __name__ == '__main__':
    b = lade('band-hills.png')
    print('band-hills: %d Pixel Maronenbraun zu Gruen' % tausche(b, LAUB))
    sichern(gespiegelt_verdoppeln(b), 'band-hills.png')

    sichern(gespiegelt_verdoppeln(lade('band-trees.png')), 'band-trees.png')

    t = lade('tree.png')
    print('tree: %d Pixel Grundflaeche zu Schatten' % tausche(t, {DUNST: SCHATTEN}, 100, 110))
    sichern(auf_inhalt(t), 'tree.png')

    sichern(auf_inhalt(lade('bush.png')), 'bush.png')
