import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildProductDetailUrl, normalizeDegree, parseProductPayload } from '../src/scraper.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

const luxuryBagPayload = {
  data: {
    detail: {
      id: '1001',
      name: 'Luxury Bag',
      price: '2,990',
      originalPrice: '4000',
      degreeDesc: '9.5新',
      imageList: ['bag1.jpg', '/bag2.jpg'],
      sku: 'BAG-1001',
      categoryName: 'Bags',
      flawList: ['Small scratch', { desc: 'Wear on corner', position: 'bottom' }],
      storeLocation: 'Shanghai warehouse',
      sellerName: 'Seller A',
      authCertificateUrl: 'https://example.com/certificate/1001',
    },
    brand: { name: 'Zzer' },
  },
};

describe('normalizeDegree', () => {
  it('normalizes numeric and named grades', () => {
    expect(normalizeDegree('10新')).toBe('A');
    expect(normalizeDegree('9.5新')).toBe('A');
    expect(normalizeDegree('9.4新')).toBe('B');
    expect(normalizeDegree('8.4新')).toBe('C');
    expect(normalizeDegree('7.4新')).toBe('D');
    expect(normalizeDegree('')).toBe('N/A');
    expect(normalizeDegree(null)).toBe('N/A');
  });
});

describe('buildProductDetailUrl', () => {
  it('includes only query parameters explicitly supplied in the environment', () => {
    vi.stubEnv('ZZER_API_VERSION', 'captured-version');
    vi.stubEnv('ZZER_API_DEVICE_ID', 'captured-device');
    vi.stubEnv('ZZER_API_PLAT', '');
    const url = new URL(buildProductDetailUrl('https://gwapi-v2.goshare2.com', '12345'));

    expect(url.searchParams.get('id')).toBe('12345');
    expect(url.searchParams.get('version')).toBe('captured-version');
    expect(url.searchParams.get('deviceId')).toBe('captured-device');
    expect(url.searchParams.has('plat')).toBe(false);
  });
});

describe('parseProductPayload', () => {
  it('maps price, discount, SKU, category, flaws, seller and certificate data', () => {
    const record = parseProductPayload(luxuryBagPayload, '1001', 'https://gwapi-v2.goshare2.com');

    expect(record.item_id).toBe('1001');
    expect(record.brand).toBe('Zzer');
    expect(record.price).toBe(2990);
    expect(record.original_price).toBe(4000);
    expect(record.discount).toBe(25);
    expect(record.sku).toBe('BAG-1001');
    expect(record.category).toBe('Bags');
    expect(record.flaws).toEqual(['Small scratch', 'bottom: Wear on corner']);
    expect(record.store_location).toBe('Shanghai warehouse');
    expect(record.seller_name).toBe('Seller A');
    expect(record.condition_grade).toBe('A');
    expect(record.images).toEqual([
      'https://img.goshare2.com/bag1.jpg',
      'https://img.goshare2.com/bag2.jpg',
    ]);
    expect(record.auth_certificate_url).toBe('https://example.com/certificate/1001');
    expect(record.raw_payload).toEqual(luxuryBagPayload);
  });

  it('calculates discount when the API omits it', () => {
    const record = parseProductPayload({
      data: { detail: { id: 2, title: 'Coat', price: '75', originalPrice: '100' } },
    }, '2', 'https://gwapi-v2.goshare2.com');

    expect(record.discount).toBe(25);
  });

  it('surfaces Zzer API error 100219 rather than disguising it as missing data', () => {
    expect(() => parseProductPayload({
      code: 100219,
      msg: 'Please update the app',
    }, '12345', 'https://gwapi-v2.goshare2.com')).toThrow(/100219.*Please update the app/u);
  });

  it('rejects a response without product detail', () => {
    expect(() => parseProductPayload({ data: {} }, 'bad', 'https://gwapi-v2.goshare2.com')).toThrow(/Missing data.detail/u);
  });
});
