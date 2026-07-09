const processed = new Map();
const { PANEL_DEDUPE_TTL_MS } = require("./constants");

function prune() {
  const now = Date.now();
  for (const [key, timestamp] of processed.entries()) {
    if (now - timestamp > PANEL_DEDUPE_TTL_MS) {
      processed.delete(key);
    }
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
