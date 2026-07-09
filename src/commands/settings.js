const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../stores/guild-settings-store");
const { MODES, THEMES } = require("../constants");
const { buildV2Payload } = require("../v2-message");

function buildSettingsCommand() {
  return new SlashCommandBuilder()
    .setName("settings")
    .setDescription("Configure SpinRoom for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName("view").setDescription("View current settings"))
    .addSubcommand((sub) =>
      sub
        .setName("audit")
        .setDescription("Set audit log channel for spin results")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel for winner announcements")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("defaults")
        .setDescription("Set default theme and mode")
        .addStringOption((option) =>
          option
            .setName("theme")
            .setDescription("Default theme")
            .addChoices(...Object.entries(THEMES).map(([value, meta]) => ({ name: meta.label, value }))),
        )
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Default mode")
            .addChoices(...Object.entries(MODES).map(([value, meta]) => ({ name: meta.label, value }))),
        )
        .addIntegerOption((option) =>
          option.setName("max_options").setDescription("Default max options").setMinValue(2).setMaxValue(24),
        )
        .addIntegerOption((option) =>
          option.setName("spin_cooldown").setDescription("Seconds between spins").setMinValue(0).setMaxValue(60),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("roles")
        .setDescription("Restrict who can add, vote, or spin")
        .addRoleOption((option) => option.setName("add_role").setDescription("Role required to add options"))
        .addRoleOption((option) => option.setName("vote_role").setDescription("Role required to vote"))
        .addRoleOption((option) => option.setName("spin_role").setDescription("Role required to spin"))
        .addRoleOption((option) =>
          option.setName("announce_role").setDescription("Role pinged on winner"),
        )
        .addBooleanOption((option) => option.setName("announce_here").setDescription("Ping @here on winner")),
    );
}

async function handleSettingsCommand(interaction) {
  if (!interaction.inGuild()) {
    await interaction.reply({ content: "Settings are per-server.", ephemeral: true });
    return true;
  }

  const sub = interaction.options.getSubcommand();
  const current = getGuildSettings(interaction.guildId);

  if (sub === "view") {
    const content = [
      "## ⚙️ SpinRoom Server Settings",
      `**Default theme:** ${current.defaultTheme}`,
      `**Default mode:** ${current.defaultMode}`,
      `**Max options:** ${current.maxOptions}`,
      `**Spin cooldown:** ${current.spinCooldownSec}s`,
      `**Audit channel:** ${current.auditChannelId ? `<#${current.auditChannelId}>` : "*not set*"}`,
      `**Add role:** ${current.addRoleId ? `<@&${current.addRoleId}>` : "*everyone*"}`,
      `**Vote role:** ${current.voteRoleId ? `<@&${current.voteRoleId}>` : "*everyone*"}`,
      `**Spin role:** ${current.spinRoleId ? `<@&${current.spinRoleId}>` : "*everyone*"}`,
      `**Announce role:** ${current.announceRoleId ? `<@&${current.announceRoleId}>` : "*none*"}`,
      `**Announce @here:** ${current.announceHere ? "yes" : "no"}`,
    ].join("\n");
    await interaction.reply(buildV2Payload({ content, ephemeral: true }));
    return true;
  }

  if (sub === "audit") {
    const channel = interaction.options.getChannel("channel");
    updateGuildSettings(interaction.guildId, { auditChannelId: channel?.id ?? null });
    await interaction.reply({
      content: channel ? `Audit log set to ${channel}.` : "Audit log channel cleared.",
      ephemeral: true,
    });
    return true;
  }

  if (sub === "defaults") {
    const patch = {};
    const theme = interaction.options.getString("theme");
    const mode = interaction.options.getString("mode");
    const maxOptions = interaction.options.getInteger("max_options");
    const spinCooldown = interaction.options.getInteger("spin_cooldown");
    if (theme) patch.defaultTheme = theme;
    if (mode) patch.defaultMode = mode;
    if (maxOptions) patch.maxOptions = maxOptions;
    if (spinCooldown !== null) patch.spinCooldownSec = spinCooldown;
    updateGuildSettings(interaction.guildId, patch);
    await interaction.reply({ content: "Defaults updated.", ephemeral: true });
    return true;
  }

  if (sub === "roles") {
    const patch = {};
    const addRole = interaction.options.getRole("add_role");
    const voteRole = interaction.options.getRole("vote_role");
    const spinRole = interaction.options.getRole("spin_role");
    const announceRole = interaction.options.getRole("announce_role");
    const announceHere = interaction.options.getBoolean("announce_here");
    if (addRole) patch.addRoleId = addRole.id;
    if (voteRole) patch.voteRoleId = voteRole.id;
    if (spinRole) patch.spinRoleId = spinRole.id;
    if (announceRole) patch.announceRoleId = announceRole.id;
    if (announceHere !== null) patch.announceHere = announceHere;
    updateGuildSettings(interaction.guildId, patch);
    await interaction.reply({ content: "Role settings updated.", ephemeral: true });
    return true;
  }

  return false;
}

module.exports = { buildSettingsCommand, handleSettingsCommand };
