const { createJsonStore } = require("../utils/json-store");

const store = createJsonStore("templates.json", {});

function getGuildTemplates(guildId) {
  const all = store.load();
  return all[guildId] ?? {};
}

function saveGuildTemplate(guildId, name, template) {
  const all = store.load();
  if (!all[guildId]) all[guildId] = {};
  all[guildId][name.toLowerCase()] = {
    ...template,
    name,
    updatedAt: Date.now(),
  };
  store.save(all);
  return all[guildId][name.toLowerCase()];
}

function getGuildTemplate(guildId, name) {
  return getGuildTemplates(guildId)[name.toLowerCase()] ?? null;
}

function listGuildTemplates(guildId) {
  return Object.values(getGuildTemplates(guildId));
}

function deleteGuildTemplate(guildId, name) {
  const all = store.load();
  if (!all[guildId]) return false;
  delete all[guildId][name.toLowerCase()];
  store.save(all);
  return true;
}

module.exports = {
  getGuildTemplate,
  saveGuildTemplate,
  listGuildTemplates,
  deleteGuildTemplate,
};
