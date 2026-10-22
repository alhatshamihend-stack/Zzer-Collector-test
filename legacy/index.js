import { getConfig } from './config.js';
import { logger } from './logger.js';
import { scrapeProductById } from './scraper.js';
import { uploadProduct } from './supabase-client.js';
async function main() {
    const config = getConfig();
    const productId = process.argv[2] ?? config.ZZER_PRODUCT_ID;
    if (!productId) {
        logger.error('No product id provided. Use --product-id=value or set ZZER_PRODUCT_ID in the environment.');
        process.exitCode = 1;
        return;
    }
    try {
        const record = await scrapeProductById(productId);
        const uploadResult = await uploadProduct(record);
        logger.info({ productId, uploadResult }, 'Scrape and upload completed');
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ productId, message }, 'Scrape failed');
        process.exitCode = 1;
    }
}
if (process.argv[1] && process.argv[1].includes('src/index.ts')) {
    void main();
}
