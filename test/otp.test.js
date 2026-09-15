const assert = require('node:assert/strict');
const { generateOtp } = require('../src/otp');

for (let attempt = 0; attempt < 100; attempt += 1) {
  const otp = generateOtp(6);

  assert.match(otp, /^\d{6}$/);
}

console.log('OTP generator checks passed');