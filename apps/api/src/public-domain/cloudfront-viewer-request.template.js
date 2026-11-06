/**
 * CloudFront Function (viewer-request) — CUP360 contrato de borda.
 * Placeholders: __SECRET__, __ALIASES_JSON__, __VERSION__
 * O provisionador substitui antes de CreateFunction/UpdateFunction.
 * Runtime: cloudfront-js-1.0 (sem import; função síncrona handler(event)).
 */
function handler(event) {
  var req = event.request;
  var h = req.headers;
  var raw =
    h.host && h.host.value
      ? h.host.value
      : h.Host && h.Host.value
        ? h.Host.value
        : '';
  var host = String(raw).split(',')[0].trim().toLowerCase();
  var ci = host.indexOf(':');
  if (ci > 0) host = host.substring(0, ci);
  while (host.length > 0 && host.charAt(host.length - 1) === '.') {
    host = host.substring(0, host.length - 1);
  }

  var aliases = __ALIASES_JSON__;
  var ok = false;
  for (var i = 0; i < aliases.length; i++) {
    if (aliases[i] === host) {
      ok = true;
      break;
    }
  }
  if (!ok) {
    return {
      statusCode: 403,
      statusDescription: 'Forbidden',
    };
  }

  if (h['x-cup360-edge-sig']) delete h['x-cup360-edge-sig'];
  if (h['x-cup360-edge-ts']) delete h['x-cup360-edge-ts'];
  if (h['x-cup360-edge-v']) delete h['x-cup360-edge-v'];
  if (h['x-cup360-edge-host']) delete h['x-cup360-edge-host'];
  if (h['x-forwarded-host']) delete h['x-forwarded-host'];
  if (h['X-Forwarded-Host']) delete h['X-Forwarded-Host'];

  var ts = Math.floor(Date.now() / 1000);
  var version = '__VERSION__';
  var payload = version + '|' + ts + '|' + host;
  var sig = hmacSha256Hex('__SECRET__', payload);

  h['x-cup360-edge-v'] = { value: version };
  h['x-cup360-edge-ts'] = { value: String(ts) };
  h['x-cup360-edge-host'] = { value: host };
  h['x-cup360-edge-sig'] = { value: sig };

  return req;
}

function hmacSha256Hex(keyStr, msgStr) {
  var block = 64;
  var k = utf8Bytes(keyStr);
  if (k.length > block) k = sha256Raw(k);
  var ipad = new Array(block);
  var opad = new Array(block);
  for (var i = 0; i < block; i++) {
    var kb = i < k.length ? k[i] : 0;
    ipad[i] = kb ^ 0x36;
    opad[i] = kb ^ 0x5c;
  }
  var inner = sha256Raw(joinBytes(ipad, utf8Bytes(msgStr)));
  return bytesToHex(sha256Raw(joinBytes(opad, inner)));
}

function joinBytes(a, b) {
  var out = new Array(a.length + b.length);
  for (var i = 0; i < a.length; i++) out[i] = a[i];
  for (var j = 0; j < b.length; j++) out[a.length + j] = b[j];
  return out;
}

function utf8Bytes(s) {
  var bytes = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) {
      bytes.push(0xc0 | (c >> 6));
      bytes.push(0x80 | (c & 0x3f));
    } else if (c < 0xd800 || c >= 0xe000) {
      bytes.push(0xe0 | (c >> 12));
      bytes.push(0x80 | ((c >> 6) & 0x3f));
      bytes.push(0x80 | (c & 0x3f));
    } else {
      i++;
      c = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(i) & 0x3ff));
      bytes.push(0xf0 | (c >> 18));
      bytes.push(0x80 | ((c >> 12) & 0x3f));
      bytes.push(0x80 | ((c >> 6) & 0x3f));
      bytes.push(0x80 | (c & 0x3f));
    }
  }
  return bytes;
}

function sha256Raw(msg) {
  return sha256(msg);
}

function bytesToHex(b) {
  var hex = [];
  for (var i = 0; i < b.length; i++) {
    var x = b[i].toString(16);
    if (x.length === 1) x = '0' + x;
    hex.push(x);
  }
  return hex.join('');
}

/* SHA-256 mínimo (RFC 6234) — sem dependências externas */
var K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0xfc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n, x) {
  return (x >>> n) | (x << (32 - n));
}

function ch(x, y, z) {
  return (x & y) ^ (~x & z);
}

function maj(x, y, z) {
  return (x & y) ^ (x & z) ^ (y & z);
}

function Sigma0(x) {
  return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
}

function Sigma1(x) {
  return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
}

function sigma0(x) {
  return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
}

function sigma1(x) {
  return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
}

function sha256(messageBytes) {
  var l = messageBytes.length * 8;
  var withOne = messageBytes.slice();
  withOne.push(0x80);
  while ((withOne.length % 64) !== 56) withOne.push(0);
  for (var i = 7; i >= 0; i--) {
    withOne.push((l / Math.pow(2, 8 * i)) & 0xff);
  }
  var H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  var W = new Array(64);
  for (var chunk = 0; chunk < withOne.length; chunk += 64) {
    for (var t = 0; t < 16; t++) {
      W[t] =
        (withOne[chunk + t * 4] << 24) |
        (withOne[chunk + t * 4 + 1] << 16) |
        (withOne[chunk + t * 4 + 2] << 8) |
        withOne[chunk + t * 4 + 3];
    }
    for (var t = 16; t < 64; t++) {
      W[t] = (sigma1(W[t - 2]) + W[t - 7] + sigma0(W[t - 15]) + W[t - 16]) | 0;
    }
    var a = H[0],
      b = H[1],
      c = H[2],
      d = H[3],
      e = H[4],
      f = H[5],
      g = H[6],
      h = H[7];
    for (var t = 0; t < 64; t++) {
      var T1 = (h + Sigma1(e) + ch(e, f, g) + K256[t] + W[t]) | 0;
      var T2 = (Sigma0(a) + maj(a, b, c)) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + T1) | 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) | 0;
    }
    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }
  var out = [];
  for (var i = 0; i < 8; i++) {
    out.push((H[i] >>> 24) & 0xff);
    out.push((H[i] >>> 16) & 0xff);
    out.push((H[i] >>> 8) & 0xff);
    out.push(H[i] & 0xff);
  }
  return out;
}
