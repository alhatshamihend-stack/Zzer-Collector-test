// content.js - Intercept XHR-anrop för att fånga produktdatan
(function() {
  'use strict';
  
  console.log('[Zzer Content] Script startar...');
  
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._zzerUrl = url;
    this._zzerMethod = method;
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const url = this._zzerUrl || '';
    
    xhr.addEventListener('load', function() {
      try {
        const isGwApi = url.includes('gwapi-v2.goshare2.com');
        const isNotTrack = !url.includes('/track');
        const hasTextResponse = (xhr.responseType === '' || xhr.responseType === 'text');
        
        if (isGwApi && isNotTrack && hasTextResponse) {
          const responseText = xhr.responseText;
          if (responseText) {
            const json = JSON.parse(responseText);
            
            if (json.data?.detail?.id && json.data?.detail?.name) {
              console.log('[Zzer Content] 🎯 PRODUKTDATA HITTAD!', json.data.detail.id, json.data.detail.name);
              
              chrome.runtime.sendMessage({
                type: 'zzer:product',
                payload: json
              });
            }
          }
        }
      } catch (e) {
        // Ignorera icke-JSON svar eller parse-fel tyst
      }
    });
    
    return originalXHRSend.apply(this, [body]);
  };
  
  console.log('[Zzer Content] XHR-interception registrerad!');
})();
