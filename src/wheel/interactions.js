const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { hasProcessed, markProcessed } = require("../panel-dedupe");
const { getWheelById, saveWheel } = require("../stores/wheels-store");
const {
  canManageWheel,
  addOptionToWheel,
  removeOptionFromWheel,
  toggleVote,
  recordBan,
  recordVeto,
  lockEntries,
  setWheelMode,
  addCoHost,
  transferHost,
  undoLastSpin,
  addTeamPlayer,
  touchWheel,
} = require("../wheel/store");
const { getGuildSettings } = require("../stores/guild-settings-store");
const { recordVeto: auditVeto } = require("../stores/audit-store");
const { THEMES } = require("../constants");
const {
  buildWheelPayload,
  buildWheelEditPayload,
  buildWinnerContainer,
  buildSettingsSelectRow,
  buildVoteSelectRow,
  buildRemoveSelectRow,
  buildBanSelectRow,
} = require("../spinroom-components");
const { runSpinAnimation } = require("../wheel/spin-engine");
const { buildV2Payload } = require("../v2-message");

function parseCustomId(customId) {
  const parts = customId.split(":");
  return { action: parts[1], wheelId: parts[2], extra: parts[3] };
}

function memberHasRole(member, roleId) {
  if (!roleId) return true;
  return member?.roles?.cache?.has(roleId) ?? false;
}

function checkRoleGate(member, guildSettings, action) {
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (action === "add") return memberHasRole(member, guildSettings.addRoleId);
  if (action === "spin") return memberHasRole(member, guildSettings.spinRoleId);
  if (action === "vote") return memberHasRole(member, guildSettings.voteRoleId);
  return true;
}

async function getWheelMessage(interaction, wheel) {
  if (wheel.messageId && wheel.channelId) {
    const channel = await interaction.client.channels.fetch(wheel.channelId).catch(() => null);
    if (channel?.isTextBased()) {
      return channel.messages.fetch(wheel.messageId).catch(() => null);
    }
  }
  return interaction.message ?? null;
}

async function refreshPanel(interaction, wheel) {
  const message = await getWheelMessage(interaction, wheel);
  if (message) {
    await message.edit(buildWheelEditPayload(wheel, { userId: interaction.user.id }));
  }
}

async function postAuditLog(client, wheel, result) {
  const settings = getGuildSettings(wheel.guildId);
  if (!settings.auditChannelId) return;

  const channel = await client.channels.fetch(settings.auditChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const payload = buildWinnerContainer(wheel, result);
  await channel.send(payload);
}

async function announceWinner(interaction, wheel, result) {
  const settings = getGuildSettings(wheel.guildId);
  let content = `🎉 **${result.emoji ?? result.option?.emoji} ${result.label}** wins!`;

  if (result.consequence) content += `\n*Consequence: ${result.consequence}*`;
  if (result.teams) {
    content += "\n" + result.teams.map((team, i) => `Team ${i + 1}: ${team.map((id) => `<@${id}>`).join(", ")}`).join("\n");
  }

  const allowedMentions = {};
  if (settings.announceRoleId) allowedMentions.roles = [settings.announceRoleId];
  if (settings.announceHere) content = `@here ${content}`;

  await interaction.channel.send({ content, allowedMentions }).catch(() => null);
}

async function handleSpinInteraction(interaction) {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) {
    return false;
  }

  const customId = interaction.customId ?? "";
  if (!customId.startsWith("spin:")) return false;

  if (hasProcessed(interaction.id)) {
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "Already handled.", ephemeral: true }).catch(() => null);
    }
    return true;
  }
  markProcessed(interaction.id);

  const { action, wheelId } = parseCustomId(customId);
  const wheel = getWheelById(wheelId);
  if (!wheel) {
    await interaction.reply({ content: "This wheel no longer exists.", ephemeral: true }).catch(() => null);
    return true;
  }

  const guildSettings = getGuildSettings(wheel.guildId);
  const isManager = canManageWheel(wheel, interaction.user.id);

  try {
    if (interaction.isButton()) {
      if (action === "add") {
        if (!checkRoleGate(interaction.member, guildSettings, "add")) {
          await interaction.reply({ content: "You don't have permission to add options.", ephemeral: true });
          return true;
        }
        const modal = new ModalBuilder()
          .setCustomId(`spin:add_modal:${wheel.id}`)
          .setTitle("Add Wheel Option")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("label")
                .setLabel("Option name")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(80)
                .setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("emoji")
                .setLabel("Emoji")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(8)
                .setRequired(false)
                .setValue("🎡"),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("consequence")
                .setLabel("Consequence (dare mode)")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(200)
                .setRequired(false),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "remove") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host or co-host can remove options.", ephemeral: true });
          return true;
        }
        const row = buildRemoveSelectRow(wheel);
        if (!row) {
          await interaction.reply({ content: "No options to remove.", ephemeral: true });
          return true;
        }
        await interaction.reply({ components: [row], ephemeral: true });
        return true;
      }

      if (action === "vote") {
        if (!checkRoleGate(interaction.member, guildSettings, "vote")) {
          await interaction.reply({ content: "You don't have permission to vote.", ephemeral: true });
          return true;
        }
        const row = buildVoteSelectRow(wheel);
        if (!row) {
          await interaction.reply({ content: "No options to vote for.", ephemeral: true });
          return true;
        }
        await interaction.reply({ components: [row], ephemeral: true });
        return true;
      }

      if (action === "veto") {
        const row = buildBanSelectRow(wheel);
        if (!row) {
          await interaction.reply({ content: "No options to veto.", ephemeral: true });
          return true;
        }
        await interaction.reply({ components: [row], ephemeral: true });
        return true;
      }

      if (action === "settings") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host or co-host can change settings.", ephemeral: true });
          return true;
        }
        const rows = buildSettingsSelectRow(wheel);
        const undoRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`spin:undo:${wheel.id}`)
            .setLabel("Undo Last Spin")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`spin:cohost:${wheel.id}`)
            .setLabel("Make Co-host")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`spin:transfer:${wheel.id}`)
            .setLabel("Transfer Host")
            .setStyle(ButtonStyle.Secondary),
        );
        await interaction.reply({ components: [...rows, undoRow], ephemeral: true });
        return true;
      }

      if (action === "lock") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host or co-host can lock entries.", ephemeral: true });
          return true;
        }
        lockEntries(wheel, !wheel.settings.locked);
        await interaction.deferUpdate();
        await refreshPanel(interaction, wheel);
        return true;
      }

      if (action === "teams") {
        addTeamPlayer(wheel, interaction.user.id);
        await interaction.reply({ content: "You joined the team pool!", ephemeral: true });
        return true;
      }

      if (action === "spin") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host or co-host can spin.", ephemeral: true });
          return true;
        }
        if (!checkRoleGate(interaction.member, guildSettings, "spin")) {
          await interaction.reply({ content: "You don't have permission to spin.", ephemeral: true });
          return true;
        }
        await interaction.deferUpdate();
        const message = await getWheelMessage(interaction, wheel);
        if (!message) throw new Error("Could not find wheel message.");
        const result = await runSpinAnimation(message, wheel);
        if (!result.blank && wheel.settings.announceWinner) {
          await announceWinner(interaction, wheel, result);
        }
        await postAuditLog(interaction.client, wheel, result);
        return true;
      }

      if (action === "undo") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host can undo.", ephemeral: true });
          return true;
        }
        undoLastSpin(wheel);
        await interaction.reply({ content: "Last spin undone.", ephemeral: true });
        await refreshPanel(interaction, wheel);
        return true;
      }

      if (action === "cohost") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host can add co-hosts.", ephemeral: true });
          return true;
        }
        addCoHost(wheel, interaction.user.id);
        await interaction.reply({ content: "You are now a co-host.", ephemeral: true });
        await refreshPanel(interaction, wheel);
        return true;
      }

      if (action === "transfer") {
        if (wheel.hostId !== interaction.user.id) {
          await interaction.reply({ content: "Only the current host can transfer.", ephemeral: true });
          return true;
        }
        transferHost(wheel, interaction.user.id);
        await interaction.reply({ content: "You are now the host.", ephemeral: true });
        await refreshPanel(interaction, wheel);
        return true;
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (action === "vote_select") {
        const optionId = interaction.values[0];
        toggleVote(wheel, optionId, interaction.user.id);
        await interaction.reply({ content: "Vote recorded!", ephemeral: true });
        await refreshPanel(interaction, wheel);
        return true;
      }

      if (action === "remove_select") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host can remove options.", ephemeral: true });
          return true;
        }
        removeOptionFromWheel(wheel, interaction.values[0]);
        await interaction.reply({ content: "Option removed.", ephemeral: true });
        await refreshPanel(interaction, wheel);
        return true;
      }

      if (action === "ban_select") {
        try {
          if (wheel.mode === "ban") {
            recordBan(wheel, interaction.user.id, interaction.values[0]);
          } else {
            recordVeto(wheel, interaction.user.id, interaction.values[0]);
            auditVeto(interaction.user.id);
          }
          await interaction.reply({ content: "Veto/ban recorded!", ephemeral: true });
          await refreshPanel(interaction, wheel);
        } catch (error) {
          await interaction.reply({ content: error.message, ephemeral: true });
        }
        return true;
      }

      if (action === "mode") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host can change mode.", ephemeral: true });
          return true;
        }
        setWheelMode(wheel, interaction.values[0]);
        await interaction.reply({ content: `Mode set to **${interaction.values[0]}**.`, ephemeral: true });
        await refreshPanel(interaction, wheel);
        return true;
      }

      if (action === "theme") {
        if (!isManager) {
          await interaction.reply({ content: "Only the host can change theme.", ephemeral: true });
          return true;
        }
        wheel.theme = interaction.values[0];
        touchWheel(wheel);
        await interaction.reply({
          content: `Theme set to **${THEMES[wheel.theme]?.label ?? wheel.theme}**.`,
          ephemeral: true,
        });
        await refreshPanel(interaction, wheel);
        return true;
      }
    }

    if (interaction.isModalSubmit() && action === "add_modal") {
      const label = interaction.fields.getTextInputValue("label");
      const emoji = interaction.fields.getTextInputValue("emoji") || "🎡";
      const consequence = interaction.fields.getTextInputValue("consequence") || null;
      addOptionToWheel(wheel, {
        label,
        emoji,
        consequence,
        addedBy: interaction.user.id,
      });
      await interaction.reply({ content: `Added **${emoji} ${label}**`, ephemeral: true });
      await refreshPanel(interaction, wheel);
      return true;
    }
  } catch (error) {
    const message = error?.message ?? "Something went wrong.";
    if (interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
    } else if (interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true }).catch(() => null);
    } else {
      await interaction.reply({ content: message, ephemeral: true }).catch(() => null);
    }
    wheel.settings.spinning = false;
    touchWheel(wheel);
    return true;
  }

  return true;
}

function attachWheelMessage(wheel, message) {
  wheel.messageId = message.id;
  wheel.channelId = message.channelId;
  saveWheel(wheel);
  return wheel;
}

module.exports = { handleSpinInteraction, attachWheelMessage, buildWheelPayload };
