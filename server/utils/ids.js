'use strict';

const crypto = require('crypto');

function newId() {
  return crypto.randomUUID();
}

// Unambiguous alphabet for public order tracking codes.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function orderCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

module.exports = { newId, orderCode };
