# Figur & Sprites — Stand und Anleitung

Die gesamte Pixel-Grafik der Seite stammt jetzt aus **PixelLab** und ist in einem
Stil gehalten: Florians eigener Character gibt Palette, Konturen und Schattierung
vor, alle Requisiten sind darauf abgestimmt.

---

## Was fertig ist

| Teil | Datei | Herkunft |
|---|---|---|
| Figur, Ruhepose | `hero-idle-east.png`, `hero-idle-west.png` | Florians Character, Rotationen `east` / `west` |
| Figur, Laufzyklus | `hero-walk-east.png`, `hero-walk-west.png` | PixelLab-Vorlage `walking-4-frames`, je 4 Einzelbilder |
| Marke, Kopfzeile + Favicon | `mark.png` und die drei Favicon-Dateien | Kopfausschnitt aus der `south`-Rotation |
| Alchemistenturm | `tower.png` | `create_map_object`, Dach nachträglich von Magenta auf Charakter-Rot gezogen |
| Bäume, Busch, Kristalle, Pilze, Runenstein, Laterne, Stein, Kräuterbeet, Huhn, Blume, Wolken | je eine `.png` | `create_map_object`, alle mit identischen Stilwerten |
| Graskante | `grass-edge.png` | von Hand — **muss nahtlos kacheln**, siehe unten |

**Scroll-Begleiter läuft.** Die Figur folgt am unteren Bildrand dem
Lesefortschritt, dreht sich beim Hochscrollen um, geht bei Stillstand in die
Ruhepose. Aus bei `prefers-reduced-motion`, unter 820 px Breite und im
Klartext-Modus.

Alle 21 Sprites zusammen: **29 KB**.

---

## Der Zugang

PixelLab hängt als MCP-Server an `~/.claude.json` (Benutzerebene, gilt in allen
Projekten). Falls Claude Code die Werkzeuge einmal nicht lädt, geht es auch direkt
über HTTP — der Endpunkt ist normales JSON-RPC über SSE:

```python
import json, urllib.request
cfg = json.load(open(r"C:\Users\Florian\.claude.json", encoding="utf-8"))["mcpServers"]["pixellab"]

def rpc(method, params=None):
    body = json.dumps({"jsonrpc":"2.0","id":1,"method":method,"params":params or {}}).encode()
    req = urllib.request.Request(cfg["url"], data=body, method="POST", headers={
        "Content-Type":"application/json",
        "Accept":"application/json, text/event-stream",
        "Authorization": cfg["headers"]["Authorization"]})
    raw = urllib.request.urlopen(req, timeout=300).read().decode()
    for line in raw.splitlines():                 # SSE: nur data:-Zeilen sind JSON
        if line.startswith("data:"):
            out = json.loads(line[5:].strip())
    return out["result"]

def call(name, args):                              # ein Werkzeug aufrufen
    return rpc("tools/call", {"name": name, "arguments": args})
```

`rpc("tools/list")` zeigt alle 76 Werkzeuge.

---

## Neue Requisiten im gleichen Stil erzeugen

Diese Werte **unverändert** übernehmen, sonst passt das Ergebnis nicht zum Rest:

```python
STIL = dict(view="side", outline="single color outline",
            shading="basic shading", detail="medium detail")

call("create_map_object", dict(
    description="beschreibung auf englisch",
    width=48, height=64, **STIL))
```

Dann `get_map_object(object_id=...)` abfragen, bis `status: completed`.

### Vier Fallen

1. **Mindestmaß 32 px** in Breite und Höhe. Kleinere Objekte trotzdem mit 32
   anfordern und den transparenten Rand danach abschneiden (`im.crop(im.getbbox())`).
2. **Objekte löschen sich nach 8 Stunden von selbst.** Sofort herunterladen.
3. **Download braucht einen User-Agent**, sonst antwortet der Speicher mit 403.
   Der API-Download braucht zusätzlich den `Authorization`-Header.
4. **Die Aufzählungswerte unterscheiden sich je Werkzeug.** `create_character`
   kennt `single color black outline`, `create_map_object` nicht — dort heißt es
   `single color outline`.

### Maßstab

Alle Requisiten der Szene stehen in **exakt doppelter** Pixelgröße im CSS
(`width` = natives Maß × 2). Das ist wichtig: bei gemischten Faktoren sind die
Pixel unterschiedlich groß und das Bild wirkt unsauber. Ausnahmen sind bewusst
gesetzt — die Wolken stehen auf 3× (sonst wirken sie wie Krümel) und der
Begleiter auf 3×, weil er nicht Teil der Szene, sondern eine Einblendung ist.

Nach jedem Austausch beide Stellen nachziehen: `width`/`height` im `<img>` in
`index.html` (natives Maß) und die `width` in `style.css` (natives Maß × 2).

### Die Graskante ist die Ausnahme

`grass-edge.png` läuft als `border-image` über die volle Breite und **muss
nahtlos kacheln**. Generierte Sprites tun das erfahrungsgemäß nicht. Diese Datei
deshalb von Hand lassen, oder mit `create_topdown_tileset` arbeiten statt mit
`create_map_object`.

---

## Die Figur animieren

```python
call("animate_character", {
  "character_id": "648cff4b-4623-4620-bc47-495381768a40",
  "template_animation_id": "walking-4-frames",
  "directions": ["east", "west"],
})
```

Vorlagen gibt es reichlich — `get_character` listet sie unter
`available_animations` (walk, walking-2 bis walking-10, running-4/6/8-frames,
breathing-idle, jumping, picking-up, pushing …).

Danach: alle Einzelbilder herunterladen und mit **einem gemeinsamen Rahmen**
zuschneiden, sonst springt die Figur beim Laufen. Der aktuelle Rahmen ist
`x19..42, y10..52` → 23 × 42 px je Einzelbild. Die Streifen liegen waagerecht
nebeneinander, das CSS schaltet mit `background-position` in `steps(4)` weiter.

---

## Wo was liegt

| Ordner | Inhalt |
|---|---|
| `assets/img/px/` | die eingebauten Sprites — das ist der Auslieferungsstand |
| `raw/Character/` | Florians Character, 8 Rotationen als PNG |
| `raw/pixellab/` | Rohdateien wie generiert, vor dem Zuschneiden |
| `raw/px-handgemacht/` | die ursprünglichen, prozedural erzeugten Sprites — Sicherung |

`raw/` gehört **nicht** auf den Server (siehe `rsync`-Befehl in der README).

---

---

## Der Boden — aus zwei Wang-Tilesets

Zwei verschiedene Sätze, weil sie zwei verschiedene Aufgaben haben.

### Wiese und Vorderkante: `2c29d63e-1b30-437e-bd69-c8d754a4f423`

„dark nocturnal grassy terrain … shallow damp dirt ledge". Sehr dunkles Nachtgras
mit rotbraunen **Erdkanten und ohne Wasser** — genau richtig, weil vorne nur Erde
zu sehen sein soll. Liegt zerlegt in `raw/tiles3/m00…m33.png`.

| Kachel | Inhalt |
|---|---|
| `m30` | reines dunkles Gras — Grundlage der Fläche |
| `m21` | waagerechte Erdkante — Grundlage der Vorderkante |
| `m03`, `m32`, `m10` | weitere Kanten, dienen als Kiesel-Steinbruch |

Terrain-Erkennung hier: **Erde = `R > G+8` und `R > B+8`** (rotbraun), Rest ist Gras.

### Der See: `1cf15fbb-fca8-4e30-a15f-48aace8688d1`

„shimmering wavy magic water surface". Liegt zerlegt in `raw/tiles2/n00…n33.png`.
Vollständiger Wang-Satz — alle 16 Eck-Kombinationen vorhanden, deshalb lässt sich
jede beliebige Seeform bauen.

Terrain-Erkennung hier: **Wasser = `B >= G`** (türkis), Erde = `R > G` und `R > B`.
Achtung: die blau leuchtenden Pflanzen im Gras fallen unter dieselbe Regel.

### Wie der See gebaut wird

1. Eck-Gitter anlegen (eine Zelle mehr in jeder Richtung als Kacheln), Ellipse
   hineinzeichnen → jede Ecke ist `W` oder `G`.
2. Je Kachel die vier Ecken auslesen und über die Zuordnungstabelle die passende
   Kachel setzen. Reines Gras (`GGGG`) wird übersprungen.
3. Farblich an das dunkle Gras angleichen (Faktor aus dem Verhältnis der mittleren
   Grastöne beider Sätze — aktuell R 0.84 / G 0.92 / B 0.93).
4. **Flutfüllung vom Bildrand** durch alle zusammenhängenden Grasflächen, die
   dabei durchsichtig werden. Die Erdböschung stoppt die Füllung. Ohne diesen
   Schritt sieht man ein Rechteck um den See, weil das Gras der Eckkacheln anders
   getönt ist als der Boden.

### Gegen den Wiederholungseindruck

Die Kachel allein wiederholt sich alle 32 px sichtbar. Drei Mittel dagegen:

1. **Ziegelversatz** — jede zweite Reihe um die halbe Kachel verschoben.
2. **Eingebaute Details vorher entfernen** und danach zufällig neu streuen, mit
   Umlauf (`% breite`), sonst reißt die Kachelung. Bei `m21` sitzen Pflanzen fest
   in der Kachel — die müssen raus, sonst stehen sie in Reih und Glied.
3. **Breiterer Rapport** — die Kante ist 8 Kacheln breit (256 px nativ, 512 px
   dargestellt), jede zweite gespiegelt, dazu gestreute Kiesel.

### Ebenen-Reihenfolge

Das war ein echter Fehler: die Licht-Ebene lag über dem Turm und hat ihn
überlagert statt beleuchtet. Richtig ist:

| z-index | Ebene |
|---|---|
| 1 | `.scene__lights` (Lichtkegel) und der Dunst oben |
| 3 | `.pond` |
| 5 | `.scene__props` |
| 6 | `.prop--tower` |
| 12 | `.scene__ground::after` (Vorderkante — überdeckt den See, das gibt Tiefe) |

## ÜBERGABE — hier weitermachen

Stand: die Seite läuft und sieht ordentlich aus. Nacht-Hero mit gekachelter
Wiese, gemalter Erdkante, See und Florians Turm. Offen ist die **Landschaft mit
Tiefe** — Berge im Hintergrund statt nur Flächen.

### Was Florian zuletzt bemängelt und was daraus wurde

| Punkt | Stand |
|---|---|
| CSS-Glow am Turm wirkt billig | **erledigt** — `.scene__lights` komplett entfernt, Licht gehört in die Sprites |
| Hintere Kante wirkt wie Tag-Szene | **erledigt** — Verlauf zieht jetzt nach `#0b0820` statt nach `--sky-4` |
| Erdkante zu gleichförmig und zu grün | **erledigt** — durchgehend gemalt aus den drei Erdfarben des Tilesets, 512 px Rapport, wellige Oberkante |
| Landschaft mit Bergen statt Flächen | **offen** — Rohmaterial liegt bereit, siehe unten |

### Rohmaterial in `raw/szene/` — ehrliche Bewertung

Fünf Teile wurden erzeugt. Sie sind **noch nicht eingebaut**.

| Datei | Größe | Taugt? |
|---|---|---|
| `berge_a.png` | 400×160 | **Sehr gut.** Detaillierte Bergkette. Aber: bringt eigenen Himmel, Sterne und Mond mit — muss auf die Silhouette beschnitten werden, sonst kollidiert es mit dem CSS-Himmel |
| `berge_b.png` | 384×112 | **Gut**, sanfte Hügelketten, gleiches Problem mit eigenem Himmel |
| `wald.png` | 400×80 | **Brauchbar**, Nadelwald-Silhouette — aber nur 186 px Inhalt, mittig auf der Leinwand, kachelt so nicht |
| `teich.png` | 224×96 | **Schwach.** Flache Ellipse aus starker Aufsicht, passt perspektivisch nicht. Der eingebaute See aus dem Wang-Satz ist besser |
| `boden.png` | 128×128 | **Am Ziel vorbei.** `create_sidescroller_tileset` liefert einen Plattformer-Satz (schwebende Felsplattformen mit orangem Licht), keine Wiese. Falsches Werkzeug für diese Aufgabe |

### Vorschlag für den nächsten Schritt

Die Berge sind die eigentliche Ausbeute. Vorgehen:

1. `berge_a.png` und `berge_b.png` **auf die Silhouette beschneiden** — alles
   oberhalb der Bergkämme wegschneiden (Himmel, Sterne, Mond gehören uns, nicht
   dem Sprite). Der Boden der Sprites ist bereits flach.
2. Als **zwei Parallax-Ebenen** zwischen `.scene__hills` und `.scene__ground`
   legen: `berge_b` weiter hinten (kleiner, dunkler, stärker entsättigt),
   `berge_a` davor. Beide `repeat-x`, unterschiedliche `background-size`, damit
   der Rapport nicht zusammenfällt.
3. `.scene__hills` (die drei CSS-Ellipsen) danach **entfernen** — die werden
   überflüssig.
4. `wald.png` auf den Inhalt beschneiden und als schmale Ebene direkt über der
   Wiese wiederholen.
5. Farblich alles in denselben Nachtton ziehen (die Berge sind kräftiger blau als
   unser Himmel).

**Nicht noch einmal versuchen:** `create_sidescroller_tileset` für die Wiese. Das
Werkzeug macht Plattformen, keine Flächen. Die aktuelle Lösung — Grasfläche aus
`m30` des Wang-Satzes plus selbst gemalte Erdkante — ist besser und bleibt.

### Was garantiert funktioniert und nicht angefasst werden sollte

- Die Schriftkombination `PixelMix` (Reihenfolge der `@font-face`!)
- Der Begleiter samt Laufzyklus
- Der Klartext-Modus
- Die 2×-Maßstabsregel

## Offen / optional

- In Florians PixelLab-Account liegt noch ein Test-Character **„Florian Pixel"**
  (`683f353a-fa25-4382-b2a3-5c233e4029cf`), den ich beim Ausprobieren erzeugt
  habe, bevor sein eigener aufgetaucht ist. Kann gelöscht werden.
- Der Turm hatte im Original ein magentafarbenes Dach. Falls das doch besser
  gefällt: `raw/pixellab/tower-raw.png` ist die unveränderte Fassung.
- Eine Ruhepose mit Animation (`breathing-idle`) würde den Begleiter beim
  Stillstand lebendiger machen — aktuell ist das ein Standbild.
