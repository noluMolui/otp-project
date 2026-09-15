const sendForm = document.getElementById('send-otp-form');
const resendButton = document.getElementById('resend-button');
const verifyForm = document.getElementById('verify-otp-form');
const LAST_EMAIL_KEY = 'otp-email';

function setStatus(message, kind = '') {
  const element = document.getElementById('status');
  if (!element) return;
  element.textContent = message;
  element.className = `mt-6 rounded-2xl border px-4 py-3 text-sm ${
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : kind === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-50 text-slate-600'
  }`.trim();
}

async function sendOtpRequest(endpoint) {
  const emailInput = document.getElementById('email') || document.getElementById('verify-email');
  const email = emailInput.value.trim();

  if (!email) {
    setStatus('Please provide an email address.', 'error');
    return;
  }

  let response;
  let data;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    data = await response.json();
  } catch (error) {
    setStatus('The server could not be reached. Please try again.', 'error');
    return;
  }

  if (!response.ok) {
    setStatus(data.reason || 'Request failed.', 'error');
    return;
  }

  localStorage.setItem(LAST_EMAIL_KEY, email);
  window.location.href = '/verify';
}

if (sendForm) {
  sendForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    await sendOtpRequest('/api/otp/send');
  });

  resendButton?.addEventListener('click', async () => {
    await sendOtpRequest('/api/otp/send');
  });

}

if (verifyForm) {
  const emailInput = document.getElementById('verify-email');
  const savedEmail = localStorage.getItem(LAST_EMAIL_KEY) || '';

  if (savedEmail) {
    emailInput.value = savedEmail;
    emailInput.readOnly = true;
    document.getElementById('otp').focus();
  }

  verifyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('verify-email').value.trim();
    const otp = document.getElementById('otp').value.replace(/\D/g, '').slice(0, 6);

    if (!email || !otp) {
      setStatus('Please provide both the email and OTP.', 'error');
      return;
    }

    let response;
    let data;

    try {
      response = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      data = await response.json();
    } catch (error) {
      setStatus('The server could not be reached. Please try again.', 'error');
      return;
    }

    if (!response.ok) {
      const messages = {
        expired: 'This OTP has expired. Request a new code and enter it immediately.',
        invalid: 'That OTP is incorrect. Use the newest six-digit code from your email.',
        used: 'This OTP has already been used. Request a new code.',
        'not-found': 'No active OTP was found. Request a new code.',
      };
      setStatus(messages[data.reason] || 'OTP verification failed.', 'error');
      return;
    }

    setStatus(`OTP confirmed successfully for ${email}.`, 'success');
  });
}
