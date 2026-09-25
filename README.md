# SkyWings AI Travel

SkyWings uses one privileged backend boundary:

```text
React browser -> SkyWings Express API -> SerpApi Google Flights / Gemini / Flask ML service
```

Provider credentials, external-provider requests, and ML service calls remain behind Express.
The browser calls only same-origin `/api/...` routes. Flight inventory is never
generated or silently replaced when the active provider is unavailable. The
server-side Amadeus integration is retained for future use but is not active.

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
- `GET /api/health` — server health.

## Truthfulness boundaries

- Flight results are normalized from SerpApi Google Flights and retain the requested provider currency.
- No provider failure produces simulated flight inventory.
- AI output is planning guidance, not a reservation or authoritative immigration advice.
- Flight search uses live third-party provider data. The separate ML price output
  is an experimental prototype trained entirely on synthetic data.
- ML training/test metrics measure performance only on synthetic generated data;
  the model is not a validated real-world fare forecast and supports only explicit
  route, airline, date-range, and USD inputs.
- Authentication, booking, payment, currency, risk, and ML demonstrations remain
  labeled according to their current limitations.
- No payment is processed and no ticket or provider booking is created.
