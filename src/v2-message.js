const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { DEFAULT_COLOR } = require("./constants");

const MAX_TEXT = 4000;

function addText(container, text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return;
  let remaining = normalized;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, MAX_TEXT);
    remaining = remaining.slice(MAX_TEXT);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
  }
}

function buildV2FromDraft(draft) {
  const container = new ContainerBuilder().setAccentColor(draft.accentColor ?? draft.color ?? DEFAULT_COLOR);

  const parts = [];
  if (draft.title) parts.push(`## ${draft.title}`);
  if (draft.description) parts.push(draft.description);

  if (draft.fields?.length) {
    for (const field of draft.fields) {
      parts.push(`**${field.name}**\n${field.value}`);
    }
  }

  if (draft.footer) parts.push(`— *${draft.footer}*`);

  addText(container, parts.join("\n\n"));

  for (const section of draft.sections ?? []) {
    if (!section.content) continue;
    const { SectionBuilder, ThumbnailBuilder } = require("discord.js");
    const sec = new SectionBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(section.content),
    );
    if (section.thumbnailUrl) {
      sec.setThumbnailAccessory(
        new ThumbnailBuilder().setURL(section.thumbnailUrl).setDescription(section.content.slice(0, 80)),
      );
    }
    container.addSectionComponents(sec);
  }

  for (const url of draft.imageUrls ?? []) {
    if (!url) continue;
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url)),
    );
  }

  if (draft.thumbnail && !draft.imageUrls?.length) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(draft.thumbnail)),
    );
  }
  if (draft.image) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(draft.image)),
    );
  }

  return container;
}

function buildV2Payload(draft, { ephemeral = false } = {}) {
  let flags = MessageFlags.IsComponentsV2;
  if (ephemeral) flags |= MessageFlags.Ephemeral;
  return { flags, components: [buildV2FromDraft(draft)] };
}

function buildV2EditPayload(draft) {
  return buildV2Payload(draft);
}

module.exports = { buildV2FromDraft, buildV2Payload, buildV2EditPayload, addText };
