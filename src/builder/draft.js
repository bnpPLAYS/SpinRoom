const crypto = require("crypto");
const { DEFAULT_COLOR, DRAFT_TTL_MS } = require("../constants");
const { createJsonStore } = require("../utils/json-store");

const store = createJsonStore("drafts.json", {});

function randomId(len = 10) {
  return crypto.randomBytes(len).toString("hex").slice(0, len);
}

function parseColor(input) {
  if (!input) return DEFAULT_COLOR;
  const trimmed = String(input).trim();
  if (trimmed.startsWith("#")) return parseInt(trimmed.slice(1), 16);
  if (trimmed.startsWith("0x")) return parseInt(trimmed, 16);
  const named = {
    blurple: 0x5865f2,
    green: 0x57f287,
    yellow: 0xfee75c,
    red: 0xed4245,
    white: 0xffffff,
    black: 0x000000,
  };
  if (named[trimmed.toLowerCase()]) return named[trimmed.toLowerCase()];
  const num = parseInt(trimmed, 16);
  return Number.isNaN(num) ? DEFAULT_COLOR : num;
}

function colorToHex(color) {
  return `#${(color >>> 0).toString(16).padStart(6, "0")}`;
}

function createDraft({ userId, guildId, channelId, type = "normal" }) {
  const draft = {
    id: randomId(12),
    userId,
    guildId,
    channelId,
    type,
    title: "",
    description: "",
    color: DEFAULT_COLOR,
    accentColor: DEFAULT_COLOR,
    url: "",
    thumbnail: "",
    image: "",
    footer: "",
    fields: [],
    sections: [],
    imageUrls: [],
    linkButtons: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + DRAFT_TTL_MS,
  };
  saveDraft(draft);
  return draft;
}

function saveDraft(draft) {
  draft.updatedAt = Date.now();
  const all = store.load();
  all[draft.id] = draft;
  store.save(all);
  return draft;
}

function getDraft(id) {
  const draft = store.load()[id];
  if (!draft) return null;
  if (Date.now() > draft.expiresAt) {
    deleteDraft(id);
    return null;
  }
  return draft;
}

function getDraftForUser(userId) {
  const all = store.load();
  const now = Date.now();
  return (
    Object.values(all).find((d) => d.userId === userId && now < d.expiresAt) ?? null
  );
}

function deleteDraft(id) {
  const all = store.load();
  delete all[id];
  store.save(all);
}

function draftSummary(draft) {
  const typeLabel = draft.type === "v2" ? "Components V2" : "Normal Embed";
  const lines = [
    `**Type:** ${typeLabel}`,
    `**Title:** ${draft.title || "*empty*"}`,
    `**Description:** ${draft.description ? `${draft.description.slice(0, 120)}${draft.description.length > 120 ? "…" : ""}` : "*empty*"}`,
    `**Color:** ${colorToHex(draft.color)}`,
    `**Fields:** ${draft.fields.length}`,
    `**Sections:** ${draft.sections.length}`,
    `**Images:** ${[draft.thumbnail, draft.image, ...(draft.imageUrls ?? [])].filter(Boolean).length}`,
    `**Footer:** ${draft.footer || "*empty*"}`,
    `**Link buttons:** ${draft.linkButtons.length}`,
  ];
  return lines.join("\n");
}

function normalToV2Draft(draft) {
  draft.type = "v2";
  draft.accentColor = draft.color;
  if (draft.fields.length && !draft.sections.length) {
    draft.sections = draft.fields.map((f) => ({
      content: `**${f.name}**\n${f.value}`,
      thumbnailUrl: "",
    }));
  }
  const urls = [];
  if (draft.thumbnail) urls.push(draft.thumbnail);
  if (draft.image) urls.push(draft.image);
  draft.imageUrls = urls;
  return saveDraft(draft);
}

function v2ToNormalDraft(draft) {
  draft.type = "normal";
  if (draft.sections.length && !draft.fields.length) {
    draft.fields = draft.sections.slice(0, 25).map((s, i) => ({
      name: `Section ${i + 1}`,
      value: s.content.slice(0, 1024),
      inline: false,
    }));
  }
  if (draft.imageUrls?.[0]) draft.thumbnail = draft.imageUrls[0];
  if (draft.imageUrls?.[1]) draft.image = draft.imageUrls[1];
  draft.color = draft.accentColor ?? draft.color;
  return saveDraft(draft);
}

module.exports = {
  createDraft,
  saveDraft,
  getDraft,
  getDraftForUser,
  deleteDraft,
  draftSummary,
  parseColor,
  colorToHex,
  normalToV2Draft,
  v2ToNormalDraft,
};
