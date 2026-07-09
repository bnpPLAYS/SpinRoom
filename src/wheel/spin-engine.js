const { resolveClassic } = require("../modes/classic");
const { resolveElimination } = require("../modes/elimination");
const { resolveBracket } = require("../modes/bracket");
const { resolveTeams, resolveTeamPick } = require("../modes/teams");
const { resolveDare } = require("../modes/dare");
const { resolveRoulette } = require("../modes/roulette");
const { resolveBan } = require("../modes/ban");
const {
  getActiveOptions,
  pushSpinHistory,
  touchWheel,
} = require("./store");
const { getGuildSettings } = require("../stores/guild-settings-store");
const { recordSpin } = require("../stores/audit-store");
const { buildWheelEditPayload } = require("../spinroom-components");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function resolveSpin(wheel) {
  switch (wheel.mode) {
    case "elimination": {
      const option = resolveElimination(wheel);
      return { option, label: option.label, emoji: option.emoji, eliminated: true };
    }
    case "bracket": {
      const option = resolveBracket(wheel);
      return { option, label: option.label, emoji: option.emoji };
    }
    case "teams": {
      const active = getActiveOptions(wheel);
      if (active.length && wheel.teamPlayers.length < 2) {
        const option = resolveTeamPick(wheel);
        return { option, label: option.label, emoji: option.emoji };
      }
      const result = resolveTeams(wheel);
      return { label: result.label, emoji: "👥", teams: result.teams };
    }
    case "dare": {
      const dare = resolveDare(wheel);
      return {
        option: dare.option,
        label: dare.option.label,
        emoji: dare.option.emoji,
        consequence: dare.consequence,
      };
    }
    case "roulette": {
      const result = resolveRoulette(wheel);
      if (result.blank) {
        return { blank: true, option: result.option, label: "BLANK", emoji: "⬜" };
      }
      return { option: result.option, label: result.option.label, emoji: result.option.emoji };
    }
    case "ban": {
      const option = resolveBan(wheel);
      return { option, label: option.label, emoji: option.emoji };
    }
    default: {
      const option = resolveClassic(wheel);
      return { option, label: option.label, emoji: option.emoji };
    }
  }
}

async function runSpinAnimation(message, wheel) {
  const guildSettings = getGuildSettings(wheel.guildId);
  const cooldownMs = (guildSettings.spinCooldownSec ?? 3) * 1000;

  if (wheel.settings.spinCooldownUntil && Date.now() < wheel.settings.spinCooldownUntil) {
    throw new Error("Spin is on cooldown. Please wait a moment.");
  }

  const active = getActiveOptions(wheel);
  if (!active.length) throw new Error("Add at least one option before spinning.");

  wheel.settings.spinning = true;
  touchWheel(wheel);

  const ticks = 14;
  for (let i = 0; i < ticks; i += 1) {
    const delay = i < ticks - 4 ? 120 : 200 + (i - (ticks - 4)) * 80;
    const randomOpt = active[Math.floor(Math.random() * active.length)];
    wheel.settings.highlightedOptionId = randomOpt.id;
    await message.edit(buildWheelEditPayload(wheel));
    await sleep(delay);
  }

  const result = resolveSpin(wheel);

  if (!result.blank) {
    pushSpinHistory(wheel, {
      label: result.label,
      emoji: result.emoji,
      mode: wheel.mode,
      at: Date.now(),
    });
    recordSpin({
      guildId: wheel.guildId,
      userId: wheel.hostId,
      wheelId: wheel.id,
      optionLabel: result.label,
      mode: wheel.mode,
    });
  }

  wheel.settings.highlightedOptionId = result.option?.id ?? null;
  wheel.settings.spinning = false;
  wheel.settings.spinCooldownUntil = Date.now() + cooldownMs;
  touchWheel(wheel);

  await message.edit(buildWheelEditPayload(wheel));
  return result;
}

module.exports = { resolveSpin, runSpinAnimation };
