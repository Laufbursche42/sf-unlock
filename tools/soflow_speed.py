#!/usr/bin/env python3
"""
SOFLOW SO4 - BLE Speed Tester (Python/bleak Variante)

Sendet das per Reverse Engineering ermittelte Max-Speed-Kommando über den
Nordic-UART-Service. Nur am eigenen Fahrzeug auf privatem Gelände. Nutzung auf eigenes Risiko.

Installation:
    pip install bleak

Beispiele:
    python soflow_speed.py --scan
    python soflow_speed.py --address <MAC-oder-UUID> --speed 25
    python soflow_speed.py --address <...> --speed 25 --encrypt
    python soflow_speed.py --address <...> --raw A9:00FA
"""

import argparse
import asyncio

NUS = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  # App -> Gerät (write)
NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  # Gerät -> App (notify)

DEFAULT_KEY_HEX = "30572F52364B3F473050415811632D2B"  # So4 V52 Kommandoschlüssel


# ---------- Frame-Bau ----------
def build_plain_frame(opcode, payload):
    body = [(len(payload) + 5) & 0xFF, opcode & 0xFF, 0x00] + [b & 0xFF for b in payload]
    chk = sum(body) & 0xFF
    return bytes([0xD7] + body + [chk])


def speed_payload(kmh):
    v = int(round(kmh * 10))
    return [(v >> 8) & 0xFF, v & 0xFF]


# ---------- AES-128-ECB (nur Verschlüsselung, Zero-Padding) ----------
def _gmul(a, b):
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi = a & 0x80
        a = (a << 1) & 0xFF
        if hi:
            a ^= 0x1B
        b >>= 1
    return p


def _build_sbox():
    inv = [0] * 256
    for i in range(1, 256):
        for j in range(1, 256):
            if _gmul(i, j) == 1:
                inv[i] = j
                break
    sbox = [0] * 256
    for i in range(256):
        b = inv[i]
        sbox[i] = (b ^ ((b << 1) | (b >> 7)) & 0xFF ^ ((b << 2) | (b >> 6)) & 0xFF
                   ^ ((b << 3) | (b >> 5)) & 0xFF ^ ((b << 4) | (b >> 4)) & 0xFF ^ 0x63) & 0xFF
    return sbox


_SBOX = _build_sbox()


def _key_expansion(key):
    w = [list(key[4 * i:4 * i + 4]) for i in range(4)]
    rcon = 1
    for i in range(4, 44):
        t = list(w[i - 1])
        if i % 4 == 0:
            t = [_SBOX[t[1]], _SBOX[t[2]], _SBOX[t[3]], _SBOX[t[0]]]
            t[0] ^= rcon
            rcon = _gmul(rcon, 2)
        w.append([w[i - 4][j] ^ t[j] for j in range(4)])
    return w


def _encrypt_block(inp, w):
    s = list(inp)

    def ark(r):
        for c in range(4):
            for row in range(4):
                s[c * 4 + row] ^= w[r * 4 + c][row]

    def sub():
        for i in range(16):
            s[i] = _SBOX[s[i]]

    def shift():
        o = list(s)
        for c in range(4):
            for row in range(4):
                s[c * 4 + row] = o[((c + row) % 4) * 4 + row]

    def mix():
        for c in range(4):
            s0, s1, s2, s3 = s[c * 4], s[c * 4 + 1], s[c * 4 + 2], s[c * 4 + 3]
            s[c * 4] = _gmul(s0, 2) ^ _gmul(s1, 3) ^ s2 ^ s3
            s[c * 4 + 1] = s0 ^ _gmul(s1, 2) ^ _gmul(s2, 3) ^ s3
            s[c * 4 + 2] = s0 ^ s1 ^ _gmul(s2, 2) ^ _gmul(s3, 3)
            s[c * 4 + 3] = _gmul(s0, 3) ^ s1 ^ s2 ^ _gmul(s3, 2)

    ark(0)
    for r in range(1, 10):
        sub(); shift(); mix(); ark(r)
    sub(); shift(); ark(10)
    return bytes(s)


def aes_ecb_encrypt(data, key):
    w = _key_expansion(key)
    pad = (16 - (len(data) % 16)) % 16
    buf = bytes(data) + bytes(pad)
    out = b""
    for off in range(0, len(buf), 16):
        out += _encrypt_block(buf[off:off + 16], w)
    return out


def frame_to_send(opcode, payload, encrypt, key_hex):
    plain = build_plain_frame(opcode, payload)
    if not encrypt:
        return plain, plain
    key = bytes.fromhex(key_hex)
    if len(key) != 16:
        raise ValueError("Schlüssel muss genau 16 Byte sein")
    return aes_ecb_encrypt(plain, key), plain


def hexstr(b):
    return " ".join(f"{x:02X}" for x in b)


# ---------- Selbsttest ----------
def _selftest():
    # FIPS-197 Blockvektor: sichert die AES-Implementierung ab.
    k = bytes(range(16))
    p = bytes([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
               0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF])
    fips = _encrypt_block(p, _key_expansion(k)).hex() == "69c4e0d86a7b0430d8cdb78070b4c55a"
    # Verifizierter SO4-Vektor: 20 km/h Klartext-Frame, mit SO4-Schlüssel verschlüsselt.
    cipher, _ = frame_to_send(0xA9, speed_payload(20), True, DEFAULT_KEY_HEX)
    so4 = hexstr(cipher) == "69 57 0A C6 1E 3B 0F 01 9A BF C5 D6 BF AC 0A 7E"
    return fips and so4


# ---------- BLE ----------
async def do_scan():
    from bleak import BleakScanner
    print("Scanne 8 Sekunden ...")
    devices = await BleakScanner.discover(timeout=8.0)
    for d in devices:
        print(f"  {d.address}  {d.name or '(ohne Namen)'}")


async def do_send(address, frame):
    from bleak import BleakClient

    def on_notify(_handle, data):
        print("RX  " + hexstr(data))

    async with BleakClient(address) as client:
        print("Verbunden:", client.is_connected)
        try:
            await client.start_notify(NUS_TX, on_notify)
        except Exception as e:
            print("Notify nicht möglich:", e)
        print("TX  " + hexstr(frame))
        await client.write_gatt_char(NUS_RX, frame, response=False)
        print("Gesendet. Warte 3 Sekunden auf Antwort ...")
        await asyncio.sleep(3.0)


def main():
    ap = argparse.ArgumentParser(description="SOFLOW SO4 BLE Speed Tester")
    ap.add_argument("--scan", action="store_true", help="BLE-Geräte auflisten")
    ap.add_argument("--address", help="MAC (Windows/Linux) oder UUID (macOS) des Scooters")
    ap.add_argument("--speed", type=float, help="Ziel-km/h für Opcode 0xA9")
    ap.add_argument("--mode", type=int, choices=[0, 1, 2], help="Fahrmodus setzen (eco0 normal1 sport2)")
    ap.add_argument("--raw", help="Rohkommando OPCODE:PAYLOADHEX, z. B. A9:00FA")
    ap.add_argument("--encrypt", action="store_true", help="AES-128-ECB (Firmware ab 5.2)")
    ap.add_argument("--key", default=DEFAULT_KEY_HEX, help="AES-Schlüssel als Hex (16 Byte)")
    args = ap.parse_args()

    if not _selftest():
        print("WARNUNG: AES-Selbsttest fehlgeschlagen. Verschlüsselung nicht nutzen.")

    if args.scan:
        asyncio.run(do_scan())
        return

    if not args.address:
        ap.error("--address wird gebraucht (oder --scan)")

    if args.raw:
        op_s, _, pl_s = args.raw.partition(":")
        opcode = int(op_s, 16)
        payload = list(bytes.fromhex(pl_s)) if pl_s else []
    elif args.speed is not None:
        opcode, payload = 0xA9, speed_payload(args.speed)
    elif args.mode is not None:
        opcode, payload = 0xA3, [args.mode]
    else:
        ap.error("Nichts zu senden. Nutze --speed, --mode oder --raw.")

    frame, plain = frame_to_send(opcode, payload, args.encrypt, args.key)
    print("Klartext-Frame:", hexstr(plain))
    if args.encrypt:
        print("Verschlüsselt: ", hexstr(frame))
    asyncio.run(do_send(args.address, frame))


if __name__ == "__main__":
    main()
