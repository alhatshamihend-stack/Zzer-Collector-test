# Project status

## Implemented in this branch

- Canonical TypeScript source layout under \`src/\`.
- Zod validation for the API response and normalized product record.
- Extraction of price, original price, discount, SKU, category, condition, flaws, images, seller, store location, certificate URL, product details, and raw payload.
- Query parameters are configurable through \`ZZER_API_*\` environment variables and are omitted when blank.
- Supabase writes go through \`zzer-track-ingest\` with both required service-role headers and an explicit payload mapping.
- Tests and CI for typecheck, unit tests, and lint.

## External verification still required

- A current successful Zzer product-detail request must be captured to populate any required dynamic parameters or signature.
- API error \`100219\` cannot be fixed by TypeScript changes alone if Zzer requires a fresh signature or additional app state.
- After a successful live scrape, verify the returned row in \`public.products_zzer\`.

Do not describe the live pipeline as fully verified until those external checks pass.
