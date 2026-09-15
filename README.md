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

## Screens

- Send OTP page: `/`
- Verify OTP page: `/verify`

## Suggested milestone commit sequence

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