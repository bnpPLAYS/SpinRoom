const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} = require("discord.js");
const { buildV2Container, buildV2Payload, buildV2EditPayload } = require("./v2-message");
const { THEMES, MODES, WHEEL_FILENAME } = require("./constants");
const { getActiveOptions, getTotalVoteWeight, canManageWheel } = require("./wheel/store");
const { getBracketLabel } = require("./modes/bracket");
const { renderWheelPng } = require("./wheel/renderer");

function buildVoteBar(votes, maxVotes) {
  const total = Math.max(votes, 0);
  const max = Math.max(maxVotes, 1);
  const filled = Math.round((total / max) * 10);
  return `${"█".repeat(filled)}${"░".repeat(10 - filled)} ${total} vote${total === 1 ? "" : "s"}`;
}

function formatTimer(wheel) {
  if (!wheel.settings.timerEndsAt) return null;
  const remaining = Math.max(0, wheel.settings.timerEndsAt - Date.now());
  const sec = Math.ceil(remaining / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildHeaderText(wheel) {
  const theme = THEMES[wheel.theme] ?? THEMES.casino;
  const mode = MODES[wheel.mode] ?? MODES.classic;
  const timer = formatTimer(wheel);
  const active = getActiveOptions(wheel);

  const lines = [
    `## ${theme.emoji} ${wheel.title}`,
    `**Mode:** ${mode.emoji} ${mode.label} · **Options:** ${active.length}/${wheel.maxOptions}`,
  ];

  if (timer) lines.push(`**Timer:** ${timer}`);
  if (wheel.settings.locked) lines.push("🔒 **Entries locked**");
  if (wheel.mode === "bracket" && wheel.bracket) {
    lines.push(`**Matchup:** ${getBracketLabel(wheel)}`);
  }
  if (wheel.settings.spinning) lines.push("🎲 **Spinning...**");

  return lines.join("\n");
}

function buildOptionSections(wheel) {
  const active = getActiveOptions(wheel);
  const maxVotes = Math.max(1, ...active.map((opt) => getTotalVoteWeight(opt)));
  const sections = [];

  if (!active.length) {
  } else {
    for (const opt of active.slice(0, 12)) {
      const votes = getTotalVoteWeight(opt);
      const voteBar = wheel.settings.privateVotes
        ? "*votes hidden*"
        : buildVoteBar(votes, maxVotes);
      const vetoText = opt.vetoedBy.length ? ` · ${opt.vetoedBy.length} veto${opt.vetoedBy.length === 1 ? "" : "es"}` : "";
      const highlight = wheel.settings.highlightedOptionId === opt.id ? " ✨" : "";
      const privateTag = opt.private ? " 🔒" : "";

      const section = new SectionBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**${opt.emoji} ${opt.label}**${highlight}${privateTag}\n${voteBar}${vetoText}` +
            (opt.consequence ? `\n*Consequence: ${opt.consequence}*` : ""),
        ),
      );

      section.setThumbnailAccessory(
        new ThumbnailBuilder().setDescription(opt.label).setURL(getEmojiUrl(opt.emoji)),
      );
      sections.push(section);
    }

    if (active.length > 12) {
      sections.push(
        new SectionBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`*+${active.length - 12} more options not shown*`),
        ),
      );
    }
  }

  return sections;
}

function getEmojiUrl(emoji) {
  const codepoints = [...emoji].map((char) => char.codePointAt(0).toString(16));
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints.join("-")}.png`;
}

function buildHistoryText(wheel) {
  if (!wheel.spinHistory.length) return "**Recent spins:** *none yet*";
  const labels = wheel.spinHistory.map((entry) => `${entry.emoji} ${entry.label}`).join(" → ");
  return `**Recent spins:** ${labels}`;
}

function buildFooterText(wheel) {
  const coHosts = wheel.coHostIds.length ? ` · Co-hosts: ${wheel.coHostIds.length}` : "";
  return `Host: <@${wheel.hostId}> · Code: \`${wheel.code}\`${coHosts}`;
}

function buildControlRows(wheel, userId) {
  const isManager = canManageWheel(wheel, userId);
  const spinning = wheel.settings.spinning;
  const locked = wheel.settings.locked;

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:add:${wheel.id}`)
      .setLabel("Add")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(spinning || locked),
    new ButtonBuilder()
      .setCustomId(`spin:remove:${wheel.id}`)
      .setLabel("Remove")
      .setEmoji("➖")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(spinning || !isManager),
    new ButtonBuilder()
      .setCustomId(`spin:vote:${wheel.id}`)
      .setLabel("Vote")
      .setEmoji("🗳️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(spinning),
    new ButtonBuilder()
      .setCustomId(`spin:settings:${wheel.id}`)
      .setLabel("Settings")
      .setEmoji("⚙️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(spinning),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spin:spin:${wheel.id}`)
      .setLabel("SPIN")
      .setEmoji("🎲")
      .setStyle(ButtonStyle.Success)
      .setDisabled(spinning || !isManager),
    new ButtonBuilder()
      .setCustomId(`spin:veto:${wheel.id}`)
      .setLabel("Veto")
      .setEmoji("🚫")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(spinning),
    new ButtonBuilder()
      .setCustomId(`spin:lock:${wheel.id}`)
      .setLabel(locked ? "Unlock" : "Lock")
      .setEmoji(locked ? "🔓" : "🔒")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(spinning || !isManager),
    new ButtonBuilder()
      .setCustomId(`spin:teams:${wheel.id}`)
      .setLabel("Join Teams")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(spinning || wheel.mode !== "teams"),
  );

  return [row1, row2];
}

function buildWheelContainer(wheel, { userId = null, includeWheelImage = false, highlightId = null } = {}) {
  const theme = THEMES[wheel.theme] ?? THEMES.casino;
  const files = [];
  const attachmentFilenames = [];

  if (includeWheelImage) {
    const wheelFile = renderWheelPng(wheel, { highlightId });
    files.push(wheelFile);
    attachmentFilenames.push(WHEEL_FILENAME);
  }

  const content = [
    buildHeaderText(wheel),
    getActiveOptions(wheel).length ? "" : "*No options yet — click **Add** to get started!*",
    buildHistoryText(wheel),
    buildFooterText(wheel),
  ]
    .filter(Boolean)
    .join("\n\n");

  const { container } = buildV2Container({
    content,
    accentColor: theme.accent,
    attachmentFilenames,
    sections: buildOptionSections({
      ...wheel,
      settings: { ...wheel.settings, highlightedOptionId: highlightId },
    }),
    separators: [new SeparatorBuilder().setDivider(true)],
    actionRows: buildControlRows(wheel, userId ?? wheel.hostId),
  });

  return { container, files };
}

function buildWheelPayload(wheel, options = {}) {
  const { container, files } = buildWheelContainer(wheel, options);
  return buildV2Payload({ container, files, ...options });
}

function buildWheelEditPayload(wheel, options = {}) {
  const { container } = buildWheelContainer(wheel, { ...options, includeWheelImage: false });
  return buildV2EditPayload({ container });
}

function buildWinnerContainer(wheel, result) {
  const theme = THEMES[wheel.theme] ?? THEMES.casino;
  const files = [];
  const wheelFile = renderWheelPng(wheel, { highlightId: result.option?.id });
  files.push(wheelFile);

  let content = `## 🎉 Winner!\n\n**${result.emoji ?? result.option?.emoji} ${result.label ?? result.option?.label}**`;
  if (result.consequence) {
    content += `\n\n**Consequence:** ${result.consequence}`;
  }
  if (result.teams) {
    content += "\n\n**Teams:**\n";
    result.teams.forEach((team, index) => {
      content += `\n**Team ${index + 1}:** ${team.map((id) => `<@${id}>`).join(", ")}`;
    });
  }
  if (result.blank) {
    content = "## ⬜ Blank!\n\nThe wheel landed on a blank slot — **spin again!**";
  }

  const { container } = buildV2Container({
    content,
    accentColor: theme.accent,
    attachmentFilenames: [WHEEL_FILENAME],
  });

  return buildV2Payload({ container, files });
}

function buildSettingsSelectRow(wheel) {
  const modeOptions = Object.entries(MODES).map(([value, meta]) => ({
    label: meta.label,
    value,
    description: meta.description,
    emoji: meta.emoji,
    default: wheel.mode === value,
  }));

  const themeOptions = Object.entries(THEMES).map(([value, meta]) => ({
    label: meta.label,
    value,
    emoji: meta.emoji,
    default: wheel.theme === value,
  }));

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`spin:mode:${wheel.id}`)
        .setPlaceholder("Switch game mode")
        .addOptions(modeOptions.slice(0, 25)),
    ),
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`spin:theme:${wheel.id}`)
        .setPlaceholder("Switch theme")
        .addOptions(themeOptions.slice(0, 25)),
    ),
  ];
}

function buildVoteSelectRow(wheel) {
  const active = getActiveOptions(wheel);
  if (!active.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`spin:vote_select:${wheel.id}`)
      .setPlaceholder("Pick an option to vote for")
      .addOptions(
        active.slice(0, 25).map((opt) => ({
          label: opt.label.slice(0, 100),
          value: opt.id,
          emoji: opt.emoji,
          description: `${getTotalVoteWeight(opt)} votes`,
        })),
      ),
  );
}

function buildRemoveSelectRow(wheel) {
  const active = getActiveOptions(wheel);
  if (!active.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`spin:remove_select:${wheel.id}`)
      .setPlaceholder("Remove an option")
      .addOptions(
        active.slice(0, 25).map((opt) => ({
          label: opt.label.slice(0, 100),
          value: opt.id,
          emoji: opt.emoji,
        })),
      ),
  );
}

function buildBanSelectRow(wheel) {
  const active = getActiveOptions(wheel);
  if (!active.length) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`spin:ban_select:${wheel.id}`)
      .setPlaceholder("Ban an option")
      .addOptions(
        active.slice(0, 25).map((opt) => ({
          label: opt.label.slice(0, 100),
          value: opt.id,
          emoji: opt.emoji,
        })),
      ),
  );
}

module.exports = {
  buildWheelContainer,
  buildWheelPayload,
  buildWheelEditPayload,
  buildWinnerContainer,
  buildSettingsSelectRow,
  buildVoteSelectRow,
  buildRemoveSelectRow,
  buildBanSelectRow,
};
