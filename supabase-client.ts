import { logger } from './logger.js';
import { getConfig } from './config.js';
import type { ProductRecord } from './types.js';

export interface UploadResult {
  ok: boolean;
  status?: number;
  data?: unknown;
  skipped?: boolean;
  reason?: string;
}

export async function uploadProduct(record: ProductRecord): Promise<UploadResult> {
  const config = getConfig();

  const payload = {
    item_id: record.item_id,
    title: record.title,
    brand: record.brand,
    price: record.price,
    condition_grade: record.condition_grade,
    images: record.images,
    source_url: record.source_url,
    captured_at: record.captured_at,
  };

  try {
    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/products_zzer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: unknown = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const message = typeof data === 'object' && data && 'message' in data ? String((data as { message?: string }).message) : text;
      const code = typeof data === 'object' && data && 'code' in data ? String((data as { code?: string }).code) : '';

      if (code === '23514' || message.includes('23514') || message.includes('check constraint')) {
        logger.warn({ productId: record.item_id, code, message }, 'Supabase check constraint violation; skipping insert');
        return { ok: false, status: response.status, skipped: true, reason: 'check_constraint' };
      }

      throw new Error(`Supabase insert failed with status ${response.status}: ${message}`);
    }

    logger.info({ productId: record.item_id, status: response.status }, 'Supabase upload succeeded');
    return { ok: true, status: response.status, data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ productId: record.item_id, message }, 'Supabase upload failed');
    throw error;
  }
}
