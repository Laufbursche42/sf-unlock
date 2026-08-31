// Laufbursche SoFlow Tool: a model-dynamic Web Bluetooth client for the SoFlow BLE protocols.
// Copyright (c) 2026 Laufbursche (https://github.com/Laufbursche42)
// The user picks a model; the page then uses the matching BLE protocol family:
//   - D7 family (one-byte opcodes): SO4, SO5 Pro, SO2, SO One (Lite/Plus/Pro).
//   - SO3 family: like D7 but byte 3 is a rolling secret and there is no encryption.
//   - SO6 family (two-byte commands, whole frame AES): SO6, SO4 UL (no BLE speed command).
//
// Everything about the protocols is from static analysis of the SoFlow app (com.soflowapp 3.8.5)
// via a Blutter disassembly, not verified on a vehicle. Runs in a Web Bluetooth browser: Bluefy on
// iOS, Chrome on Android/desktop. Safari has no Web Bluetooth.

'use strict';

const BUILD = 'v30';   // logged on load so a tester's log reveals which deployed build is running

// --------------------------- AES-128-ECB (encrypt + decrypt, zero padding) ---------------------------
// S-box and round keys are computed at run time so a typo cannot slip into a constant table.
// Web Crypto SubtleCrypto has no ECB mode, so this is a small self-contained implementation.

function gmul(a, b) {
  let p = 0;
  for (let i = 0; i < 8; i++) {
    if (b & 1) p ^= a;
    const hi = a & 0x80; a = (a << 1) & 0xff; if (hi) a ^= 0x1b; b >>= 1;
  }
  return p;
}
const AES_INV = new Uint8Array(256);
for (let i = 1; i < 256; i++) { for (let j = 1; j < 256; j++) { if (gmul(i, j) === 1) { AES_INV[i] = j; break; } } }
function rotl8(x, s) { return ((x << s) | (x >> (8 - s))) & 0xff; }
const AES_SBOX = new Uint8Array(256);
for (let i = 0; i < 256; i++) { const b = AES_INV[i]; AES_SBOX[i] = (b ^ rotl8(b, 1) ^ rotl8(b, 2) ^ rotl8(b, 3) ^ rotl8(b, 4) ^ 0x63) & 0xff; }
const AES_INV_SBOX = new Uint8Array(256);
for (let i = 0; i < 256; i++) AES_INV_SBOX[AES_SBOX[i]] = i;
function aesKeyExpansion(key) {
  const w = new Array(44);
  for (let i = 0; i < 4; i++) w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
  let rcon = 1;
  for (let i = 4; i < 44; i++) {
    let tmp = w[i - 1].slice();
    if (i % 4 === 0) { tmp = [tmp[1], tmp[2], tmp[3], tmp[0]].map(x => AES_SBOX[x]); tmp[0] ^= rcon; rcon = gmul(rcon, 2); }
    w[i] = w[i - 4].map((x, j) => x ^ tmp[j]);
  }
  return w;
}
function aesEncryptBlock(inp, w) {
  const s = new Uint8Array(16); for (let i = 0; i < 16; i++) s[i] = inp[i];
  const ark = r => { for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) s[c * 4 + row] ^= w[r * 4 + c][row]; };
  const sub = () => { for (let i = 0; i < 16; i++) s[i] = AES_SBOX[s[i]]; };
  const shift = () => { const o = s.slice(); for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) s[c * 4 + row] = o[((c + row) % 4) * 4 + row]; };
  const mix = () => { for (let c = 0; c < 4; c++) { const s0 = s[c * 4], s1 = s[c * 4 + 1], s2 = s[c * 4 + 2], s3 = s[c * 4 + 3];
    s[c * 4] = gmul(s0, 2) ^ gmul(s1, 3) ^ s2 ^ s3; s[c * 4 + 1] = s0 ^ gmul(s1, 2) ^ gmul(s2, 3) ^ s3;
    s[c * 4 + 2] = s0 ^ s1 ^ gmul(s2, 2) ^ gmul(s3, 3); s[c * 4 + 3] = gmul(s0, 3) ^ s1 ^ s2 ^ gmul(s3, 2); } };
  ark(0);
  for (let r = 1; r < 10; r++) { sub(); shift(); mix(); ark(r); }
  sub(); shift(); ark(10);
  return s;
}
function aesDecryptBlock(inp, w) {
  const s = new Uint8Array(16); for (let i = 0; i < 16; i++) s[i] = inp[i];
  const ark = r => { for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) s[c * 4 + row] ^= w[r * 4 + c][row]; };
  const invsub = () => { for (let i = 0; i < 16; i++) s[i] = AES_INV_SBOX[s[i]]; };
  const invshift = () => { const o = s.slice(); for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) s[c * 4 + row] = o[((c - row + 4) % 4) * 4 + row]; };
  const invmix = () => { for (let c = 0; c < 4; c++) { const s0 = s[c * 4], s1 = s[c * 4 + 1], s2 = s[c * 4 + 2], s3 = s[c * 4 + 3];
    s[c * 4] = gmul(s0, 14) ^ gmul(s1, 11) ^ gmul(s2, 13) ^ gmul(s3, 9); s[c * 4 + 1] = gmul(s0, 9) ^ gmul(s1, 14) ^ gmul(s2, 11) ^ gmul(s3, 13);
    s[c * 4 + 2] = gmul(s0, 13) ^ gmul(s1, 9) ^ gmul(s2, 14) ^ gmul(s3, 11); s[c * 4 + 3] = gmul(s0, 11) ^ gmul(s1, 13) ^ gmul(s2, 9) ^ gmul(s3, 14); } };
  ark(10);
  for (let r = 9; r >= 1; r--) { invshift(); invsub(); ark(r); invmix(); }
  invshift(); invsub(); ark(0);
  return s;
}
function aesEcbEncrypt(data, key) {
  const w = aesKeyExpansion(key);
  const pad = (16 - (data.length % 16)) % 16;
  const buf = new Uint8Array(data.length + pad);   // zero padding, like the app
  buf.set(data);
  const out = new Uint8Array(buf.length);
  for (let off = 0; off < buf.length; off += 16) out.set(aesEncryptBlock(buf.subarray(off, off + 16), w), off);
  return out;
}
function aesEcbDecrypt(data, key) {
  const w = aesKeyExpansion(key);
  const n = data.length - (data.length % 16);   // only whole 16-byte blocks
  const out = new Uint8Array(n);
  for (let off = 0; off + 16 <= data.length; off += 16) out.set(aesDecryptBlock(data.subarray(off, off + 16), w), off);
  return out;
}

// The two static command keys, hard-coded in the app. They differ only in the first byte.
const KEY_30 = '30572F52364B3F473050415811632D2B';   // D7 family (SO4 V52, SO5 Pro, SO2, SO One)
const KEY_20 = '20572F52364B3F473050415811632D2B';   // SO6 family (SO6, SO4 UL), both directions

// Self-tests: FIPS-197 block vector (encrypt + decrypt), the verified SO4 20 km/h frame vector for
// both keys, and an encrypt/decrypt round-trip for both keys. All must pass or crypto is not trusted.
let AES_OK = false;
(function aesSelfTest() {
  const k = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const p = [0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff];
  const w = aesKeyExpansion(k);
  const fips = [...aesEncryptBlock(p, w)].map(x => x.toString(16).padStart(2, '0')).join('');
  const fipsOk = fips === '69c4e0d86a7b0430d8cdb78070b4c55a';
  const fipsDec = [...aesDecryptBlock(hexToBytes('69c4e0d86a7b0430d8cdb78070b4c55a'), w)].map(x => x.toString(16).padStart(2, '0')).join('');
  const fipsDecOk = fipsDec === '00112233445566778899aabbccddeeff';
  // Verified SO4 vector: plaintext frame for 20 km/h, zero-padded to 16, AES-128-ECB.
  const plain20 = buildFrame(0xA9, speedPayload(20));   // D7 07 A9 00 00 C8 78
  const enc30 = bytesToHex(aesEcbEncrypt(plain20, hexToBytes(KEY_30)));
  const enc20 = bytesToHex(aesEcbEncrypt(plain20, hexToBytes(KEY_20)));
  const ok30 = enc30 === '69 57 0A C6 1E 3B 0F 01 9A BF C5 D6 BF AC 0A 7E';
  const ok20 = enc20 === 'CD EF A3 3F 97 25 C3 24 57 EC F4 80 C5 35 A2 8A';
  const rt30 = bytesToHex(aesEcbDecrypt(aesEcbEncrypt(plain20, hexToBytes(KEY_30)), hexToBytes(KEY_30))).startsWith('D7 07 A9 00 00 C8 78');
  const rt20 = bytesToHex(aesEcbDecrypt(aesEcbEncrypt(plain20, hexToBytes(KEY_20)), hexToBytes(KEY_20))).startsWith('D7 07 A9 00 00 C8 78');
  AES_OK = fipsOk && fipsDecOk && ok30 && ok20 && rt30 && rt20;
})();

// --------------------------- frame builders ---------------------------

function hexToBytes(h) { h = (h || '').replace(/[^0-9a-fA-F]/g, ''); const a = []; for (let i = 0; i + 1 < h.length; i += 2) a.push(parseInt(h.substr(i, 2), 16)); return a; }
function bytesToHex(b) { return [...b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join(' '); }

// D7 / SO3 frame = [0xD7][LEN][OPCODE][BYTE3][PAYLOAD...][CHECKSUM]. LEN = payload.length + 5.
// BYTE3 is a fixed 0x00 for the D7 family, or the rolling secret for the SO3 family.
// CHECKSUM = sum of bytes from LEN to the last payload byte, mod 256. The 0xD7 start byte is NOT
// part of the checksum. No CRC, only an additive 8-bit sum.
function buildFrameD7(opcode, payload, byte3) {
  const b3 = (byte3 == null ? 0x00 : byte3) & 0xff;
  const body = [(payload.length + 5) & 0xff, opcode & 0xff, b3, ...payload.map(x => x & 0xff)];
  let sum = 0; for (const b of body) sum = (sum + b) & 0xff;
  return new Uint8Array([0xD7, ...body, sum]);
}
// Convenience alias used by the self-test and preview: a plain D7 frame with byte 3 = 0x00.
function buildFrame(opcode, payload) { return buildFrameD7(opcode, payload, 0x00); }

// SO6 frame = [GROUP][SUBCODE][PAYLOAD_LEN][PAYLOAD...]. No start byte, no checksum. The whole frame
// is AES-128-ECB encrypted afterwards.
function buildFrameSO6(group, sub, payload) {
  return new Uint8Array([group & 0xff, sub & 0xff, payload.length & 0xff, ...payload.map(x => x & 0xff)]);
}
function speedPayload(kmh) { const v = Math.round(kmh * 10); return [(v >> 8) & 0xff, v & 0xff]; }

// SO3 rolling secret: recomputed from three bytes of every received 0x1D frame (b3, b15, b16).
// Belegt from So3DataDelegate::_calculateSecret. Result is a 7-bit value.
function so3CalcSecret(b3, b15, b16) {
  let t = (b15 ^ b3) ^ (b16 ^ b3);
  t = (((t + 0xCE) & 0xff) ^ 0xB2) & 0xff;
  t = (((t + 0xA5) & 0xff) ^ 0xCA) & 0xff;
  t = (((t + (b3 & 0x0F)) & 0xff) ^ 0x2B) & 0xff;
  t = (((t + 0x33) & 0xff) ^ 0x1D) & 0xff;
  return t & 0x7F;
}

// --------------------------- BLE transport constants ---------------------------

const TRANSPORTS = {
  nordic:    { name: 'Nordic UART', service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', write: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', notify: '6e400003-b5a3-f393-e0a9-e50e24dcca9e' },
  kingmeter: { name: 'KingMeter',   service: '43480001-f001-4b49-4e47-204d45544552', write: '43480002-f001-4b49-4e47-204d45544552', notify: '43480003-f001-4b49-4e47-204d45544552' },
  so6:       { name: 'SO6 service', service: '60000001-0000-1000-8000-00805f9b34fb', write: '60000003-0000-1000-8000-00805f9b34fb', notify: '60000002-0000-1000-8000-00805f9b34fb' },   // SO6 reverses write/notify vs Nordic/KingMeter
};
const ALL_SERVICES = [TRANSPORTS.nordic.service, TRANSPORTS.kingmeter.service, TRANSPORTS.so6.service];
const TRANSPORT_ORDER = ['nordic', 'kingmeter', 'so6'];

// --------------------------- crypto policies ---------------------------
// mode 'fw52'   -> encrypt only when firmware >= 5.2 is known (SO4).
// mode 'always' -> always encrypt outgoing (all other D7 models, SO6 family).
// mode 'never'  -> no encryption at all (SO3).
// decryptIncoming -> notifications are AES-encrypted too and must be decrypted first (SO6 family).
const CRYPTO_FW52     = { mode: 'fw52',   key: KEY_30, decryptIncoming: false };
const CRYPTO_ALWAYS30 = { mode: 'always', key: KEY_30, decryptIncoming: false };
const CRYPTO_ALWAYS20 = { mode: 'always', key: KEY_20, decryptIncoming: true };
const CRYPTO_NONE     = { mode: 'never',  key: null,   decryptIncoming: false };

// --------------------------- model register ---------------------------
// family: 'D7' | 'SO3' | 'SO6'. variant (D7 only): 'so4' | 'so5base'. so4ver forces a fixed SO4
// command set ('v52' for the SO X, which always runs the newest protocol). so6pin: SO6 unlock carries
// the 6-byte PIN payload (default 000000).
// The scan prefixes, transport and crypto are exactly the app's VehicleType._fromName plus the
// DataDelegate.of routing (belegt from the disassembly). Several marketing models share a data path:
// SO1 / SO2 Air (1st gen) / SO5 run the SO3 path; SO myTIER runs the SO4 path; SO X runs the SO4 path
// locked to protocol V52.
const PROTOCOLS = {
  so4:           { name: 'SO4',             family: 'D7',  variant: 'so4',     prefixes: ['SFSO4', 'SFS4'],                                              transport: 'nordic',    crypto: CRYPTO_FW52,     speed: true },
  somytier:      { name: 'SO myTIER',       family: 'D7',  variant: 'so4',     prefixes: ['SFSOMT'],                                                     transport: 'nordic',    crypto: CRYPTO_FW52,     speed: true },
  sox:           { name: 'SO X',            family: 'D7',  variant: 'so4', so4ver: 'v52', prefixes: ['SFSOX'],                                          transport: 'nordic',    crypto: CRYPTO_ALWAYS30, speed: true },
  so4ul:         { name: 'SO4 UL',          family: 'SO6', variant: null,      prefixes: ['SFSO4UL'],                                                    transport: 'nordic',    crypto: CRYPTO_ALWAYS20, speed: false, so6pin: false },
  so1:           { name: 'SO1',             family: 'SO3', variant: null,      prefixes: ['SFSO1', 'SFSC1', 'SFS1'],                                     transport: 'nordic',    crypto: CRYPTO_NONE,     speed: true },
  so2air:        { name: 'SO2 Air',         family: 'SO3', variant: null,      prefixes: ['SFSO2', 'SFSC2', 'SFS2A', 'SFS22'],                           transport: 'nordic',    crypto: CRYPTO_NONE,     speed: true },
  so2air2:       { name: 'SO2 Air 2nd gen', family: 'D7',  variant: 'so5base', prefixes: ['SFS2K', 'SFS2Z'],                                             transport: 'kingmeter', crypto: CRYPTO_ALWAYS30, speed: true },
  so2zero:       { name: 'SO2 Zero',        family: 'D7',  variant: 'so5base', prefixes: ['SFS2M'],                                                      transport: 'kingmeter', crypto: CRYPTO_ALWAYS30, speed: true },
  so2grover:     { name: 'SO2 Grover',      family: 'D7',  variant: 'so5base', prefixes: ['SFS2K7'],                                                     transport: 'nordic',    crypto: CRYPTO_ALWAYS30, speed: true },
  so2plusgrover: { name: 'SO2+ Grover',     family: 'D7',  variant: 'so5base', prefixes: ['SFS2K1'],                                                     transport: 'nordic',    crypto: CRYPTO_ALWAYS30, speed: true },
  so3:           { name: 'SO3',             family: 'SO3', variant: null,      prefixes: ['SFSO3', 'SFSC3', 'SFS3', 'QINGZ'],                            transport: 'nordic',    crypto: CRYPTO_NONE,     speed: true },
  so5:           { name: 'SO5',             family: 'SO3', variant: null,      prefixes: ['SFSO5', 'SFSC5'],                                             transport: 'nordic',    crypto: CRYPTO_NONE,     speed: true },
  so5pro:        { name: 'SO5 Pro',         family: 'D7',  variant: 'so5base', prefixes: ['SFS5'],                                                       transport: 'nordic',    crypto: CRYPTO_ALWAYS30, speed: true },
  so6:           { name: 'SO6',             family: 'SO6', variant: null,      prefixes: ['SFSO6'],                                                      transport: 'so6',       crypto: CRYPTO_ALWAYS20, speed: false, so6pin: true },
  soone:         { name: 'SO One',          family: 'D7',  variant: 'so5base', prefixes: ['SFSOB'],                                                      transport: 'nordic',    crypto: CRYPTO_ALWAYS30, speed: true },
  sooneplus:     { name: 'SO One+',         family: 'D7',  variant: 'so5base', prefixes: ['SFSOJ', 'SFS4J', 'SFSOL', 'SFSLP', 'SFSMX', 'SFSPE', 'SFSPM'], transport: 'nordic',  crypto: CRYPTO_ALWAYS30, speed: true },
  soonepro:      { name: 'SO One Pro',      family: 'D7',  variant: 'so5base', prefixes: ['SFSOP', 'SFSGT', 'SFSRE'],                                    transport: 'kingmeter', crypto: CRYPTO_ALWAYS30, speed: true },
};
// Branded sub-variants the user recognizes by name (from vehicle_image_utils.dart). They ride on a
// parent protocol but scan for their own prefix so the user finds their exact model in the chooser.
const BRANDED = {
  so4progt:      { label: 'SO4 Pro GT / GT2',  proto: 'soonepro',  prefixes: ['SFSGT'] },
  so4procore2:   { label: 'SO4 Pro Core2',    proto: 'soonepro',  prefixes: ['SFSRE'] },
  so4promax:     { label: 'SO4 Pro Max',      proto: 'sooneplus', prefixes: ['SFSMX'] },
  soonelite:     { label: 'SO One Lite',      proto: 'sooneplus', prefixes: ['SFSOL'] },
  soonelitepro:  { label: 'SO One Lite Pro',  proto: 'sooneplus', prefixes: ['SFSLP'] },
  sooneprime:    { label: 'SO One Prime',     proto: 'sooneplus', prefixes: ['SFSPE'] },
  sooneprimemax: { label: 'SO One Prime Max', proto: 'sooneplus', prefixes: ['SFSPM'] },
};
// Dropdown display order. 'auto' first (recommended): scan broadly and classify by the advertised
// name exactly like the app. Every marketing model the app knows is present.
const MODEL_ORDER = [
  'auto',
  'so4', 'so4ul', 'so4progt', 'so4procore2', 'so4promax',
  'soone', 'sooneplus', 'soonepro', 'soonelite', 'soonelitepro', 'sooneprime', 'sooneprimemax',
  'so1', 'so2air', 'so2air2', 'so2zero', 'so2grover', 'so2plusgrover',
  'so3', 'so5', 'so5pro', 'so6', 'somytier', 'sox',
];
// Resolve a dropdown key to a display definition. 'auto' has no protocol until a device is classified.
function modelDef(key) {
  if (key === 'auto') return { key: 'auto', label: '', proto: null };
  if (BRANDED[key]) return { key, label: BRANDED[key].label, proto: BRANDED[key].proto, prefixes: BRANDED[key].prefixes };
  const p = PROTOCOLS[key];
  return p ? { key, label: p.name, proto: key, prefixes: p.prefixes } : null;
}
// Build a live activeProto object from a dropdown key (base protocol plus the key's own name/prefixes).
function protoFor(key) {
  const d = modelDef(key);
  if (!d || !d.proto) return null;
  const base = PROTOCOLS[d.proto];
  return Object.assign({}, base, { id: key, baseId: d.proto, name: d.label, prefixes: d.prefixes || base.prefixes });
}
// Classify an advertised device name to a base protocol id, 1:1 with VehicleType._fromName (belegt,
// vehicle_type.dart 0x7cb99c, in this exact check order). Returns null for a non-SoFlow name.
function classifyByName(name) {
  if (!name) return null;
  const n = String(name);
  if (/^(SFSO1|SFSC1|SFS1)/.test(n)) return 'so1';
  if (/^SFS2K7/.test(n)) {                                   // serial weiche (belegt: substring(7), >=3000000 -> Grover)
    const serial = parseInt(n.substring(7), 10);
    return (Number.isFinite(serial) && serial >= 3000000) ? 'so2grover' : 'so2air2';
  }
  if (/^SFS2K1/.test(n)) return 'so2plusgrover';
  if (/^(SFS2K|SFS2Z)/.test(n)) return 'so2air2';
  if (/^(SFS2Z|SFS2M)/.test(n)) return 'so2zero';
  if (/^(SFSO2|SFSC2|SFS2A|SFS22)/.test(n)) return 'so2air';
  if (/^(SFSO3|SFSC3|SFS3|QINGZ)/.test(n)) return 'so3';
  if (/^SFSOB/.test(n)) return 'soone';
  if (/^(SFSOJ|SFS4J|SFSOL|SFSLP|SFSMX|SFSPE|SFSPM)/.test(n)) return 'sooneplus';
  if (/^(SFSOP|SFSGT|SFSRE)/.test(n)) return 'soonepro';
  if (/^SFSO4UL/.test(n)) return 'so4ul';
  if (/^(SFSO4|SFS4)/.test(n)) return 'so4';
  if (/^(SFSO5|SFSC5)/.test(n)) return 'so5';
  if (/^SFS5/.test(n)) return 'so5pro';
  if (/^SFSOMT/.test(n)) return 'somytier';
  if (/^SFSOX/.test(n)) return 'sox';
  if (/^SFSO6/.test(n)) return 'so6';
  return null;
}
// Placeholder active protocol while 'auto' is selected but nothing is connected yet.
const AUTO_PROTO = { id: 'auto', baseId: null, name: 'auto', family: null, variant: null, prefixes: [], transport: 'nordic', crypto: CRYPTO_NONE, speed: false };
const DEFAULT_MODEL = 'auto';

const LS_THEME = 'sfu_theme', LS_DEVICE = 'sfu_device', LS_MODEL = 'sfu_model', LS_SPEED = 'sfu_speed', LS_EKFV = 'sfu_ekfv';
let speedUnlocked = false;   // local speed lock/unlock state; SoFlow reports no speed-limit state, so we track it

// --------------------------- state ---------------------------

let activeProto = AUTO_PROTO;
let autoDetect = false;                                  // 'auto' selected: scan broadly, classify by name
let usedTransport = TRANSPORTS[activeProto.transport];   // the transport actually found on connect
let device = null, server = null, writeChar = null, notifyChar = null;
let connected = false, connecting = false;
// SO4 only: firmware version, read from byte 12 of an inbound frame (high nibble major, low nibble
// minor), used to pick plaintext (V42/V51) vs AES (V52). Stays null until a frame reveals it.
let fwMajor = null, fwMinor = null;
// SO3 only: the rolling secret placed in byte 3 of outgoing frames, updated from each 0x1D frame.
let so3Secret = 0;
// initSent marks that the connect command has been sent once the version is known (SO4 path);
// linkTimer is the fallback if the scooter never pushes a version frame.
let initSent = false, linkTimer = null;
// No model is preselected. Until the user picks one, only the universal UI (that applies to every
// scooter) is shown and connect is disabled; the model-specific cards are built dynamically.
let modelChosen = false;

function cryptoLabel(p) {
  const c = p.crypto;
  if (c.mode === 'never') return 'none';
  const key = (c.key === KEY_20) ? '20..' : '30..';
  return c.mode + ' ' + key + (c.decryptIncoming ? ' both-ways' : '');
}

// --------------------------- UI helpers ---------------------------

function $(id) { return document.getElementById(id); }

// The log is a full diagnostic transcript. Every line is timestamped and kept in logLines in
// chronological order so the copy button can hand a tester one clean, paste-ready block. The
// on-screen order stays newest-first (insertBefore) as before. Log text is technical English ASCII.
const logLines = [];
function ts() {
  const d = new Date();
  const p = (n, w) => String(n).padStart(w || 2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '.' + p(d.getMilliseconds(), 3);
}
function log(m, cls) {
  const line = '[' + ts() + '] ' + m;
  logLines.push(line);
  const el = $('log'); if (!el) return;
  const span = document.createElement('div');
  if (cls) span.className = cls;
  span.textContent = line;
  el.insertBefore(span, el.firstChild);
}
function logDiagnosticHeader() {
  const nav = (typeof navigator !== 'undefined') ? navigator : {};
  log('=== sf-unlock diagnostic ===');
  log('build: ' + BUILD);
  log('time: ' + new Date().toISOString());
  log('userAgent: ' + (nav.userAgent || '(unknown)'));
  log('platform: ' + (nav.platform || '(unknown)'));
  log('webBluetooth: ' + (nav.bluetooth ? 'yes' : 'no'));
  log('============================');
}
async function copyLog() {
  const text = logLines.join('\n');
  let ok = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; }
  } catch (e) { ok = false; }
  if (!ok) ok = copyLogFallback(text);
  log(ok ? 'log copied (' + logLines.length + ' lines)' : 'log copy failed, please select the log text manually', ok ? 'log-ok' : 'log-err');
}
function copyLogFallback(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.className = 'copy-offscreen';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand && document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) { return false; }
}
// Help "?" icons: each card can show its explanation in a modal instead of a permanent paragraph.
const HELP = { enc: ['encTitle', 'encHint'], speed: ['s3Title', 'settingsHint'], battery: ['batTitle', 'batHint'], more: ['moreTitle', 'moreHint'], disclaimer: ['footDisclaimer', 'disclaimerText'] };
function openHelp(key) {
  const m = HELP[key]; if (!m) return;
  const dlg = $('help'); if (!dlg) return;
  const ti = $('help-title'); if (ti) ti.textContent = t(m[0]);
  const bo = $('help-body'); if (bo) bo.textContent = t(m[1]);
  if (dlg.showModal) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } } else dlg.setAttribute('open', '');
}
function closeHelp() { const dlg = $('help'); if (!dlg) return; if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

function clearLog() {
  logLines.length = 0;
  const el = $('log'); if (el) el.textContent = '';
  logDiagnosticHeader();
  log('log cleared');
}
function setTile(id, val) { const el = $(id); if (el) el.textContent = (val == null ? '-' : val); }
const MODE_TILE = ['Eco', 'Normal', 'Sport'];
function modeTile(code) { return MODE_TILE[code] || ('Modus ' + code); }
function resetTiles() { ['t-speed', 't-mode', 't-batt', 't-lock', 't-volt', 't-fw', 't-curr', 't-power', 't-err', 't-trip', 't-total'].forEach(id => setTile(id, null)); }
function statusLabel(s) {
  const map = { disconnected: 'stDisconnected', connecting: 'stConnecting', linking: 'stLinking',
    connected: 'stConnected', 'no-service': 'stNoService', 'no-char': 'stNoChar' };
  return t(map[s] || 'stDisconnected') || s;
}
function setStatus(s) {
  const el = $('status'); if (el) { el.dataset.state = s; el.textContent = statusLabel(s); }
  const cb = $('btn-conn');
  if (cb) {
    const on = (s === 'connecting' || s === 'linking' || s === 'connected');
    cb.textContent = on ? t('btnDisconnect') : t('btnConnect');
    cb.dataset.act = on ? 'disconnect' : 'connect';
  }
}
// Enable controls per model: speed/mode only when the model has a BLE speed command, battery unlock
// only for the D7 family, lock/unlock for every model.
function setControlsEnabled(on) {
  const speedOn = on && activeProto.speed;
  const batOn = on && activeProto.family === 'D7';
  const list = [['btn-toggle', speedOn], ['btn-set-mode', speedOn], ['speed-in', speedOn], ['ekfv-in', speedOn], ['mode-in', speedOn],
   ['btn-bat', batOn]];
  ['btn-light', 'light-in', 'btn-dark', 'dark-in', 'btn-zero', 'zero-in', 'btn-ind', 'ind-in',
   'btn-unit', 'unit-in', 'btn-name', 'name-in', 'btn-vlock', 'vlock-in'].forEach(id => list.push([id, on]));
  list.forEach(([id, en]) => { const el = $(id); if (el) el.disabled = !en; });
  updateToggleButton();
}
// The toggle shows the action for the current local state: "Entsperren" when locked, "Sperren" when open.
function openSpeedValue() { const v = parseInt(($('speed-in') || {}).value, 10); return isNaN(v) ? 30 : v; }
function ekfvSpeedValue() { const v = parseInt(($('ekfv-in') || {}).value, 10); return isNaN(v) ? 20 : v; }
function updateToggleButton() {
  const b = $('btn-toggle'); if (!b) return;
  b.textContent = speedUnlocked ? t('btnLock') : t('btnUnlock');
}
function doSpeedToggle() {
  if (!speedSupported()) { log('this model/firmware has no BLE speed command.', 'log-err'); return; }
  if (speedUnlocked) { cmdSetMaxSpeed(ekfvSpeedValue(), false); speedUnlocked = false; }   // open -> lock to eKFV
  else { cmdSetMaxSpeed(openSpeedValue(), true); speedUnlocked = true; }                    // locked -> unlock to open
  updateToggleButton();
}

// SO4 only: firmware >= 5.2 -> protocol V52 -> AES.
function protocolIsV52() { return fwMajor != null && (fwMajor > 5 || (fwMajor === 5 && fwMinor >= 2)); }
// Encryption is fully automatic: it follows the selected model and, for the SO4, its firmware.
// There is no manual selector because the scheme is fixed per scooter, a user choice would be wrong.
function encActive() {
  const c = activeProto.crypto;
  if (c.mode === 'never') return false;   // SO3 has no crypto at all
  if (c.mode === 'always') return true;   // SO2 / SO5 Pro / SO One and the SO6 family
  return protocolIsV52();                 // SO4: only from firmware 5.2
}
function encKey() { return activeProto.crypto.key ? hexToBytes(activeProto.crypto.key) : null; }
function updateEncState() {
  const el = $('enc-state'); if (!el) return;
  el.textContent = modelChosen ? (encActive() ? t('encAes') : t('encPlain')) : '-';
}

// --------------------------- model selection ---------------------------

function buildModelDropdown() {
  const sel = $('model-in'); if (!sel) return;
  sel.textContent = '';   // clear existing options without an innerHTML sink
  const ph = document.createElement('option');
  ph.value = ''; ph.setAttribute('data-t', 'modelChoose'); ph.textContent = t('modelChoose');
  sel.appendChild(ph);
  MODEL_ORDER.forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    if (key === 'auto') { opt.setAttribute('data-t', 'modelAuto'); opt.textContent = t('modelAuto'); }
    else { const d = modelDef(key); if (!d) return; opt.textContent = d.label; }   // brand names, not translated
    sel.appendChild(opt);
  });
}
// Show/hide and enable the per-model cards: the speed/mode card and battery card only for models
// that support them, and a clear notice for models without a BLE speed command.
// SO4 firmware -> command generation. Unknown firmware assumes the newest (V52). sox is forced V52.
function so4Ver() {
  if (activeProto.so4ver) return activeProto.so4ver;
  if (fwMajor == null) return 'v52';
  if (fwMajor <= 4) return 'v42';
  if (fwMajor === 5 && fwMinor <= 1) return 'v51';
  return 'v52';
}
// A model can set speed unless it is a no-speed family (SO6/SO4 UL) or an SO4 on old V42 firmware.
function speedSupported() {
  if (!activeProto.speed) return false;
  if (activeProto.variant === 'so4' && so4Ver() === 'v42') return false;
  return true;
}
// Battery unlock (0xD5) exists only on the So5ProBase models (always) and on the SO4 path from V52
// (belegt: batteryUnlock lives on So5ProBaseDataDelegate and So4Protocol V52 only). SO3/SO6 never.
function batterySupported() {
  if (activeProto.family !== 'D7') return false;
  if (activeProto.variant !== 'so4') return true;     // SO2 / SO5 Pro / SO One family: always
  if (activeProto.so4ver === 'v52') return true;      // SO X: forced V52
  return fwMajor != null && so4Ver() === 'v52';       // SO4 / SO myTIER: only once firmware confirms V52
}
function applyModelUi() {
  const on = modelChosen;
  const auto = autoDetect && !connected;   // 'auto' picked, no device classified yet -> hide model cards
  const speedCard = $('speed-card'); if (speedCard) speedCard.hidden = !on || auto || !speedSupported();
  const batCard = $('bat-card'); if (batCard) batCard.hidden = !on || auto || !batterySupported();
  const modeCard = $('mode-card'); if (modeCard) modeCard.hidden = !on || auto || !activeProto.speed;
  const noSpeed = $('nospeed-card'); if (noSpeed) noSpeed.hidden = !on || auto || speedSupported();
  const caps = (on && !auto) ? modelCaps() : {};
  const rows = { 'row-vlock': caps.vlock, 'row-light': caps.frontLight, 'row-dark': caps.darkMode, 'row-zero': caps.zeroStart,
                 'row-ind': caps.indicator, 'row-unit': caps.unit, 'row-name': caps.name };
  let anyMore = false;
  Object.keys(rows).forEach(id => { const el = $(id); if (el) el.hidden = !rows[id]; if (rows[id]) anyMore = true; });
  const moreCard = $('more-card'); if (moreCard) moreCard.hidden = !anyMore;
  const sel = $('model-in'); if (sel && on && !autoDetect && sel.value !== activeProto.id) sel.value = activeProto.id;
  const cb = $('btn-conn'); if (cb && !connected) cb.disabled = !on;
  setControlsEnabled(connected);
  updateEncState();
}
function setModel(id, quiet) {
  if (id === 'auto') {
    if (connected) { log('model changed while connected -> disconnecting'); disconnectBle(); }
    autoDetect = true; modelChosen = true; activeProto = AUTO_PROTO;
    usedTransport = TRANSPORTS.nordic; so3Secret = 0; fwMajor = null; fwMinor = null;
    resetTiles();
    try { localStorage.setItem(LS_MODEL, 'auto'); } catch (e) {}
    const sel = $('model-in'); if (sel) sel.value = 'auto';
    applyModelUi();
    if (!quiet) log('auto detect: the page scans all SoFlow scooters (name prefix SFS) and picks the protocol from the advertised name, exactly like the app.', 'log-ok');
    return;
  }
  const p = protoFor(id);
  if (!p) {   // placeholder / no model chosen: show only the universal UI, disable connect
    autoDetect = false; modelChosen = false;
    if (connected) { log('model cleared while connected -> disconnecting'); disconnectBle(); }
    const sel = $('model-in'); if (sel) sel.value = '';
    applyModelUi();
    if (!quiet) log('no model selected. Pick your model or use auto detect.');
    return;
  }
  if (connected) { log('model changed while connected -> disconnecting to switch protocol'); disconnectBle(); }
  autoDetect = false; modelChosen = true;
  activeProto = p;
  usedTransport = TRANSPORTS[p.transport];
  so3Secret = 0;
  fwMajor = null; fwMinor = null;
  resetTiles();
  try { localStorage.setItem(LS_MODEL, id); } catch (e) {}
  applyModelUi();
  if (!quiet) {
    log('model set: ' + p.name + '  [family ' + p.family + (p.variant ? '/' + p.variant : '') +
        ', transport ' + TRANSPORTS[p.transport].name + ', crypto ' + cryptoLabel(p) +
        ', speed ' + (speedSupported() ? 'yes' : 'no') + ', scan ' + p.prefixes.join('/') + ']', 'log-ok');
  }
}
// Apply a protocol detected from the advertised device name (auto detect, or a manual mismatch fix).
function applyDetectedProto(detectedId, note) {
  const p = protoFor(detectedId);
  if (!p) return;
  activeProto = p;
  usedTransport = TRANSPORTS[p.transport];
  if (note) log(note, 'log-ok');
}

// --------------------------- connect / disconnect ---------------------------

async function pickAndConnect() {
  if (!navigator.bluetooth) { log('Web Bluetooth not available. Use Bluefy (iOS) or Chrome/Edge.', 'log-err'); return; }
  try {
    let filters;
    // Newer units (e.g. the SO4 Pro GT2 / Core2) advertise the plain name "SoFlow", not an "SFS..."
    // name, so the SFS filter alone never shows them. Include "SoFlow" in every chooser.
    const soflowExtra = [{ namePrefix: 'SoFlow' }, { namePrefix: 'SOFLOW' }];
    if (autoDetect) {
      log('auto detect: scanning SoFlow scooters (name prefix SFS / QINGZ / SoFlow) ...');
      filters = [{ namePrefix: 'SFS' }, { namePrefix: 'QINGZ' }].concat(soflowExtra);
    } else {
      log('scanning for ' + activeProto.name + ' (' + activeProto.prefixes.join('/') + ' / SoFlow) ...');
      filters = activeProto.prefixes.map(p => ({ namePrefix: p })).concat(soflowExtra);
    }
    device = await navigator.bluetooth.requestDevice({ filters, optionalServices: ALL_SERVICES });
    log('selected: ' + (device.name || '(no name)') + ' [' + device.id + ']');
    // Classify by the advertised name, exactly like the app (VehicleType._fromName). The name is
    // authoritative for crypto and frame family: in auto mode it picks the protocol; in manual mode it
    // corrects a wrong pick so the tool still connects correctly instead of failing silently.
    const detected = classifyByName(device.name);
    if (autoDetect) {
      if (detected) applyDetectedProto(detected, 'detected ' + PROTOCOLS[detected].name + ' from name "' + device.name + '"');
      else log('name "' + (device.name || '(no name)') + '" carries no model (newer SoFlow units advertise a plain name). Connecting and classifying from the GATT service instead. If commands misbehave, pick your exact model manually (GT2 = SO4 Pro GT, Core2 = SO4 Pro Core2).', 'log-ok');
    } else if (detected && detected !== activeProto.baseId) {
      applyDetectedProto(detected, 'note: this device advertises as ' + PROTOCOLS[detected].name + ', using that protocol instead of the picked one (the name is authoritative, like the app).');
    }
    await connectGatt(device);
  } catch (e) {
    log('scan/connect cancelled: ' + e, 'log-err');
  }
}

// Diagnostics: show ALL Bluetooth devices (accept all), so a scooter that does not advertise an
// "SFS" name still appears. Logs the real name, classifies it, connects and lists the GATT services.
// This is how we find out why a specific unit (e.g. a newer GT2/Core2) does not connect normally.
function charProps(c) {
  const p = c.properties || {};
  return ['read', 'write', 'writeWithoutResponse', 'notify', 'indicate'].filter(k => p[k]).join(',') || '-';
}
async function scanAllDevicesDiagnostic() {
  if (!navigator.bluetooth) { log('Web Bluetooth not available. Use Bluefy (iOS) or Chrome (Android/desktop).', 'log-err'); return; }
  let dev = null;
  try {
    log('DIAG: showing ALL Bluetooth devices. Pick your scooter, even if the name looks wrong or missing.', 'log-ok');
    dev = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ALL_SERVICES });
  } catch (e) { log('DIAG cancelled: ' + e, 'log-err'); return; }
  log('DIAG selected: name="' + (dev.name || '(no name)') + '"  id=' + dev.id);
  const cls = classifyByName(dev.name);
  log('DIAG classify: ' + (cls ? PROTOCOLS[cls].name + ' (' + cls + ', transport ' + PROTOCOLS[cls].transport + ')'
      : 'NOT recognized - the advertised name matches no known SFS/QINGZ prefix'), cls ? 'log-ok' : 'log-err');
  try {
    log('DIAG: connecting to read the GATT services ...');
    const srv = await dev.gatt.connect();
    let svcs = [];
    try { svcs = await srv.getPrimaryServices(); } catch (e) { log('DIAG getPrimaryServices error: ' + e, 'log-err'); }
    if (!svcs || !svcs.length) {
      log('DIAG: none of the known services is present (Nordic 6E40.., KingMeter 4348.., SO6 6000..). This unit uses a service this tool does not know yet.', 'log-err');
    } else {
      for (const s of svcs) {
        log('DIAG service ' + s.uuid, 'log-ok');
        try { const chs = await s.getCharacteristics(); for (const c of chs) log('DIAG   char ' + c.uuid + '  [' + charProps(c) + ']'); }
        catch (e) { log('DIAG   (characteristics unreadable: ' + e + ')'); }
      }
    }
    try { dev.gatt.disconnect(); } catch (e) {}
    log('DIAG done. Copy the log and send it. For the full picture (name + ALL service UUIDs + manufacturer data) use the nRF Connect app on Android.', 'log-ok');
  } catch (e) {
    log('DIAG connect failed: ' + e, 'log-err');
    log('DIAG: even so, the advertised name above already helps. Send the log.', 'log-err');
  }
}

// Find the model's service first; if it is missing, look through the other known services and note
// which one was found. This keeps the tool usable when a unit exposes a different transport.
async function resolveService(srv) {
  const want = TRANSPORTS[activeProto.transport];
  let svc = await srv.getPrimaryService(want.service).catch(() => null);
  if (svc) { usedTransport = want; return svc; }
  for (const key of TRANSPORT_ORDER) {
    const cand = TRANSPORTS[key];
    if (cand.service === want.service) continue;
    svc = await srv.getPrimaryService(cand.service).catch(() => null);
    if (svc) { usedTransport = cand; log('note: expected ' + want.name + ' service not found, using ' + cand.name + ' instead.', 'log-err'); return svc; }
  }
  return null;
}

// When auto detect cannot read the model from the name (newer units advertise "SoFlow"), guess the
// protocol from the GATT service found: SO6 service -> SO6; KingMeter -> the SO One Pro / SO4 Pro
// GT/Core2 family; Nordic -> the So5ProBase default (key A). The user can still override manually.
function protoFromTransport(tkey) {
  if (tkey === 'so6') return 'so6';
  if (tkey === 'kingmeter') return 'soonepro';
  return 'soone';
}
async function connectGatt(dev) {
  if (connecting) { log('connect already in progress'); return; }
  connecting = true;
  try {
    if (device && device !== dev) { try { device.removeEventListener('gattserverdisconnected', onDisconnected); } catch (e) {} }
    device = dev;
    device.removeEventListener('gattserverdisconnected', onDisconnected);
    device.addEventListener('gattserverdisconnected', onDisconnected);
    setStatus('connecting');
    connected = false;
    server = await device.gatt.connect();
    const svc = await resolveService(server);
    if (!svc) { try { device.gatt.disconnect(); } catch (e) {} setStatus('no-service'); log('no known service found (' + TRANSPORTS[activeProto.transport].name + ' expected). Wrong model selected? Please report.', 'log-err'); return; }
    if (autoDetect && !activeProto.baseId) {   // auto mode, name gave no model: classify from the service found
      const tkey = usedTransport === TRANSPORTS.so6 ? 'so6' : usedTransport === TRANSPORTS.kingmeter ? 'kingmeter' : 'nordic';
      const guess = protoFromTransport(tkey);
      applyDetectedProto(guess, 'classified as ' + PROTOCOLS[guess].name + ' from the ' + usedTransport.name + ' service.');
    }
    writeChar = await svc.getCharacteristic(usedTransport.write).catch(() => null);
    notifyChar = await svc.getCharacteristic(usedTransport.notify).catch(() => null);
    if (!writeChar || !notifyChar) { try { device.gatt.disconnect(); } catch (e) {} setStatus('no-char'); log('write/notify characteristic missing on ' + usedTransport.name, 'log-err'); return; }
    await notifyChar.startNotifications();
    notifyChar.removeEventListener('characteristicvaluechanged', onCharacteristicValue);
    notifyChar.addEventListener('characteristicvaluechanged', onCharacteristicValue);
    connected = true;
    speedUnlocked = false;   // fresh connect: assume locked, the toggle offers "Entsperren"
    initSent = false;
    fwMajor = null; fwMinor = null;
    so3Secret = 0;
    setControlsEnabled(true);
    const info = $('devinfo');
    if (info) info.textContent = t('devPrefix') + ' ' + (device.name || '(no name)') + '  -  ' + activeProto.name + ', ' + usedTransport.name + ', notify active.';
    try { if (device.id) localStorage.setItem(LS_DEVICE, device.id); } catch (e) {}
    log('connected: ' + (device.name || '(no name)') + ' [' + device.id + ']', 'log-ok');
    log('model ' + activeProto.name + '  family ' + activeProto.family + '  crypto ' + cryptoLabel(activeProto), 'log-ok');
    log('service ' + usedTransport.service, 'log-ok');
    log('char  write=' + writeChar.uuid + '  notify=' + notifyChar.uuid, 'log-ok');
    updateEncState();
    applyModelUi();
    afterConnect();
  } catch (e) {
    setStatus('disconnected');
    log('connect failed: ' + e, 'log-err');
  } finally {
    connecting = false;
  }
}

// Post-connect handshake, per family.
//   SO4: encryption depends on firmware, so wait for a pushed status frame to read the version
//        (byte 12) and only then send the connect command with the right encryption (like the app).
//   other D7 (so5base): encryption is fixed, send the indicator-light connect command + a nudge.
//   SO3: send the appStatus poll (0xA0), the device then pushes 0x1D / 0x2D telemetry.
//   SO6: send the token handshake ({06,01}) and start realtime monitoring ({05,46}).
function afterConnect() {
  if (activeProto.family === 'D7' && activeProto.variant === 'so4') {
    setStatus('linking');
    log('waiting for a pushed status frame to read the firmware version (protocol select) ...');
    transmit(buildFrameD7(0x1D, [], 0x00), 'realtime request 0x1D (nudge)');
    if (linkTimer) clearTimeout(linkTimer);
    linkTimer = setTimeout(onLinkTimeout, 2500);
    return;
  }
  setStatus('connected');
  if (activeProto.family === 'D7') {
    transmit(buildFrameD7(0xA6, [0x01], 0x00), 'init setBleIndicatorLight(true) 0xA6');
    transmit(buildFrameD7(0x1D, [], 0x00), 'realtime request 0x1D (nudge)');
  } else if (activeProto.family === 'SO3') {
    transmit(buildFrameD7(0xA0, [0x00, 0x02], so3Secret), 'appStatus poll 0xA0 [00,02]');
  } else if (activeProto.family === 'SO6') {
    transmit(buildFrameSO6(0x06, 0x01, [0x01]), 'updateToken {06,01}');
    transmit(buildFrameSO6(0x05, 0x46, [0x01]), 'startMonitoringRealtime {05,46}');
  }
  maybeRunDeepAction();
}

function onDisconnected(ev) {
  if (ev && ev.target && ev.target !== device) return;   // ignore a late event from a scooter we already left
  connected = false;
  speedUnlocked = false;
  clearAcks();
  initSent = false;
  fwMajor = null; fwMinor = null;
  so3Secret = 0;
  if (linkTimer) { clearTimeout(linkTimer); linkTimer = null; }
  setStatus('disconnected');
  const cb = $('btn-conn'); if (cb) cb.disabled = !modelChosen;
  setControlsEnabled(false);
  resetTiles();
  const info = $('devinfo'); if (info) info.textContent = '';
  updateEncState();
  log('disconnected.', 'log-err');
}

// SO4 only: no version frame arrived in time. Keep the connection usable, but say clearly that the
// protocol is unknown so encryption follows the selector (Auto -> plaintext).
function onLinkTimeout() {
  linkTimer = null;
  if (!connected) return;
  if (fwMajor == null) {
    log('no version frame received within 2.5s. firmware/protocol unknown; encryption follows the selector (Auto -> plaintext).', 'log-err');
    setStatus('connected');
    maybeRunDeepAction();
  }
}

function disconnectBle() {
  const d = device;
  if (d) { try { d.removeEventListener('gattserverdisconnected', onDisconnected); } catch (e) {} }   // its own disconnect must not re-fire onDisconnected
  try { if (d && d.gatt && d.gatt.connected) d.gatt.disconnect(); } catch (e) {}
  device = null; server = null; writeChar = null; notifyChar = null;   // no stale handles into the next connection
  connected = false;
  clearAcks();
  if (linkTimer) { clearTimeout(linkTimer); linkTimer = null; }
  setStatus('disconnected');
  setControlsEnabled(false);
  resetTiles();
  const info = $('devinfo'); if (info) info.textContent = '';
}

function onCharacteristicValue(ev) {
  try {
    const b = new Uint8Array(ev.target.value.buffer);
    log('RX  ' + bytesToHex(b), 'log-rx');   // raw hex is always the source of truth
    handleFrame(b);
  } catch (e) { log('RX parse error: ' + e, 'log-err'); }
}

// Inbound dispatch by family. D7 / SO3 frames are plaintext and start with 0xD7 plus an additive
// checksum. SO6 frames are AES-encrypted and are decrypted first.
// KingMeter-transport SoFlow units (SO One Pro and the branded SO4 Pro GT2 / Core2) send every
// inbound frame - both the command echo and the realtime telemetry - with 0xD5 as the start byte
// instead of 0xD7. The rest of the frame (LEN, OPCODE, byte 3, payload, additive checksum) is
// byte-for-byte the same. belegt from a GT2/Core2 log: the echo of a set-max-speed command comes
// back as "D5 07 A9 ..." with a valid checksum, and the realtime frames "D5 1C 1D ..." decode
// cleanly with the So5ProBase reader. So accept both start bytes; without this the tool threw every
// GT2/Core2 frame away, which is why their live values stayed empty and every command was falsely
// reported as unconfirmed even though it worked.
function handleFrame(b) {
  if (!b || b.length < 2) return;
  if (activeProto.family === 'SO6') { handleFrameSO6(b); return; }
  if (b[0] !== 0xD7 && b[0] !== 0xD5) { log('  note: frame does not start with 0xD7 or 0xD5; not decoding (raw hex above).'); return; }
  let sum = 0; for (let i = 1; i < b.length - 1; i++) sum = (sum + b[i]) & 0xff;   // LEN .. last payload byte
  const chkOk = (sum === b[b.length - 1]);
  log('  frame: len=' + b.length + ', checksum ' +
      (chkOk ? 'ok' : 'MISMATCH (got 0x' + b[b.length - 1].toString(16).padStart(2, '0') + ', calc 0x' + sum.toString(16).padStart(2, '0') + ')'));
  const op = b[2];
  resolveAck('op:' + op, bytesToHex(b));
  if (activeProto.family === 'SO3') {
    if (op === 0x1D) { updateSo3Secret(b); decodeSo3Realtime(b); }
    else if (op === 0x2D) decodeSo3Status2(b);
    return;
  }
  // D7 family
  if (activeProto.variant === 'so4') {
    // Firmware version: byte 12, high nibble major, low nibble minor. Same byte the app reads for
    // the protocol choice (plaintext vs V52 AES). belegt.
    if (b.length > 12) {
      const major = b[12] >> 4, minor = b[12] & 0x0f;
      if (major > 0 && major < 15) applyDetectedVersion(major, minor);
    }
    if (b.length >= 20 && op === 0x1D) decodeRealtimeSo4(b);
  } else {
    if (op === 0x1D) decodeRealtimeSo5(b);
  }
}

// SO4 only: firmware known -> pick protocol like So4Protocol.fromVersion, update UI, and (once) send
// the app connect command with the encryption the version requires.
function applyDetectedVersion(major, minor) {
  const changed = (major !== fwMajor || minor !== fwMinor);
  fwMajor = major; fwMinor = minor;
  setTile('t-fw', major + '.' + minor);
  if (changed) {
    const proto = (major <= 4) ? 'V42' : ((major === 5 && minor <= 1) ? 'V51' : 'V52');
    const aes = protocolIsV52();
    log('firmware ' + major + '.' + minor + ' -> protocol ' + proto + ' -> ' + (aes ? 'AES-128-ECB' : 'plaintext'), 'log-ok');
    updateEncState();
    applyModelUi();   // V42 has no speed command -> refresh the speed / no-speed cards now
  }
  if (!initSent) {
    initSent = true;
    if (linkTimer) { clearTimeout(linkTimer); linkTimer = null; }
    setStatus('connected');
    // App connect command: So4DataDelegate.onConnected sends _setBleIndicatorLight(true), which each
    // firmware builds differently (V52 = 0xA6 [01], V42 = via 0xA0, V51 = no builder).
    if (so4Ver() === 'v52') transmit(buildFrameD7(0xA6, [0x01], 0x00), 'init setBleIndicatorLight(true) 0xA6');
    else if (so4Ver() === 'v42') transmit(buildFrameD7(0xA0, [so4ModeByte0(1), 0x00], 0x00), 'init setBleIndicatorLight(true) 0xA0 (v42)');
    maybeRunDeepAction();
  }
}

// SO3: keep the rolling secret in step with the device. Recomputed from b3, b15, b16 of each 0x1D.
function updateSo3Secret(b) {
  if (b.length < 17) return;
  const s = so3CalcSecret(b[3], b[15], b[16]);
  if (s !== so3Secret) { so3Secret = s; log('  SO3 secret updated to 0x' + s.toString(16).padStart(2, '0') + ' (from b3,b15,b16). used in byte 3 of outgoing frames.'); }
}

// --------------------------- telemetry decoders ---------------------------

// SO4 realtime (0x1D), mirroring _So4ProtocolV52.processVehicleData. Plaintext.
//   byte 4 status (bit0 headlight, bit1-3 speedMode, bit4 unit, bit7 locked)
//   5..6 speed*10 BE   7..8 voltage/10   9..10 current/10   11 error   12/13/14 versions
//   15..16 trip/10   17..18 total km   19 battery %
function decodeRealtimeSo4(b) {
  const st = b[4];
  const modeCode = (st >> 1) & 0x07;
  const unit = (st & 0x10) ? 'imperial' : 'metric';
  const locked = (st & 0x80) ? 'locked' : 'unlocked';
  const headlight = (st & 0x01) ? 'on' : 'off';
  const speed = ((b[5] << 8) | b[6]) / 10;
  const voltage = ((b[7] << 8) | b[8]) / 10;
  const current = ((b[9] << 8) | b[10]) / 10;
  const errCode = b[11];
  const pv = (b[12] >> 4) + '.' + (b[12] & 0x0f);
  const disp = (b[13] >> 4) + '.' + (b[13] & 0x0f);
  const cpu = (b[14] >> 4) + '.' + (b[14] & 0x0f);
  const trip = ((b[15] << 8) | b[16]) / 10;
  const total = (b[17] << 8) | b[18];
  const batt = b[19];
  setTile('t-speed', speed.toFixed(1) + ' km/h');
  setTile('t-mode', modeTile(modeCode));
  setTile('t-batt', batt + ' %');
  setTile('t-lock', t((st & 0x80) ? 'valLocked' : 'valUnlocked'));
  setTile('t-volt', voltage.toFixed(1) + ' V');
  setTile('t-fw', pv);
  setTile('t-curr', current.toFixed(1) + ' A');
  setTile('t-err', errCode === 0 ? 'OK' : String(errCode));
  setTile('t-trip', trip.toFixed(1) + ' km');
  setTile('t-total', total + ' km');
  log('  realtime: speed=' + speed.toFixed(1) + 'km/h mode=' + modeCode + ' ' + locked +
      ' batt=' + batt + '% ' + voltage.toFixed(1) + 'V ' + current.toFixed(1) + 'A unit=' + unit +
      ' light=' + headlight + ' err=' + errCode + ' fw(proto/disp/cpu)=' + pv + '/' + disp + '/' + cpu +
      ' trip=' + trip.toFixed(1) + 'km total=' + total + 'km', 'log-ok');
}

// So5ProBase realtime (0x1D) for SO5 Pro, SO2, SO One. Longer frame: 4 error bytes, versions
// at 15/16/17, battery at 22, duration 23-25, darkMode 26. Fields are read with guards so a shorter
// frame still yields the basic values.
function decodeRealtimeSo5(b) {
  if (b.length < 11) { log('  realtime: frame too short (' + b.length + ' bytes).'); return; }
  const st = b[4];
  const modeCode = (st >> 1) & 0x07;
  const unit = (st & 0x10) ? 'imperial' : 'metric';
  const locked = (st & 0x80) ? 'locked' : 'unlocked';
  const headlight = (st & 0x01) ? 'on' : 'off';
  const speed = ((b[5] << 8) | b[6]) / 10;
  const voltage = ((b[7] << 8) | b[8]) / 10;
  const current = ((b[9] << 8) | b[10]) / 10;
  const parts = ['speed=' + speed.toFixed(1) + 'km/h', 'mode=' + modeCode, locked, 'unit=' + unit,
    'light=' + headlight, voltage.toFixed(1) + 'V', current.toFixed(1) + 'A'];
  setTile('t-speed', speed.toFixed(1) + ' km/h');
  setTile('t-mode', modeTile(modeCode));
  setTile('t-lock', t((st & 0x80) ? 'valLocked' : 'valUnlocked'));
  setTile('t-volt', voltage.toFixed(1) + ' V');
  setTile('t-curr', current.toFixed(1) + ' A');
  if (b.length >= 15) { const eh = bytesToHex(b.subarray(11, 15)); parts.push('err=' + eh); setTile('t-err', /^(00 )*00$/.test(eh) ? 'OK' : eh); }
  if (b.length >= 18) {
    const pv = (b[15] >> 4) + '.' + (b[15] & 0x0f);
    parts.push('fw(proto/disp/cpu)=' + pv + '/' + (b[16] >> 4) + '.' + (b[16] & 0x0f) + '/' + (b[17] >> 4) + '.' + (b[17] & 0x0f));
    setTile('t-fw', pv);
  }
  if (b.length >= 22) { const trip = ((b[18] << 8) | b[19]) / 10, total = (b[20] << 8) | b[21]; parts.push('trip=' + trip.toFixed(1) + 'km', 'total=' + total + 'km'); setTile('t-trip', trip.toFixed(1) + ' km'); setTile('t-total', total + ' km'); }
  if (b.length >= 23) { parts.push('batt=' + b[22] + '%'); setTile('t-batt', b[22] + ' %'); }
  if (b.length >= 26) parts.push('dur=' + b[23] + 'h' + b[24] + 'm' + b[25] + 's');
  if (b.length >= 27) parts.push('dark=' + (b[26] === 0 ? 'on' : 'off'));   // darkMode active when byte is 0
  log('  realtime: ' + parts.join(' '), 'log-ok');
}

// SO3 realtime frame 0x1D: status plus electrical values. power/energy at 11-14. Bytes 3/15/16 feed
// the rolling secret (handled in updateSo3Secret).
function decodeSo3Realtime(b) {
  if (b.length < 11) { log('  SO3 0x1D: frame too short (' + b.length + ' bytes).'); return; }
  const st = b[4];
  const modeCode = (st >> 1) & 0x07;
  const unit = (st & 0x10) ? 'imperial' : 'metric';
  const speed = ((b[5] << 8) | b[6]) / 10;
  const voltage = ((b[7] << 8) | b[8]) / 10;
  const current = ((b[9] << 8) | b[10]) / 10;
  const parts = ['speed=' + speed.toFixed(1) + 'km/h', 'mode=' + modeCode + ' (MessedUp mapping, decode uncertain)',
    'unit=' + unit, voltage.toFixed(1) + 'V', current.toFixed(1) + 'A'];
  if (b.length >= 15) { const power = ((b[11] << 8) | b[12]) / 10, energy = ((b[13] << 8) | b[14]) / 10; parts.push('power=' + power.toFixed(1) + 'W', 'energy=' + energy.toFixed(1) + 'Wh'); }
  setTile('t-speed', speed.toFixed(1) + ' km/h');
  setTile('t-mode', modeTile(modeCode));
  setTile('t-volt', voltage.toFixed(1) + ' V');
  log('  SO3 0x1D: ' + parts.join(' '), 'log-ok');
}

// SO3 status frame 0x2D: two firmware versions (each byte is major.minor over both nibbles) plus
// trip / total distance.
function decodeSo3Status2(b) {
  if (b.length < 10) { log('  SO3 0x2D: frame too short (' + b.length + ' bytes).'); return; }
  const fw1 = (b[4] >> 4) + '.' + (b[4] & 0x0f);
  const fw2 = (b[5] >> 4) + '.' + (b[5] & 0x0f);
  const trip = ((b[6] << 8) | b[7]) / 10;
  const total = (b[8] << 8) | b[9];
  setTile('t-fw', fw1);
  log('  SO3 0x2D: fw ' + fw1 + '/' + fw2 + ' trip=' + trip.toFixed(1) + 'km total=' + total + 'km', 'log-ok');
}

// SO6 family: decrypt first (if the model encrypts both ways), then read the command echo and, for a
// {05,46} realtime answer, the best-effort electrical values. Marked partial - byte-to-field mapping
// is only partly belegt and should be checked on a real unit.
function handleFrameSO6(b) {
  let data = b;
  if (activeProto.crypto.decryptIncoming && encActive() && encKey()) {
    if (!AES_OK) { log('  cannot decrypt: AES self-test failed.', 'log-err'); return; }
    try { data = aesEcbDecrypt(b, encKey()); log('  decrypted: ' + bytesToHex(data)); }
    catch (e) { log('  decrypt error: ' + e, 'log-err'); return; }
  }
  if (data.length < 3) { log('  SO6 frame too short after decrypt.'); return; }
  const g = data[0], sub = data[1], plen = data[2];
  log('  SO6 frame: group=0x' + g.toString(16).padStart(2, '0') + ' sub=0x' + sub.toString(16).padStart(2, '0') + ' payloadLen=' + plen);
  const echoHex = bytesToHex(data);
  resolveAck('so6:' + g + ':' + sub, echoHex);
  if (g === 0x05 && sub === 0x0E && !resolveAck('so6:5:12', echoHex)) resolveAck('so6:5:1', echoHex);   // {05,0E} lock-status confirms a lock/unlock
  if (g === 0x05 && sub === 0x46) decodeRealtimeSo6(data);
}
function decodeRealtimeSo6(d) {
  if (d.length < 5) { log('  SO6 realtime: too short to decode.'); return; }
  const be = i => (d[i] << 8) | d[i + 1];
  const parts = ['voltage=' + (be(3) / 10).toFixed(1) + 'V (belegt)'];
  if (d.length >= 7) parts.push('current=' + (be(5) / 10).toFixed(1) + 'A');
  if (d.length >= 9) parts.push('power=' + (be(7) / 10).toFixed(1) + 'W');
  if (d.length >= 11) parts.push('val4=' + (be(9) / 10).toFixed(1));
  if (d.length >= 14) parts.push('raw[11..13]=' + bytesToHex(d.subarray(11, 14)));
  log('  SO6 realtime (partial, voltage/current/power belegt): ' + parts.join(' '), 'log-ok');
  setTile('t-volt', (be(3) / 10).toFixed(1) + ' V');
  if (d.length >= 7) setTile('t-curr', (be(5) / 10).toFixed(1) + ' A');
  if (d.length >= 9) setTile('t-power', (be(7) / 10).toFixed(1) + ' W');
  ['t-speed', 't-mode', 't-batt', 't-lock', 't-fw', 't-err', 't-trip', 't-total'].forEach(id => setTile(id, null));
}

// --------------------------- writing frames + commands ---------------------------

async function writeFrame(bytes) {
  const wc = writeChar;
  if (!wc) throw new Error('not connected');
  if (wc.writeValueWithoutResponse) return wc.writeValueWithoutResponse(bytes);
  if (wc.writeValueWithResponse) return wc.writeValueWithResponse(bytes);
  return wc.writeValue(bytes);
}

// --------------------------- command acknowledgements ---------------------------
// Protocol-faithful port of the app's _executeCommand: for each user command we remember the opcode
// (D7/SO3) or the group/sub (SO6) we sent, then wait for the first incoming frame that echoes it.
// A matching echo is the vehicle's Success response for that command; no echo within the window is
// logged as "no confirmation". An echo proves the controller ACCEPTED the command, not that it will
// ride the value - the real speed only shows in the live telemetry while riding.
const ACK_TIMEOUT_MS = 3000;
const pendingAcks = new Map();   // ack-key -> { label, timer }
function armAck(key, label) {
  const prev = pendingAcks.get(key);
  if (prev) clearTimeout(prev.timer);
  const timer = setTimeout(() => {
    pendingAcks.delete(key);
    log('  no confirmation for "' + label + '" within ' + (ACK_TIMEOUT_MS / 1000) + 's (scooter sent no matching echo).', 'log-err');
  }, ACK_TIMEOUT_MS);
  pendingAcks.set(key, { label, timer });
}
function resolveAck(key, echoHex) {
  const p = pendingAcks.get(key);
  if (!p) return false;
  clearTimeout(p.timer);
  pendingAcks.delete(key);
  log('  confirmed: scooter acknowledged "' + p.label + '" (echo ' + echoHex + ').', 'log-ok');
  return true;
}
function clearAcks() {
  pendingAcks.forEach(p => clearTimeout(p.timer));
  pendingAcks.clear();
}

// Encrypt (if the active model requires it) and write a pre-built plaintext frame, logging both the
// wire bytes and the plaintext.
async function transmit(plain, label, ackKey) {
  if (!connected || !writeChar) { log('not connected', 'log-err'); return; }
  try {
    let out = plain;
    let note = 'plaintext';
    if (encActive() && encKey()) {
      if (!AES_OK) { log('AES self-test failed earlier, refusing to encrypt.', 'log-err'); return; }
      out = aesEcbEncrypt(plain, encKey());
      note = 'AES-128-ECB (' + (activeProto.crypto.key === KEY_20 ? '20..' : '30..') + ')';
    } else if (activeProto.crypto.mode === 'fw52' && fwMajor == null) {
      log('firmware not read yet, sending plaintext (SO4 stays plaintext below 5.2).');
    }
    log('TX  ' + bytesToHex(out) + '   (' + label + ', ' + note + ', plain ' + bytesToHex(plain) + ')', 'log-tx');
    if (ackKey) armAck(ackKey, label);
    await writeFrame(out);
    log('sent.', 'log-ok');
  } catch (e) {
    log('send failed: ' + e, 'log-err');
  }
}

// getSpeedCode is the identity on SO4 and So5ProBase (belegt: eco 0, normal 1, sport 2). On old SO4
// firmware (V42/V51) the mode/lock/unlock/indicator payload packs (code<<1)|lowBit into byte 0; V52
// uses clean single-purpose commands. currentMode tracks the last ride mode for that byte 0.
let currentMode = 1;   // normal
function so4ModeByte0(lowBit) { return (((currentMode & 0xff) << 1) | (lowBit & 1)) & 0xff; }

function cmdSetMaxSpeed(kmh, persist) {
  if (!speedSupported()) { log('this model/firmware has no BLE speed command.', 'log-err'); return; }
  if (persist !== false) { try { localStorage.setItem(LS_SPEED, String(kmh)); } catch (e) {} }
  const b3 = (activeProto.family === 'SO3') ? so3Secret : 0x00;
  transmit(buildFrameD7(0xA9, speedPayload(kmh), b3), 'max speed ' + kmh + ' km/h 0xA9', 'op:' + 0xA9);
}
function cmdSetSpeedMode(mode) {
  if (!activeProto.speed) { log('this model has no BLE ride-mode command.', 'log-err'); return; }
  currentMode = mode & 0xff;
  if (activeProto.family === 'SO3') {
    transmit(buildFrameD7(0xA4, [0x00, mode & 0xff], so3Secret), 'ride mode ' + mode + ' 0xA4', 'op:' + 0xA4);
  } else if (activeProto.variant === 'so4' && so4Ver() !== 'v52') {
    transmit(buildFrameD7(0xA0, [so4ModeByte0(1), 0x00], 0x00), 'ride mode ' + mode + ' 0xA0 (SO4 ' + so4Ver() + ')', 'op:' + 0xA0);
  } else {
    transmit(buildFrameD7(0xA3, [mode & 0xff], 0x00), 'ride mode ' + mode + ' 0xA3', 'op:' + 0xA3);
  }
}
function cmdUnlock() {
  if (activeProto.family === 'SO6') {
    const pin = activeProto.so6pin ? [0x30, 0x30, 0x30, 0x30, 0x30, 0x30] : [];
    transmit(buildFrameSO6(0x05, 0x01, pin), 'unlock {05,01}' + (activeProto.so6pin ? ' PIN 000000' : ''), 'so6:5:1');
  } else if (activeProto.family === 'SO3') {
    transmit(buildFrameD7(0xA2, [0x00, 0x00], so3Secret), 'unlock 0xA2 [00,00]', 'op:' + 0xA2);
  } else if (activeProto.variant === 'so4' && so4Ver() !== 'v52') {
    transmit(buildFrameD7(0xA0, [so4ModeByte0(1), 0x00], 0x00), 'unlock 0xA0 (SO4 ' + so4Ver() + ')', 'op:' + 0xA0);
  } else {
    transmit(buildFrameD7(0xA0, [0x00], 0x00), 'unlock 0xA0 [00]', 'op:' + 0xA0);
  }
}
function cmdLock() {
  if (activeProto.family === 'SO6') {
    transmit(buildFrameSO6(0x05, 0x0C, [0x01]), 'lock {05,0C}', 'so6:5:12');
  } else if (activeProto.family === 'SO3') {
    transmit(buildFrameD7(0xA2, [0x00, 0x02], so3Secret), 'lock 0xA2 [00,02]', 'op:' + 0xA2);   // belegt: SO3 lock = [00,02]
  } else if (activeProto.variant === 'so4' && so4Ver() !== 'v52') {
    transmit(buildFrameD7(0xA0, [so4ModeByte0(1), 0x01], 0x00), 'lock 0xA0 (SO4 ' + so4Ver() + ')', 'op:' + 0xA0);
  } else {
    transmit(buildFrameD7(0xA0, [0x01], 0x00), 'lock 0xA0 [01]', 'op:' + 0xA0);
  }
}
function cmdBatteryUnlock() {
  if (activeProto.family !== 'D7') { log('this model has no battery-unlock command.', 'log-err'); return; }
  if (activeProto.variant === 'so4') {
    if (so4Ver() !== 'v52') { log('battery unlock is not supported on this SO4 firmware (only from V52).', 'log-err'); return; }
    transmit(buildFrameD7(0xD5, [0x01], 0x00), 'battery unlock 0xD5 [01]', 'op:' + 0xD5);
  } else {
    transmit(buildFrameD7(0xD5, [0x00], 0x00), 'battery unlock 0xD5 [00]', 'op:' + 0xD5);   // so5base
  }
}

// Extra settings that only some families expose. Opcodes belegt in the analysis: front light 0xA2,
// dark mode 0xD6, zero-start 0xA5, unit 0xA7 (SO3 0xAB), name 0xFF (SO6 {04,01}), indicator 0xA6.
// front light / dark mode / zero-start / unit / name are So5ProBase only (SO5 Pro, SO2, SO One); the indicator light (setBleIndicatorLight) is on the SO4 path only; unit also on SO3, name also on SO6.
// modelCaps() decides which control a model shows.
function modelCaps() {
  const p = activeProto;
  const so5 = (p.family === 'D7' && p.variant === 'so5base');
  return {
    vlock:      true,                     // the immobilizer (lock/unlock) exists on every family (belegt)
    indicator:  (p.variant === 'so4'),   // setBleIndicatorLight exists only on the SO4 path (belegt)
    frontLight: so5,
    darkMode:   so5,
    zeroStart:  so5,
    unit:       so5 || (p.family === 'SO3'),
    name:       so5 || (p.family === 'SO6'),
  };
}
function b01(on) { return on ? 0x01 : 0x00; }
function cmdFrontLight(on) { transmit(buildFrameD7(0xA2, [b01(on)], 0x00), 'front light ' + (on ? 'on' : 'off') + ' 0xA2', 'op:' + 0xA2); }
function cmdDarkMode(on)   { transmit(buildFrameD7(0xD6, [on ? 0x00 : 0x01], 0x00), 'dark mode ' + (on ? 'on' : 'off') + ' 0xD6', 'op:' + 0xD6); }   // wire is inverted: dark mode on = 0x00
function cmdZeroStart(on)  { transmit(buildFrameD7(0xA5, [b01(on)], 0x00), 'zero-start ' + (on ? 'on' : 'off') + ' 0xA5', 'op:' + 0xA5); }
function cmdIndicator(on)  {
  if (activeProto.variant === 'so4' && so4Ver() === 'v42') { transmit(buildFrameD7(0xA0, [so4ModeByte0(b01(on)), 0x00], 0x00), 'indicator ' + (on ? 'on' : 'off') + ' 0xA0 (SO4 v42)', 'op:' + 0xA0); return; }
  if (activeProto.variant === 'so4' && so4Ver() === 'v51') { log('indicator light is not supported on SO4 V51 firmware.', 'log-err'); return; }
  transmit(buildFrameD7(0xA6, [b01(on)], 0x00), 'indicator light ' + (on ? 'on' : 'off') + ' 0xA6', 'op:' + 0xA6);
}
function cmdSetUnit(imperial) {
  if (activeProto.family === 'SO3') transmit(buildFrameD7(0xAB, [0x00, imperial ? 0x02 : 0x00], so3Secret), 'unit ' + (imperial ? 'mph' : 'km/h') + ' 0xAB', 'op:' + 0xAB);   // belegt: imperial=[00,02], metric=[00,00]
  else transmit(buildFrameD7(0xA7, [b01(imperial)], 0x00), 'unit ' + (imperial ? 'mph' : 'km/h') + ' 0xA7', 'op:' + 0xA7);
}
async function cmdSetName(name) {
  const s = (name || '').trim().slice(0, 20);
  if (!s) { log('name is empty.', 'log-err'); return; }
  const utf8 = Array.from(new TextEncoder().encode(s));
  if (activeProto.family === 'SO6') {
    if (utf8.length < 9) {
      transmit(buildFrameSO6(0x04, 0x01, utf8), 'set name "' + s + '" {04,01}', 'so6:4:1');
    } else {   // belegt: >=9 bytes -> first 9 in {04,01}, remainder in {04,02} after write success
      await transmit(buildFrameSO6(0x04, 0x01, utf8.slice(0, 9)), 'set name part 1 {04,01} (first 9 bytes)', 'so6:4:1');
      transmit(buildFrameSO6(0x04, 0x02, utf8.slice(9)), 'set name part 2 {04,02} (remainder)', 'so6:4:2');
    }
  } else {
    transmit(buildFrameD7(0xFF, utf8.concat([0x7F]), 0x00), 'set name "' + s + '" 0xFF', 'op:' + 0xFF);   // 0x7F trails the name (D7 only)
  }
}

// --------------------------- shortcut deep-link + auto-reconnect ---------------------------
// A home-screen shortcut opens the page with ?do=slow or ?do=fast. On load the page reconnects
// to the last granted scooter via getDevices() (no chooser), then runs the action once connected.

let pendingDeepAction = null;

function parseDeepLink() {
  try {
    let a = (new URLSearchParams(location.search).get('do') || '').toLowerCase();
    if (!a && location.hash) a = (new URLSearchParams(location.hash.replace(/^#/, '')).get('do') || '').toLowerCase();
    if (a === 'slow' || a === 'fast') { pendingDeepAction = a; log('shortcut: ' + a + ' requested'); }
  } catch (e) {}
}
function maybeRunDeepAction() {
  if (!pendingDeepAction || !connected) return;
  const a = pendingDeepAction; pendingDeepAction = null;
  if (!speedSupported()) { log('shortcut ' + a + ' ignored: this model/firmware has no BLE speed command.', 'log-err'); return; }
  if (a === 'fast') { const v = openSpeedValue(); log('shortcut: unlock -> ' + v + ' km/h'); cmdSetMaxSpeed(v, true); speedUnlocked = true; }
  else { const v = ekfvSpeedValue(); log('shortcut: lock -> ' + v + ' km/h (eKFV)'); cmdSetMaxSpeed(v, false); speedUnlocked = false; }
  updateToggleButton();
}
async function tryAutoReconnect() {
  if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return;
  try {
    const devs = await navigator.bluetooth.getDevices();
    if (!devs || !devs.length) return;
    const savedId = localStorage.getItem(LS_DEVICE);
    let dev = (savedId && devs.find(d => d.id === savedId)) || null;
    if (!dev && autoDetect) dev = devs.find(d => classifyByName(d.name)) || null;
    if (!dev) dev = devs.find(d => (d.name || '') && activeProto.prefixes.some(p => d.name.startsWith(p))) || null;
    if (!dev) return;
    // Classify by name like pickAndConnect, so the reconnect (auto mode, or a mismatched pick) uses the
    // correct protocol instead of the placeholder.
    const detected = classifyByName(dev.name);
    if (autoDetect) {
      if (detected) applyDetectedProto(detected, 'auto-reconnect detected ' + PROTOCOLS[detected].name + ' from "' + dev.name + '"');
      else { log('auto-reconnect: could not recognize "' + (dev.name || '(no name)') + '". Pick your model manually.', 'log-err'); return; }
    } else if (detected && detected !== activeProto.baseId) {
      applyDetectedProto(detected, 'note: the reconnected device is a ' + PROTOCOLS[detected].name + ', using that protocol.');
    }
    log('auto-reconnect: ' + (dev.name || dev.id));
    await connectGatt(dev);
  } catch (e) {
    setStatus('disconnected');
    log('auto-reconnect skipped: ' + e);
  }
}

// --------------------------- language ---------------------------

let lang = 'de';
function table() { return (window.I18N && window.I18N[lang]) || {}; }
function t(key) { const v = table()[key]; return (typeof v === 'string') ? v : ''; }

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(n => {
    const v = t(n.getAttribute('data-t'));
    if (/[<&]/.test(v)) n.innerHTML = v; else n.textContent = v;   // scan-ok: our own translation table
  });
  { const el = $('link-guide'); if (el) el.href = docFile('GUIDE'); }
  { const el = $('link-readme'); if (el) el.href = docFile('README'); }
  { const el = $('link-license'); if (el) el.href = docFile('LICENSE'); }
  { const el = $('link-privacy'); if (el) el.href = docFile('PRIVACY'); }
  { const el = $('link-trademarks'); if (el) el.href = docFile('TRADEMARKS'); }
  { const el = $('langs'); if (el) el.setAttribute('aria-label', t('langGroup')); }
  updateToggleButton();   // the toggle label is dynamic, refresh it after a language switch
  { const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const el = $('btn-theme');
    if (el) { el.setAttribute('aria-label', t(dark ? 'themeToLight' : 'themeToDark')); el.title = el.getAttribute('aria-label'); } }
  { const el = $('build-ver'); if (el) el.textContent = t('buildLabel') + ' ' + BUILD; }
  document.querySelectorAll('#langs button').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
  { const el = $('status'); setStatus(el ? el.dataset.state : 'disconnected'); }
  updateEncState();
}
function initLangSwitch() {
  document.querySelectorAll('#langs button').forEach(b => {
    b.addEventListener('click', () => { lang = b.dataset.lang; applyLang(); });
  });
}

// --------------------------- theme ---------------------------

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const b = $('btn-theme');
  if (b) {
    b.innerHTML = dark ? '&#9728;' : '&#9790;';   // scan-ok: a fixed character, not user input
    b.setAttribute('aria-label', t(dark ? 'themeToLight' : 'themeToDark'));
    b.title = b.getAttribute('aria-label');
  }
  try { localStorage.setItem(LS_THEME, dark ? 'dark' : 'light'); } catch (e) {}
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(LS_THEME); } catch (e) {}
  applyTheme(saved !== 'light');
  const b = $('btn-theme');
  if (b) b.addEventListener('click', () => { applyTheme(document.documentElement.getAttribute('data-theme') === 'light'); });
}

// --------------------------- document viewer ---------------------------

const DOC_TITLES = {
  'GUIDE.de.md': 'footGuide', 'GUIDE.en.md': 'footGuide',
  'PRIVACY.de.md': 'footPrivacy', 'PRIVACY.md': 'footPrivacy',
  'LICENSE.de.md': 'footLicense', 'LICENSE.md': 'footLicense',
  'TRADEMARKS.de.md': 'footTrademarks', 'TRADEMARKS.md': 'footTrademarks',
  'README.md': 'footReadme',
};
const escHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = s => s.toLowerCase().trim().replace(/[^\w\sÀ-ɏ-]/g, '').replace(/ /g, '-');

// Only the markdown these documents use: headings, lists with one level of nesting, tables, fenced
// code, quotes, rules, bold, inline code and links.
function mdToHtml(src) {
  const inline = s => escHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, text, href) => {
      if (DOC_TITLES[href]) return `<a href="${href}" data-docfile="${href}">${text}</a>`;
      if (href.startsWith('#')) return `<a href="${href}" data-anchor="${href.slice(1)}">${text}</a>`;
      return `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
    });
  const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let listKind = null, li = null, para = [], inFence = false;
  const sink = () => (li ? li.parts : out);
  const flushPara = () => { if (para.length) { sink().push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const closeNested = () => { if (li && li.nested) { li.parts.push('</ul>'); li.nested = false; } };
  const closeLi = () => { if (!li) return; flushPara(); closeNested(); out.push('<li>' + li.parts.join('\n') + '</li>'); li = null; };
  const closeList = () => { closeLi(); if (listKind) { out.push('</' + listKind + '>'); listKind = null; } };
  const block = () => { flushPara(); closeList(); };
  const openList = kind => { flushPara(); if (listKind !== kind) { closeList(); out.push('<' + kind + '>'); listKind = kind; } else closeLi(); };
  const cells = l => l.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const body = l.trim();
    const indented = /^ {2,}\S/.test(l);
    if (inFence) { if (body.startsWith('```')) { sink().push('</code></pre>'); inFence = false; } else sink().push(escHtml(l)); continue; }
    if (body.startsWith('```')) { if (li) { flushPara(); closeNested(); } else block(); sink().push('<pre><code>'); inFence = true; continue; }
    if (body === '') { if (li && /^ {2,}\S/.test(lines[i + 1] || '')) flushPara(); else block(); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(body)) { block(); out.push('<hr>'); continue; }
    if (body.startsWith('|') && /^\|[\s:|-]+\|?\s*$/.test((lines[i + 1] || '').trim())) {
      if (li) { flushPara(); closeNested(); } else block();
      sink().push('<div class="doc-table"><table><thead><tr>' + cells(body).map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>');
      i++;
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith('|')) {
        sink().push('<tr>' + cells(lines[++i].trim()).map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>');
      }
      sink().push('</tbody></table></div>');
      continue;
    }
    let m;
    if ((m = body.match(/^(#{1,4})\s+(.*)$/))) { block(); const n = m[1].length; out.push(`<h${n} id="${slug(m[2])}">${inline(m[2])}</h${n}>`); continue; }
    if ((m = body.match(/^>\s?(.*)$/))) { if (li) { flushPara(); closeNested(); } else block(); sink().push('<blockquote>' + inline(m[1]) + '</blockquote>'); continue; }
    if (indented && li && (m = body.match(/^[-*]\s+(.*)$/))) { flushPara(); if (!li.nested) { li.parts.push('<ul class="nested">'); li.nested = true; } li.parts.push('<li>' + inline(m[1]) + '</li>'); continue; }
    if ((m = body.match(/^[-*]\s+(.*)$/)) && !indented) { openList('ul'); li = { parts: [inline(m[1])], nested: false }; continue; }
    if ((m = body.match(/^\d+\.\s+(.*)$/)) && !indented) { openList('ol'); li = { parts: [inline(m[1])], nested: false }; continue; }
    if (li && !indented) closeList();
    if (li) closeNested();
    para.push(body);
  }
  if (inFence) sink().push('</code></pre>');
  block();
  // Join the blocks, then drop the stray newline right after an opened code fence so a code block
  // does not start with an empty first line.
  return out.join('\n').replace(/<pre><code>\n/g, '<pre><code>');
}

const docCache = {};
const docFile = name => {
  if (name === 'GUIDE') return `GUIDE.${lang}.md`;
  if (name === 'README') return 'README.md';   // only exists in English
  return lang === 'de' ? `${name}.de.md` : `${name}.md`;
};
function openDoc(name, anchor, titleKey) { openDocFile(docFile(name), anchor, titleKey); }
function openDocFile(file, anchor, titleKey) {
  const dlg = $('doc'), body = $('doc-body');
  if (!dlg || !body) return;
  const mark = (lang === 'de' && !file.includes('.de.') && file !== 'README.md') ? ' ' + t('docEnglish') : '';
  $('doc-title').textContent = (t(titleKey || DOC_TITLES[file] || '') || file) + mark;
  if (typeof dlg.showModal === 'function') dlg.showModal();
  const show = html => {
    body.innerHTML = html;   // scan-ok: markdown of our own documents, rendered by mdToHtml which escapes first
    const h1 = body.querySelector('h1');
    if (h1) { $('doc-title').textContent = h1.textContent.trim() + mark; h1.remove(); }
    body.scrollTop = 0;
    if (!anchor) return;
    const target = body.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(anchor) : anchor));
    if (target) body.scrollTop = target.offsetTop - body.offsetTop;
  };
  if (docCache[file]) { show(docCache[file]); return; }
  body.innerHTML = '<p>' + escHtml(t('docLoading')) + '</p>';   // scan-ok: escaped
  fetch(file + '?v=' + BUILD)
    .then(r => { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.text(); })
    .then(txt => { docCache[file] = mdToHtml(txt); show(docCache[file]); })
    .catch(e => {
      body.innerHTML = '<p>' + escHtml(t('docFail')) + '</p><pre class="err">'   // scan-ok: escaped
                     + escHtml(file + ': ' + (e && e.message ? e.message : e)) + '</pre>';
    });
}
function wireDocViewer() {
  document.addEventListener('click', e => {
    if (!e.target.closest) return;
    const jump = e.target.closest('[data-anchor]');
    if (jump) {
      e.preventDefault();
      const body = $('doc-body');
      const target = body && body.querySelector('#' + CSS.escape(jump.getAttribute('data-anchor')));
      if (target) body.scrollTop = target.offsetTop - body.offsetTop;
      return;
    }
    const disc = e.target.closest('[data-open-disclaimer]');
    if (disc) { e.preventDefault(); openHelp('disclaimer'); return; }
    const a = e.target.closest('[data-doc], [data-docfile]');
    if (!a) return;
    e.preventDefault();
    const anchor = a.getAttribute('data-doc-anchor') || '';
    const file = a.getAttribute('data-docfile');
    const titleKey = a.getAttribute('data-t') || '';
    if (file) openDocFile(file, anchor, titleKey); else openDoc(a.getAttribute('data-doc'), anchor, titleKey);
  });
  ['doc-x', 'doc-close'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => { const d = $('doc'); if (d) d.close(); }); });
}

// --------------------------- init ---------------------------

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.help-btn').forEach(btn => btn.addEventListener('click', () => openHelp(btn.getAttribute('data-help'))));
  ['help-x', 'help-close'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', closeHelp); });
  { const b = $('link-disclaimer'); if (b) b.addEventListener('click', e => { e.preventDefault(); openHelp('disclaimer'); }); }
  logDiagnosticHeader();
  initLangSwitch();
  initTheme();
  wireDocViewer();
  buildModelDropdown();

  // Restore the saved model, then render the language and the per-model UI. Default is auto detect so a
  // fresh visitor can just tap Connect and the page recognizes the scooter by its advertised name.
  let saved = null;
  try { saved = localStorage.getItem(LS_MODEL); } catch (e) {}
  const validModel = (saved === 'auto') || !!PROTOCOLS[saved] || !!BRANDED[saved];
  setModel(validModel ? saved : 'auto', true);
  { try { const s = localStorage.getItem(LS_SPEED); if (s && $('speed-in')) $('speed-in').value = s; } catch (e) {} }
  { try { const k = localStorage.getItem(LS_EKFV); if (k && $('ekfv-in')) $('ekfv-in').value = k; } catch (e) {} }
  applyLang();

  // The AES self-test result, in the log and under the encryption card.
  log('AES self-test (both keys, encrypt+decrypt): ' + (AES_OK ? 'OK' : 'FAILED'), AES_OK ? 'log-ok' : 'log-err');
  if (modelChosen) {
    log('model: ' + activeProto.name + ' [' + activeProto.family + (activeProto.variant ? '/' + activeProto.variant : '') +
        ', ' + TRANSPORTS[activeProto.transport].name + ', crypto ' + cryptoLabel(activeProto) + ', speed ' + (activeProto.speed ? 'yes' : 'no') + ']');
  } else {
    log('no model selected yet. Pick your model to begin.');
  }

  $('btn-conn').addEventListener('click', () => {
    if ($('btn-conn').dataset.act === 'disconnect') disconnectBle(); else pickAndConnect();
  });
  { const sel = $('model-in'); if (sel) sel.addEventListener('change', () => setModel(sel.value)); }
  $('btn-toggle').addEventListener('click', doSpeedToggle);
  { const s = $('speed-in'); if (s) s.addEventListener('change', () => { try { localStorage.setItem(LS_SPEED, s.value); } catch (e) {} }); }
  { const e2 = $('ekfv-in'); if (e2) e2.addEventListener('change', () => { try { localStorage.setItem(LS_EKFV, e2.value); } catch (er) {} }); }
  $('btn-set-mode').addEventListener('click', () => cmdSetSpeedMode(parseInt($('mode-in').value, 10)));
  { const b = $('btn-vlock'); if (b) b.addEventListener('click', () => ($('vlock-in').value === '1' ? cmdLock() : cmdUnlock())); }
  $('btn-bat').addEventListener('click', cmdBatteryUnlock);
  { const b = $('btn-light'); if (b) b.addEventListener('click', () => cmdFrontLight($('light-in').value === '1')); }
  { const b = $('btn-dark');  if (b) b.addEventListener('click', () => cmdDarkMode($('dark-in').value === '1')); }
  { const b = $('btn-zero');  if (b) b.addEventListener('click', () => cmdZeroStart($('zero-in').value === '1')); }
  { const b = $('btn-ind');   if (b) b.addEventListener('click', () => cmdIndicator($('ind-in').value === '1')); }
  { const b = $('btn-unit');  if (b) b.addEventListener('click', () => cmdSetUnit($('unit-in').value === '1')); }
  { const b = $('btn-name');  if (b) b.addEventListener('click', () => cmdSetName($('name-in').value)); }
  { const b = $('btn-copy-log'); if (b) b.addEventListener('click', copyLog); }
  { const b = $('btn-diag'); if (b) b.addEventListener('click', scanAllDevicesDiagnostic); }
  { const b = $('btn-clear-log'); if (b) b.addEventListener('click', clearLog); }

  setControlsEnabled(false);
  updateEncState();
  if (!navigator.bluetooth) log('Web Bluetooth not available. On iOS use the Bluefy browser.', 'log-err');
  parseDeepLink();
  if (pendingDeepAction) tryAutoReconnect();
});
