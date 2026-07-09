const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { getWheelById } = require("../stores/wheels-store");
const { getActiveOptions } = require("../wheel/store");
const { buildV2Payload } = require("../v2-message");

function buildExportCommand() {
  return new SlashCommandBuilder()
    .setName("export")
    .setDescription("Export a wheel as JSON")
    .addStringOption((option) =>
      option.setName("wheel_id").setDescription("Wheel ID to export").setRequired(true),
    );
}

function buildImportCommand() {
  return new SlashCommandBuilder()
    .setName("import")
    .setDescription("Import a wheel from JSON")
    .addAttachmentOption((option) =>
      option.setName("file").setDescription("JSON export file").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("json").setDescription("Raw JSON string").setRequired(false),
    );
}

async function handleExportCommand(interaction) {
  const wheelId = interaction.options.getString("wheel_id", true);
  const wheel = getWheelById(wheelId);

  if (!wheel) {
    await interaction.reply({ content: "Wheel not found.", ephemeral: true });
    return true;
  }

  const exportData = {
    title: wheel.title,
    mode: wheel.mode,
    theme: wheel.theme,
    maxOptions: wheel.maxOptions,
    options: getActiveOptions(wheel).map((opt) => ({
      label: opt.label,
      emoji: opt.emoji,
      consequence: opt.consequence,
    })),
    exportedAt: new Date().toISOString(),
    code: wheel.code,
  };

  const json = JSON.stringify(exportData, null, 2);
  const file = new AttachmentBuilder(Buffer.from(json, "utf8"), {
    name: `spinroom-${wheel.code}.json`,
  });

  await interaction.reply({
    content: `Exported wheel \`${wheel.code}\`.`,
    files: [file],
    ephemeral: true,
  });
  return true;
}

async function handleImportCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Import in a server channel.", ephemeral: true });
    return true;
  }

  const file = interaction.options.getAttachment("file");
  const jsonText = interaction.options.getString("json");
  let raw = jsonText;

  if (file) {
    const response = await fetch(file.url);
    raw = await response.text();
  }

  if (!raw) {
    await interaction.reply({ content: "Provide a JSON file or string.", ephemeral: true });
    return true;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    await interaction.reply({ content: "Invalid JSON.", ephemeral: true });
    return true;
  }

  const { createWheel } = require("../wheel/store");
  const { buildWheelPayload } = require("../spinroom-components");
  const { attachWheelMessage } = require("../wheel/interactions");

  const wheel = createWheel({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    title: data.title ?? "Imported Wheel",
    mode: data.mode ?? "classic",
    theme: data.theme ?? "casino",
    maxOptions: data.maxOptions ?? 12,
    options: data.options ?? [],
  });

  const payload = buildWheelPayload(wheel, { userId: interaction.user.id, includeWheelImage: true });
  await interaction.reply({ content: "Wheel imported!", ephemeral: true });
  const message = await interaction.channel.send(payload);
  attachWheelMessage(wheel, message);
  return true;
}

module.exports = {
  buildExportCommand,
  buildImportCommand,
  handleExportCommand,
  handleImportCommand,
};
