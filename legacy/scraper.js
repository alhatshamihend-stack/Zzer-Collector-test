import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { productRecordSchema, zzerApiResponseSchema } from './types.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RAW_RESPONSE_DIR = path.join(PROJECT_ROOT, 'data', 'raw');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export function normalizeDegree(input) {
    const raw = typeof input === 'string' || typeof input === 'number' ? String(input).trim() : '';
    if (!raw)
        return 'N/A';
    const lower = raw.toLowerCase();
    if (/(new|like new|excellent|very good)/i.test(lower)) {
        return 'A';
    }
    if (/(good)/i.test(lower)) {
        return 'B';
    }
    const numericOnly = raw.replace(/[^\d.]/g, '');
    if (!numericOnly)
        return 'N/A';
    const value = Number(numericOnly);
    if (!Number.isFinite(value))
        return 'N/A';
    if (value >= 9.5 || /10/.test(raw))
        return 'A';
    if (value >= 8.5 && value < 9.5)
        return 'B';
    if (value >= 7.5 && value < 8.5)
        return 'C';
    if (value >= 6 && value < 7.5)
        return 'D';
    return 'N/A';
}
export function normalizeImageUrl(value) {
    const url = value.trim();
    if (!url)
        return '';
    return url.startsWith('http') ? url : `https://img.goshare2.com/${url.replace(/^\//, '')}`;
}
export async function persistRawResponse(productId, payload) {
    await fs.mkdir(RAW_RESPONSE_DIR, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(RAW_RESPONSE_DIR, `${productId}_${timestamp}.json`);
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return filePath;
}
export function parseProductPayload(raw, productId, sourceUrl) {
    const parsed = zzerApiResponseSchema.safeParse(raw);
    if (!parsed.success) {
        throw new Error(`Invalid Zzer API payload: ${parsed.error.message}`);
    }
    const detail = parsed.data.data?.detail;
    if (!detail) {
        throw new Error(`Missing detail payload for product ${productId}`);
    }
    const rawPrice = detail.price ?? 0;
    const numericPrice = typeof rawPrice === 'number' ? rawPrice : Number(String(rawPrice).replace(/[^\d.-]/g, ''));
    const imageList = Array.isArray(detail.imageList) ? detail.imageList.filter((image) => typeof image === 'string' && !!image) : [];
    const degreeRaw = detail.degreeDesc ?? detail.degree ?? detail.condition ?? 'N/A';
    const normalizedDegree = normalizeDegree(degreeRaw);
    const record = productRecordSchema.parse({
        item_id: String(detail.id ?? productId),
        title: String(detail.name ?? 'Unknown product'),
        brand: String(parsed.data.data?.brand?.name ?? 'Unknown'),
        price: Number.isFinite(numericPrice) ? numericPrice : 0,
        condition_grade: normalizedDegree === 'N/A' ? 'N/A' : normalizedDegree,
        images: imageList.map(normalizeImageUrl),
        source_url: sourceUrl,
        captured_at: new Date().toISOString(),
        raw_degree: String(degreeRaw),
    });
    return record;
}
export async function fetchProductDetail(productId) {
    const config = getConfig();
    const url = `${config.ZZER_API_BASE_URL}/product/api/v1/product/detail?id=${encodeURIComponent(productId)}`;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            logger.info({ productId, attempt, url }, 'Requesting Zzer product detail');
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${config.ZZER_AUTH_TOKEN}`,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                    Accept: 'application/json',
                    Origin: 'https://zzer.com',
                    Referer: 'https://zzer.com/',
                },
            });
            if (!response.ok) {
                throw new Error(`Zzer API returned ${response.status}: ${response.statusText}`);
            }
            const body = await response.json();
            const record = parseProductPayload(body, productId, url);
            await persistRawResponse(productId, body);
            logger.info({ productId, status: response.status }, 'Zzer product detail fetched successfully');
            return record;
        }
        catch (error) {
            if (attempt === 3) {
                logger.error({ productId, attempt, error: error instanceof Error ? error.message : 'Unknown error' }, 'Zzer fetch failed after retries');
                throw error;
            }
            const backoffMs = 500 * attempt;
            logger.warn({ productId, attempt, backoffMs }, 'Retrying Zzer product fetch');
            await delay(backoffMs);
        }
    }
    throw new Error(`Unavailable product detail for ${productId}`);
}
export async function scrapeProductById(productId) {
    return fetchProductDetail(productId);
}
