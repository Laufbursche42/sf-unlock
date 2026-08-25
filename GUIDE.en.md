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

**A SoFlow scooter.** Supported are SO4, SO4 Pro, SO4 Pro GT, SO4 Pro Max, SO4 UL, SO2 Air2, SO2
Grover, SO2 Zero, SO3, SO5 Pro, SO6 and SoOne Lite, SoOne Plus, SoOne Pro. Not every model can do
everything over Bluetooth. Most importantly, **SO6 and SO4 UL have no BLE speed command**, so the
speed cannot be set through this page for those two.

---

## 2. Pick your model

The first step is always the model dropdown at the top. The protocol differs per family, and the
page needs the right choice to use the correct scan name, transport, frame format and encryption.
Pick your model before you connect. The page then only shows the controls your model actually
supports.

---

## 3. Connect

1. Open the page in Bluefy or Chrome.
2. Turn the scooter on. Keep it a few meters next to the phone.
3. Tap **Connect** and choose your scooter in the browser chooser. Only devices whose name matches
   the selected model show up in that list.
4. Watch the status top right: `connecting`, then `linking`, then `connected`.

The page then asks for the live data once and reads the firmware version from it, among other
things. The very first connect always needs the browser chooser. That is a browser security rule no
shortcut can skip.

---

## 4. Set and test the maximum speed

Only on models with a BLE speed command (so not SO6 and not SO4 UL).

1. Enter the value in km/h in the **Settings** card.
2. Tap **Set**. The page sends the value to the scooter.

The page itself has no upper limit. Whether the controller actually rides a raised value or caps it
on its own is the open question this test is meant to clarify.

**How to test whether the scooter really rides the value:**

1. Find a safe, open spot on private ground, no traffic. Helmet on.
2. Ride at full throttle briefly and note the km/h at which the scooter caps. That is your baseline.
3. Set a value slightly above it, for example 2 to 3 km/h more, and tap **Set**.
4. Ride full throttle again and watch the **Speed** tile. Does it climb past the previous cap? Then
   the controller accepts the value.
5. Repeat in small steps. The value at which it stops going higher is the firmware's hard cap.
6. A high number does not make the scooter faster than the motor and battery allow. It only shows
   whether the controller accepts it.

Report your result with the copied log (section 11): model, firmware, the value you set and the live
speed you reached.

---

## 5. Set the ride mode

Choose eco, normal or sport and tap **Set**. That switches the ride level.

---

## 6. Lock and unlock the vehicle

This is the **anti-theft immobilizer** of the scooter, NOT the speed. Unlock releases the scooter,
lock immobilizes it. The exact command depends on the model, and the page picks it automatically.

---

## 7. Unlock the battery lock

Only on the D7 models (SO4, SO4 Pro/GT/Max, SO2, SO5 Pro, SoOne). This is the lock on the removable
battery (anti-theft), not the speed. SO3, SO6 and SO4 UL do not have this command, so the card does
not appear there.

---

## 8. Read live values

Once data arrives, the tiles fill in (ride mode, max speed, firmware) and the log shows the decoded
values plus the raw bytes as hex. The notification format is only partly decoded for some models, so
a value may stay a dash. The raw data is always in the log.

---

## 9. Encryption

The page decides automatically whether to encrypt, there is no switch. It follows the model and, for
the SO4, its firmware:

- **SO4:** plain text up to firmware 5.1, AES-128-ECB from 5.2. The version is read from the live
  data.
- **SO2, SO5 Pro, SoOne, SO4 Pro/GT/Max:** always AES-128-ECB.
- **SO6 and SO4 UL:** always AES-128-ECB in both directions, with a different static key.
- **SO3:** no encryption, but a rolling secret byte in the frame.

The active encryption is shown up top next to the connection. The AES self-test runs on load and
goes into the log.

---

## 10. Shortcuts (speed)

For daily use you can add home-screen shortcuts: one sets the speed to 22 km/h, the other to the last
value you set. Opening it reconnects to the last scooter and sets the value. This works only on
models with a BLE speed command.

---

## 11. Test cleanly and report

Test on your own device on private ground only. The log at the bottom is a full transcript (model,
firmware, every byte sent and received). **Copy log** gives you the whole transcript as text.

Report problems or successes: by DM to
[Laufbursche on escooter-stammtisch](https://www.escooter-stammtisch.de/index.php?user/6497-laufbursche/)
or as a [GitHub issue](https://github.com/Laufbursche42/sf-unlock/issues). Attach the copied log so
it is clear what was sent and received.

---

## 12. Limits worth knowing

- **SO6 and SO4 UL** have no BLE speed command. The speed cannot be set through this page for them.
- Whether the controller rides a value above the factory limit is not confirmed. Everything here
  comes from static analysis of the app, not from the vehicle.
- There is no firmware flashing and no LED control. The SoFlow app does not do firmware updates over
  Bluetooth.

---

## 13. Legal

Raising the maximum speed lifts the factory limit. The type approval (ABE) is then void and riding on
public roads is no longer allowed. Use it on your own vehicle and at your own risk only.
