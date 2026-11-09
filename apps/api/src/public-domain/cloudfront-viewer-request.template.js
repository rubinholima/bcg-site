/**
 * CloudFront Function (viewer-request) — CUP360 contrato de borda.
 * Placeholders: __SECRET__, __ALIASES_JSON__, __VERSION__
 * Runtime: cloudfront-js-2.0 (crypto HMAC SHA-256).
 */
import crypto from 'crypto';

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

  var ts = Math.floor(Date.now() / 1000);
  var version = '__VERSION__';
  var payload = version + '|' + ts + '|' + host;
  var sig = crypto.createHmac('sha256', __SECRET__).update(payload).digest('hex');

  h['x-cup360-edge-v'] = { value: version };
  h['x-cup360-edge-ts'] = { value: String(ts) };
  h['x-cup360-edge-host'] = { value: host };
  h['x-cup360-edge-sig'] = { value: sig };

  return req;
}
