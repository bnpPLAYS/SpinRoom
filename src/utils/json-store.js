const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "..", "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createJsonStore(filename, defaultValue) {
  const filePath = path.join(DATA_DIR, filename);

  return {
    load() {
      ensureDataDir();
      if (!fs.existsSync(filePath)) return structuredClone(defaultValue);
      try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch {
        return structuredClone(defaultValue);
      }
    },
    save(data) {
      ensureDataDir();
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    },
  };
}

module.exports = { createJsonStore };
