const sendForm = document.getElementById('send-otp-form');
const resendButton = document.getElementById('resend-button');
const verifyForm = document.getElementById('verify-otp-form');
const sendStatus = document.getElementById('status');
const codeDisplay = document.getElementById('demo-code');

function setStatus(message, kind = '') {
  const element = document.getElementById('status');
  element.textContent = message;
  element.className = `status ${kind}`.trim();
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
  if (codeDisplay) {
    codeDisplay.textContent = demonstrationCode;
    codeDisplay.style.display = 'block';
  }

  setStatus(
    `${data.isResend ? 'OTP resent' : 'OTP sent'} for ${email}. It expires in ${30} seconds.`,
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
}

if (verifyForm) {
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

    setStatus('OTP is valid.', 'success');
  });
}
