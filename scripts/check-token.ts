import { getScraperConfig } from '../src/config.js';
import { buildProductDetailUrl } from '../src/scraper.js';

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

async function main(): Promise<void> {
  const config = getScraperConfig();
  const productId = process.argv[2];

  const url = productId
    ? buildProductDetailUrl(config.ZZER_API_BASE_URL, productId)
    : config.ZZER_API_BASE_URL.replace(/\\/+$/u, '') + '/guide/api/v1/home/indexTop';

  console.log(productId
    ? 'Checking the actual Zzer product-detail request for product ' + productId + '...'
    : 'Checking whether the Zzer auth token can access the home endpoint...');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + config.ZZER_AUTH_TOKEN,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
      Origin: 'https://zzer.com',
      Referer: 'https://zzer.com/',
    },
  });

  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = text ? JSON.parse(text) : {};
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    // The HTTP status and a short response excerpt below are still useful.
  }

  const code = body.code === undefined ? '' : String(body.code);
  const message = typeof body.msg === 'string' ? body.msg : typeof body.message === 'string' ? body.message : '';

  if (!response.ok) {
    throw new Error('Zzer returned HTTP ' + response.status + ': ' + (message || response.statusText));
  }
  if (productId && code === '100219') {
    throw new Error('Zzer returned code 100219: ' + (message || 'The request needs values from a current working app request. This script does not invent them.'));
  }
  if (productId && !(typeof body.data === 'object' && body.data !== null && 'detail' in body.data)) {
    throw new Error('HTTP 200 did not contain data.detail. code=' + (code || '(none)') + '; message=' + (message || '(none)') + '. Check the captured query parameters and any request signature.');
  }

  console.log('HTTP ' + response.status + ' — request returned a response accepted by this check.');
  if (code) console.log('API code: ' + code);
  if (message) console.log('API message: ' + message);
  if (!productId) console.log('Note: this validates token access only, not the product-detail API or its signature.');
}

main().catch((error: unknown) => {
  console.error('❌ ' + (error instanceof Error ? error.message : 'Unknown error'));
  process.exitCode = 1;
});
