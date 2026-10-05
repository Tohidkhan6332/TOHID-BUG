# TOHID-BUG Web Panel

Separate web UI for the existing TOHID-BUG service.

## Telegram menu mapped to web

- Pair
- Tutorial
- Stats
- Plans
- Dashboard
- Developer
- Payments / account history
- Channel/group links can be wired from the existing configuration

Telegram command lists are intentionally not shown.

## Backend contract

Set the API base URL in browser local storage:

    localStorage.setItem("TOHID_WEB_API", "https://YOUR-TOHID-BUG-BACKEND.example.com")

The UI expects:

- POST /api/pair `{ number, customCode? }`
- GET /api/plans/:planKey
- POST /api/payment `{ planKey, method }`
- POST /api/payment/:paymentId/proof `{ transactionId }`
- GET /api/account
- GET /api/payments
- GET /api/stats

The actual pairing/payment state remains in Tohid.js. The next integration step is to expose these operations through authenticated HTTP routes instead of duplicating the bot logic in the webpage.

Do not put bot tokens, payment secrets, or admin credentials in this frontend.
