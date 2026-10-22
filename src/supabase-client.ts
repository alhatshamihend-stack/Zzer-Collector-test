import { logger } from './logger.js';
import { getConfig } from './config.js';
import type { ProductRecord } from './types.js';

export interface UploadResult {
  ok: boolean;
  status?: number;
  data?: unknown;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export async function uploadProduct(record: ProductRecord): Promise<UploadResult> {
  const config = getConfig();
  const endpoint = config.SUPABASE_URL.replace(/\/+$/u, '') + '/functions/v1/zzer-track-ingest';

  // This is the explicit contract consumed by the deployed zzer-track-ingest
  // function. Both spellings are included for fields its normalizer reads in camelCase.
  const zzerPayload: JsonRecord = {
    zzer_item_id: record.item_id,
    title: record.title,
    brand: record.brand,
    category: record.category,
    condition_grade: record.condition_grade === 'N/A' ? undefined : record.condition_grade,
    selling_price_cny: record.price,
    original_price: record.original_price,
    original_price_cny: record.original_price > 0 ? record.original_price : null,
    discount: record.discount,
    sku: record.sku,
    degree_ext: record.degree_ext,
    degreeExt: record.degree_ext,
    store_location: record.store_location,
    storeLocation: record.store_location,
    flaws: record.flaws,
    seller_name: record.seller_name,
    sellerName: record.seller_name,
    auth_certificate_url: record.auth_certificate_url,
    photos: record.images,
    product_details: {
      ...record.product_details,
      source_url: record.source_url,
      raw_response_path: record.raw_response_path ?? null,
      raw_degree: record.raw_degree ?? null,
    },
    raw_payload: record.raw_payload,
    raw_detail: record.product_details.raw_detail,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: config.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: 'Bearer ' + config.SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        zzer_payload: zzerPayload,
        captured_at: record.captured_at,
      }),
    });

    const responseText = await response.text();
    let data: unknown = {};
    try {
      data = responseText ? JSON.parse(responseText) as unknown : {};
    } catch {
      data = { raw: responseText };
    }

    const responseRecord = asRecord(data);
    if (!response.ok || responseRecord.ok === false) {
      const message = typeof responseRecord.error === 'string'
        ? responseRecord.error
        : typeof responseRecord.message === 'string'
          ? responseRecord.message
          : responseText;
      throw new Error('Supabase ingest failed with status ' + response.status + ': ' + message);
    }

    logger.info({
      productId: record.item_id,
      status: response.status,
      action: responseRecord.action,
    }, 'Supabase ingest succeeded');
    return { ok: true, status: response.status, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ productId: record.item_id, message }, 'Supabase ingest failed');
    throw error;
  }
}
