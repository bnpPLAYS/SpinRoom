const { SlashCommandBuilder } = require("discord.js");
const { MODES, THEMES } = require("../constants");
const { createWheel } = require("../wheel/store");
const { buildWheelPayload } = require("../spinroom-components");
const { attachWheelMessage } = require("../wheel/interactions");
const { getGuildSettings } = require("../stores/guild-settings-store");

function buildSpinCommand() {
  return new SlashCommandBuilder()
    .setName("spin")
    .setDescription("Create a SpinRoom decision wheel in this channel")
    .addStringOption((option) =>
      option.setName("title").setDescription("Wheel title").setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Game mode")
        .setRequired(false)
        .addChoices(...Object.entries(MODES).map(([value, meta]) => ({ name: meta.label, value }))),
    )
    .addStringOption((option) =>
      option
        .setName("theme")
        .setDescription("Visual theme")
        .setRequired(false)
        .addChoices(...Object.entries(THEMES).map(([value, meta]) => ({ name: meta.label, value }))),
    )
    .addIntegerOption((option) =>
      option
        .setName("max_options")
        .setDescription("Maximum options (2-24)")
        .setMinValue(2)
        .setMaxValue(24)
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("timer")
        .setDescription("Auto-spin countdown in seconds")
        .setMinValue(0)
        .setMaxValue(3600)
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option.setName("private_votes").setDescription("Hide vote counts until spin").setRequired(false),
    );
}

async function handleSpinCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Wheels can only be created in a server.", ephemeral: true });
    return true;
  }

  const guildSettings = getGuildSettings(interaction.guildId);
  const title = interaction.options.getString("title") ?? "SpinRoom Wheel";
  const mode = interaction.options.getString("mode") ?? guildSettings.defaultMode;
  const theme = interaction.options.getString("theme") ?? guildSettings.defaultTheme;
  const maxOptions = interaction.options.getInteger("max_options") ?? guildSettings.maxOptions;
  const timer = interaction.options.getInteger("timer") ?? 0;
  const privateVotes = interaction.options.getBoolean("private_votes") ?? false;

  const wheel = createWheel({
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    hostId: interaction.user.id,
    title,
    mode,
    theme,
    maxOptions,
    timerSec: timer,
    privateVotes,
  });

  const payload = buildWheelPayload(wheel, {
    userId: interaction.user.id,
    includeWheelImage: true,
  });

  await interaction.reply({ content: "🎡 Wheel created!", ephemeral: true });
  const message = await interaction.channel.send(payload);
  attachWheelMessage(wheel, message);

  return true;
}

module.exports = { buildSpinCommand, handleSpinCommand };
