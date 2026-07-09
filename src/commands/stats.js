const { SlashCommandBuilder } = require("discord.js");
const { getGuildStats, getUserStats } = require("../stores/audit-store");
const { listActiveWheels } = require("../stores/wheels-store");
const { buildV2Payload } = require("../v2-message");

function buildStatsCommand() {
  return new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View SpinRoom statistics")
    .addUserOption((option) =>
      option.setName("user").setDescription("User stats (defaults to server stats)").setRequired(false),
    );
}

async function handleStatsCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Stats are per-server.", ephemeral: true });
    return true;
  }

  const targetUser = interaction.options.getUser("user");

  if (targetUser) {
    const stats = getUserStats(targetUser.id);
    const content = [
      `## 📊 Stats for ${targetUser.username}`,
      `**Spins participated:** ${stats.totalSpins}`,
      `**Wins:** ${stats.wins}`,
      `**Vetoes used:** ${stats.vetoes}`,
      `**Wheels hosted:** ${stats.hosts}`,
    ].join("\n");
    await interaction.reply(buildV2Payload({ content, ephemeral: true }));
    return true;
  }

  const guildStats = getGuildStats(interaction.guildId);
  const activeWheels = listActiveWheels(interaction.guildId);
  const topOptions = Object.entries(guildStats.optionWins ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count], i) => `${i + 1}. **${label}** — ${count} wins`)
    .join("\n");

  const modeLines = Object.entries(guildStats.modeCounts ?? {})
    .map(([mode, count]) => `• **${mode}:** ${count}`)
    .join("\n");

  const content = [
    "## 📊 Server SpinRoom Stats",
    `**Total spins:** ${guildStats.totalSpins}`,
    `**Active wheels:** ${activeWheels.length}`,
    "",
    "**Top winning options:**",
    topOptions || "*none yet*",
    "",
    "**Spins by mode:**",
    modeLines || "*none yet*",
  ].join("\n");

  await interaction.reply(buildV2Payload({ content, ephemeral: true }));
  return true;
}

module.exports = { buildStatsCommand, handleStatsCommand };
