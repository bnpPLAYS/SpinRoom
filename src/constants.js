const THEMES = {
  casino: { accent: 0xff6b35, label: "Casino", emoji: "🎰" },
  neon: { accent: 0x00f5d4, label: "Neon", emoji: "💠" },
  pastel: { accent: 0xffb5e8, label: "Pastel", emoji: "🌸" },
  minimal: { accent: 0x36393f, label: "Minimal", emoji: "⚪" },
  ocean: { accent: 0x0077b6, label: "Ocean", emoji: "🌊" },
  forest: { accent: 0x2d6a4f, label: "Forest", emoji: "🌲" },
  sunset: { accent: 0xff8500, label: "Sunset", emoji: "🌅" },
  midnight: { accent: 0x5a189a, label: "Midnight", emoji: "🌙" },
};

const MODES = {
  classic: { label: "Classic", emoji: "🎯", description: "Weighted random pick" },
  elimination: { label: "Elimination", emoji: "💀", description: "Remove one option per spin" },
  bracket: { label: "Bracket", emoji: "🏆", description: "Tournament matchups" },
  teams: { label: "Team Split", emoji: "👥", description: "Split players into teams" },
  dare: { label: "Dare Wheel", emoji: "😈", description: "Option + consequence pairs" },
  roulette: { label: "Roulette", emoji: "🔫", description: "Blank slots re-spin" },
  ban: { label: "Ban Round", emoji: "🚫", description: "Everyone bans one option" },
};

const BUILTIN_TEMPLATES = {
  "movie-night": {
    title: "Movie Night",
    mode: "classic",
    theme: "midnight",
    options: [
      { label: "Action", emoji: "💥" },
      { label: "Comedy", emoji: "😂" },
      { label: "Horror", emoji: "👻" },
      { label: "Sci-Fi", emoji: "🚀" },
      { label: "Romance", emoji: "💕" },
    ],
  },
  "restaurant-picker": {
    title: "Where should we eat?",
    mode: "classic",
    theme: "casino",
    options: [
      { label: "Pizza", emoji: "🍕" },
      { label: "Burgers", emoji: "🍔" },
      { label: "Tacos", emoji: "🌮" },
      { label: "Sushi", emoji: "🍣" },
      { label: "Ramen", emoji: "🍜" },
    ],
  },
  "punishment-wheel": {
    title: "Punishment Wheel",
    mode: "dare",
    theme: "neon",
    options: [
      { label: "Sing in VC", emoji: "🎤", consequence: "30 seconds of singing" },
      { label: "Change nickname", emoji: "📝", consequence: "Funny nickname for 1 hour" },
      { label: "Truth question", emoji: "❓", consequence: "Answer honestly in chat" },
      { label: "Lucky escape", emoji: "😅", consequence: "Nothing this time!" },
    ],
  },
  "who-goes-first": {
    title: "Who goes first?",
    mode: "classic",
    theme: "minimal",
    options: [],
  },
  "truth-or-dare": {
    title: "Truth or Dare",
    mode: "dare",
    theme: "sunset",
    options: [
      { label: "Truth", emoji: "💬", consequence: "Answer a personal question" },
      { label: "Dare", emoji: "🔥", consequence: "Complete a silly challenge" },
      { label: "Double Truth", emoji: "📖", consequence: "Two truths, no lie" },
      { label: "Wildcard", emoji: "🃏", consequence: "Group picks your fate" },
    ],
  },
};

const WHEEL_FILENAME = "spinroom-wheel.png";

module.exports = {
  BOT_NAME: process.env.BOT_NAME?.trim() || "SpinRoom",
  DEFAULT_EMBED_COLOR: 0xff6b35,
  THEMES,
  MODES,
  BUILTIN_TEMPLATES,
  WHEEL_FILENAME,
  MAX_OPTIONS_DEFAULT: 12,
  MAX_OPTIONS_LIMIT: 24,
  SPIN_HISTORY_LIMIT: 10,
  WHEEL_EXPIRY_MS: 24 * 60 * 60 * 1000,
  PANEL_DEDUPE_TTL_MS: 5 * 60 * 1000,
  SPIN_COOLDOWN_DEFAULT_SEC: 3,
};
