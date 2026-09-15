const crypto = require('node:crypto');
const config = require('./config');

function generateOtp(length = config.otpLength, random = crypto.randomInt) {
  const maximum = 10 ** length;
  const value = random(0, maximum);

  return String(value).padStart(length, '0');
}

function createOtpService({
  config: serviceConfig = config,
  randomInt = crypto.randomInt,
  now = () => Date.now(),
} = {}) {
  const userState = new Map();

  function getUser(email) {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      throw new Error('An email address is required.');
    }

    if (!userState.has(normalizedEmail)) {
      userState.set(normalizedEmail, {
        requestHistory: [],
        lastGeneratedAt: 0,
        lastCode: null,
        currentOtp: null,
      });
    }

    return userState.get(normalizedEmail);
  }

  function pruneHistory(history, cutoff) {
    return history.filter((timestamp) => timestamp > cutoff);
  }

  function generateUniqueCode(user) {
    const dayWindow = 24 * 60 * 60 * 1000;

    let candidate = generateOtp(serviceConfig.otpLength, randomInt);
    let attempts = 0;

    while (
      attempts < 25 &&
      user.lastCode &&
      user.lastGeneratedAt &&
      now() - user.lastGeneratedAt < dayWindow &&
      user.lastCode === candidate
    ) {
      candidate = generateOtp(serviceConfig.otpLength, randomInt);
      attempts += 1;
    }

    return candidate;
  }

  function sendOtp(email) {
    const user = getUser(email);
    const timestamp = now();
    const hourWindow = 60 * 60 * 1000;
    const resendWindow = serviceConfig.resendWindowMinutes * 60 * 1000;

    user.requestHistory = pruneHistory(user.requestHistory, timestamp - hourWindow);

    if (user.currentOtp && user.currentOtp.expiresAt > timestamp) {
      const timeSinceCreation = timestamp - user.currentOtp.createdAt;
      const resendAllowed =
        timeSinceCreation <= resendWindow &&
        user.currentOtp.resendCount < serviceConfig.maxResendsPerOtp;

      if (resendAllowed) {
        user.currentOtp.expiresAt = timestamp + serviceConfig.otpExpirySeconds * 1000;
        user.currentOtp.resendCount += 1;

        return {
          status: 'ok',
          code: user.currentOtp.code,
          isResend: true,
          expiresAt: user.currentOtp.expiresAt,
        };
      }
    }

    if (user.requestHistory.length >= serviceConfig.maxRequestsPerHour) {
      return {
        status: 'error',
        reason: 'max-requests-per-hour',
      };
    }

    const otpCode = generateUniqueCode(user);
    const entry = {
      code: otpCode,
      createdAt: timestamp,
      expiresAt: timestamp + serviceConfig.otpExpirySeconds * 1000,
      resendCount: 0,
      used: false,
    };

    if (user.currentOtp && !user.currentOtp.used) {
      user.currentOtp.used = true;
    }

    user.currentOtp = entry;
    user.lastCode = otpCode;
    user.lastGeneratedAt = timestamp;
    user.requestHistory.push(timestamp);

    return {
      status: 'ok',
      code: otpCode,
      isResend: false,
      expiresAt: entry.expiresAt,
    };
  }

  function verifyOtp(email, otpCode, { now: suppliedNow = now } = {}) {
    const user = userState.get(String(email || '').trim().toLowerCase());
    const timestamp = suppliedNow();

    if (!user || !user.currentOtp) {
      return { valid: false, reason: 'not-found' };
    }

    const currentOtp = user.currentOtp;

    if (currentOtp.used) {
      return { valid: false, reason: 'used' };
    }

    if (String(otpCode) !== currentOtp.code) {
      return { valid: false, reason: 'invalid' };
    }

    if (timestamp > currentOtp.expiresAt) {
      return { valid: false, reason: 'expired' };
    }

    currentOtp.used = true;

    return {
      valid: true,
      reason: 'valid',
      expiresAt: currentOtp.expiresAt,
    };
  }

  return { sendOtp, verifyOtp, userState };
}

module.exports = { generateOtp, createOtpService };