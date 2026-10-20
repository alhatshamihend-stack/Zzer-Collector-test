// content.js - MAIN World interceptor för Zzer
(function() {
  'use strict';

  if (window.__ZZER_MAIN_INTERCEPTOR_ACTIVE__) return;
  window.__ZZER_MAIN_INTERCEPTOR_ACTIVE__ = true;

  console.log('[Zzer MAIN] Script startar i frame:', window.location.href);

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];

    if (url && typeof url === 'string' &&
        url.includes('gwapi-v2.goshare2.com') &&
        !url.includes('/track')) {
      const response = await originalFetch.apply(this, args);
      const clone = response.clone();

      try {
        const json = await clone.json();

        if (json.data?.detail?.id && json.data?.detail?.name) {
          console.log('[Zzer MAIN] 🎯 PRODUKTDATA HITTAD!', json.data.detail.id, json.data.detail.name);
          window.postMessage({
            type: 'ZZER_PRODUCT_DATA',
            payload: json
          }, '*');
        }
      } catch (e) {
        // Ignorera icke-JSON-svar.
      }
    }

    return response;
  };

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._zzerUrl = url;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const url = this._zzerUrl || '';

    if (url.includes('gwapi-v2.goshare2.com') && !url.includes('/track')) {
      xhr.addEventListener('load', function() {
        try {
          if ((xhr.responseType === '' || xhr.responseType === 'text') && xhr.responseText) {
            const json = JSON.parse(xhr.responseText);

            if (json.data?.detail?.id && json.data?.detail?.name) {
              console.log('[Zzer MAIN] 🎯 PRODUKTDATA HITTAD (XHR)!', json.data.detail.id, json.data.detail.name);
              window.postMessage({
                type: 'ZZER_PRODUCT_DATA',
                payload: json
              }, '*');
            }
          }
        } catch (e) {
          // Ignorera svar som inte kan parseas som JSON.
        }
      });
    }

    return originalXHRSend.apply(this, [body]);
  };

  console.log('[Zzer MAIN] Interception registrerad i MAIN world!');
})();
