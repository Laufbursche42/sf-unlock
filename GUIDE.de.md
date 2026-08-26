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

Danach fragt die Seite einmal die Live-Daten ab und liest daraus unter anderem die Firmware-Version.
Das allererste Verbinden braucht immer die Auswahl des Browsers. Das ist eine Sicherheitsregel des
Browsers, die keine Verknüpfung überspringen kann.

---

## 4. Höchstgeschwindigkeit setzen und testen

Nur bei Modellen mit BLE-Speed-Kommando (also nicht SO6 und nicht SO4 UL).

1. Trage in der Karte **Einstellungen** den gewünschten Wert in km/h ein.
2. Tippe auf **Setzen**. Die Seite sendet den Wert an den E-Scooter.

Die Seite kennt dabei keine Obergrenze. Bei einem ersten Tester hat der Controller einen erhöhten
Wert wirklich gefahren (30 km/h gesetzt, 30 km/h erreicht). Ob das bei deinem Modell mit deiner
Firmware genauso ist, klärt genau dieser Test.

**So testest du, ob der E-Scooter den Wert wirklich fährt:**

1. Such dir einen sicheren, freien Ort auf privatem Gelände, kein Verkehr. Helm auf.
2. Fahr kurz Vollgas und merk dir, bei welcher km/h-Zahl der E-Scooter abriegelt. Das ist dein
   Ausgangswert.
3. Setze einen Wert leicht darüber, zum Beispiel 2 bis 3 km/h mehr und tippe auf **Setzen**.
4. Fahr wieder Vollgas und beobachte die Kachel **Geschwindigkeit**. Steigt sie über den vorherigen
   Riegel? Dann nimmt der Controller den Wert an.
5. Wiederhole das in kleinen Schritten. Ab welchem Wert es nicht mehr weiter geht, ist der harte
   Deckel der Firmware.
6. Ein hoher Zahlenwert macht den E-Scooter nicht schneller, als Motor und Akku hergeben. Er zeigt nur,
   ob der Controller ihn annimmt.

Melde dein Ergebnis mit dem kopierten Log (Abschnitt 12): Modell, Firmware, gesetzter Wert und die
erreichte Live-Geschwindigkeit.

---

## 5. Fahrmodus setzen

Wähle eco, normal oder sport und tippe auf **Setzen**. Das schaltet die Fahrstufe.

---

## 6. Fahrzeug sperren und entsperren

Das ist die **Wegfahrsperre beziehungsweise der Diebstahlschutz** des E-Scooters, NICHT die
Geschwindigkeit. Entsperren gibt den E-Scooter frei, Sperren stellt ihn ab. Der genaue Befehl hängt vom
Modell ab, die Seite wählt ihn automatisch.

---

## 7. Akku-Schloss entsperren

Der Befehl gibt das Schloss am herausnehmbaren Akku frei (Diebstahlschutz), er hat nichts mit der
Geschwindigkeit zu tun. Die Karte erscheint nur bei Modellen, die den Befehl wirklich haben: SO5 Pro,
SO2 Air 2nd gen, SO2 Zero, SO2 Grover, SO2+ Grover sowie SO One in allen Varianten. Beim SO4 und SO myTIER gibt es ihn erst ab Firmware 5.2, deshalb erscheint die Karte dort erst, wenn
die Seite nach dem Verbinden diese Firmware erkannt hat. Der SO X zeigt ihn sofort, weil er fest auf
Protokoll V52 läuft. Bei SO1, SO2 Air (erste Generation), SO3, SO5,
SO6 und SO4 UL gibt es den Befehl nicht.

---

## 8. Weitere Einstellungen

Manche Modelle bieten in der Karte **Weitere Einstellungen** noch Komfort-Schalter. Es erscheinen nur
die, die dein Modell wirklich kann:

- **Scheinwerfer** an oder aus.
- **Dark Mode** des Displays an oder aus.
- **Zero-Start** (Anfahren erst per Kick oder direkt per Gas) an oder aus.
- **Einheit** zwischen km/h und mph umschalten.
- **Name** des E-Scooters ändern (der Name, der im Bluetooth-Dialog erscheint).
- **Anzeigelicht** (das BLE-Statuslicht), nur beim SO4.

Diese Schalter sind reine Komfort-Funktionen und haben nichts mit der Geschwindigkeit zu tun.
Scheinwerfer, Dark Mode und Zero-Start gibt es bei den So5-Klasse-Modellen (SO2, SO5 Pro, SO One).
Den Namen kann man bei diesen und beim SO6 setzen, die Einheit bei diesen und beim SO3. Das
BLE-Anzeigelicht gibt es nur auf dem SO4-Pfad (SO4, SO myTIER, SO X).

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
Mitschnitt (Modell, Firmware, jedes gesendete plus empfangene Byte). Mit **Log kopieren** bekommst du
den ganzen Mitschnitt als Text.

Probleme oder Erfolge bitte melden: per DM an
[Laufbursche im escooter-stammtisch](https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/)
oder als [GitHub-Issue](https://github.com/Laufbursche42/sf-unlock/issues). Häng den kopierten Log an,
dann sieht man genau, was gesendet plus empfangen wurde.

---

## 13. Grenzen, die man kennen sollte

- **SO6 und SO4 UL** kennen kein BLE-Speed-Kommando. Die Geschwindigkeit ist über diese Seite dort
  nicht setzbar.
- Dass der Controller einen Wert oberhalb der Drossel wirklich fährt, ist bei einem Modell im Feld
  bestätigt (30 gesetzt, 30 gefahren). Für die übrigen Modelle steht der Test noch aus. Das Protokoll
  selbst stammt aus der statischen Analyse der App.
- Es gibt kein Firmware-Flashen und keine LED-Steuerung. Die SoFlow-App macht kein Firmware-Update
  über Bluetooth.

---

## 14. Recht

Das Anheben der Höchstgeschwindigkeit hebt die Drossel auf. Die ABE erlischt damit und der Betrieb auf
öffentlichen Wegen ist dann nicht erlaubt. Nutzung ausschließlich am eigenen Gerät und auf eigenes
Risiko.
