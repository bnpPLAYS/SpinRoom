const { createJsonStore } = require("../utils/json-store");

const store = createJsonStore("templates.json", {});

function listTemplates(guildId, userId) {
  const all = store.load();
  const guild = all[guildId] ?? {};
  const personal = all[`user:${userId}`] ?? {};
  return { guild: Object.values(guild), personal: Object.values(personal) };
}

function saveTemplate({ guildId, userId, name, draft, scope = "guild" }) {
  const all = store.load();
  const key = scope === "personal" ? `user:${userId}` : guildId;
  if (!all[key]) all[key] = {};

  all[key][name.toLowerCase()] = {
    name,
    type: draft.type,
    title: draft.title,
    description: draft.description,
    color: draft.color,
    accentColor: draft.accentColor,
    url: draft.url,
    thumbnail: draft.thumbnail,
    image: draft.image,
    footer: draft.footer,
    fields: draft.fields,
    sections: draft.sections,
    imageUrls: draft.imageUrls,
    linkButtons: draft.linkButtons,
    savedAt: Date.now(),
    savedBy: userId,
  };
  store.save(all);
  return all[key][name.toLowerCase()];
}

function getTemplate(guildId, userId, name, scope = "guild") {
  const all = store.load();
  const key = scope === "personal" ? `user:${userId}` : guildId;
  return all[key]?.[name.toLowerCase()] ?? null;
}

function applyTemplateToDraft(draft, template) {
  Object.assign(draft, {
    type: template.type ?? draft.type,
    title: template.title ?? "",
    description: template.description ?? "",
    color: template.color ?? draft.color,
    accentColor: template.accentColor ?? template.color ?? draft.accentColor,
    url: template.url ?? "",
    thumbnail: template.thumbnail ?? "",
    image: template.image ?? "",
    footer: template.footer ?? "",
    fields: structuredClone(template.fields ?? []),
    sections: structuredClone(template.sections ?? []),
    imageUrls: structuredClone(template.imageUrls ?? []),
    linkButtons: structuredClone(template.linkButtons ?? []),
  });
  return draft;
}

module.exports = { listTemplates, saveTemplate, getTemplate, applyTemplateToDraft };
