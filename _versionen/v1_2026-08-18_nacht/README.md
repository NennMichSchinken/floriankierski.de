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
| **Pixel** (Standard) | zum Auffallen | Nachtszene im Stardew-Stil, Pergament-Karten, Pixelschrift |
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
  img/px/               Pixel-Sprites aus PixelLab (21 Dateien, zusammen 29 KB)
  img/lumen/            Lumen-Screenshots (je Vollbild + Vorschau)
  img/design/           Arbeiten aus der Mediengestalter-Zeit
  img/og/og-image.jpg   Vorschaubild für WhatsApp, LinkedIn usw.
raw/                    Ausgangsmaterial + Sprite-Rohdateien — NICHT auf den Server kopieren
```

`raw/` enthält Lebensläufe mit Adresse und Telefonnummer. Beim Deployen bitte
ausschließen (siehe `rsync`-Befehl unten).

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

## Auf den eigenen Server bringen

### 1. Dateien hochladen

Vom Rechner aus, `raw/` und die Editor-Konfiguration ausgeschlossen:

```bash
rsync -avz --delete --exclude 'raw/' --exclude '.claude/' --exclude 'README.md' ./ benutzer@server:/var/www/floriankierski.de/
```

### 2. Rechte setzen

```bash
sudo chown -R www-data:www-data /var/www/floriankierski.de
```

### 3. Nginx-Server-Block

Nach `/etc/nginx/sites-available/floriankierski.de`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name floriankierski.de www.floriankierski.de;
    root /var/www/floriankierski.de;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Schriften und Bilder ändern sich nicht mehr — lange cachen
    location ~* \.(woff2|png|jpg|gif|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # HTML nie cachen, damit Änderungen sofort ankommen
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml text/plain;
    gzip_min_length 512;
}
```

Aktivieren und prüfen:

```bash
sudo ln -s /etc/nginx/sites-available/floriankierski.de /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. DNS bei IONOS

A-Record auf die IPv4 des Servers, AAAA-Record auf die IPv6 — jeweils für
`@` und `www`. Vor Schritt 5 abwarten, bis die Änderung greift:

```bash
dig +short floriankierski.de
```

### 5. HTTPS

```bash
sudo certbot --nginx -d floriankierski.de -d www.floriankierski.de
```

Certbot trägt die Zertifikate selbst in den Server-Block ein und legt einen Timer
für die Erneuerung an. Kontrolle:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

Das ist genau der Fehler, der den Server 2024 lahmgelegt hat — der `--dry-run`
lohnt sich einmal im Halbjahr.

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

Alle Sprites stammen aus PixelLab und folgen einem Stil: Florians eigener
Character gibt Palette, Konturen und Schattierung vor. Seine Figur läuft als
Begleiter am unteren Bildrand mit dem Lesefortschritt mit und steckt als Kopf in
Kopfzeile und Favicon.

Wie man neue Sprites im passenden Stil erzeugt, welche Fallen es dabei gibt und
warum alles in exakt doppelter Pixelgröße dargestellt wird, steht in
**[PIXELLAB.md](PIXELLAB.md)**.

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
