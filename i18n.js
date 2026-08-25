'use strict';

// Jede sichtbare Zeichenkette der Seite, in beiden Sprachen. Die Schlüssel passen zu den
// data-t-Attributen in index.html und zu den t()-Aufrufen in app.js, sodass ein fehlender
// Eintrag als leeres Element auffällt statt still auf die andere Sprache zu fallen.
// Deutsch ist die Voreinstellung; der Umschalter sitzt im Kopf.
//
// Das Log bleibt technisch und englisch (ASCII), damit ein Mitschnitt in einer Sprache bleibt.
window.I18N = {
  de: {
    pageTitle: "Laufbursche SoFlow Tool",
    brandSub: "SoFlow Tool",
    langGroup: "Sprache",
    themeToLight: "Auf helle Darstellung umschalten",
    themeToDark: "Auf dunkle Darstellung umschalten",

    s1Title: "So fängst du an",
    sub: "Live über Web Bluetooth mit deinem SoFlow-Scooter reden. Läuft in Bluefy (iOS) oder Chrome (Android/Desktop). Nichts verlässt dein Gerät.",
    startHintGuide: "Neu hier? In der <a href=\"GUIDE.de.md\" data-doc=\"GUIDE\" data-t=\"footGuide\">Anleitung</a> steht jeder Schritt.",
    expWarn: "<b>Experimentell.</b> Ob der Controller einen erhöhten Wert übernimmt oder selbst abriegelt, ist noch nicht bestätigt. Genau das soll dieser Test klären. Alles hier stammt aus statischer Analyse der App, nicht aus dem Fahrzeug. Probleme oder Fehler beim Testen bitte per DM an <a href=\"https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/\" target=\"_blank\" rel=\"noopener\">Laufbursche im escooter-stammtisch</a> oder als <a href=\"https://github.com/Laufbursche42/sf-unlock/issues\" target=\"_blank\" rel=\"noopener\">GitHub-Issue</a> melden.",
    ownDevice: "Nur am eigenen Fahrzeug auf privatem Gelände. Das Anheben der Höchstgeschwindigkeit hebt die Drossel auf, die ABE erlischt und der Betrieb auf öffentlichen Wegen ist dann nicht erlaubt.",

    s2Title: "Verbindung",
    modelLabel: "Modell",
    modelHint: "Wähle zuerst dein Modell. Danach nutzt die Seite das passende BLE-Protokoll, den passenden Scan-Namensfilter plus den passenden Transport. Voreinstellung ist SO4.",
    btnConnect: "Verbinden",
    btnDisconnect: "Trennen",
    controlsHint: "Verbinde dich mit dem Scooter. Auf dem iPhone geht Web Bluetooth nur über die App Bluefy, auf Android oder Desktop über Chrome oder Edge.",

    liveTitle: "Live-Werte vom Scooter",
    tileSpeed: "Geschwindigkeit",
    tileMode: "Fahrmodus",
    tileBatt: "Akku",
    tileLock: "Sperre",
    tileVolt: "Spannung",
    tileFw: "Firmware",
    valLocked: "gesperrt",
    valUnlocked: "offen",
    liveHint: "Die Werte werden aus dem Parser der App dekodiert und stehen so auch im Dokument. Nicht jedes Modell liefert jedes Feld, dann steht dort ein Strich. Die rohen Notifications stehen zusätzlich als Hex im Log.",

    s3Title: "Einstellungen",
    lblSpeed: "Max-Speed (km/h)",
    btnSetSpeed: "Setzen (0xA9)",
    lblMode: "Fahrmodus",
    modeEco: "eco",
    modeNormal: "normal",
    modeSport: "sport",
    btnSetMode: "Setzen (0xA3)",
    framePrefix: "Frame-Vorschau (0xA9):",
    settingsHint: "Max-Speed als km/h. Der Wert wird als (km/h mal 10) gesendet. Im Kommandobau gibt es keine Grenze. Ob der Controller hohe Werte annimmt, ist die offene Frage.",

    noSpeedTitle: "Kein Speed per Bluetooth",
    noSpeedHint: "Diese Reihe (SO6 beziehungsweise SO4 UL) hat kein BLE-Speed-Kommando. Die Höchstgeschwindigkeit lässt sich über diese App nicht per Bluetooth setzen. Sperren plus Entsperren gehen weiterhin.",

    lockTitle: "Fahrzeug-Sperre (Diebstahlschutz)",
    btnUnlock: "Entsperren",
    btnLock: "Sperren",
    lockHint: "Wegfahrsperre (Diebstahlschutz) des Scooters, NICHT die Höchstgeschwindigkeit. Der genaue Befehl hängt vom Modell ab: D7-Modelle 0xA0, SO3 0xA2, SO6-Familie {05,0C}/{05,01}. Belegt: die App nennt es LockVehicle beziehungsweise isLocked (LockWhileMovingException).",

    batTitle: "Akku entsperren",
    btnBat: "Akku entsperren (0xD5)",
    batHint: "Akku-Schloss entsperren (Diebstahlschutz am herausnehmbaren Akku), nicht speed-bezogen. Nur die D7-Modelle haben diesen Befehl (0xD5), SO3 plus die SO6-Familie nicht.",

    encTitle: "Verschlüsselung",
    encStatePrefix: "Aktiv:",
    encHint: "Wird automatisch nach Modell und Firmware gewählt, keine Einstellung nötig. SO4 verschlüsselt erst ab Firmware 5.2, die übrigen D7-Modelle immer, SO6 plus SO4 UL immer in beide Richtungen, SO3 nie.",

    s5Title: "Verknüpfungen",
    scFast: "Entsperren: gesetzter Wert",
    scSlow: "Sperren: 22 km/h",
    shortcutIos: "iOS (Bluefy): lege dir eine Verknüpfung auf diese Adresse an.",
    shortcutAndroid: "Android (Chrome): eine Verknüpfung auf dem Startbildschirm auf diese Adresse.",
    shortcutNote: "Beim Öffnen über eine solche Verknüpfung verbindet sich die Seite mit dem zuletzt genutzten Scooter und setzt die Geschwindigkeit: Sperren auf 22 km/h, Entsperren auf den zuletzt gesetzten Wert. Der Scooter muss an sein und in Reichweite. Nur für Modelle mit BLE-Speed-Kommando.",

    s6Title: "Protokoll-Log",
    btnCopyLog: "Log kopieren",
    btnClearLog: "Log leeren",
    logTxLegend: "TX / blau = gesendet",
    logRxLegend: "RX / braun = empfangen",

    footGuide: "Anleitung",
    footDisclaimer: "Haftungsausschluss",
    disclaimerText: "Dieses Werkzeug ist eine Machbarkeitsstudie, kein fertiges Produkt. Es gibt keine Gewährleistung und keine Garantie für fehlerfreien Betrieb. Das Anheben der Geschwindigkeit hebt die Drossel auf: die ABE erlischt und der Betrieb auf öffentlichen Wegen ist dann nicht erlaubt. Nutzung ausschließlich am eigenen Fahrzeug und auf eigenes Risiko. Die Seite spricht nur lokal per Bluetooth mit dem Gerät, es werden keine Daten an einen Server gesendet. SoFlow ist eine Marke des jeweiligen Inhabers. Dieses Projekt ist unabhängig und nicht mit SoFlow verbunden.",
    footSource: "Quellcode",
    footReadme: "Readme",
    footLicense: "Lizenz",
    footPrivacy: "Datenschutz",
    footTrademarks: "Marken",
    buildLabel: "Build",
    docClose: "Schließen",
    docLoading: "wird geladen ...",
    docFail: "Das Dokument konnte nicht geladen werden.",
    docEnglish: "(englisch)",

    encPlain: "Klartext",
    encAes: "AES-128-ECB",

    stDisconnected: "getrennt",
    stConnecting: "verbinde ...",
    stLinking: "warte auf Daten ...",
    stConnected: "verbunden",
    stNoService: "kein Dienst",
    stNoChar: "keine Merkmale",
    devPrefix: "Gerät:"
  },

  en: {
    pageTitle: "Laufbursche SoFlow Tool",
    brandSub: "SoFlow Tool",
    langGroup: "Language",
    themeToLight: "Switch to light theme",
    themeToDark: "Switch to dark theme",

    s1Title: "Getting started",
    sub: "Talk to your SoFlow scooter live over Web Bluetooth. Runs in Bluefy (iOS) or Chrome (Android/desktop). Nothing leaves your device.",
    startHintGuide: "New here? Every step is in the <a href=\"GUIDE.en.md\" data-doc=\"GUIDE\" data-t=\"footGuide\">guide</a>.",
    expWarn: "<b>Experimental.</b> Whether the controller accepts a raised value or caps it on its own is not confirmed yet. That is exactly what this test is meant to clarify. Everything here comes from static analysis of the app, not from the vehicle. Report problems or errors during testing by DM to <a href=\"https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/\" target=\"_blank\" rel=\"noopener\">Laufbursche on escooter-stammtisch</a> or open a <a href=\"https://github.com/Laufbursche42/sf-unlock/issues\" target=\"_blank\" rel=\"noopener\">GitHub issue</a>.",
    ownDevice: "Only on your own vehicle on private ground. Raising the top speed removes the throttle limit, the road approval lapses and operating it on public roads is then not allowed.",

    s2Title: "Connection",
    modelLabel: "Model",
    modelHint: "Pick your model first. The page then uses the matching BLE protocol, scan name filter and transport. The default is SO4.",
    btnConnect: "Connect",
    btnDisconnect: "Disconnect",
    controlsHint: "Connect to the scooter. On iPhone, Web Bluetooth only works through the Bluefy app; on Android or desktop use Chrome or Edge.",

    liveTitle: "Live values from the scooter",
    tileSpeed: "Speed",
    tileMode: "Ride mode",
    tileBatt: "Battery",
    tileLock: "Lock",
    tileVolt: "Voltage",
    tileFw: "Firmware",
    valLocked: "locked",
    valUnlocked: "open",
    liveHint: "The values are decoded from the app's own parser and are documented as such. Not every model provides every field; where it does not, a dash is shown. The raw notifications are also logged as hex.",

    s3Title: "Settings",
    lblSpeed: "Max speed (km/h)",
    btnSetSpeed: "Set (0xA9)",
    lblMode: "Ride mode",
    modeEco: "eco",
    modeNormal: "normal",
    modeSport: "sport",
    btnSetMode: "Set (0xA3)",
    framePrefix: "Frame preview (0xA9):",
    settingsHint: "Max speed in km/h. The value is sent as (km/h times 10). There is no cap in the command builder. Whether the controller accepts high values is the open question.",

    noSpeedTitle: "No speed over Bluetooth",
    noSpeedHint: "This series (SO6 or SO4 UL) has no BLE speed command. The top speed cannot be set over Bluetooth through this app. Lock and unlock still work.",

    lockTitle: "Vehicle lock (anti-theft)",
    btnUnlock: "Unlock",
    btnLock: "Lock",
    lockHint: "Vehicle immobilizer lock (anti-theft), NOT the top speed. The exact command depends on the model: D7 models 0xA0, SO3 0xA2, SO6 family {05,0C}/{05,01}. In the app code it is called LockVehicle / isLocked (LockWhileMovingException).",

    batTitle: "Battery unlock",
    btnBat: "Battery unlock (0xD5)",
    batHint: "Battery-lock release (anti-theft on the removable battery), not speed related. Only the D7 models have this command (0xD5), SO3 and the SO6 family do not.",

    encTitle: "Encryption",
    encStatePrefix: "Active:",
    encHint: "Chosen automatically from the model and its firmware, no setting needed. SO4 only encrypts from firmware 5.2, the other D7 models always, SO6 and SO4 UL always in both directions, SO3 never.",

    s5Title: "Shortcuts",
    scFast: "Unlock: set value",
    scSlow: "Lock: 22 km/h",
    shortcutIos: "iOS (Bluefy): add a shortcut pointing at this address.",
    shortcutAndroid: "Android (Chrome): a home-screen shortcut pointing at this address.",
    shortcutNote: "Opened through such a shortcut, the page reconnects to the last scooter and sets the speed: lock to 22 km/h, unlock to the last value you set. The scooter has to be on and in range. Only for models with a BLE speed command.",

    s6Title: "Protocol log",
    btnCopyLog: "Copy log",
    btnClearLog: "Clear log",
    logTxLegend: "TX / blue = sent",
    logRxLegend: "RX / brown = received",

    footGuide: "Guide",
    footDisclaimer: "Disclaimer",
    disclaimerText: "This tool is a feasibility study, not a finished product. There is no warranty and no guarantee of error-free operation. Raising the speed removes the throttle: the type approval becomes void and riding on public roads is then not allowed. Use it only on your own vehicle and at your own risk. The page talks to the device locally over Bluetooth only, no data is sent to any server. SoFlow is a trademark of its respective owner. This project is independent and not affiliated with SoFlow.",
    footSource: "Source",
    footReadme: "Readme",
    footLicense: "License",
    footPrivacy: "Privacy",
    footTrademarks: "Trademarks",
    buildLabel: "build",
    docClose: "Close",
    docLoading: "loading ...",
    docFail: "The document could not be loaded.",
    docEnglish: "(English)",

    encPlain: "Plaintext",
    encAes: "AES-128-ECB",

    stDisconnected: "disconnected",
    stConnecting: "connecting ...",
    stLinking: "waiting for data ...",
    stConnected: "connected",
    stNoService: "no service",
    stNoChar: "no characteristic",
    devPrefix: "Device:"
  }
};
