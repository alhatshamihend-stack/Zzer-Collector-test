# Extract Zzer auth token from DevTools

This project intentionally does not use browser automation. Instead, it uses a manually extracted auth token from the browser session.

## 1) Open the site

Visit the Zzer product page in Chrome or Edge.

## 2) Open DevTools

- Press F12
- Go to the Network tab
- Filter by `gwapi-v2.goshare2.com`

## 3) Reload the product page

Trigger the product detail request and click the matching `GET` or `POST` row.

## 4) Inspect the request headers

Look for one of the following:

- `Authorization`
- `token`
- `session`
- `cookie` values used by the app

## 5) Check browser storage

Open:

- Application tab
- Local Storage
- Session Storage
- Cookies

Look for values such as:

- `token`
- `auth`
- `session_id`
- `jwt`
- any Zzer-prefixed storage key

## 6) Copy the value into your env file

Create a `.env` file from `.env.example` and populate:

```bash
ZZER_AUTH_TOKEN="<copied-token>"
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

## 7) Validate

Run:

```bash
npm run test
npm run scrape -- 12345
```

If the request returns a 200 with a product payload, the token is valid.

## Security notes

- Never commit `.env` to git.
- Use the service-role key only in trusted local or CI environments.
- Prefer a short-lived token if Zzer exposes one.
- Do not paste tokens into issue trackers or screenshots.
