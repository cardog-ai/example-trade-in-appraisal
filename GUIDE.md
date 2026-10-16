# Build guide: the steps

The commit history follows these steps in order. Each step names the files
it adds and the Cardog SDK calls it introduces.

## 1. Scaffold

A Next.js App Router app with Tailwind, standalone (its own lockfile), and
Larkspur's look: concrete ground, a spruce bar, grease-pencil yellow for the
number that matters, Barlow Condensed for anything read at arm's length.

- `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
- `src/app/globals.css` (theme tokens and the slab, field and button classes), `src/app/layout.tsx`
- `src/brand/larkspur.tsx` (mark, wordmark, data credit)
- `.gitignore`, `.dockerignore`, `.prettierrc`, `.env.example`, `LICENSE`

SDK calls: none.

## 2. The Cardog client and the trade file

One server-only client with every call in one file, each one timed and
logged; fixture mode when there is no key. Pure functions turn responses
into the facts an appraisal works from, and hold the store's math.

- `src/lib/cardog.ts`, `src/lib/calls.ts`, `src/lib/fixtures.ts`, `src/fixtures/*.json`, `scripts/record-fixtures.mjs`
- `src/lib/reads.ts`: the estimate round and the desk round of reads
- `src/lib/trade-file.ts`: facts, comparables, the 13-item checklist, the 8 photo slots
- `src/lib/valuation.ts`: the instant estimate and the desk worksheet
- `src/kit/call-log.tsx`, `src/kit/calls-pane.tsx`, `src/kit/app-shell.tsx`

SDK calls: `new CardogClient({ apiKey })`, and the five calls the later steps put on screen:
`cardog.v2.vin.getByVin(vin)`, `cardog.v2.quotes.getByRef(modelYearRef)`,
`cardog.v2.listings.search({ filters })`, `cardog.v2.vin.windowSticker(vin)`,
`cardog.v2.recalls.entity(modelYearRef)`.

## 3. Accounts and roles

better-auth with email and password, sessions in SQLite through Drizzle, and
a `role` field (`customer`, `appraiser`, `desk`) sign-up cannot set. Each
role lands on its own screen.

- `src/db/schema.ts`, `src/db/index.ts`, `drizzle.config.ts`, `drizzle/`
- `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/middleware.ts`
- `src/app/api/auth/[...all]/route.ts`, `src/app/(auth)/*`, `src/app/home/route.ts`
- `src/lib/appraisals.ts` (queries and the history log), `src/components/frame.tsx`, `src/components/account-menu.tsx`

SDK calls: none.

## 4. The website estimate

The store's public page: VIN with live check-digit feedback, kilometres, and
one of four conditions; an estimate range from the middle half of the market,
adjusted for kilometres and condition, less the store's costs. The customer
books it, signing up on the way, and follows it in **My trade**.

- `src/app/page.tsx`, `src/components/estimate-tool.tsx`, `src/components/condition-picker.tsx`, `src/lib/vin.ts`
- `src/app/api/estimate/route.ts`
- `src/app/trade/book/page.tsx`, `src/app/trade/page.tsx`, `src/app/trade/[id]/*`
- `src/app/actions.ts` (every write in the app), `src/components/bits.tsx`

SDK calls: `cardog.v2.vin.getByVin(vin)`, then `cardog.v2.quotes.getByRef(decode.refs.modelYear)`.

## 5. The walk-around

The appraiser's phone screen: the queue of booked cars and walk-ins, then the
odometer, thirteen OK-or-work checks with a cost on each one that needs work,
eight photo slots that open the camera, and a pinned bar with the running
reconditioning total. Everything autosaves; **Send to desk** checks the
odometer, every item, and the front, rear and odometer photos.

- `src/app/lot/page.tsx`, `src/app/lot/[id]/page.tsx`, `src/app/lot/[id]/walkaround.tsx`
- `src/lib/photos.ts`, `src/app/api/appraisals/[id]/photos/*`

SDK calls: a walk-in makes the same two as the website (decode, quote).

## 6. The desk sheet

The desk's board, and the appraisal sheet: what the lot found, the market
bar, comparable listings near the store, the window sticker, recalls issued
for the model year, and the worksheet from retail anchor to offer. The desk
sends the offer (the customer accepts it in their account) or records a
walk-in's answer, and every step lands in the history.

- `src/app/desk/page.tsx`, `src/app/desk/[id]/page.tsx`, `src/app/desk/[id]/sheet.tsx`

SDK calls, in parallel on the first open and on **Refresh market**:
`cardog.v2.quotes.getByRef(modelYearRef)`,
`cardog.v2.listings.search({ filters: { models, year, odometer, location } })`,
`cardog.v2.vin.windowSticker(vin)`, `cardog.v2.recalls.entity(modelYearRef)`.

## 7. Seed and ship

A setup script that migrates and seeds the review logins and three trade-ins
at three stages; the README, this guide, and a Dockerfile.

- `scripts/setup.ts`, `README.md`, `GUIDE.md`, `Dockerfile`

SDK calls: none (the seed builds its trade files from the fixtures).
