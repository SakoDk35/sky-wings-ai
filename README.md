# SkyWings AI Travel

SkyWings is currently in a staged security and accuracy recovery. Phase 1
contains browser credential exposure and labels demonstrational features
truthfully; it does not add real booking, payment, authentication, or live
provider inventory.

## Run locally

Prerequisite: Node.js.

1. Install dependencies with `npm install`.
2. Start the application with `npm run dev`.

The Vite frontend must never receive Gemini or Amadeus credentials. Do not use
`VITE_`-prefixed variables for secrets and do not add secret values to
`vite.config.ts`.

Copy `.env.example` only as a reference for variables that belong to the server
process. The provider variables are reserved for the secure server integrations
planned for Phase 2; Phase 1 deliberately does not call Gemini or Amadeus from
the browser. Keep real local values in ignored environment files and never
commit them.

## Phase 1 behavior

- Live flight inventory is unavailable; no AI-generated flight inventory is
  substituted.
- Gemini-backed chat, itinerary, visa, and packing features are unavailable
  until a server-side integration exists.
- Booking, account, currency, risk, amenity, route, and ML demonstrations are
  labeled as local, static, approximate, synthetic, or unverified as applicable.
- No payment is processed and no ticket or provider booking is created.
