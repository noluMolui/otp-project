const crypto = require('node:crypto');
const config = require('./config');

function generateOtp(length = config.otpLength, random = crypto.randomInt) {
  const maximum = 10 ** length;
  const value = random(0, maximum);

  return String(value).padStart(length, '0');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function createOtpService({
  config: serviceConfig = config,
  randomInt = crypto.randomInt,
  now = () => Date.now(),
} = {}) {
  const userState = new Map();

  function getUser(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      throw new Error('An email address is required.');
    }

    if (!userState.has(normalizedEmail)) {
      userState.set(normalizedEmail, {
        requestHistory: [],
        generatedOtps: [],
        currentOtp: null,
      });
    }

    return userState.get(normalizedEmail);
  }

  function pruneHistory(history, cutoff) {
    return history.filter((timestamp) => timestamp > cutoff);
  }

  function generateUniqueCode(user, timestamp) {
    const dayWindow = 24 * 60 * 60 * 1000;
    const recentCodes = new Set(
      user.generatedOtps
        .filter((entry) => entry.generatedAt > timestamp - dayWindow)
        .map((entry) => entry.code),
    );

    let candidate = generateOtp(serviceConfig.otpLength, randomInt);
    let attempts = 0;

    while (recentCodes.has(candidate) && attempts < 100) {
      candidate = generateOtp(serviceConfig.otpLength, randomInt);
      attempts += 1;
    }

    if (recentCodes.has(candidate)) {
      throw new Error('Unable to generate a unique OTP.');
    }

    return candidate;
  }

  function sendOtp(email) {
    const user = getUser(email);
    const timestamp = now();
    const hourWindow = 60 * 60 * 1000;
    const dayWindow = 24 * 60 * 60 * 1000;
    const resendWindow = serviceConfig.resendWindowMinutes * 60 * 1000;
    const previousState = {
      requestHistory: [...user.requestHistory],
      generatedOtps: user.generatedOtps.map((entry) => ({ ...entry })),
      currentOtp: user.currentOtp ? { ...user.currentOtp } : null,
    };

    const rollback = () => {
      user.requestHistory = previousState.requestHistory;
      user.generatedOtps = previousState.generatedOtps;
      user.currentOtp = previousState.currentOtp;
    };

    user.requestHistory = pruneHistory(user.requestHistory, timestamp - hourWindow);
    user.generatedOtps = user.generatedOtps.filter(
      (entry) => entry.generatedAt > timestamp - dayWindow,
    );

    if (user.currentOtp) {
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
          rollback,
        };
      }
    }

    if (user.requestHistory.length >= serviceConfig.maxRequestsPerHour) {
      return {
        status: 'error',
        reason: 'max-requests-per-hour',
      };
    }

    const otpCode = generateUniqueCode(user, timestamp);
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
    user.generatedOtps.push({ code: otpCode, generatedAt: timestamp });
    user.requestHistory.push(timestamp);

    return {
      status: 'ok',
      code: otpCode,
      isResend: false,
      expiresAt: entry.expiresAt,
      rollback,
    };
  }

  function verifyOtp(email, otpCode, { now: suppliedNow = now } = {}) {
    const user = userState.get(normalizeEmail(email));
    const timestamp = suppliedNow();

    if (!user || !user.currentOtp) {
      return { valid: false, reason: 'not-found' };
    }

    const currentOtp = user.currentOtp;

    if (currentOtp.used) {
      return { valid: false, reason: 'used' };
    }

    const submittedCode = String(otpCode || '');
    if (!/^\d{6}$/.test(submittedCode)) {
      return { valid: false, reason: 'invalid' };
    }

    const submittedBuffer = Buffer.from(submittedCode);
    const storedBuffer = Buffer.from(currentOtp.code);
    if (
      submittedBuffer.length !== storedBuffer.length ||
      !crypto.timingSafeEqual(submittedBuffer, storedBuffer)
    ) {
      return { valid: false, reason: 'invalid' };
    }

    if (timestamp >= currentOtp.expiresAt) {
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

module.exports = { generateOtp, createOtpService, isValidEmail, normalizeEmail };