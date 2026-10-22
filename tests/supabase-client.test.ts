import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadProduct } from '../src/supabase-client.js';
import { productRecordSchema } from '../src/types.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('uploadProduct', () => {
  it('posts the mapped payload to the Edge Function with both required auth headers', async () => {
    vi.stubEnv('ZZER_AUTH_TOKEN', 'test-zzer-token');
    vi.stubEnv('ZZER_API_BASE_URL', 'https://gwapi-v2.goshare2.com');
    vi.stubEnv('SUPABASE_URL', 'https://test-project.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: true,
      action: 'inserted',
      zzer_item_id: '123',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const record = productRecordSchema.parse({
      item_id: '123',
      title: 'Test bag',
      brand: 'Test brand',
      price: 125,
      original_price: 200,
      discount: 37.5,
      sku: 'SKU-123',
      category: 'Bags',
      flaws: ['Scratch'],
      store_location: 'Shanghai',
      seller_name: 'Seller',
      degree_ext: 'Excellent',
      auth_certificate_url: null,
      condition_grade: 'A',
      images: ['https://img.goshare2.com/test.jpg'],
      source_url: 'https://gwapi-v2.goshare2.com/product/api/v1/product/detail?id=123',
      captured_at: new Date('2026-01-01T00:00:00.000Z').toISOString(),
      product_details: { raw_detail: { id: '123' } },
      raw_payload: { data: { detail: { id: '123' } } },
    });

    const result = await uploadProduct(record);
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://test-project.supabase.co/functions/v1/zzer-track-ingest');
    expect(init.headers).toMatchObject({
      apikey: 'test-service-role-key',
      Authorization: 'Bearer test-service-role-key',
    });

    const body = JSON.parse(String(init.body)) as {
      zzer_payload: Record<string, unknown>;
      captured_at: string;
    };
    expect(body.captured_at).toBe(record.captured_at);
    expect(body.zzer_payload.zzer_item_id).toBe('123');
    expect(body.zzer_payload.selling_price_cny).toBe(125);
    expect(body.zzer_payload.photos).toEqual(['https://img.goshare2.com/test.jpg']);
    expect(body.zzer_payload.storeLocation).toBe('Shanghai');
    expect(body.zzer_payload.sellerName).toBe('Seller');
  });
});
