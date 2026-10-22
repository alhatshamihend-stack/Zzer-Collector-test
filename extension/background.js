const SUPABASE_FUNCTIONS_PATH = "/functions/v1/";
const ZZER_TRACK_HOST = "gwapi-v2.goshare2.com";
const ZZER_TRACK_PATH = "/producer/api/data/collect/track";
let missingConfigurationWarningLogged = false;

function normalizeConditionGrade(value) {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase();
  const aliases = {
    "new": "new",
    "as new": "new",
    "som ny": "new",
    "ny": "new",
    "like new": "like_new",
    "like-new": "like_new",
    "likenew": "like_new",
    "good": "good",
    "bra": "good",
    "gott": "good",
    "very good": "very_good",
    "verygood": "very_good",
    "excellent": "excellent",
    "a": "a",
    "b": "b",
    "c": "c",
    "d": "d",
    "e": "e",
  };

  if (aliases[normalized]) return aliases[normalized];
  if (/^[abcde]$/i.test(raw)) return raw.toLowerCase();
  return null;
}

// Ny funktion för att mappa Zzers specifika data.detail-struktur
function mapZzerDetailPayload(raw) {
  if (!raw || typeof raw !== "object") return null;

  // Hämta detail-objektet från svaret
  const detail = raw.data?.detail || raw.detail || raw.product || raw.data || raw;
  if (!detail || typeof detail !== "object") return null;

  // Extrahera pris och konvertera från string till number
  const rawPrice = detail.price ?? detail.salePrice ?? detail.currentPrice;
  const parsedPrice = typeof rawPrice === "number"
    ? rawPrice
    : Number(String(rawPrice ?? "").replace(/[^\d.-]/g, ""));

  // Bygg bild-URL:er (Zzer använder relativa sökvägar)
  const imageBaseUrl = "https://img.goshare2.com/";
  const images = Array.isArray(detail.imageList)
    ? detail.imageList.map(img => img.startsWith("http") ? img : `${imageBaseUrl}${img}`)
    : [];

  const normalizedDegree = normalizeConditionGrade(detail.degreeDesc ?? detail.degree ?? detail.condition);

  return {
    itemId: String(detail.id ?? detail.itemId ?? detail.productId ?? ""),
    title: String(detail.name ?? detail.title ?? detail.productName ?? "Okänd produkt"),
    brand: String(raw.data?.brand?.name ?? detail.brand ?? detail.vendor ?? "Okänd"),
    price: Number.isFinite(parsedPrice) ? parsedPrice : 0,
    degree: normalizedDegree,
    images: images.length > 0 ? images : [],
  };
}

async function getSupabaseConfig() {
  const {
    supabaseProjectUrl,
    supabaseAnonKey,
    supabaseWebhookSecret,
  } = await chrome.storage.local.get([
    "supabaseProjectUrl",
    "supabaseAnonKey",
    "supabaseWebhookSecret",
  ]);

  if (
    typeof supabaseProjectUrl !== "string" ||
    typeof supabaseAnonKey !== "string" ||
    typeof supabaseWebhookSecret !== "string" ||
    !supabaseProjectUrl.trim() ||
    !supabaseAnonKey.trim() ||
    supabaseWebhookSecret.trim().length < 32
  ) {
    throw new Error(
      "Supabase is not configured: URL, anon public key, and webhook secret are required in chrome.storage.local",
    );
  }

  let projectUrl;
  try { projectUrl = new URL(supabaseProjectUrl.trim()); } 
  catch { throw new Error("Supabase project URL is invalid"); }

  if (projectUrl.protocol !== "https:" || !projectUrl.hostname.endsWith(".supabase.co")) {
    throw new Error("Invalid Supabase URL");
  }

  return {
    projectUrl: projectUrl.origin,
    anonKey: supabaseAnonKey.trim(),
    webhookSecret: supabaseWebhookSecret.trim(),
  };
}

async function sendToSupabase(functionName, payload) {
  const { projectUrl, anonKey, webhookSecret } = await getSupabaseConfig();
  const response = await fetch(new URL(`${SUPABASE_FUNCTIONS_PATH}${functionName}`, projectUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      "x-zzer-webhook-secret": webhookSecret,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  
  console.log("[Zzer Background] Supabase svar:", data);
  if (!response.ok) {
    const reason = typeof data.error === "string" ? data.error : "Request failed";
    throw new Error(`${reason} (HTTP ${response.status})`);
  }
  return { ok: true, data };
}

function parseRequestBody(details) {
  const chunks = details.requestBody?.raw?.map((entry) => entry.bytes).filter((bytes) => bytes instanceof ArrayBuffer);
  if (!chunks?.length) return null;

  const byteLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bodyBytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  try { return JSON.parse(new TextDecoder("utf-8").decode(bodyBytes)); } 
  catch { return null; }
}

// Lyssna på track-anrop (för analytics/timing)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.method !== "POST") return;
    const requestUrl = new URL(details.url);
    
    if (requestUrl.hostname !== ZZER_TRACK_HOST || requestUrl.pathname !== ZZER_TRACK_PATH) return;

    console.log(`[Zzer Background] Fångade track-POST: ${requestUrl.pathname}`);
    
    // Notera: Track-payloaden innehåller INTE produktdata, bara analytics.
    // Produktdatan hämtas separat via GET-detail-endpointen.
  },
  { urls: [`*://${ZZER_TRACK_HOST}${ZZER_TRACK_PATH}*`] },
  ["requestBody"]
);

// Tillfällig debug-lyssnare (försvinner vid reload)
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes("gwapi-v2.goshare2.com")) {
      console.log("[DEBUG] Zzer-anrop:", details.method, new URL(details.url).pathname);
    }
  },
  { urls: ["*://gwapi-v2.goshare2.com/*"] },
  ["requestBody"]
);
console.log("✅ Tillfällig lyssnare registrerad!");

// DEBUG: Lyssna på ALLA anrop mot gwapi-v2 för att hitta produkt-detail-endpointen
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes("gwapi-v2.goshare2.com") && details.method === "GET") {
      console.log("[DEBUG] GET-anrop:", new URL(details.url).pathname);
    }
  },
  { urls: ["*://gwapi-v2.goshare2.com/*"] }
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "zzer:product") {
    return false;
  }

  console.log("[Zzer Background] Mottog produktdetaljer från content script");
  
  // Använd mapZzerDetailPayload för att mappa fälten
  const zzerPayload = mapZzerDetailPayload(message.payload);
  
  if (!zzerPayload || !zzerPayload.itemId) {
    console.warn("[Zzer Background] Ogiltig payload:", zzerPayload);
    sendResponse({ ok: false, error: "Invalid payload" });
    return false;
  }

  console.log("[Zzer Background] Payload extraherad:", zzerPayload);

  sendToSupabase("zzer-track-ingest", {
    zzer_payload: zzerPayload,
    captured_at: new Date().toISOString(),
  })
    .then((result) => {
      console.log("[Zzer Background] Supabase svar:", result);
      sendResponse(result);
    })
    .catch((error) => {
      console.error("[Zzer Background] Supabase fel:", error.message);
      sendResponse({ ok: false, error: error.message });
    });

  return true; // Viktigt för async response
});
