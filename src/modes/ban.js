const { resolveClassic } = require("./classic");
const { getActiveOptions } = require("../wheel/store");

function allBansSubmitted(wheel, memberCountEstimate = 0) {
  const banCount = Object.keys(wheel.bans).length;
  if (memberCountEstimate > 0) return banCount >= memberCountEstimate;
  return banCount >= 1;
}

function resolveBan(wheel) {
  const active = getActiveOptions(wheel);
  if (!active.length) throw new Error("All options were banned.");
  return resolveClassic(wheel);
}

module.exports = { allBansSubmitted, resolveBan };
