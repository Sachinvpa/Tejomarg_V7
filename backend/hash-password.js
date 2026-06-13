/* =====================================================================
 * Credential manager for the Tejomarg Quotation Portal.
 *
 * Adds or updates a user in backend/users.json. The plain password is
 * only ever passed on the command line — it is hashed (scrypt + random
 * salt) before being written, so users.json never contains the password.
 *
 * Usage:
 *    node backend/hash-password.js <userid> '<password>'
 *
 * Example:
 *    node backend/hash-password.js contact@tejomarg.org 'Tejomarg@123'
 * ===================================================================== */

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

const [, , userid, password] = process.argv;
if (!userid || !password) {
  console.error("Usage: node backend/hash-password.js <userid> '<password>'");
  process.exit(1);
}

const USERS_FILE = path.join(__dirname, 'users.json');
let users = {};
try { users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch (_) {}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, Buffer.from(salt, 'hex'), 32).toString('hex');
users[userid.toLowerCase()] = { salt, hash };

fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2) + '\n');
console.log('Saved credential for "' + userid.toLowerCase() + '" to backend/users.json');
