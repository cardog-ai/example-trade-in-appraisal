# Larkspur Motors: trade-in appraisal on the Cardog API

Larkspur Motors is a used-car dealership. This is its trade-in desk, end to
end: a customer gets an instant estimate on the store's website from a VIN,
kilometres and condition; an appraiser walks the car on a phone with a
checklist and photo slots; the desk manager prices it from the market,
comparable listings nearby and the factory window sticker, and sends a firm
offer the customer accepts in their account.

It is a complete Next.js app: email and password accounts with
[better-auth](https://better-auth.com), three roles, SQLite through Drizzle,
photos on disk, and a history on every appraisal. It runs on a fresh clone
with no keys at all.

## The Cardog calls

Every call is in [`src/lib/cardog.ts`](src/lib/cardog.ts), server-side,
through [`@cardog/api`](https://www.npmjs.com/package/@cardog/api):

```ts
import { CardogClient } from "@cardog/api";
const cardog = new CardogClient({ apiKey: process.env.CARDOG_API_KEY });
```

| Screen | Call | What the app uses |
| --- | --- | --- |
| Website estimate, walk-in | `cardog.v2.vin.getByVin(vin)` | Year, make, model, trim, and `refs.model` / `refs.modelYear` for every call below |
| Website estimate, desk sheet | `cardog.v2.quotes.getByRef(modelYearRef)` | Asking-price p25, median, p75 and the live count: the estimate range, the market bar, the fallback anchor |
| Desk sheet | `cardog.v2.listings.search({ filters })` | Live listings of the same model, a year either side, within 40,000 km, near the store (`location: { lat, lng, radius }`): the comparables and their median |
| Desk sheet | `cardog.v2.vin.windowSticker(vin)` | The factory window sticker when one is held (issuer, date, a 24-hour PDF link), or the reason there is none |
| Desk sheet | `cardog.v2.recalls.entity(modelYearRef)` | Recall campaigns issued for the model year, Transport Canada first |

The right-hand pane (an **API calls** pill in the header on a phone), **What
the app called**, shows each call as it happens: the method, the HTTP
request, a trimmed response and the latency. The key never reaches the
browser.

## Run it

Node 20.9 or newer and pnpm.

```bash
git clone <this repo> larkspur && cd larkspur
pnpm install
pnpm dev
```

Open http://localhost:3022. `pnpm dev` creates `data/larkspur.db`, applies the
migrations and seeds the accounts and three trade-ins the first time. Sign in
with:

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Customer | `customer@larkspur.example` | `larkspur-customer` | My trade: a Civic with an offer out |
| Appraiser | `appraiser@larkspur.example` | `larkspur-appraiser` | The lot: a RAV4 booked from the website |
| Desk manager | `desk@larkspur.example` | `larkspur-desk` | The desk: a walk-in Wrangler that needs an offer |

The estimate on `/` needs no account. **Book my appraisal** asks the
customer to sign in or sign up, and anyone who signs up is a customer.

### Fixture mode and live mode

With no `CARDOG_API_KEY`, every call is served from `src/fixtures/`, for
three VINs the app offers as samples:

| VIN | Vehicle | Shows |
| --- | --- | --- |
| `2T3R1RFV9NW273162` | 2022 Toyota RAV4 | No decoded trim; sticker not collected yet for this VIN |
| `1C4HJXDN0MW685120` | 2021 Jeep Wrangler Unlimited Sport | A factory window sticker on file; 30 recall campaigns listed for the model year |
| `2HGFC2F51MH015612` | 2021 Honda Civic LX | A falling market (median down 9% in three months); no sticker for this maker |

Each fixture call says where it came from, and the pane shows it. The
fixtures are real reads of the Cardog API taken on 2026-10-16; the comparables
in them were searched Canada-wide, because the read had no location.

To call the API instead:

```bash
cp .env.example .env.local
# set CARDOG_API_KEY (https://cardog.app/account/api)
pnpm dev
```

Set `DEALER_LAT`, `DEALER_LNG` and `DEALER_RADIUS_KM` to search comparables
around your own lot. To re-record the fixtures from the live API:

```bash
CARDOG_API_KEY=... pnpm record-fixtures
```

## How it fits together

```
src/
  lib/cardog.ts         every Cardog call, the client, fixture switch
  lib/reads.ts          the two rounds of reads: estimate (decode, quote) and desk (quote, comps, sticker, recalls)
  lib/trade-file.ts     responses → facts, comparables, the checklist and photo slots (pure)
  lib/valuation.ts      the estimate and the desk's worksheet (pure)
  lib/appraisals.ts     appraisal queries, history events
  lib/auth.ts           better-auth: email + password, SQLite sessions, role
  db/schema.ts          better-auth tables + appraisal + appraisal_event + photo
  app/actions.ts        server actions: book, walk-in, save walk-around, send to desk, refresh, offer, answer
  app/page.tsx          the store's website: the instant estimate
  app/trade/*           the customer: book, my trade, the offer
  app/lot/*             the appraiser: the queue, walk-ins, the walk-around
  app/desk/*            the desk: the board and the appraisal sheet
  app/api/*             the estimate, photo upload and photo serving
  kit/                  app shell, call log and pane (brand-free)
  brand/                Larkspur's mark and the data credit
```

### The math

Every number is worked back from what the car will retail for
(`lib/valuation.ts`):

```
retail anchor          comparables' median asking price (market median when fewer than 3)
+ kilometre adjustment this car's km against the comparables' median km, at $0.06 a km
− reconditioning       the walk-around's costs (the website uses a per-condition allowance)
− pack                 $750: safety, detail, certification
− target gross         $2,500
= offer
```

The desk can change the anchor, the rate, the pack and the gross on each
sheet, and the final offer can be typed over the suggestion. Each change of
state is an event in the appraisal's history.

### Roles

- `role` is a user field sign-up cannot set. Make someone staff in the
  database: `UPDATE user SET role = 'appraiser' WHERE email = ...` (or
  `'desk'`). The desk can also use the lot.
- Customers see only their own trades and photos; photo upload is staff only,
  while the car is on the lot.

### What the API does not supply here

- Comparable listings carry price, kilometres, year and trim, but no
  distance from the store, so the sheet says "within 250 km" rather than
  sorting by distance, and the search response has no total count.
- The quote is for the model year, all trims and kilometres. The estimate
  calls itself a range; the desk prices from comparables.
- The window sticker is the original PDF; its printed contents (options,
  MSRP) are not served as data yet, so the desk opens it to read the build.
- Recalls are listed by model year, not by VIN, and say nothing about
  whether a given car has had the work done. The sheet says "Recalls issued
  for this model and year" and points to the manufacturer's lookup.

## Database

```bash
pnpm db:generate   # after editing src/db/schema.ts: write a migration
pnpm db:setup      # apply migrations; seed if empty
pnpm db:reset      # delete the database and photos and start again
```

## Auth secret

better-auth signs sessions with `BETTER_AUTH_SECRET`.

- `pnpm dev` with no `.env.local`, and any `pnpm build`, fall back to a
  development secret, so a fresh clone runs and builds.
- `.env.example` sets that same development placeholder, clearly named. With
  it, `pnpm build && pnpm start` works locally and warns on every start.
- A production server (`pnpm start`) with no secret set refuses to start.

Before deploying, replace it: `openssl rand -base64 32`.

## Production build locally

```bash
cp .env.example .env.local
pnpm install
pnpm db:setup
pnpm build
pnpm start          # http://localhost:3022
```

## Deploy

The app needs a Node server and a disk for SQLite and photos. The
`Dockerfile` builds one container; mount a volume at `/app/data` and set
`CARDOG_API_KEY`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. For a
serverless host, swap the Drizzle driver in `src/db/index.ts` for a hosted
database and `src/lib/photos.ts` for object storage.

## License

MIT. See [LICENSE](LICENSE).
