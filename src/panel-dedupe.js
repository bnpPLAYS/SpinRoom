const processed = new Map();
const TTL_MS = 5 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [key, ts] of processed.entries()) {
    if (now - ts > TTL_MS) processed.delete(key);
  }
}

function hasProcessed(key) {
  prune();
  return processed.has(key);
}

function markProcessed(key) {
  prune();
  processed.set(key, Date.now());
}

module.exports = { hasProcessed, markProcessed };
