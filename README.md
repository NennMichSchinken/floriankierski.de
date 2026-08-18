# floriankierski.de

Bewerbungsportfolio von Florian Kierski — Ausbildungsplatz als Fachinformatiker
für Systemintegration (alternativ Anwendungsentwicklung).

Statische Seite. Kein Build-Schritt, kein Node, keine Abhängigkeiten. Der Ordner
wird so wie er ist auf den Webserver gelegt.

---

## Zwei Darstellungen

Die Seite hat oben rechts einen Umschalter:

| Modus | Für wen | Was passiert |
|---|---|---|
| **Pixel** (Standard) | zum Auffallen | Tageslandschaft im Stardew-Stil, Pergament-Karten, Pixelschrift |
| **Klartext** | für nüchterne Ausbilder | helles, dokumentartiges Layout, Inter, keine Deko |

Technisch ist das ein Attribut am `<html>`-Element: `data-mode="pixel"` oder
`data-mode="plain"`. Beide Modi teilen sich dieselbe Struktur und werden nur über
CSS-Variablen in `assets/css/style.css` unterschieden (die beiden Token-Blöcke ganz
oben). Die Wahl merkt sich der Browser in `localStorage` unter `fk-mode`.

Beim Drucken (Strg+P) wird immer die nüchterne Fassung ausgegeben, egal welcher
Modus gerade aktiv ist.

---

## Aufbau

```
index.html              gesamter Inhalt, das Icon-Sprite ist eingebettet
PIXELLAB.md             Spezifikation der Figur + was noch offen ist
robots.txt, sitemap.xml
favicon.ico / favicon-32.png / apple-touch-icon.png
assets/
  css/style.css         alles, zwei Token-Blöcke oben steuern die Modi
  js/main.js            Moduswechsel, Menü, Lightbox, Himmel, Einblenden
  fonts/                Pixelify, Silkscreen, Inter als woff2 — selbst gehostet
  img/px/               Pixel-Sprites aus PixelLab (16 Dateien, zusammen 131 KB)
                        die *-day.png sind die Tagesfassungen, siehe unten
  img/lumen/            Lumen-Screenshots (je Vollbild + Vorschau)
  img/design/           Arbeiten aus der Mediengestalter-Zeit
  img/og/og-image.jpg   Vorschaubild für WhatsApp, LinkedIn usw.
tools/                  Skripte, die die Sprites erzeugen, plus die unveränderten
                        PixelLab-Downloads — gehört ins Repo, keine privaten Daten
raw/                    Ausgangsmaterial und Bewerbungsunterlagen — steht in .gitignore
_versionen/             ältere Fassungen als Schnappschuss
```

`raw/` enthält Lebensläufe mit Adresse und Telefonnummer. Beim Deployen bitte
ausschließen (siehe `rsync`-Befehl unten).

---

## Fassungen

| Fassung | Wo | Stand |
|---|---|---|
| **v1 — Nacht** | `_versionen/v1_2026-08-18_nacht/` (+ `.zip`) | eingefroren, jederzeit zurückholbar |
| **v2 — Tag** | dieser Ordner | aktuell |

### Was der Umbau auf Tag geändert hat

Nur die Hero-Szene. Alles darunter — Abschnitte, Pergamentkarten,
Klartext-Modus — ist unverändert.

Sonne statt Mond, Tageshimmel statt Nordlicht und Sternen, Pollen statt
aufsteigender Glut. Dazu drei Dinge, die mehr Arbeit waren als erwartet:

**Die Bodenkacheln sind echt umgefärbt, nicht per CSS-Filter aufgehellt.**
Der Filter war der erste Versuch. Gemessen kam das Gras damit auf L=82 und
blieb blaustichig — dunkler als die Hügel dahinter, weil ein Filter Licht und
Schatten gleichmäßig anhebt und der Fläche die Tiefe nimmt.
`tools/tag-palette.py` rechnet statt dessen jede Farbe einzeln in HSV um.
Kein Pixel verschoben, die Nacht-Originale bleiben liegen.

**Die Szene wurde einmal komplett neu zusammengesetzt.** In der ersten
Tagesfassung standen drei Bildsprachen nebeneinander: glatte CSS-Ellipsen als
Hügel, ein Teich aus starker Aufsicht und ein Turm in 3/4-Ansicht mit
Nachtpalette. Das passte nicht zusammen und sah auch nicht so aus. Teich,
Turm und die Ellipsen sind raus. An ihrer Stelle stehen zwei gekachelte
Bänder und ein paar Requisiten, alle mit PixelLab erzeugt — in Seitenansicht
wie der Boden und mit **fest vorgegebener Palette**, gewonnen aus der
Erdkante und der Tageswiese. Ohne diese Vorgabe fällt so eine Szene
auseinander; mit ihr kann nichts aus dem Rahmen fallen. Details in
[PIXELLAB.md](PIXELLAB.md).

**Hinter dem Hero-Text steht jetzt eine Tafel mit harter Kante.** Vorher lag
dort ein weicher dunkler Schleier. Über einem klaren Tageshimmel liest der
sich als Fleck, egal wie sanft man ihn macht. Die Tafel ist halbtransparent
und passt zu den Pergamentkarten der übrigen Seite. Der Fließtext liegt damit
bei 7.7:1, im ungünstigsten denkbaren Fall — reinweißer Hintergrund — noch
bei 5.0:1.

### Beim Ändern von CSS, JS oder Sprites

Hinter `style.css`, `main.js` und den Sprite-Pfaden steht in `index.html` und
`style.css` ein `?v=`. **Die Zahl bei jeder Änderung hochzählen.** Sonst
zeigen Browser mit altem Zwischenspeicher weiter die vorige Fassung — beim
Bauen ist das mehrfach passiert und kostet jedes Mal Zeit, bis man es merkt.

---

## Schriften: warum drei Dateien

`assets/css/style.css` definiert eine kombinierte Familie **PixelMix**. Grund:
Pixelify Sans hat zwei Glyphen, die in jeder Größe falsch gelesen werden.

- Die Ziffer **5** sieht aus wie ein **S** — aus „Kapitel 5" wird „Kapitel S".
- Das große **C** sieht aus wie ein **O** — aus „Certbot" wird „Oertbot".

Deshalb kommen Ziffern (`U+0030-0039`) und das große C (`U+0043`) aus Silkscreen,
alles andere aus Pixelify. Die Silkscreen-Regel muss dabei **als letzte** stehen —
bei überlappenden `unicode-range` gewinnt die zuletzt deklarierte Schrift.

Silkscreen wiederum setzt einen Punkt in das große O („WÖRLD"), taugt also nicht
für Fließtext. Deshalb die Aufteilung.

Alle Schriften liegen lokal — es geht keine Anfrage an Google, das erspart die
DSGVO-Diskussion.

---

## Veröffentlichen

Die Seite liegt auf **GitHub Pages**, Repo
`NennMichSchinken/website-floriankierski.github.io`. Was auf `main` liegt, ist
live — es gibt keinen Build-Schritt und keine Pipeline dazwischen.

```bash
git push origin main
```

Nach etwa einer Minute ist die Änderung unter https://floriankierski.de zu
sehen. Die Datei `CNAME` im Wurzelverzeichnis nennt die Domain; sie muss dort
liegen bleiben, sonst fällt die Seite auf die github.io-Adresse zurück. Die
A- und AAAA-Records bei IONOS zeigen auf GitHubs Pages-Server, HTTPS macht
GitHub selbst.

### Was nicht ins Repo gehört

GitHub Pages liefert **den kompletten Repo-Inhalt** unter der Domain aus — es
gibt keine Trennung zwischen „Quelldateien" und „veröffentlicht". Alles, was
im Repo liegt, ist damit öffentlich abrufbar.

Deshalb steht `raw/` in `.gitignore`: dort liegen die Lebensläufe und das
Anschreiben mit Anschrift und Telefonnummer. Der Ordner bleibt lokal liegen
und wird nicht mitgepusht. **Vor jedem Commit lohnt der Blick, ob wirklich
nur Absicht drin steht:**

```bash
git status --short
```

Was zum Nachbauen der Grafik gebraucht wird, liegt statt dessen in `tools/` —
das ist Pixel-Kunst ohne persönliche Daten und darf öffentlich sein.

---

## Lokal ansehen

```bash
python -m http.server 5173
```

Dann `http://localhost:5173` aufrufen. Ein einfacher Doppelklick auf `index.html`
reicht **nicht**: alle Pfade sind absolut (`/assets/...`) und brauchen einen Server.

---

## Inhalte ändern

Alles steht direkt in `index.html`, in der Reihenfolge der Abschnitte:

| Was | Wo suchen |
|---|---|
| Anrede, Pitch oben | `<section class="hero"` |
| Text über mich, Kennzahlen | `id="ueber"` |
| Stationen im Werdegang | `id="werdegang"`, je ein `<li class="quest">` |
| Projekte | `id="projekte"` |
| Design-Arbeiten | `id="design"`, je eine `<figure class="gal__item">` |
| Kenntnisse | `id="skills"`, je ein `<li class="slot">` |
| Kontaktdaten | `id="kontakt"` |

Neue Bilder in `assets/img/design/` legen — jeweils eine große Fassung und eine
Vorschau mit dem Zusatz `-thumb`. Die Galerie erwartet beides:

```html
<button class="gal__btn" type="button"
        data-full="/assets/img/design/DATEI.jpg"
        data-cap="Beschriftung im Vollbild">
  <img src="/assets/img/design/DATEI-thumb.jpg" alt="Beschreibung für Screenreader"
       width="760" height="428" loading="lazy" decoding="async">
</button>
```

---

## Die Pixel-Grafik

Alle Sprites stammen aus PixelLab. Florians eigener Character gibt Palette,
Konturen und Schattierung vor; seine Figur läuft als Begleiter am unteren
Bildrand mit dem Lesefortschritt mit und steckt als Kopf in Kopfzeile und
Favicon.

Neue Sprites entstehen mit **fest vorgegebener Palette** — sonst passen sie
nicht zum Rest. Wie das geht, welche Fallen es dabei gibt und warum alles in
exakt doppelter Pixelgröße dargestellt wird, steht in
**[PIXELLAB.md](PIXELLAB.md)**. Die Skripte, die die Sprites erzeugen, liegen
in `tools/` und sind beliebig oft wiederholbar.

## Offene Punkte

- **Impressum.** Eine reine private Bewerbungsseite ist in der Regel nicht
  impressumspflichtig (§ 5 DDG gilt für geschäftsmäßige Angebote), deshalb steht in
  der Fußzeile nur ein entsprechender Hinweis. Falls doch ein Impressum gewünscht
  ist, gehört dort eine ladungsfähige Anschrift hinein — die aktuell bewusst nicht
  auf der Seite steht.
- **Hype-4-Profil** ist nicht verlinkt, weil die URL in der Quelldatei
  unvollständig war.
- **Lebenslauf-PDFs** liegen bewusst nicht zum Download bereit; sie enthalten
  Adresse und Telefonnummer.
