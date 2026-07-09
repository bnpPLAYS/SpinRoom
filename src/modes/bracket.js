const { getActiveOptions } = require("../wheel/store");

function getCurrentMatchup(wheel) {
  if (!wheel.bracket) return null;
  return wheel.bracket.matchups[wheel.bracket.currentIndex] ?? null;
}

function resolveBracket(wheel) {
  const matchup = getCurrentMatchup(wheel);
  if (!matchup) throw new Error("Bracket is complete.");

  const optionA = wheel.options.find((o) => o.id === matchup.a);
  const optionB = matchup.b ? wheel.options.find((o) => o.id === matchup.b) : null;

  if (!optionB) {
    matchup.winnerId = optionA.id;
    advanceBracket(wheel);
    return optionA;
  }

  const roll = Math.random() < 0.5 ? optionA : optionB;
  matchup.winnerId = roll.id;

  const loser = roll.id === optionA.id ? optionB : optionA;
  loser.eliminated = true;
  advanceBracket(wheel);
  return roll;
}

function advanceBracket(wheel) {
  wheel.bracket.currentIndex += 1;
  if (wheel.bracket.currentIndex >= wheel.bracket.matchups.length) {
    const winners = wheel.bracket.matchups
      .map((m) => wheel.options.find((o) => o.id === m.winnerId))
      .filter(Boolean);

    if (winners.length <= 1) return;

    for (const opt of wheel.options) {
      if (!winners.find((w) => w.id === opt.id)) opt.eliminated = true;
    }

    wheel.bracket.round += 1;
    wheel.bracket.currentIndex = 0;
    wheel.bracket.matchups = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) {
        wheel.bracket.matchups.push({ a: winners[i].id, b: winners[i + 1].id, winnerId: null });
      } else {
        wheel.bracket.matchups.push({ a: winners[i].id, b: null, winnerId: winners[i].id });
      }
    }
  }
}

function getBracketLabel(wheel) {
  const matchup = getCurrentMatchup(wheel);
  if (!matchup) return "Bracket complete";
  const a = wheel.options.find((o) => o.id === matchup.a);
  const b = matchup.b ? wheel.options.find((o) => o.id === matchup.b) : null;
  if (!b) return `${a?.emoji} ${a?.label} advances (bye)`;
  return `${a?.emoji} ${a?.label} vs ${b?.emoji} ${b?.label}`;
}

module.exports = { resolveBracket, getCurrentMatchup, getBracketLabel };
