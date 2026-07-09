const { createJsonStore } = require("../utils/json-store");

const store = createJsonStore("audit.json", { guilds: {}, users: {} });

function recordSpin({ guildId, userId, wheelId, optionLabel, mode }) {
  const data = store.load();
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = { totalSpins: 0, optionWins: {}, modeCounts: {} };
  }
  if (!data.users[userId]) {
    data.users[userId] = { totalSpins: 0, wins: 0, vetoes: 0, hosts: 0 };
  }

  const guild = data.guilds[guildId];
  guild.totalSpins += 1;
  guild.optionWins[optionLabel] = (guild.optionWins[optionLabel] ?? 0) + 1;
  guild.modeCounts[mode] = (guild.modeCounts[mode] ?? 0) + 1;

  data.users[userId].totalSpins += 1;

  store.save(data);
  return data;
}

function recordHost(userId) {
  const data = store.load();
  if (!data.users[userId]) data.users[userId] = { totalSpins: 0, wins: 0, vetoes: 0, hosts: 0 };
  data.users[userId].hosts += 1;
  store.save(data);
}

function recordVeto(userId) {
  const data = store.load();
  if (!data.users[userId]) data.users[userId] = { totalSpins: 0, wins: 0, vetoes: 0, hosts: 0 };
  data.users[userId].vetoes += 1;
  store.save(data);
}

function getGuildStats(guildId) {
  const data = store.load();
  return data.guilds[guildId] ?? { totalSpins: 0, optionWins: {}, modeCounts: {} };
}

function getUserStats(userId) {
  const data = store.load();
  return data.users[userId] ?? { totalSpins: 0, wins: 0, vetoes: 0, hosts: 0 };
}

module.exports = {
  recordSpin,
  recordHost,
  recordVeto,
  getGuildStats,
  getUserStats,
};
