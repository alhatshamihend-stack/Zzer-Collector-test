# Zzer Product Data Pipeline

A standalone Node.js/TypeScript scraper that requests product details from Zzer and uploads normalized product records to Supabase through the deployed \`zzer-track-ingest\` Edge Function.

## Canonical production path

- \`src/config.ts\`: environment validation
- \`src/scraper.ts\`: URL builder, API request, parsing, raw-response capture
- \`src/types.ts\`: Zod schemas and normalized product type
- \`src/supabase-client.ts\`: explicit Edge Function payload mapping
- \`src/index.ts\`: CLI entry point
- \`tests/\`: unit tests
- \`scripts/check-token.ts\`: checks token access; with a product ID, tests the actual detail endpoint
- \`extension/\`: archived analytics-only browser extension prototype
- \`legacy/\`: old JavaScript implementation retained for reference; not used by npm scripts

## Setup

1. Install Node.js 20 or newer.
2. Copy \`.env.example\` to \`.env\`.
3. Fill in \`ZZER_AUTH_TOKEN\`, \`SUPABASE_URL\`, and \`SUPABASE_SERVICE_ROLE_KEY\`.
4. Run:

\`\`\`bash
npm ci
npm run typecheck
npm test
npm run lint
\`\`\`

## Run a product

First check the actual detail endpoint:

\`\`\`bash
npm run check-token -- 2186235436006653957
\`\`\`

Then scrape and upload:

\`\`\`bash
npm run scrape -- 2186235436006653957
\`\`\`

The product ID is only an example; replace it with the ID you want to test.

## Zzer API parameters

The code supports these environment variables and maps them to the query parameter names used by the detail endpoint:

| Environment variable | Query parameter |
| --- | --- |
| \`ZZER_API_DEVICE_ID\` | \`deviceId\` |
| \`ZZER_API_FMT\` | \`fmt\` |
| \`ZZER_API_H5_VERSION\` | \`h5Version\` |
| \`ZZER_API_LANG_TYPE\` | \`langType\` |
| \`ZZER_API_LOGIN_ID\` | \`loginId\` |
| \`ZZER_API_MPB\` | \`mpb\` |
| \`ZZER_API_MPM\` | \`mpm\` |
| \`ZZER_API_MT\` | \`mt\` |
| \`ZZER_API_PLAT\` | \`plat\` |
| \`ZZER_API_TS\` | \`ts\` |
| \`ZZER_API_VERSION\` | \`version\` |
| \`ZZER_API_SN\` | \`sn\` |

Copy values from a current successful product-detail request in DevTools. Empty variables are omitted; the program does not invent API values. If Zzer uses a request signature that depends on changing values, copying an old \`sn\` or timestamp may not work: the signing method or a fresh valid request is needed.

## Supabase mapping

The scraper posts to \`/functions/v1/zzer-track-ingest\`, not the table REST endpoint. It sends both required headers:

- \`apikey: SUPABASE_SERVICE_ROLE_KEY\`
- \`Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY\`

The service-role key is only used by the trusted local Node process and stays in its local `.env`. Never put it in the browser extension or commit it to Git.

The browser extension follows a separate no-login path: it sends the public `anon public` key in `apikey` plus a local `x-zzer-webhook-secret`. Configure that random secret in Supabase **Edge Functions → Secrets** as `ZZER_WEBHOOK_SECRET` and in the extension's local `chrome.storage.local`; never commit or share it. See [SECURITY-SETUP.md](SECURITY-SETUP.md) for the steps.

The payload maps \`item_id\` to \`zzer_item_id\`, \`price\` to \`selling_price_cny\`, \`images\` to \`photos\`, and includes the business fields, \`product_details\`, and \`raw_payload\`. The Edge Function currently accepts condition grades S/A/B/C/D; an unknown grade (N/A) is omitted rather than sending an invalid enum value.

## Validation and limitations

The automated tests cover field mapping, discount calculation, query-parameter handling, API error 100219, and Edge Function request headers. CI runs typecheck, tests, and lint.

A successful TypeScript build does not prove Zzer will accept a live request. Error \`100219\` means the remote API has rejected the request; verify the captured query values and any dynamic signature before treating the live pipeline as operational.

Raw API responses are saved locally under \`data/raw/\` for diagnosis. They may contain session-related data; do not commit or share them without reviewing and redacting sensitive values.
