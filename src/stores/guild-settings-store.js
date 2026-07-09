const { createJsonStore } = require("../utils/json-store");
const { SPIN_COOLDOWN_DEFAULT_SEC } = require("../constants");

const store = createJsonStore("guild-settings.json", {});

const DEFAULTS = {
  maxOptions: 12,
  defaultTheme: "casino",
  defaultMode: "classic",
  auditChannelId: null,
  spinCooldownSec: SPIN_COOLDOWN_DEFAULT_SEC,
  allowedModes: null,
  addRoleId: null,
  spinRoleId: null,
  voteRoleId: null,
  announceRoleId: null,
  announceHere: false,
};

function getGuildSettings(guildId) {
  const all = store.load();
  return { ...DEFAULTS, ...(all[guildId] ?? {}) };
}

function updateGuildSettings(guildId, patch) {
  const all = store.load();
  all[guildId] = { ...DEFAULTS, ...(all[guildId] ?? {}), ...patch };
  store.save(all);
  return all[guildId];
}

module.exports = { getGuildSettings, updateGuildSettings, DEFAULTS };
