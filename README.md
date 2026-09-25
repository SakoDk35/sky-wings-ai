# SkyWings AI Travel

SkyWings uses one privileged backend boundary:

```text
React browser -> SkyWings Express API -> SerpApi Google Flights / Gemini / Flask ML service
```

Provider credentials, external-provider requests, and ML service calls remain behind Express.
The browser calls only same-origin `/api/...` routes. Flight inventory is never
generated or silently replaced when the active provider is unavailable. The
server-side Amadeus integration is retained for future use but is not active.

SkyWings application accounts are also handled by Express and persisted in the
local SQLite database. Passwords are stored only as salted `scrypt` hashes, and
opaque sessions use an HttpOnly cookie whose token hash is stored server-side.

## Run locally

Prerequisite: Node.js.

1. Install dependencies with `npm install`.
2. Create an ignored `.env.local` using `.env.example` as a reference.
3. Start Express with `npm run server`.
4. In another terminal, start Vite with `npm run dev`.

To enable the optional experimental ML prototype, use the isolated environment
and startup commands in [the ML README](ml-price-predictor/README.md). Express uses
`ML_SERVICE_URL` and defaults to `http://127.0.0.1:5000` for local development.
ML runs only when **Run Experimental ML Prototype** is selected in a flight's
analysis panel; the other local analyses remain automatic.

Vite proxies `/api` to `http://127.0.0.1:3001` during development. Do not use
`VITE_` variables for provider secrets and do not add secrets to
`vite.config.ts`.

## Server routes

- `GET /api/flights/search` — validated Google Flights results through SerpApi.
- `POST /api/ai/chat` — server-backed travel assistant.
- `POST /api/ai/travel-plan` — validated itinerary drafts.
- `POST /api/ai/visa` — general AI guidance with an official-verification warning.
- `POST /api/ai/packing-list` — validated packing-list output.
- `POST /api/ml/price-prediction` — validated proxy to the experimental ML prototype.
- `POST /api/auth/signup` — create a SkyWings application account and session.
- `POST /api/auth/login` — authenticate and create a server-side session.
- `GET /api/auth/me` — restore the current authenticated SkyWings user.
- `POST /api/auth/logout` — revoke the current server-side session.
- `POST /api/demo-bookings` — save an authenticated user's labeled demo record.
- `GET /api/demo-bookings` — list only the authenticated user's demo records.
- `GET /api/health` — server health.

## Truthfulness boundaries

- Active SerpApi Google Flights searches request and normalize prices in USD.
- The current flight-search demo supports one-way flight searches. Complete
  round-trip itinerary selection is outside the current project scope.
- No provider failure produces simulated flight inventory.
- AI output is planning guidance, not a reservation or authoritative immigration advice.
- Flight search uses live third-party provider data. The separate ML price output
  is an experimental prototype trained entirely on synthetic data.
- ML training/test metrics measure performance only on synthetic generated data;
  the model is not a validated real-world fare forecast. V2 uses six inputs:
  current USD price, days before departure, total duration, stops, departure-month
  sine, and departure-month cosine. Route and airline are not model features.
- SkyWings accounts, hashed passwords, sessions, and per-user demo history are
  real application features. They are not airline accounts or reservations.
- The booking flow remains a demonstration: no provider booking is created, no
  payment details are collected or processed, and no ticket is issued.
- Flight Highlights are deterministic comparisons limited to the currently displayed
  search results; they are not market-wide rankings or recommendations.
- Price Analysis uses the arithmetic mean of valid comparable prices in the
  currently displayed result set; it is not a market-wide price comparison.
- Local operational search logs store search criteria, status and result count,
  a sanitized error code when applicable, the request IP address, and a timestamp.
  They are not linked to a SkyWings account, and the current demo has no automatic
  retention or deletion schedule.
