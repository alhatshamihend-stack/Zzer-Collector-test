import { getConfig } from '../src/config.js';

async function checkToken(): Promise<void> {
  console.log('🔍 Kontrollerar Zzer auth token...');

  try {
    const config = getConfig();

    const url = `${config.ZZER_API_BASE_URL}/guide/api/v1/home/indexTop`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.ZZER_AUTH_TOKEN}`,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Origin: 'https://zzer.com',
        Referer: 'https://zzer.com/',
      },
    });

    if (response.status === 401 || response.status === 403) {
      console.error(`❌ Token ogiltig eller utgången (Status: ${response.status})`);
      console.error('   Hämta en ny token från DevTools → Network → Headers');
      process.exit(1);
    }

    if (!response.ok) {
      console.error(`⚠️ Oväntat svar från Zzer API (Status: ${response.status})`);
      console.error('   Token kan vara giltig men API:t svarar inte normalt');
      process.exit(1);
    }

    console.log('✅ Zzer auth token är giltig!');
    console.log('   Du kan nu köra: npm run scrape -- <PRODUCT_ID>');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Nätverksfel vid token-kontroll:', message);
    process.exit(1);
  }
}

void checkToken();
