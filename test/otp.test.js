const assert = require('node:assert/strict');
const { createOtpService, generateOtp } = require('../src/otp');

const baseConfig = {
  maxRequestsPerHour: 3,
  otpExpirySeconds: 30,
  resendWindowMinutes: 5,
  maxResendsPerOtp: 3,
  otpLength: 6,
};

function withService({ now = () => 1_000, sequence = [], config = baseConfig } = {}) {
  const values = [...sequence];
  const randomInt = (min, max) => {
    if (values.length === 0) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    return values.shift();
  };

  return createOtpService({ config, now, randomInt });
}

{
  const otp = generateOtp(6, () => 123456);
  assert.match(otp, /^\d{6}$/);
  assert.equal(otp, '123456');
}

{
  const service = withService({ sequence: [123456, 234567] });
  const first = service.sendOtp('student@example.com');
  const second = service.sendOtp('student@example.com');

  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  assert.equal(second.isResend, true);
  assert.equal(second.code, '123456');
}

{
  let tick = 1_000;
  const service = withService({
    now: () => tick,
    sequence: [123456, 234567, 345678, 456789],
  });

  service.sendOtp('rate@example.com');
  tick += 6 * 60_000;
  service.sendOtp('rate@example.com');
  tick += 6 * 60_000;
  service.sendOtp('rate@example.com');
  tick += 6 * 60_000;

  const rejected = service.sendOtp('rate@example.com');
  assert.equal(rejected.status, 'error');
  assert.equal(rejected.reason, 'max-requests-per-hour');
}

{
  const service = withService({
    now: () => 1_000,
    sequence: [123456],
  });

  const first = service.sendOtp('resend@example.com');
  const second = service.sendOtp('resend@example.com');

  assert.equal(first.code, '123456');
  assert.equal(second.code, '123456');
  assert.equal(second.isResend, true);
}

{
  let tick = 1_000;
  const service = withService({
    now: () => tick,
    sequence: [123456],
  });

  const first = service.sendOtp('expired-resend@example.com');
  tick += 31_000;
  const resent = service.sendOtp('expired-resend@example.com');

  assert.equal(resent.status, 'ok');
  assert.equal(resent.isResend, true);
  assert.equal(resent.code, first.code);
}

{
  let tick = 1_000;
  const service = withService({
    now: () => tick,
    sequence: [111111, 111111, 222222],
  });

  const first = service.sendOtp('history@example.com');
  tick += 6 * 60_000;
  const second = service.sendOtp('history@example.com');

  assert.equal(first.code, '111111');
  assert.equal(second.code, '222222');
}

{
  let tick = 1_000;
  const service = withService({
    now: () => tick,
    sequence: [123456, 654321],
  });

  const first = service.sendOtp('rollback@example.com');
  first.rollback();
  const retry = service.sendOtp('rollback@example.com');

  assert.notEqual(retry.code, first.code);
  assert.equal(retry.isResend, false);
}

{
  let tick = 1_000;
  const service = withService({
    now: () => tick,
    sequence: [123456],
  });

  const first = service.sendOtp('resend-rollback@example.com');
  tick += 31_000;
  const failedDelivery = service.sendOtp('resend-rollback@example.com');
  failedDelivery.rollback();
  const retry = service.sendOtp('resend-rollback@example.com');

  assert.equal(retry.code, first.code);
  assert.equal(retry.isResend, true);
}

{
  const service = withService({
    now: () => 1_000,
    sequence: [123456, 654321],
  });

  service.sendOtp('verify@example.com');
  const valid = service.verifyOtp('verify@example.com', '123456');
  const usedAgain = service.verifyOtp('verify@example.com', '123456');
  const malformed = service.verifyOtp('verify@example.com', '12345');

  assert.equal(valid.valid, true);
  assert.equal(usedAgain.valid, false);
  assert.equal(usedAgain.reason, 'used');
  assert.equal(malformed.valid, false);
}

{
  const service = withService({
    now: () => 1_000,
    sequence: [123456],
  });

  service.sendOtp('expire@example.com');
  const expired = service.verifyOtp('expire@example.com', '123456', { now: () => 1_000 + (30 * 1000) + 1 });

  assert.equal(expired.valid, false);
  assert.equal(expired.reason, 'expired');
}

{
  let tick = 1_000;
  const service = withService({
    now: () => tick,
    sequence: [555555, 666666],
  });

  const first = service.sendOtp('latest@example.com');
  tick = 1_000 + (6 * 60 * 1000) + 1;
  const second = service.sendOtp('latest@example.com');

  assert.equal(first.code, '555555');
  assert.equal(second.code, '666666');

  const oldOtp = service.verifyOtp('latest@example.com', '555555');
  assert.equal(oldOtp.valid, false);
  assert.equal(oldOtp.reason, 'invalid');
}

console.log('OTP service tests passed');