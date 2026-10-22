# Zzer ingestion security setup

This repository's `extension/background.js` sends product data to the Supabase Edge Function
`zzer-track-ingest`. The browser extension must never contain a Supabase service-role or secret API key.

## Required server secret

In the Supabase project `jfilwqwmcehzlsyfppsb`, open **Edge Functions → Secrets** and add:

- Name: `ZZER_WEBHOOK_SECRET`
- Value: a random secret generated locally for this private extension

Do not commit the value to GitHub or send it in chat. The Edge Function compares this header in constant time and only uses its server-side Supabase service-role key internally.

## Required local Chrome configuration

Open the Zzer extension's **Service worker → Inspect** console and store these values in `chrome.storage.local`:

- `supabaseProjectUrl`: `https://jfilwqwmcehzlsyfppsb.supabase.co`
- `supabaseAnonKey`: the legacy **anon public** key
- `supabaseWebhookSecret`: the same random value saved as `ZZER_WEBHOOK_SECRET`

The extension sends the public key in the `apikey` header and the local webhook secret in `x-zzer-webhook-secret`. It does not send `Authorization: Bearer service_role` and never needs the service-role key.

## Server protections

- Webhook secret is required; requests fail closed if it is missing or incorrect.
- Payload size is capped at 1 MB.
- Product IDs and field lengths are validated.
- A database-backed rate limiter allows up to 120 accepted requests per 60-second window.
- Only the fixed `products_zzer` upsert path uses the server-side privileged client.

This is a private-extension credential, not a way to safely distribute a public extension to strangers: anyone with access to the local Chrome profile can extract its stored webhook secret. Rotate it in Supabase and local storage if it is exposed.
