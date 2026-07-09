const { getActiveOptions, createOption } = require("../wheel/store");
const { resolveClassic } = require("./classic");

function resolveRoulette(wheel) {
  const active = getActiveOptions(wheel);
  const blanks = wheel.settings.blankSlots;
  const pool = [...active];

  for (let i = 0; i < blanks; i += 1) {
    pool.push(
      createOption({ label: "BLANK — Spin Again", emoji: "⬜", addedBy: wheel.hostId }),
    );
  }

  const pick = resolveClassic({ ...wheel, options: pool });
  if (pick.label.startsWith("BLANK")) {
    return { blank: true, option: pick };
  }
  return { blank: false, option: pick };
}

module.exports = { resolveRoulette };
