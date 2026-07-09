const { getActiveOptions } = require("../wheel/store");
const { pickWeightedOption } = require("./classic");

function resolveElimination(wheel) {
  const active = getActiveOptions(wheel);
  if (active.length <= 1) {
    return active[0] ?? null;
  }
  const loser = pickWeightedOption(active);
  loser.eliminated = true;
  return loser;
}

module.exports = { resolveElimination };
