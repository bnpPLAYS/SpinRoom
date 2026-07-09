const { createJsonStore } = require("../utils/json-store");

const store = createJsonStore("wheels.json", {});

function getAllWheels() {
  return store.load();
}

function saveAllWheels(wheels) {
  store.save(wheels);
}

function getWheelById(wheelId) {
  return getAllWheels()[wheelId] ?? null;
}

function getWheelByCode(code) {
  const normalized = String(code ?? "").trim().toUpperCase();
  const wheels = getAllWheels();
  return Object.values(wheels).find((wheel) => wheel.code === normalized) ?? null;
}

function saveWheel(wheel) {
  const wheels = getAllWheels();
  wheels[wheel.id] = wheel;
  saveAllWheels(wheels);
  return wheel;
}

function deleteWheel(wheelId) {
  const wheels = getAllWheels();
  delete wheels[wheelId];
  saveAllWheels(wheels);
}

function listActiveWheels(guildId) {
  const now = Date.now();
  return Object.values(getAllWheels()).filter(
    (wheel) => wheel.guildId === guildId && now - wheel.lastActivityAt < wheel.expiryMs,
  );
}

module.exports = {
  getAllWheels,
  getWheelById,
  getWheelByCode,
  saveWheel,
  deleteWheel,
  listActiveWheels,
};
