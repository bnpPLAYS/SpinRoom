const {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { hasProcessed, markProcessed } = require("../panel-dedupe");
const {
  getDraft,
  saveDraft,
  deleteDraft,
  parseColor,
  normalToV2Draft,
  v2ToNormalDraft,
} = require("./draft");
const { buildBuilderPanel } = require("./panel");
const { renderDraft } = require("./render");
const { saveTemplate } = require("../stores/templates-store");
const { MAX_FIELDS, MAX_SECTIONS } = require("../constants");

function parseId(customId) {
  const [, action, draftId] = customId.split(":");
  return { action, draftId };
}

function assertOwner(draft, userId) {
  if (draft.userId !== userId) throw new Error("This builder belongs to someone else.");
}

async function refreshBuilder(interaction, draft) {
  if (interaction.isModalSubmit()) {
    await interaction.reply(buildBuilderPanel(draft));
    return;
  }
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(buildBuilderPanel(draft));
  } else {
    await interaction.update(buildBuilderPanel(draft));
  }
}

async function handleBuilderInteraction(interaction) {
  const customId = interaction.customId ?? "";
  if (!customId.startsWith("ef:")) return false;

  if (hasProcessed(interaction.id)) return true;
  markProcessed(interaction.id);

  const { action, draftId } = parseId(customId);
  const draft = getDraft(draftId);
  if (!draft) {
    await interaction.reply({ content: "This draft expired. Run `/embed create` again.", ephemeral: true }).catch(() => null);
    return true;
  }

  try {
    assertOwner(draft, interaction.user.id);

    if (interaction.isButton()) {
      if (action === "edit_basic") {
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_basic:${draft.id}`)
          .setTitle("Title & Description")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("title")
                .setLabel("Title")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(256)
                .setRequired(false)
                .setValue(draft.title || ""),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("description")
                .setLabel("Description")
                .setStyle(TextInputStyle.Paragraph)
                .setMaxLength(4000)
                .setRequired(false)
                .setValue(draft.description || ""),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("url")
                .setLabel("Title URL (optional)")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(draft.url || ""),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "edit_color") {
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_color:${draft.id}`)
          .setTitle("Embed Color")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("color")
                .setLabel("Hex color (#5865F2) or name (blurple)")
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setValue(`#${(draft.color >>> 0).toString(16).padStart(6, "0")}`),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "edit_images") {
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_images:${draft.id}`)
          .setTitle("Images")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("thumbnail")
                .setLabel("Thumbnail URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(draft.thumbnail || ""),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("image")
                .setLabel("Main image URL")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue(draft.image || ""),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("gallery")
                .setLabel("V2 gallery URLs (comma-separated)")
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setValue((draft.imageUrls ?? []).join(", ")),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "edit_footer") {
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_footer:${draft.id}`)
          .setTitle("Footer")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("footer")
                .setLabel("Footer text")
                .setStyle(TextInputStyle.Short)
                .setMaxLength(2048)
                .setRequired(false)
                .setValue(draft.footer || ""),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "add_field") {
        if (draft.fields.length >= MAX_FIELDS) {
          await interaction.reply({ content: `Max ${MAX_FIELDS} fields.`, ephemeral: true });
          return true;
        }
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_field:${draft.id}`)
          .setTitle("Add Field")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("name").setLabel("Field name").setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("value").setLabel("Field value").setStyle(TextInputStyle.Paragraph).setMaxLength(1024).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("inline").setLabel("Inline? (yes/no)").setStyle(TextInputStyle.Short).setRequired(false).setValue("no"),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "add_section") {
        if (draft.sections.length >= MAX_SECTIONS) {
          await interaction.reply({ content: `Max ${MAX_SECTIONS} sections.`, ephemeral: true });
          return true;
        }
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_section:${draft.id}`)
          .setTitle("Add V2 Section")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("content").setLabel("Section content (markdown)").setStyle(TextInputStyle.Paragraph).setMaxLength(4000).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("thumbnail").setLabel("Thumbnail URL (optional)").setStyle(TextInputStyle.Short).setRequired(false),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "add_button") {
        if (draft.linkButtons.length >= 25) {
          await interaction.reply({ content: "Max 25 link buttons.", ephemeral: true });
          return true;
        }
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_link:${draft.id}`)
          .setTitle("Add Link Button")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("label").setLabel("Button label").setStyle(TextInputStyle.Short).setMaxLength(80).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("url").setLabel("URL (https://)").setStyle(TextInputStyle.Short).setRequired(true),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "toggle_type") {
        if (draft.type === "v2") v2ToNormalDraft(draft);
        else normalToV2Draft(draft);
        await interaction.deferUpdate();
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "preview") {
        const payload = renderDraft(draft, { ephemeral: true });
        await interaction.reply({ ...payload, content: "**Preview:**", ephemeral: true });
        return true;
      }

      if (action === "send") {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.SendMessages)) {
          await interaction.reply({ content: "You need Send Messages permission.", ephemeral: true });
          return true;
        }
        const payload = renderDraft(draft);
        await interaction.channel.send(payload);
        await interaction.reply({ content: "Embed sent to this channel!", ephemeral: true });
        return true;
      }

      if (action === "save") {
        const modal = new ModalBuilder()
          .setCustomId(`ef:modal_save:${draft.id}`)
          .setTitle("Save Template")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("name").setLabel("Template name").setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true),
            ),
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId("scope").setLabel("Scope: guild or personal").setStyle(TextInputStyle.Short).setRequired(false).setValue("guild"),
            ),
          );
        await interaction.showModal(modal);
        return true;
      }

      if (action === "clear") {
        draft.title = "";
        draft.description = "";
        draft.url = "";
        draft.thumbnail = "";
        draft.image = "";
        draft.footer = "";
        draft.fields = [];
        draft.sections = [];
        draft.imageUrls = [];
        draft.linkButtons = [];
        saveDraft(draft);
        await interaction.deferUpdate();
        await refreshBuilder(interaction, draft);
        return true;
      }
    }

    if (interaction.isModalSubmit()) {
      if (action === "modal_basic") {
        draft.title = interaction.fields.getTextInputValue("title") || "";
        draft.description = interaction.fields.getTextInputValue("description") || "";
        draft.url = interaction.fields.getTextInputValue("url") || "";
        saveDraft(draft);
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "modal_color") {
        const color = parseColor(interaction.fields.getTextInputValue("color"));
        draft.color = color;
        draft.accentColor = color;
        saveDraft(draft);
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "modal_images") {
        draft.thumbnail = interaction.fields.getTextInputValue("thumbnail") || "";
        draft.image = interaction.fields.getTextInputValue("image") || "";
        const gallery = interaction.fields.getTextInputValue("gallery") || "";
        draft.imageUrls = gallery
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        saveDraft(draft);
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "modal_footer") {
        draft.footer = interaction.fields.getTextInputValue("footer") || "";
        saveDraft(draft);
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "modal_field") {
        draft.fields.push({
          name: interaction.fields.getTextInputValue("name"),
          value: interaction.fields.getTextInputValue("value"),
          inline: interaction.fields.getTextInputValue("inline")?.toLowerCase() === "yes",
        });
        saveDraft(draft);
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "modal_section") {
        draft.sections.push({
          content: interaction.fields.getTextInputValue("content"),
          thumbnailUrl: interaction.fields.getTextInputValue("thumbnail") || "",
        });
        saveDraft(draft);
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "modal_link") {
        const url = interaction.fields.getTextInputValue("url");
        if (!/^https?:\/\//i.test(url)) {
          await interaction.reply({ content: "URL must start with http:// or https://", ephemeral: true });
          return true;
        }
        draft.linkButtons.push({
          label: interaction.fields.getTextInputValue("label"),
          url,
        });
        saveDraft(draft);
        await refreshBuilder(interaction, draft);
        return true;
      }

      if (action === "modal_save") {
        const name = interaction.fields.getTextInputValue("name");
        const scope = interaction.fields.getTextInputValue("scope")?.toLowerCase() === "personal" ? "personal" : "guild";
        saveTemplate({
          guildId: interaction.guildId,
          userId: interaction.user.id,
          name,
          draft,
          scope,
        });
        await interaction.reply({ content: `Template **${name}** saved (${scope}).`, ephemeral: true });
        return true;
      }
    }
  } catch (error) {
    const msg = error?.message ?? "Something went wrong.";
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: msg, ephemeral: true }).catch(() => null);
    } else {
      await interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
    return true;
  }

  return true;
}

module.exports = { handleBuilderInteraction };
