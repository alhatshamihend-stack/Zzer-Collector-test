import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { productRecordSchema, zzerApiResponseSchema, type ProductRecord } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RAW_RESPONSE_DIR = path.join(PROJECT_ROOT, 'data', 'raw');

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function firstValue(...values: unknown[]): unknown {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
}

function firstText(...values: unknown[]): string | undefined {
  const value = firstValue(...values);
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    return text || undefined;
  }
  return undefined;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const cleaned = value.trim().replace(/[¥￥$,\s%]/gu, '');
  if (!/^-?\d+(?:\.\d+)?$/u.test(cleaned)) return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeDegree(input: unknown): string {
  const raw = typeof input === 'string' || typeof input === 'number' ? String(input).trim() : '';
  if (!raw) return 'N/A';

  const upper = raw.toUpperCase();
  if (['S', 'A', 'B', 'C', 'D'].includes(upper)) return upper;

  if (/(new|like[\s-]?new|excellent|very good|全新|新品|未使用|十成新)/iu.test(raw)) return 'A';
  if (/(good|良好)/iu.test(raw) && !/\d/u.test(raw)) return 'B';

  const match = raw.match(/\d+(?:\.\d+)?/u);
  if (!match) return 'N/A';

  let value = Number(match[0]);
  if (!Number.isFinite(value)) return 'N/A';
  if (value > 10 && value <= 100) value /= 10;

  if (value >= 9.5 && value <= 10) return 'A';
  if (value >= 8.5 && value < 9.5) return 'B';
  if (value >= 7.5 && value < 8.5) return 'C';
  if (value >= 6 && value < 7.5) return 'D';
  return 'N/A';
}

export function normalizeImageUrl(value: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//iu.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  return 'https://img.goshare2.com/' + trimmed.replace(/^\/+/u, '');
}

function extractImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): string[] => {
    let candidate: unknown = entry;
    if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
      const item = entry as JsonRecord;
      if (typeof item.type === 'number' && item.type !== 0) return [];
      candidate = firstValue(item.url, item.src, item.image, item.photo, item.imageUrl, item.largeUrl);
    }
    if (typeof candidate !== 'string' || !candidate.trim()) return [];
    return [normalizeImageUrl(candidate)];
  });
}

function normalizeFlawText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const item = value as JsonRecord;
  const description = firstText(item.desc, item.content, item.text, item.flawName, item.name, item.description, item.defectDesc);
  if (!description) return null;
  const position = firstText(item.positionName, item.position, item.location);
  return position ? position + ': ' + description : description;
}

function collectFlaws(detail: JsonRecord): string[] {
  const report = asRecord(firstValue(detail.identifyReportModuleV2, detail.identify_report_module_v2));
  const entries: unknown[] = [];

  for (const key of ['flawList', 'defectList', 'flawInfo', 'defectInfo', 'defects']) {
    const value = detail[key];
    if (Array.isArray(value)) entries.push(...value);
  }
  for (const key of ['flaw', 'flawList', 'defectList', 'defects', 'defectInfo']) {
    const value = report[key];
    if (Array.isArray(value)) entries.push(...value);
  }

  const description = firstText(detail.flawDesc, detail.defectDesc, report.flawDesc, report.defectDesc, report.description);
  if (description) entries.push(description);

  const unique = new Set<string>();
  for (const entry of entries) {
    const text = normalizeFlawText(entry);
    if (text) unique.add(text);
  }
  return Array.from(unique);
}

function normalizeOptionalUrl(value: unknown): string | null {
  const text = firstText(value);
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//iu.test(text) ? text : text.startsWith('//') ? 'https:' + text : normalizeImageUrl(text));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildProductDetailUrl(baseUrl: string, productId: string): string {
  const url = new URL('/product/api/v1/product/detail', baseUrl);
  url.searchParams.set('id', productId);

  // Only include API values explicitly supplied from a known working request.
  // Empty values are omitted rather than guessed or silently hardcoded.
  const envParams: Array<[string, string]> = [
    ['ZZER_API_DEVICE_ID', 'deviceId'],
    ['ZZER_API_FMT', 'fmt'],
    ['ZZER_API_H5_VERSION', 'h5Version'],
    ['ZZER_API_LANG_TYPE', 'langType'],
    ['ZZER_API_LOGIN_ID', 'loginId'],
    ['ZZER_API_MPB', 'mpb'],
    ['ZZER_API_MPM', 'mpm'],
    ['ZZER_API_MT', 'mt'],
    ['ZZER_API_PLAT', 'plat'],
    ['ZZER_API_TS', 'ts'],
    ['ZZER_API_VERSION', 'version'],
    ['ZZER_API_SN', 'sn'],
  ];

  for (const [envName, queryName] of envParams) {
    const value = process.env[envName]?.trim();
    if (value) url.searchParams.set(queryName, value);
  }

  return url.toString();
}

export async function persistRawResponse(productId: string, payload: unknown): Promise<string> {
  await fs.mkdir(RAW_RESPONSE_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/gu, '-');
  const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/gu, '_');
  const filePath = path.join(RAW_RESPONSE_DIR, safeProductId + '_' + timestamp + '.json');
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}

export function parseProductPayload(raw: unknown, productId: string, sourceUrl: string): ProductRecord {
  const root = asRecord(raw);
  const parsed = zzerApiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Invalid Zzer API payload: ' + parsed.error.message);
  }

  const detailValue = parsed.data.data?.detail;
  if (!detailValue) {
    const code = firstText(root.code);
    const message = firstText(root.msg, root.message);
    if (code && !['0', '200', 'success'].includes(code.toLowerCase())) {
      throw new Error('Zzer API error ' + code + (message ? ': ' + message : ''));
    }
    throw new Error('Missing data.detail in Zzer API response for product ' + productId);
  }

  const detail = detailValue as JsonRecord;
  const brandValue = parsed.data.data?.brand;
  const brandFromResponse = typeof brandValue === 'string'
    ? brandValue
    : firstText(asRecord(brandValue).name);

  const rawPrice = firstValue(detail.price, detail.salePrice, detail.currentPrice, detail.sellingPrice, detail.priceCny, detail.selling_price_cny);
  const price = Math.max(0, toNumber(rawPrice) ?? 0);
  const rawOriginalPrice = firstValue(detail.originalPrice, detail.marketPrice, detail.retailPrice, detail.original_price, detail.originalPriceCny, detail.original_price_cny);
  const originalPrice = Math.max(0, toNumber(rawOriginalPrice) ?? 0);

  const explicitDiscount = toNumber(firstValue(detail.discount, detail.discountRate, detail.discountPercent, detail.discount_rate));
  const calculatedDiscount = originalPrice > 0
    ? Math.max(0, Math.min(100, Math.round(((originalPrice - price) / originalPrice) * 100)))
    : 0;
  const discount = Math.max(0, explicitDiscount ?? calculatedDiscount);

  const imageSource = firstValue(detail.imageList, detail.imageListV1, detail.photos, detail.images);
  const images = extractImageUrls(imageSource);
  const rawDegree = firstValue(detail.degreeDesc, detail.degree, detail.condition, detail.condition_grade, detail.degreeExt, 'N/A');
  const conditionGrade = normalizeDegree(rawDegree);
  const flaws = collectFlaws(detail);
  const category = firstText(detail.categoryName, detail.cateName, detail.firstCategoryName, detail.categoryMain, detail.categorySub, detail.category) ?? '';
  const storeLocation = firstText(detail.storeLocation, detail.warehouseCode, detail.storeTextEn, detail.storeText, detail.locationWarehouse) ?? '';
  const sellerName = firstText(detail.sellerName, detail.shopName, detail.vendor) ?? '';
  const degreeExt = firstText(detail.degreeExtEn, detail.degreeExt, detail.degreeDesc, detail.degree) ?? '';
  const certificateUrl = normalizeOptionalUrl(firstValue(detail.authCertificateUrl, detail.auth_certificate_url, detail.certificateUrl));
  const capturedAt = new Date().toISOString();
  const title = firstText(detail.name, detail.title, detail.productName, detail.product_name) ?? 'Unknown product';
  const itemId = firstText(detail.id, productId) ?? productId;
  const safeSource = new URL(sourceUrl);
  safeSource.pathname = '/product/api/v1/product/detail';
  safeSource.search = '';
  safeSource.hash = '';
  safeSource.searchParams.set('id', productId);
  const safeSourceUrl = safeSource.toString();
  const productDetails: JsonRecord = {
    raw_detail: detail,
    identify_report_module_v2: asRecord(firstValue(detail.identifyReportModuleV2, detail.identify_report_module_v2)),
    raw_degree: String(rawDegree),
    source_url: safeSourceUrl,
    captured_at: capturedAt,
  };

  return productRecordSchema.parse({
    item_id: itemId,
    title,
    brand: firstText(brandFromResponse, detail.brand, detail.vendor) ?? 'Unknown',
    price,
    original_price: originalPrice,
    discount,
    sku: firstText(detail.sku, detail.itemNo, detail.articleNumber) ?? '',
    category,
    flaws,
    store_location: storeLocation,
    seller_name: sellerName,
    degree_ext: degreeExt,
    auth_certificate_url: certificateUrl,
    condition_grade: conditionGrade,
    images,
    source_url: safeSourceUrl,
    captured_at: capturedAt,
    raw_degree: String(rawDegree),
    product_details: productDetails,
    raw_payload: root,
  });
}

export async function fetchProductDetail(productId: string): Promise<ProductRecord> {
  const config = getConfig();
  const url = buildProductDetailUrl(config.ZZER_API_BASE_URL, productId);
  const parsedUrl = new URL(url);
  const safeSourceUrl = new URL('/product/api/v1/product/detail', config.ZZER_API_BASE_URL);
  safeSourceUrl.searchParams.set('id', productId);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let rawResponsePath: string | undefined;
    try {
      logger.info({
        productId,
        attempt,
        endpoint: parsedUrl.pathname,
        configuredQueryParams: Array.from(parsedUrl.searchParams.keys()).filter((key) => key !== 'id'),
      }, 'Requesting Zzer product detail');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + config.ZZER_AUTH_TOKEN,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          Accept: 'application/json',
          Origin: 'https://zzer.com',
          Referer: 'https://zzer.com/',
        },
      });

      const responseText = await response.text();
      let body: unknown;
      try {
        body = responseText ? JSON.parse(responseText) as unknown : {};
      } catch {
        body = { raw: responseText };
      }
      rawResponsePath = await persistRawResponse(productId, body);

      if (!response.ok) {
        throw new Error('Zzer API returned HTTP ' + response.status + ': ' + response.statusText);
      }

      const record = parseProductPayload(body, productId, safeSourceUrl.toString());
      const result = productRecordSchema.parse({ ...record, raw_response_path: rawResponsePath });
      logger.info({ productId, status: response.status, rawResponsePath }, 'Zzer product detail fetched successfully');
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('100219')) {
        logger.error({ productId, attempt, rawResponsePath, message }, 'Zzer rejected the detail request; verify live request parameters/signature');
        throw error;
      }

      if (attempt === 3) {
        logger.error({ productId, attempt, rawResponsePath, message }, 'Zzer fetch failed after retries');
        throw error;
      }

      const backoffMs = 500 * attempt;
      logger.warn({ productId, attempt, backoffMs, message }, 'Retrying Zzer product fetch');
      await delay(backoffMs);
    }
  }

  throw new Error('Unavailable product detail for ' + productId);
}

export async function scrapeProductById(productId: string): Promise<ProductRecord> {
  return fetchProductDetail(productId);
}
