// fetch wrapper ที่ retry 2 ครั้ง (1s → 2s backoff) สำหรับ transient GEE timeout
// ใช้แทน fetch() ตรงๆ ใน hook ที่ยิงไป backend
//
// retry เฉพาะ:
//   - network error (fetch reject)
//   - 5xx status (server-side blip)
// ไม่ retry:
//   - 4xx (request ผิด — retry ก็ไม่เปลี่ยน)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function fetchWithRetry(url, options = {}, { retries = 2, baseDelayMs = 1000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) {
      await sleep(baseDelayMs * (attempt + 1));  // 1s, 2s
    }
  }
  throw lastErr;
}
