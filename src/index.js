require("dotenv").config();

const {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const { BOT_NAME } = require("./constants");
const { buildEmbedCommand } = require("./commands/embed");
const { handleEmbedCommand } = require("./commands/embed-handler");
const { handleBuilderInteraction } = require("./builder/interactions");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or CLIENT_ID in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = [
  buildEmbedCommand(),
  new SlashCommandBuilder().setName("ping").setDescription("Check if EmbedForge is online"),
].map((c) => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Commands registered to guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Commands registered globally");
  }
}

function isBenign(error) {
  return [40060, 10062, 10008].includes(error?.code);
}

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  if (c.user.username !== BOT_NAME) {
    await c.user.setUsername(BOT_NAME).catch(() => null);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (await handleBuilderInteraction(interaction)) return;

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "embed") {
        await handleEmbedCommand(interaction);
        return;
      }
      if (interaction.commandName === "ping") {
        await interaction.reply("🛠️ EmbedForge is online!");
      }
    }
  } catch (error) {
    if (isBenign(error)) return;
    console.error(error);
    const reply = { content: "Something went wrong.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => null);
    } else if (interaction.isRepliable()) {
      await interaction.reply(reply);
    }
  }
});

registerCommands()
  .then(() => client.login(token))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
