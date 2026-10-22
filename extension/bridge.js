// bridge.js - isolated world bridge toward the extension runtime
window.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'ZZER_PRODUCT_DATA') return;

  console.log('[Zzer BRIDGE] Mottog data från MAIN world:', event.data.payload?.data?.detail?.id);

  chrome.runtime.sendMessage({
    type: 'zzer:product',
    payload: event.data.payload,
  });
});
