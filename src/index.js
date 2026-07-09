require("dotenv").config();

const {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} = require("discord.js");
const { BOT_NAME, WHEEL_EXPIRY_MS } = require("./constants");
const { buildSpinCommand, handleSpinCommand } = require("./commands/spin");
const { buildJoinCommand, handleJoinCommand } = require("./commands/join");
const { buildTemplateCommand, handleTemplateCommand } = require("./commands/template");
const { buildStatsCommand, handleStatsCommand } = require("./commands/stats");
const { buildSettingsCommand, handleSettingsCommand } = require("./commands/settings");
const {
  buildExportCommand,
  buildImportCommand,
  handleExportCommand,
  handleImportCommand,
} = require("./commands/export-import");
const { handleSpinInteraction } = require("./wheel/interactions");
const { getAllWheels, deleteWheel, saveWheel } = require("./stores/wheels-store");
const { buildWheelEditPayload } = require("./spinroom-components");

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

if (!clientId) {
  console.error("Missing CLIENT_ID in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

const commands = [
  buildSpinCommand(),
  buildJoinCommand(),
  buildTemplateCommand(),
  buildStatsCommand(),
  buildSettingsCommand(),
  buildExportCommand(),
  buildImportCommand(),
  new SlashCommandBuilder().setName("ping").setDescription("Check if SpinRoom is online"),
].map((command) => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(token);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Slash commands registered to guild ${guildId}.`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("Slash commands registered globally.");
  }
}

function isBenignInteractionError(error) {
  const code = error?.code;
  return (
    code === 40060 ||
    code === 10062 ||
    code === 10008 ||
    error?.message?.includes("already been acknowledged") ||
    error?.message?.includes("Unknown interaction")
  );
}

function startWheelExpiryJob() {
  setInterval(() => {
    const wheels = getAllWheels();
    const now = Date.now();
    for (const [id, wheel] of Object.entries(wheels)) {
      if (now - wheel.lastActivityAt > (wheel.expiryMs ?? WHEEL_EXPIRY_MS)) {
        deleteWheel(id);
      }
    }
  }, 60 * 60 * 1000);
}

function startTimerJob() {
  setInterval(async () => {
    const wheels = getAllWheels();
    const now = Date.now();
    for (const wheel of Object.values(wheels)) {
      if (!wheel.settings.timerEndsAt || wheel.settings.spinning) continue;
      if (now < wheel.settings.timerEndsAt) {
        try {
          const channel = await client.channels.fetch(wheel.channelId).catch(() => null);
          if (!channel?.isTextBased()) continue;
          const message = await channel.messages.fetch(wheel.messageId).catch(() => null);
          if (message) await message.edit(buildWheelEditPayload(wheel));
        } catch {
          // ignore edit failures
        }
        continue;
      }

      wheel.settings.timerEndsAt = null;
      saveWheel(wheel);
      try {
        const channel = await client.channels.fetch(wheel.channelId).catch(() => null);
        if (!channel?.isTextBased()) continue;
        const message = await channel.messages.fetch(wheel.messageId).catch(() => null);
        if (!message) continue;
        const { runSpinAnimation } = require("./wheel/spin-engine");
        await runSpinAnimation(message, wheel);
      } catch (error) {
        console.warn("[timer] Auto-spin failed:", error.message);
      }
    }
  }, 1000);
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  if (readyClient.user.username !== BOT_NAME) {
    await readyClient.user.setUsername(BOT_NAME).catch((error) => {
      console.warn(`Could not set username to "${BOT_NAME}":`, error.message);
    });
  }

  startWheelExpiryJob();
  startTimerJob();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    let handled = await handleSpinInteraction(interaction);
    if (handled) return;

    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case "spin":
          handled = await handleSpinCommand(interaction);
          break;
        case "join":
          handled = await handleJoinCommand(interaction);
          break;
        case "template":
          handled = await handleTemplateCommand(interaction);
          break;
        case "stats":
          handled = await handleStatsCommand(interaction);
          break;
        case "settings":
          handled = await handleSettingsCommand(interaction);
          break;
        case "export":
          handled = await handleExportCommand(interaction);
          break;
        case "import":
          handled = await handleImportCommand(interaction);
          break;
        case "ping":
          await interaction.reply("🎡 SpinRoom is online!");
          handled = true;
          break;
        default:
          break;
      }
    }

    if (!handled && interaction.isRepliable()) {
      await interaction.reply({ content: "Unknown command.", ephemeral: true });
    }
  } catch (error) {
    if (isBenignInteractionError(error)) {
      console.warn("Ignored duplicate or expired interaction:", error.message);
      return;
    }

    console.error("Interaction handler error:", error);
    const reply = { content: "Something went wrong. Please try again.", ephemeral: true };
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => null);
      } else if (interaction.isRepliable()) {
        await interaction.reply(reply);
      }
    } catch (replyError) {
      if (!isBenignInteractionError(replyError)) {
        console.error("Failed to send error reply:", replyError);
      }
    }
  }
});

async function main() {
  await registerCommands();
  await client.login(token);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
