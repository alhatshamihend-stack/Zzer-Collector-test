import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from './config.js';
import { logger } from './logger.js';
import { scrapeProductById } from './scraper.js';
import { uploadProduct } from './supabase-client.js';

async function main(): Promise<void> {
  const config = getConfig();
  const productId = process.argv[2] ?? config.ZZER_PRODUCT_ID;

  if (!productId) {
    logger.error('No product ID supplied. Run: npm run scrape -- <PRODUCT_ID>');
    process.exitCode = 1;
    return;
  }

  try {
    const record = await scrapeProductById(productId);
    const uploadResult = await uploadProduct(record);
    logger.info({ productId, uploadResult }, 'Scrape and Supabase ingest completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ productId, message }, 'Scrape pipeline failed');
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  void main();
}
