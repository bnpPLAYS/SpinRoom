const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { buildV2Payload } = require("../v2-message");

function buildLinkButtonRows(linkButtons) {
  if (!linkButtons?.length) return [];
  const rows = [];
  let current = new ActionRowBuilder();
  for (const btn of linkButtons.slice(0, 25)) {
    if (current.components.length >= 5) {
      rows.push(current);
      current = new ActionRowBuilder();
    }
    current.addComponents(
      new ButtonBuilder().setLabel(btn.label.slice(0, 80)).setURL(btn.url).setStyle(ButtonStyle.Link),
    );
  }
  if (current.components.length) rows.push(current);
  return rows;
}

function renderNormalDraft(draft, { ephemeral = false } = {}) {
  const embed = new EmbedBuilder().setColor(draft.color ?? 0x5865f2);
  if (draft.title) embed.setTitle(draft.title);
  if (draft.description) embed.setDescription(draft.description);
  if (draft.url) embed.setURL(draft.url);
  if (draft.thumbnail) embed.setThumbnail(draft.thumbnail);
  if (draft.image) embed.setImage(draft.image);
  if (draft.footer) embed.setFooter({ text: draft.footer });

  for (const field of draft.fields ?? []) {
    embed.addFields({
      name: field.name || "—",
      value: field.value || "—",
      inline: Boolean(field.inline),
    });
  }

  const payload = { embeds: [embed], components: buildLinkButtonRows(draft.linkButtons) };
  if (ephemeral) payload.flags = 64;
  return payload;
}

function renderDraft(draft, options = {}) {
  if (draft.type === "v2") {
    const payload = buildV2Payload(draft, options);
    const linkRows = buildLinkButtonRows(draft.linkButtons);
    if (linkRows.length) payload.components = [...payload.components, ...linkRows];
    return payload;
  }
  return renderNormalDraft(draft, options);
}

module.exports = { renderDraft, renderNormalDraft, buildLinkButtonRows };
