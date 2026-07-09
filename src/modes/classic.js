const { getActiveOptions, getTotalVoteWeight } = require("../wheel/store");

function pickWeightedOption(options) {
  const weights = options.map((opt) => getTotalVoteWeight(opt));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < options.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return options[i];
  }
  return options[options.length - 1];
}

function resolveClassic(wheel) {
  const active = getActiveOptions(wheel);
  if (!active.length) throw new Error("No options to spin.");
  return pickWeightedOption(active);
}

module.exports = { resolveClassic, pickWeightedOption };
