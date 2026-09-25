# Guide: Laufbursche SoFlow unlock

> **Feasibility study.** This tool shows what the Bluetooth protocol of the SoFlow scooters makes
> possible. It is not a finished product. Error-free operation is not promised and there is no
> warranty. Whatever you do with it, you do at your own risk and on your own vehicle only.

## 1. What you need

Everything happens in the browser over Web Bluetooth: pick the model, connect, set the speed, switch
the ride mode, lock and unlock the vehicle. There is nothing to install. You need:

**A browser that supports Web Bluetooth.**

- **iOS:** the **Bluefy** browser (free on the App Store). Safari and every other iOS browser run on
  the Safari engine, which has no Web Bluetooth at all.
- **Android or desktop:** **Chrome** or another Chromium browser. Web Bluetooth is built in.

**A SoFlow scooter.** Supported are all scooters the manufacturer app knows: SO1, SO2 Air, SO2 Air
2nd gen, SO2 Zero, SO2 Grover, SO2+ Grover, SO3, SO4, SO4 UL, SO4 Pro GT, SO4 Pro Core2, SO4 Pro Max,
SO5, SO5 Pro, SO6, SO One, SO One+, SO One Pro, SO One Lite, SO One Lite Pro, SO One Prime, SO One
Prime Max, SO myTIER and SO X. Not every model can do everything over Bluetooth. Most importantly,
**SO6 and SO4 UL have no BLE speed command**, so the speed cannot be set through this page for those.
An SO4 on old firmware (version 4.x) also has no speed command.

---

## 2. Auto detect or pick your model

The easiest option in the model dropdown at the top is **Auto detect**. The page then scans all
SoFlow scooters nearby and sets the protocol, transport and encryption itself from the advertised
device name, exactly like the manufacturer app. You do not need to know your model.

If you prefer, pick your model straight from the list. Every marketing name is there, from SO4 to
SO One Prime Max. The page then only shows the controls your model actually supports. Even with a
manual pick the device name decides the protocol in the end, so a wrong choice is corrected
automatically.

---

## 3. Connect

1. Open the page in Bluefy or Chrome.
2. Turn the scooter on. Keep it a few meters next to the phone.
3. Tap **Connect** and choose your scooter in the browser chooser. With auto detect every SoFlow
   scooter shows up (the name starts with SFS or QINGZ); with a manual pick only your model's devices do.
4. Watch the status top right: `connecting`, then `linking`, then `connected`.

**Android: Location must be on.** On Android, Chrome only scans for Bluetooth when Location services
(GPS) are on and Chrome has the Location or Nearby-devices permission. Otherwise the device list stays
completely empty even though the scooter is right there. Also close the SoFlow app fully first (swipe
it away), otherwise it holds the connection and the scooter no longer advertises for the browser to
see. If in doubt, power the scooter off and on again right before you scan.

The page then asks for the live data once and reads the firmware version from it, among other
things. The very first connect always needs the browser chooser. That is a browser security rule no
shortcut can skip.

---

## 4. Set the maximum speed

Only on models with a BLE speed command (so not SO6 and not SO4 UL). The **Tuning and lock** card has
two values, **Open** and **eKFV**, and two buttons:

- **Limiter on** writes the eKFV value (default 22 km/h) as the top speed. Lowering to a legal value is
  deterministic, so this button is **enabled**.
- **Limiter off** (raising above the factory value) is deliberately **greyed out**. The reason sits right
  under the button: whether the controller actually rides a value raised via 0xA9, or clamps it in
  firmware, cannot be proven from the app alone (security report, finding F3). The scooter does
  acknowledge the command (the log shows "confirmed"), but "confirmed" means accepted, not ridden. So
  raising stays disabled until it is proven on a vehicle, to avoid claiming something that is not shown.

On a first tester's scooter an SO4 did ride a raised value (30 km/h set, 30 km/h reached); for every
other model it is open. If you want to check on your own vehicle on private ground, watch the **Speed**
tile at full throttle and report the result with the saved log (section 12): model, firmware, the value
you set and the live speed you reached.

---

## 5. Set the ride mode

Tap **eco**, **normal** or **sport** directly in the **Tuning and lock** card. That switches the ride
level. On the SO3 the mode mapping is unconfirmed per the report (a note sits under the buttons). **SO6
and SO4 UL** have no ride-mode command, so the buttons are greyed out there.

---

## 6. Lock and unlock the vehicle

This is the **anti-theft immobilizer** of the scooter, NOT the speed. The **Tuning and lock** card has
**Unlock** and **Lock** for it. The exact command depends on the model, and the page picks it
automatically. Locking only works at standstill; the page refuses to lock while moving, and asks for
confirmation before locking.

On **SO6 and SO4 UL** both buttons are greyed out: their lock and unlock frames need an undocumented
session token from the handshake, which is not statically proven.

---

## 7. Unlock the battery lock

This releases the lock on the removable battery (anti-theft); it has nothing to do with speed. The
button is enabled only for models that actually have the command: SO5 Pro, SO2 Air 2nd gen, SO2 Zero,
SO2 Grover, SO2+ Grover and every SO One variant. On the SO4 and SO myTIER only from firmware 5.2, so
the button becomes active there only once the page has detected that firmware after connecting. The SO X
has it right away, since it is locked to protocol V52. On SO1, SO2 Air (first gen), SO3, SO5, SO6 and
SO4 UL the button is greyed out with the reason. The page asks for confirmation before sending.

---

## 8. More settings

The **Tuning and lock** card has comfort toggles at the bottom. Every row stays visible; a setting your
model cannot do is greyed out with the reason:

- **Headlight** on or off.
- **Dark mode** of the display on or off.
- **Zero-start** (start by kick first or straight from the throttle) on or off.
- **Indicator light** (the BLE status light), SO4 path only (not on SO4 V51).
- **Unit** switch between km/h and mph.

These are pure comfort settings and have nothing to do with speed. Headlight, dark mode and zero-start
are on the So5-class models (SO2, SO5 Pro, SO One), the unit on those and on the SO3, the indicator light
only on the SO4 path (SO4, SO myTIER, SO X). The page deliberately does not change the Bluetooth name: a
renamed scooter drops out of the official app.

---

## 9. Read live values

Once data arrives, the tiles fill in (ride mode, max speed, firmware) and the log shows the decoded
values plus the raw bytes as hex. The notification format is only partly decoded for some models, so
a value may stay a dash. The raw data is always in the log.

Every command sent also waits for the scooter's echo; the log then shows `confirmed` or
`no confirmation`. An echo only means the scooter accepted the command, not that it will ride the
value.

---

## 10. Encryption

The page decides automatically whether to encrypt, there is no switch. It follows the model and, for
the SO4, its firmware:

- **SO4:** plain text up to firmware 5.1, AES-128-ECB from 5.2. The version is read from the live
  data.
- **SO2, SO5 Pro, SO One (Lite/Plus/Pro):** always AES-128-ECB.
- **SO6 and SO4 UL:** always AES-128-ECB in both directions, with a different static key.
- **SO3:** no encryption, but a rolling secret byte in the frame.

The active encryption is shown up top next to the connection. The AES self-test runs on load and
goes into the log.

---

## 11. Shortcuts (speed)

For daily use you can add home-screen shortcuts: one sets the speed to 22 km/h, the other to the last
value you set. Opening it reconnects to the last scooter and sets the value. This works only on
models with a BLE speed command.

---

## 12. Test cleanly and report

Test on your own device on private ground only. The log at the bottom is a full transcript (model,
firmware, every byte sent and received), newest line at the bottom with autoscroll. **Anonymize log** is
on by default and redacts the device id, MAC, keys and long hex runs so the transcript is safe to share;
**Diagnostic log** additionally taps every raw channel (for troubleshooting only). **Copy log**, **Clear
log** and **Save as .txt** all emit the (anonymized) transcript.

Report problems or successes: by DM to
[Laufbursche on escooter-stammtisch](https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/)
or as a [GitHub issue](https://github.com/Laufbursche42/sf-unlock/issues). Attach the copied log so
it is clear what was sent and received.

---

## 13. Limits worth knowing

- **SO6 and SO4 UL** have no BLE speed command. The speed cannot be set through this page for them, and
  lock/unlock stays greyed out there too (undocumented session token).
- That the controller rides a value above the factory limit is confirmed in the field on one SO4
  (30 set, 30 ridden); confirmation on the other models is still open, which is why **Limiter off**
  (raising) is greyed out. The protocol itself comes from static analysis of the app.
- There is no advanced expert/register write surface: the app's admin area uses the same commands. There
  is no firmware flashing and no LED control; the SoFlow app does not do firmware updates over Bluetooth.

---

## 14. Legal

Raising the maximum speed lifts the factory limit. The type approval (ABE) is then void and riding on
public roads is no longer allowed. Use it on your own vehicle and at your own risk only.
