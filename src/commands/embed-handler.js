const { createDraft, getDraftForUser, saveDraft, normalToV2Draft, v2ToNormalDraft } = require("../builder/draft");
const { buildBuilderPanel } = require("../builder/panel");
const { renderDraft } = require("../builder/render");
const { parseColor } = require("../builder/draft");
const { getTemplate, applyTemplateToDraft, listTemplates } = require("../stores/templates-store");
const { buildV2Payload } = require("../v2-message");

async function handleEmbedCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Use embed commands in a server.", ephemeral: true });
    return true;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "create") {
    const type = interaction.options.getString("type") ?? "normal";
    const draft = createDraft({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      type,
    });
    await interaction.reply(buildBuilderPanel(draft));
    return true;
  }

  if (sub === "quick") {
    const title = interaction.options.getString("title", true);
    const description = interaction.options.getString("description", true);
    const color = parseColor(interaction.options.getString("color") ?? "#5865F2");
    const type = interaction.options.getString("type") ?? "normal";

    const draft = {
      type,
      title,
      description,
      color,
      accentColor: color,
      fields: [],
      sections: [],
      imageUrls: [],
      linkButtons: [],
      footer: "",
      thumbnail: "",
      image: "",
      url: "",
    };

    const payload = renderDraft(draft);
    await interaction.reply({ content: "Sent!", ephemeral: true });
    await interaction.channel.send(payload);
    return true;
  }

  if (sub === "template") {
    const name = interaction.options.getString("name", true);
    const scope = interaction.options.getString("scope") ?? "guild";
    const template = getTemplate(interaction.guildId, interaction.user.id, name, scope);
    if (!template) {
      await interaction.reply({ content: `Template **${name}** not found.`, ephemeral: true });
      return true;
    }
    const draft = createDraft({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      type: template.type ?? "normal",
    });
    applyTemplateToDraft(draft, template);
    saveDraft(draft);
    await interaction.reply(buildBuilderPanel(draft));
    return true;
  }

  if (sub === "templates") {
    const { guild, personal } = listTemplates(interaction.guildId, interaction.user.id);
    const lines = [
      "**Guild templates:**",
      ...(guild.length ? guild.map((t) => `• \`${t.name}\` — ${t.title || "untitled"} (${t.type})`) : ["*none*"]),
      "",
      "**Personal templates:**",
      ...(personal.length ? personal.map((t) => `• \`${t.name}\` — ${t.title || "untitled"} (${t.type})`) : ["*none*"]),
    ];
    await interaction.reply(buildV2Payload(
      { title: "Saved Templates", description: lines.join("\n"), color: 0x5865f2, accentColor: 0x5865f2 },
      { ephemeral: true },
    ));
    return true;
  }

  if (sub === "convert") {
    const draft = getDraftForUser(interaction.user.id);
    if (!draft) {
      await interaction.reply({ content: "No active draft. Run `/embed create` first.", ephemeral: true });
      return true;
    }
    const to = interaction.options.getString("to", true);
    if (to === "v2") normalToV2Draft(draft);
    else v2ToNormalDraft(draft);
    await interaction.reply(buildBuilderPanel(draft));
    return true;
  }

  return false;
}

module.exports = { handleEmbedCommand };
