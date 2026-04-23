const cache = new Map<string, any>();

export const getCache = (key: string) => {
  return cache.get(key);
};

export const setCache = (key: string, value: any, ttl = 60) => {
  cache.set(key, value);

  setTimeout(() => {
    cache.delete(key);
  }, ttl * 1000);
};

/* =========================
   CLEAR CACHE (UPGRADED 🔥)
========================= */
export const clearCache = (keyOrPattern: string | RegExp) => {
  // 🔥 STRING CASE
  if (typeof keyOrPattern === "string") {
    cache.delete(keyOrPattern);
    return;
  }

  // 🔥 REGEX CASE (IMPORTANT)
  for (const key of cache.keys()) {
    if (keyOrPattern.test(key)) {
      cache.delete(key);
    }
  }
};