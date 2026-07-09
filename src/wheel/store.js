const crypto = require("crypto");
const {
  THEMES,
  MODES,
  MAX_OPTIONS_DEFAULT,
  MAX_OPTIONS_LIMIT,
  SPIN_HISTORY_LIMIT,
  WHEEL_EXPIRY_MS,
} = require("../constants");
const { saveWheel } = require("../stores/wheels-store");
const { recordHost } = require("../stores/audit-store");
const { getGuildSettings } = require("../stores/guild-settings-store");

function randomId(length = 8) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

function generateRoomCode() {
  return `SPIN-${randomId(4).toUpperCase()}`;
}

function createOption({ label, emoji = "🎡", consequence = null, addedBy = null }) {
  return {
    id: randomId(6),
    label: String(label).trim().slice(0, 80),
    emoji: String(emoji).trim().slice(0, 8) || "🎡",
    consequence: consequence ? String(consequence).trim().slice(0, 200) : null,
    votes: {},
    eliminated: false,
    vetoedBy: [],
    addedBy,
    private: false,
  };
}

function createWheel({
  guildId,
  channelId,
  hostId,
  title = "SpinRoom Wheel",
  mode = "classic",
  theme = "casino",
  maxOptions = MAX_OPTIONS_DEFAULT,
  timerSec = 0,
  privateVotes = false,
  options = [],
  teamCount = 2,
  blankSlots = 2,
}) {
  const guildSettings = getGuildSettings(guildId);
  const resolvedTheme = THEMES[theme] ? theme : guildSettings.defaultTheme;
  const resolvedMode = MODES[mode] ? mode : guildSettings.defaultMode;
  const id = randomId(12);
  const now = Date.now();

  const wheel = {
    id,
    code: generateRoomCode(),
    guildId,
    channelId,
    messageId: null,
    hostId,
    coHostIds: [],
    title: String(title).trim().slice(0, 100) || "SpinRoom Wheel",
    mode: resolvedMode,
    theme: resolvedTheme,
    maxOptions: Math.min(Math.max(maxOptions, 2), MAX_OPTIONS_LIMIT),
    options: options.map((opt) =>
      createOption({
        label: opt.label,
        emoji: opt.emoji,
        consequence: opt.consequence,
        addedBy: hostId,
      }),
    ),
    spinHistory: [],
    undoStack: [],
    settings: {
      locked: false,
      privateVotes,
      timerEndsAt: timerSec > 0 ? now + timerSec * 1000 : null,
      spinCooldownUntil: null,
      teamCount: Math.max(2, Math.min(teamCount, 8)),
      blankSlots: Math.max(0, Math.min(blankSlots, 6)),
      spinning: false,
      highlightedOptionId: null,
      announceWinner: true,
    },
    bracket: null,
    teamPlayers: [],
    bans: {},
    vetoes: {},
    reactionBoosts: {},
    createdAt: now,
    lastActivityAt: now,
    expiryMs: WHEEL_EXPIRY_MS,
  };

  if (resolvedMode === "bracket") {
    wheel.bracket = initBracket(wheel.options);
  }

  saveWheel(wheel);
  recordHost(hostId);
  return wheel;
}

function initBracket(options) {
  const active = options.filter((o) => !o.eliminated);
  const shuffled = [...active].sort(() => Math.random() - 0.5);
  const matchups = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    if (shuffled[i + 1]) {
      matchups.push({ a: shuffled[i].id, b: shuffled[i + 1].id, winnerId: null });
    } else {
      matchups.push({ a: shuffled[i].id, b: null, winnerId: shuffled[i].id });
    }
  }
  return { round: 1, matchups, currentIndex: 0 };
}

function touchWheel(wheel) {
  wheel.lastActivityAt = Date.now();
  saveWheel(wheel);
  return wheel;
}

function getActiveOptions(wheel) {
  return wheel.options.filter((opt) => !opt.eliminated && opt.vetoedBy.length === 0);
}

function getVoteWeight(wheel, option, userId) {
  let weight = Object.values(option.votes).reduce((sum, w) => sum + w, 0);
  if (option.votes[userId]) weight += 0;
  const boost = wheel.reactionBoosts[userId] ?? 0;
  if (option.votes[userId]) {
    weight = Object.values(option.votes).reduce((sum, w) => sum + w, 0) + boost;
  }
  return Math.max(1, weight + (wheel.hostId === userId ? 1 : 0));
}

function getTotalVoteWeight(option) {
  return Math.max(1, Object.values(option.votes).reduce((sum, w) => sum + w, 0));
}

function canManageWheel(wheel, userId) {
  return wheel.hostId === userId || wheel.coHostIds.includes(userId);
}

function addOptionToWheel(wheel, { label, emoji, consequence, addedBy, isPrivate = false }) {
  if (wheel.settings.locked) throw new Error("Entries are locked.");
  if (getActiveOptions(wheel).length >= wheel.maxOptions) {
    throw new Error(`Maximum ${wheel.maxOptions} options reached.`);
  }
  const option = createOption({ label, emoji, consequence, addedBy });
  option.private = isPrivate;
  wheel.options.push(option);
  return touchWheel(wheel);
}

function removeOptionFromWheel(wheel, optionId) {
  const index = wheel.options.findIndex((opt) => opt.id === optionId);
  if (index === -1) throw new Error("Option not found.");
  wheel.options.splice(index, 1);
  return touchWheel(wheel);
}

function toggleVote(wheel, optionId, userId) {
  const option = wheel.options.find((opt) => opt.id === optionId);
  if (!option || option.eliminated) throw new Error("Cannot vote for that option.");

  if (option.votes[userId]) {
    delete option.votes[userId];
  } else {
    for (const opt of wheel.options) {
      delete opt.votes[userId];
    }
    option.votes[userId] = 1;
  }
  return touchWheel(wheel);
}

function recordBan(wheel, userId, optionId) {
  if (wheel.bans[userId]) throw new Error("You already used your ban.");
  const option = wheel.options.find((opt) => opt.id === optionId);
  if (!option) throw new Error("Option not found.");
  wheel.bans[userId] = optionId;
  if (!option.vetoedBy.includes(userId)) option.vetoedBy.push(userId);
  return touchWheel(wheel);
}

function recordVeto(wheel, userId, optionId) {
  if (wheel.vetoes[userId]) throw new Error("You already used your veto.");
  const option = wheel.options.find((opt) => opt.id === optionId);
  if (!option) throw new Error("Option not found.");
  wheel.vetoes[userId] = optionId;
  if (!option.vetoedBy.includes(userId)) option.vetoedBy.push(userId);
  return touchWheel(wheel);
}

function pushSpinHistory(wheel, result) {
  wheel.spinHistory.unshift(result);
  wheel.spinHistory = wheel.spinHistory.slice(0, SPIN_HISTORY_LIMIT);
  wheel.undoStack.push(structuredClone(wheel.options));
  wheel.undoStack = wheel.undoStack.slice(0, 5);
  return touchWheel(wheel);
}

function undoLastSpin(wheel) {
  if (!wheel.undoStack.length) throw new Error("Nothing to undo.");
  wheel.options = wheel.undoStack.pop();
  if (wheel.spinHistory.length) wheel.spinHistory.shift();
  return touchWheel(wheel);
}

function addCoHost(wheel, userId) {
  if (!wheel.coHostIds.includes(userId)) wheel.coHostIds.push(userId);
  return touchWheel(wheel);
}

function transferHost(wheel, newHostId) {
  wheel.hostId = newHostId;
  wheel.coHostIds = wheel.coHostIds.filter((id) => id !== newHostId);
  return touchWheel(wheel);
}

function setWheelMode(wheel, mode) {
  if (!MODES[mode]) throw new Error("Unknown mode.");
  wheel.mode = mode;
  if (mode === "bracket") wheel.bracket = initBracket(wheel.options);
  return touchWheel(wheel);
}

function lockEntries(wheel, locked = true) {
  wheel.settings.locked = locked;
  for (const opt of wheel.options) {
    if (opt.private) opt.private = false;
  }
  return touchWheel(wheel);
}

function addTeamPlayer(wheel, userId) {
  if (!wheel.teamPlayers.includes(userId)) wheel.teamPlayers.push(userId);
  return touchWheel(wheel);
}

module.exports = {
  createWheel,
  touchWheel,
  getActiveOptions,
  getVoteWeight,
  getTotalVoteWeight,
  canManageWheel,
  addOptionToWheel,
  removeOptionFromWheel,
  toggleVote,
  recordBan,
  recordVeto,
  pushSpinHistory,
  undoLastSpin,
  addCoHost,
  transferHost,
  setWheelMode,
  lockEntries,
  addTeamPlayer,
  initBracket,
  createOption,
};
