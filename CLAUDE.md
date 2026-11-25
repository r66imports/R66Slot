# R66Slot — r66slot.co.za

Next.js 15 storefront + admin. Hosted on Railway; GitHub `r66imports/R66Slot`, branch `master`.
Sister site: `../r66emporium` — never port changes there unless asked; finish here and report the gap.

## Verify before pushing
- `npm run build` — required. `tsc` alone misses server-only modules leaking into client bundles.
- `npm test` — lint + type-check + freeform test + consistency scanner.
- `npm run check:consistency` — consistency scanner on its own.
- Verify live behaviour with a field or response only the new code emits.

## Deploy
- User says **"go"** = commit + push to `master`; Railway deploys. Never push without it.
- Ignore the `deploy` / `deploy:preview` scripts — they are old Vercel leftovers.
- Commit scoped: `git commit -m "..." -- <paths>` (hook-enforced). Never sweep in other sessions' uncommitted files.

## Before changing behaviour
- Check the Site Rules (`/site-rules` skill, `src/lib/site-rules.ts`, shown at `/admin/settings/site-rules`). Rule text in the stored blob shadows the code — update both.
- New admin page → register it in `src/lib/admin-permissions.ts`.
- Stock, Stock Audit, Worksheet or intake changes → read the `/stock-intake-flow` skill first.
- Payment status → read the `/mark-as-paid` skill. Only Admin's Mark as Paid sets `paid`.

## Never
- Format money with `toLocaleString` — use `R1 000.00` (toFixed + regex).
- Default a wholesale price to ZAR — it carries its own currency.
- Expose `compareAtPrice` publicly — on Slot it is Average Cost.
- Bulk-correct stock before the stocktake; never clamp negative stock.
- Build auction features — Slot has no Auctions.

## Key places
- `src/app` — routes (storefront + `/admin`), `src/lib` — business logic (`stock-log.ts`, `profit.ts`, `preorder-*.ts`, `shipping-options.ts`, `catalogue-import.ts`).
- `src/middleware.ts` gates the admin API; storefront reads are allowlisted there.
- `scripts/railway-init.js` runs on start (DB setup).
