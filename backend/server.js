/* =====================================================================
 * Tejomarg Foundation — website + Quotation Portal auth server
 * ---------------------------------------------------------------------
 * Serves the static site AND handles login server-side. Credentials are
 * NEVER sent to the browser: they live in backend/users.json as a salted
 * scrypt hash, and the password is verified here, on the server.
 *
 * On success the server issues a signed, HttpOnly session cookie. The
 * /Quotation_portal/ directory (the portal + rendered quotations) is
 * gated behind that cookie, so it cannot be opened without logging in.
 *
 * To change a password, run:
 *    node backend/hash-password.js contact@tejomarg.org 'NewPassword'
 * ===================================================================== */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT        = path.resolve(__dirname, '..');           // Tejomarg_Website/
const PORT        = 4490;
const HOST        = '127.0.0.1';
const USERS_FILE  = path.join(__dirname, 'users.json');
const SECRET_FILE = path.join(__dirname, '.session-secret');
const COOKIE      = 'tmf_session';
const SESSION_TTL = 8 * 60 * 60 * 1000;                      // 8 hours
const LOGIN_PAGE  = '/quotation-login.html';
const PORTAL_HOME = '/Quotation_portal/portal.html';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.json': 'application/json', '.b64': 'text/plain',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

/* ---- session secret (persisted so a restart doesn't drop logins) ---- */
function getSecret() {
  try { return fs.readFileSync(SECRET_FILE); }
  catch (_) {
    const s = crypto.randomBytes(48);
    fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
    return s;
  }
}
const SECRET = getSecret();

/* ---- credential verification (server-side only) ---- */
function loadUsers() {
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); }
  catch (_) { return {}; }
}
function verify(userid, password) {
  const rec = loadUsers()[String(userid).toLowerCase()];
  if (!rec || !rec.salt || !rec.hash) return false;
  const got  = crypto.scryptSync(password, Buffer.from(rec.salt, 'hex'), 32);
  const want = Buffer.from(rec.hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/* ---- signed session tokens (HMAC, no DB needed) ---- */
function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac  = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return data + '.' + mac;
}
function validToken(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [data, mac] = token.split('.');
  const expect = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let payload;
  try { payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); }
  catch (_) { return null; }
  if (!payload.exp || Date.now() > payload.exp) return null;
  return payload;
}
function parseCookies(req) {
  const out = {}; const h = req.headers.cookie;
  if (!h) return out;
  h.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
const isAuthed = req => !!validToken(parseCookies(req)[COOKIE]);

/* ---- routing helpers ---- */
const isProtected = p => p === '/Quotation_portal' || p.startsWith('/Quotation_portal/');
const isBlocked   = p => p.startsWith('/backend') ||
                         p.split('/').some(seg => seg && seg[0] === '.');

function readBody(req, cb) {
  let data = '';
  req.on('data', c => { data += c; if (data.length > 10000) req.destroy(); });
  req.on('end', () => cb(data));
}
function sendJSON(res, code, obj, headers) {
  res.writeHead(code, Object.assign({ 'content-type': 'application/json' }, headers || {}));
  res.end(JSON.stringify(obj));
}

/* ---- server ---- */
http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  /* --- API: login --- */
  if (req.method === 'POST' && urlPath === '/api/login') {
    return readBody(req, body => {
      let creds = {};
      try { creds = JSON.parse(body || '{}'); } catch (_) {}
      const userid   = String(creds.userid || '').trim();
      const password = String(creds.password || '');
      if (verify(userid, password)) {
        const token = sign({ u: userid.toLowerCase(), exp: Date.now() + SESSION_TTL });
        return sendJSON(res, 200, { ok: true, redirect: PORTAL_HOME }, {
          'set-cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}`
        });
      }
      return sendJSON(res, 401, { ok: false, error: 'The User ID or Password is incorrect.' });
    });
  }

  /* --- API: logout --- */
  if (req.method === 'POST' && urlPath === '/api/logout') {
    return sendJSON(res, 200, { ok: true }, {
      'set-cookie': `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`
    });
  }

  /* --- API: session check (used by the portal page) --- */
  if (req.method === 'GET' && urlPath === '/api/session') {
    return sendJSON(res, 200, { authed: isAuthed(req) });
  }

  /* --- static files --- */
  let p = urlPath === '/' ? '/index.html' : urlPath;

  if (isBlocked(p)) { res.writeHead(404); return res.end('Not found'); }

  if (isProtected(p) && !isAuthed(req)) {
    res.writeHead(302, { location: LOGIN_PAGE });
    return res.end();
  }

  const filePath = path.normalize(path.join(ROOT, p));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  fs.readFile(filePath, (e, d) => {
    if (e) { res.writeHead(404); return res.end('Not found'); }
    const headers = { 'content-type': MIME[path.extname(filePath)] || 'application/octet-stream' };
    if (isProtected(p)) headers['cache-control'] = 'no-store';
    res.writeHead(200, headers);
    res.end(d);
  });
}).listen(PORT, HOST, () => console.log('Tejomarg site + auth server on http://' + HOST + ':' + PORT));
