# Zzer Product Data Pipeline

This project collects product metadata from Zzer via a standalone Node.js scraper and uploads normalized product records to Supabase.

## Why this architecture

A Chrome extension was ruled out after confirming the product API runs in a cross-origin webview/bridge context that is inaccessible to extension code. The browser path is blocked by isolation and the extension cannot read the response body or inherit the session in the service worker.

The viable alternative is a standalone scraper that:

1. reads a manually extracted auth token from the browser session,
2. calls the direct Zzer product API,
3. normalizes the payload,
4. sends the result to Supabase.

## Project structure

```text
.
├── .env.example
├── .eslintrc.cjs
├── .github/
│   └── workflows/
│       └── scrape.yml
├── data/
│   └── raw/
├── scripts/
│   └── extract-token.md
├── src/
│   ├── config.ts
│   ├── index.ts
│   ├── logger.ts
│   ├── scraper.ts
│   ├── supabase-client.ts
│   └── types.ts
├── tests/
│   └── scraper.test.ts
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
└── zzer-scraper.js
```

## Quick start

1. Copy `.env.example` to `.env`.
2. Fill in your real values.
3. Install dependencies:

```bash
npm install
```

4. Validate the token before scraping:

```bash
npm run check-token
```

5. Run the scraper:

```bash
npm run scrape -- 12345
```

Or:

```bash
ZZER_AUTH_TOKEN="..." \
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="..." \
npm run scrape -- 12345
```

## Environment variables

```bash
ZZER_AUTH_TOKEN="paste-from-devtools"
ZZER_API_BASE_URL="https://gwapi-v2.goshare2.com"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="service-role-key"
LOG_LEVEL="info"
ZZER_PRODUCT_ID=""
```

## Data normalization rules

| Raw value | Normalized |
|-----------|------------|
| `10新`, `9.9新`, ..., `9.5新` | `A` |
| `9.4新` ... `8.5新` | `B` |
| `8.4新` ... `7.5新` | `C` |
| `7.4新` ... `6新` | `D` |
| null / undefined / empty | `N/A` |

## Supabase integration

The uploader writes to the `products_zzer` table via the REST API. It catches Postgres constraint violations (`23514`) and logs a warning instead of crashing.

## Token extraction guide

See [scripts/extract-token.md](scripts/extract-token.md).

## Testing

Run:

```bash
npm test
```

The test suite covers:

- luxury goods (A-grade)
- jewelry with null data
- clothing data
- malformed payloads

## Future-proofing

- Raw responses are saved under `data/raw/` for audit and debugging.
- Instead of hardcoding rules, you can extend the normalization step when Zzer changes its schema.
- If Zzer publishes an official API, replace the endpoint in `src/config.ts` and keep the same validation/upload flow.

## Troubleshooting

### 401 or 403

- Check that `ZZER_AUTH_TOKEN` is valid.
- Confirm the token is still alive in the browser session.
- Re-extract it from DevTools if needed.

### 23514 check constraint violation

- Check that `condition_grade` values are normalized before insert.
- Verify the table allows the raw grade values you send.

### Empty or malformed JSON

- Ensure the target page is actually a Zzer product page.
- Confirm `detail` is present in the API response.
