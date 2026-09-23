# SkyWings AI Travel

SkyWings uses one privileged backend boundary:

```text
React browser -> SkyWings Express API -> SerpApi Google Flights / Gemini
```

Provider credentials, SerpApi requests, and Gemini SDK calls remain inside Express.
The browser calls only same-origin `/api/...` routes. Flight inventory is never
generated or silently replaced when the active provider is unavailable. The
server-side Amadeus integration is retained for future use but is not active.

## Run locally

Prerequisite: Node.js.

1. Install dependencies with `npm install`.
2. Create an ignored `.env.local` using `.env.example` as a reference.
3. Start Express with `npm run server`.
4. In another terminal, start Vite with `npm run dev`.

Vite proxies `/api` to `http://127.0.0.1:3001` during development. Do not use
`VITE_` variables for provider secrets and do not add secrets to
`vite.config.ts`.

## Server routes

- `GET /api/flights/search` — validated Google Flights results through SerpApi.
- `POST /api/ai/chat` — server-backed travel assistant.
- `POST /api/ai/travel-plan` — validated itinerary drafts.
- `POST /api/ai/visa` — general AI guidance with an official-verification warning.
- `POST /api/ai/packing-list` — validated packing-list output.
- `GET /api/health` — server health.

## Truthfulness boundaries

- Flight results are normalized from SerpApi Google Flights and retain the requested provider currency.
- No provider failure produces simulated flight inventory.
- AI output is planning guidance, not a reservation or authoritative immigration advice.
- Authentication, booking, payment, currency, risk, route fallback, and ML
  demonstrations remain labeled according to their Phase 1 limitations.
- No payment is processed and no ticket or provider booking is created.
