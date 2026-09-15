const crypto = require('node:crypto');

function generateOtp(length) {
  const maximum = 10 ** length;
  const value = crypto.randomInt(0, maximum);

  return String(value).padStart(length, '0');
}

module.exports = { generateOtp };