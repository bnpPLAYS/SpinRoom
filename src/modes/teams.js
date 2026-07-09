const { getActiveOptions } = require("../wheel/store");

function resolveTeams(wheel) {
  const players = wheel.teamPlayers.length ? wheel.teamPlayers : [];
  if (players.length < 2) {
    throw new Error("Add at least 2 players via **Join Teams** before spinning.");
  }

  const teamCount = wheel.settings.teamCount;
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const teams = Array.from({ length: teamCount }, () => []);

  shuffled.forEach((playerId, index) => {
    teams[index % teamCount].push(playerId);
  });

  wheel.lastTeamResult = teams;
  return { teams, label: `Split ${players.length} players into ${teamCount} teams` };
}

function resolveTeamPick(wheel) {
  const active = getActiveOptions(wheel);
  if (!active.length) throw new Error("No team names to pick.");
  const index = Math.floor(Math.random() * active.length);
  return active[index];
}

module.exports = { resolveTeams, resolveTeamPick };
