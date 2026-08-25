# Laufbursche SoFlow unlock

A static web page that talks to SoFlow e-scooters over Web Bluetooth. You pick your model, and the
page uses the matching BLE protocol for it. Depending on the model it sets the maximum speed,
switches the ride mode, locks and unlocks the vehicle and unlocks the battery, straight from the
browser. Nothing to install: no app store, no signing, no developer account. It runs in **Bluefy**
on iOS and in **Chrome** on Android or desktop.

> **This is a feasibility study.** It exists to show what SoFlow's Bluetooth protocol makes
> possible, not to be a finished product. The protocols were reconstructed from the official app
> (com.soflowapp 3.8.5) and are documented byte for byte, but the real send test at the vehicle is
> still open. Error-free operation is not promised and there is no warranty of any kind. Whatever
> you do with it, you do at your own risk.

**Open the web app: [laufbursche42.github.io/sf-unlock](https://laufbursche42.github.io/sf-unlock/)**

Or run it yourself, no build step, no dependencies: clone the repo and serve the folder over a
local HTTP server. Opening `index.html` directly as a `file://` URL will not work, the page fetches
its own documents and browsers block that over `file://`.

```
git clone https://github.com/Laufbursche42/sf-unlock.git
cd sf-unlock
python -m http.server 8000
```

Any static server works. With Node installed, this does the same job:

```
npx serve .
```

Then open the printed address in a browser that supports Web Bluetooth.

**Guide: [Deutsch](GUIDE.de.md) | [English](GUIDE.en.md)** covers everything step by step, from
picking the model to the first send.

## Pick your model first

The BLE protocol differs per model family, so the first step is always the model dropdown. The page
then knows the scan name, the transport, the frame format, the encryption and the command set for
that model. Supported models:

- **SO4**, **SO4 Pro**, **SO4 Pro GT**, **SO4 Pro Max**, **SO4 UL**
- **SO2 Air2**, **SO2 Grover**, **SO2 Zero**
- **SO3**
- **SO5 Pro**
- **SO6**
- **SoOne Lite**, **SoOne Plus**, **SoOne Pro**

Not every model exposes every function over Bluetooth. Most importantly, **SO6 and SO4 UL have no
BLE speed command at all**, so the maximum speed cannot be set from this page for those two. The
page hides the controls a model does not support and shows a clear note instead.

## What it does

- **Set the maximum speed** (opcode 0xA9 on the SO4 style models). The value is `km/h * 10` as a
  big-endian 16-bit number, and the command itself carries no limit. Not available on SO6 and SO4 UL.
- **Switch the ride mode** between eco, normal and sport.
- **Lock and unlock the vehicle**. This is the anti-theft immobilizer (the app calls it
  `LockVehicle` / `isLocked`), not the speed. The exact command depends on the model family.
- **Unlock the battery lock** (opcode 0xD5). Only the SO4 style (D7) models have this command.
- **More per-model settings** where the model exposes them: headlight (0xA2), dark mode (0xD6),
  zero-start (0xA5), unit (0xA7, SO3 0xAB) and the Bluetooth name (0xFF, SO6 {04,01}) on the Pro and
  So5-class models, plus the display indicator light (0xA6) on all D7 models. The page shows only the
  controls a model actually has.
- **Read the telemetry** the scooter sends back (speed, battery, ride mode, firmware version and
  more, model dependent) and keep the raw notifications in an on-screen diagnostic log as plain hex.
- **Home-screen shortcuts** for speed: one sets the throttle back to 22 km/h, the other restores the
  last value you set.

## Encryption is automatic

Encryption follows the selected model and, for the SO4, its firmware. There is no manual switch,
that choice would be wrong since the scheme is fixed per scooter:

- **SO4:** plain text up to firmware 5.1, **AES-128-ECB** from firmware 5.2 (the version is read
  from the telemetry).
- **SO2, SO5 Pro, SoOne, SO4 Pro / GT / Max:** always AES-128-ECB.
- **SO6 and SO4 UL:** always AES-128-ECB, in both directions, with a different static key.
- **SO3:** no encryption at all, but a rolling secret byte in the frame.

The self-test for the built-in AES runs on load and is written to the diagnostic log.

## Browser support

- **iOS:** the **Bluefy** browser. Safari and every other iOS browser run on the Safari engine,
  which has no Web Bluetooth at all.
- **Android or desktop:** **Chrome** or another Chromium browser. Web Bluetooth is built in.

There is no OTA firmware flashing here and no LED control; the SoFlow app does not do firmware
updates over Bluetooth either.

## Project structure

```
index.html                - the single page: cards, dialogs, the model dropdown
app.js                    - all logic: AES-128-ECB, frame builders, the model registry,
                            connect, decode, UI and the diagnostic log
i18n.js                   - the German and English string table
styles.css                - theme and layout
PROTOCOL.md               - the reverse-engineered BLE protocol reference
GUIDE.de.md, GUIDE.en.md  - the step-by-step guide
tools/soflow_speed.py     - a Python (bleak) reference for the frame and AES
scripts/                  - check-i18n.js and security-scan.py (run in CI and the git hooks)
.github/workflows/        - CI (JS lint plus security scan) and CodeQL
.githooks/                - pre-commit and pre-push checks
```

## How it works

- The user picks a model. The `PROTOCOLS` table in `app.js` maps each model to a family (`D7`,
  `SO3` or `SO6`), a transport (Nordic UART, KingMeter or the SO6 service), a crypto policy and an
  opcode set.
- Commands are built per family and written to the write characteristic. Notifications are decoded
  per family; the SO6 family decrypts them first.
- Encryption is automatic per model. The two static AES keys live in `app.js`.
- The full byte-level protocol for every model is in `PROTOCOL.md`.

## Development

No build step and no dependencies. Edit the files and reload the page. Serve locally, Web Bluetooth
needs `https` or `localhost`:

```
python -m http.server 8000
```

Run the same checks as the CI and the hooks:

```
node scripts/check-i18n.js
python scripts/security-scan.py
```

Enable the git hooks with `git config core.hooksPath .githooks`. New user-facing strings go into
both languages in `i18n.js`; `check-i18n.js` fails on a missing or unused key.

## Reporting

Found a problem or want to confirm what works on a real scooter? Send a DM to
[Laufbursche on escooter-stammtisch](https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/)
or open a [GitHub issue](https://github.com/Laufbursche42/sf-unlock/issues). The copy button under
the log gives you the full diagnostic transcript to paste in.

## Legal

Raising the maximum speed lifts the factory limit. The operating permit (Betriebserlaubnis, ABE) is
then void and riding the scooter in public traffic is no longer allowed. Use it on your own vehicle
only. Everything you do with this page is at your own risk.

## License

PolyForm Noncommercial 1.0.0 with two additional terms, in full in [LICENSE.md](LICENSE.md).

## Privacy

Nothing leaves your device but the page load itself. The details are in [PRIVACY.md](PRIVACY.md).

## Trademarks

An independent project, not affiliated with SoFlow. "SoFlow" and the model names are trademarks of
their respective owners and are used here only to say which scooters this page works with. See
[TRADEMARKS.md](TRADEMARKS.md).
