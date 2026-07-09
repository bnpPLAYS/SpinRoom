const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { draftSummary } = require("./draft");

function buildBuilderPanel(draft) {
  const container = new ContainerBuilder().setAccentColor(0x5865f2);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `## 🛠️ EmbedForge Builder\n\n${draftSummary(draft)}\n\n*Use the buttons below to edit, preview, and send.*`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ef:edit_basic:${draft.id}`)
      .setLabel("Title & Description")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ef:edit_color:${draft.id}`)
      .setLabel("Color")
      .setEmoji("🎨")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ef:edit_images:${draft.id}`)
      .setLabel("Images")
      .setEmoji("🖼️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ef:edit_footer:${draft.id}`)
      .setLabel("Footer")
      .setEmoji("👣")
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ef:add_field:${draft.id}`)
      .setLabel("Add Field")
      .setEmoji("➕")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ef:add_section:${draft.id}`)
      .setLabel("Add V2 Section")
      .setEmoji("📦")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ef:add_button:${draft.id}`)
      .setLabel("Link Button")
      .setEmoji("🔗")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ef:toggle_type:${draft.id}`)
      .setLabel(draft.type === "v2" ? "→ Normal" : "→ V2")
      .setEmoji("🔄")
      .setStyle(ButtonStyle.Secondary),
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ef:preview:${draft.id}`)
      .setLabel("Preview")
      .setEmoji("👁️")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ef:send:${draft.id}`)
      .setLabel("Send")
      .setEmoji("📤")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ef:save:${draft.id}`)
      .setLabel("Save Template")
      .setEmoji("💾")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ef:clear:${draft.id}`)
      .setLabel("Clear")
      .setEmoji("🗑️")
      .setStyle(ButtonStyle.Danger),
  );

  container.addActionRowComponents(row1, row2, row3);

  return {
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [container],
  };
}

function buildBuilderEditPayload(draft) {
  return buildBuilderPanel(draft);
}

module.exports = { buildBuilderPanel, buildBuilderEditPayload };
