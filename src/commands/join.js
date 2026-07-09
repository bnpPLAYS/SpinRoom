const { SlashCommandBuilder } = require("discord.js");
const { getWheelByCode } = require("../stores/wheels-store");
const { buildWheelPayload } = require("../spinroom-components");
const { attachWheelMessage } = require("../wheel/interactions");

function buildJoinCommand() {
  return new SlashCommandBuilder()
    .setName("join")
    .setDescription("Open a SpinRoom wheel by room code")
    .addStringOption((option) =>
      option.setName("code").setDescription("Room code, e.g. SPIN-A3F9").setRequired(true),
    );
}

async function handleJoinCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Join wheels from inside a server.", ephemeral: true });
    return true;
  }

  const code = interaction.options.getString("code", true);
  const wheel = getWheelByCode(code);

  if (!wheel) {
    await interaction.reply({ content: `No wheel found for code \`${code}\`.`, ephemeral: true });
    return true;
  }

  const payload = buildWheelPayload(wheel, {
    userId: interaction.user.id,
    includeWheelImage: true,
  });

  await interaction.reply({ content: `Joined wheel \`${wheel.code}\`!`, ephemeral: true });
  const message = await interaction.channel.send(payload);
  attachWheelMessage(wheel, message);
  return true;
}

module.exports = { buildJoinCommand, handleJoinCommand };
