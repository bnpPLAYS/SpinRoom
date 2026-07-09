const { resolveClassic } = require("./classic");

function resolveDare(wheel) {
  const winner = resolveClassic(wheel);
  return {
    option: winner,
    consequence: winner.consequence || "No consequence set — make something up!",
  };
}

module.exports = { resolveDare };
