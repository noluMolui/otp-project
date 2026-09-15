const sendForm = document.getElementById('send-otp-form');
const resendButton = document.getElementById('resend-button');
const verifyForm = document.getElementById('verify-otp-form');
const codeDisplay = document.getElementById('demo-code');

const LAST_OTP_KEY = 'last-otp-demo-code';
const LAST_EMAIL_KEY = 'last-otp-demo-email';

function setStatus(message, kind = '') {
  const element = document.getElementById('status');
  if (!element) return;
  element.textContent = message;
  element.className = `status ${kind}`.trim();
}

function rememberLastOtp(code, email) {
  if (!code) return;
  localStorage.setItem(LAST_OTP_KEY, code);
  localStorage.setItem(LAST_EMAIL_KEY, email || '');
}

function readLastOtp() {
  return {
    code: localStorage.getItem(LAST_OTP_KEY) || '',
    email: localStorage.getItem(LAST_EMAIL_KEY) || '',
  };
}

async function sendOtpRequest(endpoint) {
  const emailInput = document.getElementById('email') || document.getElementById('verify-email');
  const email = emailInput.value.trim();

  if (!email) {
    setStatus('Please provide an email address.', 'error');
    return;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  if (!response.ok) {
    setStatus(data.reason || 'Request failed.', 'error');
    return;
  }

  const demonstrationCode = data.code || '000000';
  rememberLastOtp(demonstrationCode, email);

  if (codeDisplay) {
    codeDisplay.textContent = demonstrationCode;
    codeDisplay.style.display = 'block';
  }

  setStatus(
    `${data.isResend ? 'OTP resent and received' : 'OTP received'} for ${email}. Use the code below to confirm it.`,
    'success',
  );
}

if (sendForm) {
  sendForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendOtpRequest('/api/otp/send');
  });

  resendButton?.addEventListener('click', async () => {
    await sendOtpRequest('/api/otp/send');
  });

  const saved = readLastOtp();
  if (saved.code && codeDisplay) {
    codeDisplay.textContent = saved.code;
    codeDisplay.style.display = 'block';
    setStatus(`Last OTP received for ${saved.email || 'the user'}.`, 'success');
  }
}

if (verifyForm) {
  const saved = readLastOtp();
  if (saved.email) {
    document.getElementById('verify-email').value = saved.email;
  }
  if (saved.code) {
    document.getElementById('otp').value = saved.code;
    setStatus('OTP received and ready to be confirmed.', 'success');
  }

  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('verify-email').value.trim();
    const otp = document.getElementById('otp').value.trim();

    if (!email || !otp) {
      setStatus('Please provide both the email and OTP.', 'error');
      return;
    }

    const response = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json();

    if (!response.ok) {
      setStatus(data.reason || 'OTP verification failed.', 'error');
      return;
    }

    setStatus(`OTP confirmed successfully for ${email}.`, 'success');
  });
}
