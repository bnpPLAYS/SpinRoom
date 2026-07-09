const { SlashCommandBuilder } = require("discord.js");
const { BUILTIN_TEMPLATES } = require("../constants");
const {
  saveGuildTemplate,
  getGuildTemplate,
  listGuildTemplates,
  deleteGuildTemplate,
} = require("../stores/templates-store");
const { createWheel } = require("../wheel/store");
const { buildWheelPayload } = require("../spinroom-components");
const { attachWheelMessage } = require("../wheel/interactions");
const { buildV2Payload } = require("../v2-message");
const { getActiveOptions } = require("../wheel/store");

function buildTemplateCommand() {
  return new SlashCommandBuilder()
    .setName("template")
    .setDescription("Save, load, or list wheel templates")
    .addSubcommand((sub) =>
      sub
        .setName("save")
        .setDescription("Save the current channel's latest wheel as a template")
        .addStringOption((option) =>
          option.setName("name").setDescription("Template name").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("wheel_id").setDescription("Wheel ID to save").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("load")
        .setDescription("Create a wheel from a template")
        .addStringOption((option) =>
          option.setName("name").setDescription("Template name or built-in preset").setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName("list").setDescription("List saved templates"))
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete a saved template")
        .addStringOption((option) =>
          option.setName("name").setDescription("Template name").setRequired(true),
        ),
    );
}

async function handleTemplateCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Templates work in servers only.", ephemeral: true });
    return true;
  }

  const sub = interaction.options.getSubcommand();

  if (sub === "save") {
    const name = interaction.options.getString("name", true);
    const wheelId = interaction.options.getString("wheel_id", true);
    const { getWheelById } = require("../stores/wheels-store");
    const wheel = getWheelById(wheelId);
    if (!wheel) {
      await interaction.reply({ content: "Wheel not found.", ephemeral: true });
      return true;
    }

    saveGuildTemplate(interaction.guildId, name, {
      title: wheel.title,
      mode: wheel.mode,
      theme: wheel.theme,
      maxOptions: wheel.maxOptions,
      options: getActiveOptions(wheel).map((opt) => ({
        label: opt.label,
        emoji: opt.emoji,
        consequence: opt.consequence,
      })),
    });

    await interaction.reply({ content: `Template **${name}** saved!`, ephemeral: true });
    return true;
  }

  if (sub === "load") {
    const name = interaction.options.getString("name", true).toLowerCase();
    const builtin = BUILTIN_TEMPLATES[name];
    const saved = getGuildTemplate(interaction.guildId, name);
    const template = builtin ?? saved;

    if (!template) {
      await interaction.reply({ content: `Template **${name}** not found.`, ephemeral: true });
      return true;
    }

    const wheel = createWheel({
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      hostId: interaction.user.id,
      title: template.title,
      mode: template.mode,
      theme: template.theme,
      maxOptions: template.maxOptions ?? 12,
      options: template.options ?? [],
    });

    const payload = buildWheelPayload(wheel, { userId: interaction.user.id, includeWheelImage: true });
    await interaction.reply({ content: `Loaded template **${name}**!`, ephemeral: true });
    const message = await interaction.channel.send(payload);
    attachWheelMessage(wheel, message);
    return true;
  }

  if (sub === "list") {
    const saved = listGuildTemplates(interaction.guildId);
    const builtinNames = Object.keys(BUILTIN_TEMPLATES);
    const lines = [
      "**Built-in presets:**",
      ...builtinNames.map((n) => `• \`${n}\` — ${BUILTIN_TEMPLATES[n].title}`),
      "",
      "**Saved templates:**",
      ...(saved.length
        ? saved.map((t) => `• \`${t.name}\` — ${t.title} (${t.options?.length ?? 0} options)`)
        : ["*none yet*"]),
    ];

    await interaction.reply(buildV2Payload({ content: lines.join("\n"), ephemeral: true }));
    return true;
  }

  if (sub === "delete") {
    const name = interaction.options.getString("name", true);
    const deleted = deleteGuildTemplate(interaction.guildId, name);
    await interaction.reply({
      content: deleted ? `Deleted template **${name}**.` : `Template **${name}** not found.`,
      ephemeral: true,
    });
    return true;
  }

  return false;
}

module.exports = { buildTemplateCommand, handleTemplateCommand };
