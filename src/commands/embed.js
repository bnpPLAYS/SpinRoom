const { SlashCommandBuilder } = require("discord.js");
const { createDraft } = require("../builder/draft");
const { buildBuilderPanel } = require("../builder/panel");

function buildEmbedCommand() {
  return new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Build normal embeds and Components V2 messages")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Open the visual embed builder")
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Start with normal embed or Components V2")
            .addChoices(
              { name: "Normal Embed", value: "normal" },
              { name: "Components V2", value: "v2" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("quick")
        .setDescription("Send a simple embed in one command")
        .addStringOption((opt) => opt.setName("title").setDescription("Title").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Description").setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName("color")
            .setDescription("Hex color (#5865F2) or blurple/green/red")
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("normal or v2")
            .addChoices({ name: "Normal", value: "normal" }, { name: "Components V2", value: "v2" }),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("template")
        .setDescription("Load a saved template into the builder")
        .addStringOption((opt) => opt.setName("name").setDescription("Template name").setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName("scope")
            .setDescription("guild or personal")
            .addChoices({ name: "Guild", value: "guild" }, { name: "Personal", value: "personal" }),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("templates")
        .setDescription("List saved templates")
    )
    .addSubcommand((sub) =>
      sub
        .setName("convert")
        .setDescription("Convert your active draft between normal and V2")
        .addStringOption((opt) =>
          opt
            .setName("to")
            .setDescription("Target type")
            .setRequired(true)
            .addChoices({ name: "Normal Embed", value: "normal" }, { name: "Components V2", value: "v2" }),
        ),
    );
}

module.exports = { buildEmbedCommand };
