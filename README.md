# OTP Security Demo

This project demonstrates a secure OTP request and verification flow using Node.js, Express, and a minimal frontend. It is designed as a teaching example and includes the core rules for delivery limits, resend handling, expiry, and one-time validation.

## Features

- 6-digit OTP generation with leading-zero support
- One-time use validation
- Latest-OTP-only enforcement
- 30-second expiry window
- Maximum 3 OTP requests per hour
- 5-minute resend window for the original code
- Maximum 3 resends per OTP

## Run locally

```text
npm install
npm start
```

The app runs at `http://localhost:3000`.

Before starting the app, copy `.env.example` to `.env` and set the SMTP values for an email provider. The SMTP account must be permitted to send using `MAIL_FROM`.

## Screens

- Send OTP page: `/`
- Verify OTP page: `/verify`

## Requirement coverage

- OTPs are six digits and preserve leading zeroes.
- Only the newest OTP can be verified, and each OTP can be used once.
- OTPs expire after 30 seconds by default.
- The same OTP is resent for up to five minutes, including after expiry, and no more than three times.
- Newly generated OTPs do not repeat for the same email address within 24 hours.
- A maximum of three newly generated OTP requests is allowed per email address per hour.
- OTPs are sent through SMTP and are never returned by the API or displayed in the frontend.

## Test

Run the automated business-rule tests and syntax checks:

```text
npm test
npm run check
```

For a real email test:

1. Start the server with `npm start`.
2. Open `http://localhost:3000` and enter an email address you can access.
3. Confirm the six-digit code arrives by email and verify it at `http://localhost:3000/verify`.
4. Verify the same code again; the second attempt must fail.
5. Request a resend within five minutes, including after 30 seconds; the same code must be delivered and its expiry renewed.
6. Request four newly generated OTPs within one hour using requests more than five minutes apart; the fourth must be rejected.

The server keeps OTP state in memory for this assessment demo. Restarting the server clears active OTPs and request history.

## Milestone commits

1. `chore: initialize OTP demo`
2. `feat: add OTP configuration`
3. `feat: add OTP generation`
4. `test: add OTP generator and business rule checks`
5. `feat: implement OTP request and resend rules`
6. `feat: expose OTP send and verify API`
7. `feat: add frontend send OTP screen`
8. `feat: add frontend verify OTP screen`
9. `docs: add setup and usage notes`

## API examples

```bash
curl -X POST http://localhost:3000/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com"}'

curl -X POST http://localhost:3000/api/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","otp":"123456"}'
```