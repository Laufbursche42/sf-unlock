# Anleitung: Laufbursche SoFlow unlock

> **Machbarkeitsstudie.** Dieses Werkzeug zeigt, was das Bluetooth-Protokoll der SoFlow-Roller
> technisch hergibt. Es ist kein fertiges Produkt. Fehlerfreier Betrieb wird nicht versprochen, es
> gibt keinerlei Gewährleistung. Was du hier tust, tust du auf eigenes Risiko und nur am eigenen
> Fahrzeug.

## 1. Was du brauchst

Alles passiert im Browser über Web Bluetooth: Modell wählen, verbinden, Geschwindigkeit setzen,
Fahrmodus schalten, Fahrzeug sperren, entsperren. Es gibt nichts zu installieren. Gebraucht wird:

**Ein Browser, der Web Bluetooth kann.**

- **iOS:** der Browser **Bluefy** (kostenlos im App Store). Safari und jeder andere iOS-Browser
  laufen auf der Safari-Engine, die überhaupt kein Web Bluetooth hat.
- **Android oder Desktop:** **Chrome** oder ein anderer Chromium-Browser. Web Bluetooth ist
  eingebaut, kein Extra-Browser nötig.

**Ein SoFlow-Roller.** Unterstützt sind SO4, SO4 Pro, SO4 Pro GT, SO4 Pro Max, SO4 UL, SO2 Air2,
SO2 Grover, SO2 Zero, SO3, SO5 Pro, SO6 sowie SoOne Lite, SoOne Plus, SoOne Pro. Nicht jedes Modell
kann alles über Bluetooth. Wichtig: **SO6 und SO4 UL haben kein BLE-Speed-Kommando**, dort lässt
sich die Geschwindigkeit über diese Seite nicht setzen.

---

## 2. Modell wählen

Der erste Schritt ist immer das Modell-Dropdown oben. Das Protokoll unterscheidet sich je Reihe und
die Seite braucht die richtige Auswahl, um den passenden Scan-Namen, den Transport, das Frame-Format
sowie die Verschlüsselung zu nutzen. Wähle dein Modell, bevor du verbindest. Die Seite blendet danach
nur die Bedienelemente ein, die dein Modell wirklich kann.

---

## 3. Verbinden

1. Öffne die Seite in Bluefy oder Chrome.
2. Schalte den Roller ein. Er muss ein paar Meter neben dem Handy bleiben.
3. Tippe auf **Verbinden** und wähle deinen Roller in der Auswahl des Browsers. In dieser Liste
   erscheinen nur Geräte, deren Name zum gewählten Modell passt.
4. Beobachte die Statusanzeige oben rechts: erst `connecting`, dann `linking`, dann `connected`.

Danach fragt die Seite einmal die Live-Daten ab und liest daraus unter anderem die Firmware-Version.
Das allererste Verbinden braucht immer die Auswahl des Browsers. Das ist eine Sicherheitsregel des
Browsers, die keine Verknüpfung überspringen kann.

---

## 4. Höchstgeschwindigkeit setzen

Nur bei Modellen mit BLE-Speed-Kommando (also nicht SO6 und nicht SO4 UL).

1. Trage in der Karte **Einstellungen** den gewünschten Wert in km/h ein.
2. Tippe auf **Setzen**. Die Seite baut das Kommando 0xA9 und sendet es.

Der Wert geht als km/h mal 10 als 16-Bit-Zahl raus. Im Kommandobau gibt es keine Grenze. Ob der
Controller einen erhöhten Wert wirklich fährt oder selbst abriegelt, ist die offene Frage, die genau
dieser Test klären soll.

---

## 5. Fahrmodus setzen

Wähle eco, normal oder sport und tippe auf **Setzen**. Das schaltet die Fahrstufe (Kommando 0xA3,
beim SO3 0xA4).

---

## 6. Fahrzeug sperren und entsperren

Das ist die **Wegfahrsperre beziehungsweise der Diebstahlschutz** des Rollers, NICHT die
Geschwindigkeit. Im App-Code heißt es LockVehicle beziehungsweise isLocked. Entsperren gibt den
Roller frei, Sperren stellt ihn ab. Der genaue Befehl hängt vom Modell ab (D7-Modelle 0xA0, SO3
0xA2, SO6-Familie ein Zwei-Byte-Kommando), die Seite wählt ihn automatisch.

---

## 7. Akku-Schloss entsperren

Nur bei den D7-Modellen (SO4, SO4 Pro/GT/Max, SO2, SO5 Pro, SoOne). Das betrifft das Schloss am
herausnehmbaren Akku (Diebstahlschutz), nicht die Geschwindigkeit. Bei SO3, SO6 und SO4 UL gibt es
diesen Befehl nicht, die Karte erscheint dort gar nicht.

---

## 8. Live-Werte lesen

Sobald Daten ankommen, füllen sich die Kacheln (Fahrmodus, Max-Speed, Firmware) und der Log zeigt die
dekodierten Werte plus die rohen Bytes als Hex. Das Notification-Format ist je Modell teils nur
teilweise entschlüsselt, deshalb bleibt manches ein Strich. Die rohen Daten stehen immer im Log.

---

## 9. Verschlüsselung

Die Seite entscheidet automatisch, ob verschlüsselt wird, es gibt keinen Schalter. Das hängt am
Modell und beim SO4 an der Firmware:

- **SO4:** bis Firmware 5.1 Klartext, ab 5.2 AES-128-ECB. Die Version wird aus den Live-Daten
  gelesen.
- **SO2, SO5 Pro, SoOne, SO4 Pro/GT/Max:** immer AES-128-ECB.
- **SO6 und SO4 UL:** immer AES-128-ECB in beide Richtungen, mit einem anderen festen Schlüssel.
- **SO3:** keine Verschlüsselung, dafür ein rollierendes Secret-Byte im Frame.

Oben bei der Verbindung steht, welche Verschlüsselung gerade aktiv ist. Der AES-Selbsttest läuft beim
Laden und landet im Log.

---

## 10. Verknüpfungen (Speed-Shortcuts)

Für den Alltag kannst du dir Verknüpfungen anlegen: eine setzt die Geschwindigkeit auf 22 km/h, die
andere auf den zuletzt gesetzten Wert. Beim Öffnen verbindet sich die Seite mit dem zuletzt genutzten
Roller und setzt den Wert. Das geht nur bei Modellen mit BLE-Speed-Kommando.

---

## 11. Sauber testen und Ergebnis melden

Teste ausschließlich am eigenen Gerät auf privatem Gelände. Bevor du sendest, prüfe die Frame-Vorschau
in der Speed-Karte. Der Log unten ist ein vollständiger Mitschnitt (Modell, Firmware, jedes gesendete
plus empfangene Byte). Mit **Log kopieren** bekommst du den ganzen Mitschnitt als Text.

Probleme oder Erfolge bitte melden: per DM an
[Laufbursche im escooter-stammtisch](https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/)
oder als [GitHub-Issue](https://github.com/Laufbursche42/sf-unlock/issues). Häng den kopierten Log an,
dann sieht man genau, was gesendet plus empfangen wurde.

---

## 12. Grenzen, die man kennen sollte

- **SO6 und SO4 UL** kennen kein BLE-Speed-Kommando. Die Geschwindigkeit ist über diese Seite dort
  nicht setzbar.
- Ob der Controller einen Wert oberhalb der Drossel wirklich fährt, ist nicht bestätigt. Alles hier
  stammt aus der statischen Analyse der App, nicht aus dem Fahrzeug.
- Es gibt kein Firmware-Flashen und keine LED-Steuerung. Die SoFlow-App macht kein Firmware-Update
  über Bluetooth.

---

## 13. Recht

Das Anheben der Höchstgeschwindigkeit hebt die Drossel auf. Die ABE erlischt damit und der Betrieb auf
öffentlichen Wegen ist dann nicht erlaubt. Nutzung ausschließlich am eigenen Gerät und auf eigenes
Risiko.
