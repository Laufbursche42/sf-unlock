# Anleitung: Laufbursche SoFlow unlock

> **Machbarkeitsstudie.** Dieses Werkzeug zeigt, was das Bluetooth-Protokoll der SoFlow-E-Scooter
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

**Ein SoFlow-E-Scooter.** Unterstützt sind alle E-Scooter, die auch die Hersteller-App kennt: SO1, SO2 Air,
SO2 Air 2nd gen, SO2 Zero, SO2 Grover, SO2+ Grover, SO3, SO4, SO4 UL, SO4 Pro GT, SO4 Pro Core2,
SO4 Pro Max, SO5, SO5 Pro, SO6, SO One, SO One+, SO One Pro, SO One Lite, SO One Lite Pro, SO One
Prime, SO One Prime Max, SO myTIER sowie SO X. Nicht jedes Modell kann alles über Bluetooth. Wichtig:
**SO6 und SO4 UL haben kein BLE-Speed-Kommando**, dort lässt sich die Geschwindigkeit über diese Seite
nicht setzen. Beim SO4 mit alter Firmware (Version 4.x) gibt es ebenfalls kein Speed-Kommando.

---

## 2. Modell automatisch erkennen oder selbst wählen

Am einfachsten steht im Modell-Dropdown oben die Auswahl **Automatisch erkennen**. Damit sucht die
Seite alle SoFlow-E-Scooter in der Nähe und stellt Protokoll, Transport sowie Verschlüsselung selbst
anhand des Gerätenamens ein, genau wie die Hersteller-App. Du musst dein Modell also nicht kennen.

Wer will, wählt sein Modell auch direkt aus der Liste. Jeder Marketing-Name ist dabei, von SO4 über
SO One Pro bis SO4 Pro Core2. Die Seite blendet danach nur die Bedienelemente ein, die dein Modell
wirklich kann. Auch bei manueller Wahl bestimmt am Ende der Gerätename das Protokoll, ein Fehlgriff
wird also automatisch korrigiert.

---

## 3. Verbinden

1. Öffne die Seite in Bluefy oder Chrome.
2. Schalte den E-Scooter ein. Er muss ein paar Meter neben dem Handy bleiben.
3. Tippe auf **Verbinden** und wähle deinen E-Scooter in der Auswahl des Browsers. Bei automatischer
   Erkennung erscheinen dort alle SoFlow-E-Scooter (der Name beginnt mit SFS oder QINGZ), bei manueller Wahl nur die
   Geräte deines Modells.
4. Beobachte die Statusanzeige oben rechts: erst `connecting`, dann `linking`, dann `connected`.

**Android: Standort muss an sein.** Chrome scannt auf Android nur nach Bluetooth, wenn die
Standortdienste (GPS) eingeschaltet sind und Chrome die Berechtigung Standort beziehungsweise Geräte
in der Nähe hat. Sonst bleibt die Geräteliste komplett leer, obwohl der E-Scooter direkt daneben
steht. Schließe außerdem die SoFlow-App vorher ganz (aus dem App-Wechsler wischen), sonst hält sie die
Verbindung und der E-Scooter sendet kein Signal mehr, das der Browser sehen kann. Im Zweifel den
E-Scooter kurz aus- und wieder einschalten, direkt bevor du scannst.

Danach fragt die Seite einmal die Live-Daten ab und liest daraus unter anderem die Firmware-Version.
Das allererste Verbinden braucht immer die Auswahl des Browsers. Das ist eine Sicherheitsregel des
Browsers, die keine Verknüpfung überspringen kann.

---

## 4. Höchstgeschwindigkeit setzen

Nur bei Modellen mit BLE-Speed-Kommando (also nicht SO6 und nicht SO4 UL). In der Karte **Tuning und
Schloss** gibt es zwei Werte, **Offen** und **eKFV**, und zwei Knöpfe:

- **Drossel ein** schreibt den eKFV-Wert (Standard 22 km/h) als Höchstgeschwindigkeit. Das Herunterregeln
  auf einen legalen Wert ist deterministisch und daher **aktiv**.
- **Drossel aus** (Anheben über den Werkswert) ist bewusst **ausgegraut**. Der Grund steht direkt unter
  dem Knopf: Ob der Controller einen über 0xA9 angehobenen Wert wirklich fährt oder in der Firmware
  begrenzt, lässt sich aus der App allein nicht beweisen (Sicherheitsreport, Finding F3). Der Befehl
  wird vom E-Scooter zwar bestätigt (das Log zeigt "confirmed"), aber "bestätigt" heißt nur angenommen,
  nicht gefahren. Damit hier nichts Falsches versprochen wird, bleibt das Anheben gesperrt, bis es am
  Fahrzeug belegt ist.

Bei einem ersten Tester hat ein SO4 einen erhöhten Wert wirklich gefahren (30 km/h gesetzt, 30 km/h
erreicht); für alle anderen Modelle ist das offen. Wenn du das an deinem eigenen Fahrzeug auf privatem
Gelände prüfen willst, beobachte beim Vollgasfahren die Kachel **Geschwindigkeit** und melde das Ergebnis
mit dem gespeicherten Log (Abschnitt 12): Modell, Firmware, gesetzter Wert und erreichte
Live-Geschwindigkeit.

---

## 5. Fahrmodus setzen

Tippe in der Karte **Tuning und Schloss** direkt auf **eco**, **normal** oder **sport**. Das schaltet
die Fahrstufe. Beim SO3 ist die Modus-Zuordnung laut Report unbestätigt (ein Hinweis steht unter den
Knöpfen). **SO6 und SO4 UL** haben keinen Fahrmodus-Befehl, dort sind die Knöpfe ausgegraut.

---

## 6. Fahrzeug sperren und entsperren

Das ist die **Wegfahrsperre beziehungsweise der Diebstahlschutz** des E-Scooters, NICHT die
Geschwindigkeit. In der Karte **Tuning und Schloss** gibt es dafür **Entsperren** und **Sperren**. Der
genaue Befehl hängt vom Modell ab, die Seite wählt ihn automatisch. Gesperrt wird nur im Stillstand;
während der Fahrt lehnt die Seite das Sperren ab. Vor dem Sperren fragt die Seite kurz nach.

Bei **SO6 und SO4 UL** sind beide Knöpfe ausgegraut: deren Sperr- und Entsperr-Frames brauchen ein nicht
dokumentiertes Session-Token aus dem Handshake, das statisch nicht belegt ist.

---

## 7. Akku-Schloss entsperren

Der Befehl gibt das Schloss am herausnehmbaren Akku frei (Diebstahlschutz), er hat nichts mit der
Geschwindigkeit zu tun. Der Knopf ist nur bei Modellen aktiv, die den Befehl wirklich haben: SO5 Pro,
SO2 Air 2nd gen, SO2 Zero, SO2 Grover, SO2+ Grover sowie SO One in allen Varianten. Beim SO4 und SO
myTIER erst ab Firmware 5.2, deshalb wird der Knopf dort erst aktiv, wenn die Seite nach dem Verbinden
diese Firmware erkannt hat. Der SO X hat ihn sofort, weil er fest auf Protokoll V52 läuft. Bei SO1,
SO2 Air (erste Generation), SO3, SO5, SO6 und SO4 UL ist der Knopf ausgegraut und nennt den Grund. Vor
dem Senden fragt die Seite kurz nach.

---

## 8. Weitere Einstellungen

Die Karte **Tuning und Schloss** hat unten noch Komfort-Schalter. Jede Zeile bleibt sichtbar; was dein
Modell nicht kann, ist ausgegraut und nennt den Grund:

- **Scheinwerfer** an oder aus.
- **Dark Mode** des Displays an oder aus.
- **Zero-Start** (Anfahren erst per Kick oder direkt per Gas) an oder aus.
- **Anzeigelicht** (das BLE-Statuslicht), nur auf dem SO4-Pfad (nicht bei SO4 V51).
- **Einheit** zwischen km/h und mph umschalten.

Diese Schalter sind reine Komfort-Funktionen und haben nichts mit der Geschwindigkeit zu tun.
Scheinwerfer, Dark Mode und Zero-Start gibt es bei den So5-Klasse-Modellen (SO2, SO5 Pro, SO One), die
Einheit bei diesen und beim SO3, das BLE-Anzeigelicht nur auf dem SO4-Pfad (SO4, SO myTIER, SO X). Den
Bluetooth-Namen ändert die Seite bewusst nicht: ein umbenannter E-Scooter fällt aus der Hersteller-App.

---

## 9. Live-Werte lesen

Sobald Daten ankommen, füllen sich die Kacheln (Fahrmodus, Max-Speed, Firmware) und der Log zeigt die
dekodierten Werte plus die rohen Bytes als Hex. Das Notification-Format ist je Modell teils nur
teilweise entschlüsselt, deshalb bleibt manches ein Strich. Die rohen Daten stehen immer im Log.

Jedes gesendete Kommando wartet zudem auf die Echo-Antwort des E-Scooters. Der Log zeigt dann
`confirmed` oder `no confirmation`. Ein Echo heißt nur, dass der E-Scooter den Befehl angenommen hat,
nicht dass er den Wert auch fährt.

---

## 10. Verschlüsselung

Die Seite entscheidet automatisch, ob verschlüsselt wird, es gibt keinen Schalter. Das hängt am
Modell und beim SO4 an der Firmware:

- **SO4:** bis Firmware 5.1 Klartext, ab 5.2 AES-128-ECB. Die Version wird aus den Live-Daten
  gelesen.
- **SO2, SO5 Pro, SO One (Lite/Plus/Pro):** immer AES-128-ECB.
- **SO6 und SO4 UL:** immer AES-128-ECB in beide Richtungen, mit einem anderen festen Schlüssel.
- **SO3:** keine Verschlüsselung, dafür ein rollierendes Secret-Byte im Frame.

Oben bei der Verbindung steht, welche Verschlüsselung gerade aktiv ist. Der AES-Selbsttest läuft beim
Laden und landet im Log.

---

## 11. Verknüpfungen (Speed-Shortcuts)

Für den Alltag kannst du dir Verknüpfungen anlegen: eine setzt die Geschwindigkeit auf 22 km/h, die
andere auf den zuletzt gesetzten Wert. Beim Öffnen verbindet sich die Seite mit dem zuletzt genutzten
E-Scooter und setzt den Wert. Das geht nur bei Modellen mit BLE-Speed-Kommando.

---

## 12. Sauber testen und Ergebnis melden

Teste ausschließlich am eigenen Gerät auf privatem Gelände. Der Log unten ist ein vollständiger
Mitschnitt (Modell, Firmware, jedes gesendete plus empfangene Byte), neueste Zeile unten, mit
Autoscroll. **Log anonymisieren** ist standardmäßig an und schwärzt Geräte-ID, MAC, Schlüssel und lange
Hex-Ketten, damit du den Mitschnitt gefahrlos teilen kannst; **Diagnose-Log** schneidet zusätzlich jeden
rohen Kanal mit (nur zur Fehlersuche). Mit **Log kopieren**, **Log leeren** und **Als .txt speichern**
bekommst du den (anonymisierten) Mitschnitt heraus.

Probleme oder Erfolge bitte melden: per DM an
[Laufbursche im escooter-stammtisch](https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/)
oder als [GitHub-Issue](https://github.com/Laufbursche42/sf-unlock/issues). Häng den kopierten Log an,
dann sieht man genau, was gesendet plus empfangen wurde.

---

## 13. Grenzen, die man kennen sollte

- **SO6 und SO4 UL** kennen kein BLE-Speed-Kommando. Die Geschwindigkeit ist über diese Seite dort
  nicht setzbar. Auch Sperren/Entsperren bleibt dort ausgegraut (nicht dokumentiertes Session-Token).
- Dass der Controller einen Wert oberhalb der Drossel wirklich fährt, ist bei einem SO4 im Feld
  bestätigt (30 gesetzt, 30 gefahren). Für die übrigen Modelle steht der Test noch aus, deshalb ist
  **Drossel aus** (Anheben) ausgegraut. Das Protokoll selbst stammt aus der statischen Analyse der App.
- Es gibt keine erweiterte Experten-/Register-Schreibfläche: der Admin-Bereich der App nutzt dieselben
  Befehle. Es gibt kein Firmware-Flashen und keine LED-Steuerung; die SoFlow-App macht kein
  Firmware-Update über Bluetooth.

---

## 14. Recht

Das Anheben der Höchstgeschwindigkeit hebt die Drossel auf. Die ABE erlischt damit und der Betrieb auf
öffentlichen Wegen ist dann nicht erlaubt. Nutzung ausschließlich am eigenen Gerät und auf eigenes
Risiko.
