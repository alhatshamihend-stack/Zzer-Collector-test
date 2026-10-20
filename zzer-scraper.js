// zzer-scraper.js - Standalone scraper for Zzer product data
const fetch = require('node-fetch');

// Replace these with the real values you get from DevTools / Application / Cookies or localStorage.
const ZZER_AUTH_TOKEN = process.env.ZZER_AUTH_TOKEN || 'YOUR_MANUAL_TOKEN_HERE';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_ANON_KEY';

function normalizeConditionGrade(value) {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase();
  const aliases = {
    'new': 'new',
    'as new': 'new',
    'som ny': 'new',
    'ny': 'new',
    'like new': 'like_new',
    'like-new': 'like_new',
    'likenew': 'like_new',
    'good': 'good',
    'bra': 'good',
    'gott': 'good',
    'very good': 'very_good',
    'verygood': 'very_good',
    'excellent': 'excellent',
    'a': 'a',
    'b': 'b',
    'c': 'c',
    'd': 'd',
    'e': 'e',
  };

  if (aliases[normalized]) return aliases[normalized];
  if (/^[abcde]$/i.test(raw)) return raw.toLowerCase();
  return null;
}

async function mapProductDetail(json) {
  if (!json || !json.data || !json.data.detail) {
    return null;
  }

  const detail = json.data.detail;
  const rawPrice = detail.price ?? detail.salePrice ?? detail.currentPrice;
  const parsedPrice = typeof rawPrice === 'number'
    ? rawPrice
    : Number(String(rawPrice ?? '').replace(/[^\d.-]/g, ''));

  const imageBaseUrl = 'https://img.goshare2.com/';
  const images = Array.isArray(detail.imageList)
    ? detail.imageList.map((img) => (String(img).startsWith('http') ? img : `${imageBaseUrl}${img}`))
    : [];

  const normalizedDegree = normalizeConditionGrade(detail.degreeDesc ?? detail.degree ?? detail.condition);

  return {
    itemId: String(detail.id ?? detail.itemId ?? detail.productId ?? ''),
    title: String(detail.name ?? detail.title ?? detail.productName ?? 'Okänd produkt'),
    brand: String(json.data.brand?.name ?? detail.brand ?? detail.vendor ?? 'Okänd'),
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    degree: normalizedDegree,
    images,
  };
}

async function sendToSupabase(zzerPayload) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/zzer-track-ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      zzer_payload: zzerPayload,
      captured_at: new Date().toISOString(),
    }),
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`Supabase request failed with status ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

async function scrapeProduct(productId) {
  const url = `https://gwapi-v2.goshare2.com/product/api/v1/product/detail?id=${productId}`;

  console.log(`[SCRAPER] Hämtar produkt ${productId}...`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ZZER_AUTH_TOKEN}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://zzer.com',
        'Referer': 'https://zzer.com/',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();

    if (!json.data?.detail?.id) {
      console.log('[SCRAPER] ❌ Ingen produktdata i svaret');
      return;
    }

    const detail = json.data.detail;
    const payload = await mapProductDetail(json);

    if (!payload || !payload.itemId) {
      console.log('[SCRAPER] ❌ Kunde inte mappa produktdata');
      return;
    }

    console.log(`[SCRAPER] ✅ Hittad: ${detail.name} (${detail.id})`);
    console.log('[SCRAPER] Mappad payload:', payload);

    const result = await sendToSupabase(payload);
    console.log('[SCRAPER] Supabase svar:', result);
  } catch (error) {
    console.error('[SCRAPER] Fel:', error.message);
    process.exitCode = 1;
  }
}

const productId = process.argv[2];
if (!productId) {
  console.log('Användning: node zzer-scraper.js <product_id>');
  console.log('Exempel: node zzer-scraper.js 123456');
  process.exit(1);
}

scrapeProduct(productId);
