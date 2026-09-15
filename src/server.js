const express = require('express');
const path = require('node:path');
const { createOtpService } = require('./otp');

const app = express();
const port = Number(process.env.PORT || 3000);
const otpService = createOtpService();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/otp/send', (request, response) => {
  const { email } = request.body || {};

  if (!email) {
    return response.status(400).json({ status: 'error', reason: 'email-required' });
  }

  const result = otpService.sendOtp(email);

  if (result.status === 'error') {
    return response.status(429).json(result);
  }

  return response.json({
    status: 'ok',
    code: result.code,
    isResend: Boolean(result.isResend),
    expiresAt: result.expiresAt,
  });
});

app.post('/api/otp/verify', (request, response) => {
  const { email, otp } = request.body || {};

  if (!email || !otp) {
    return response.status(400).json({ status: 'error', reason: 'email-and-otp-required' });
  }

  const result = otpService.verifyOtp(email, otp);

  if (!result.valid) {
    return response.status(400).json({ status: 'error', reason: result.reason });
  }

  return response.json({ status: 'ok', valid: true, reason: result.reason });
});

app.get('/', (request, response) => {
  response.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/verify', (request, response) => {
  response.sendFile(path.join(__dirname, '..', 'public', 'verify.html'));
});

app.listen(port, () => {
  console.log(`OTP demo listening on http://localhost:${port}`);
});