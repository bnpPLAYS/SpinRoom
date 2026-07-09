/**
 * Smoke test — run without Discord token.
 * Usage: node scripts/verify.js
 */

const { createWheel, addOptionToWheel, toggleVote } = require("../src/wheel/store");
const { buildWheelPayload, buildWinnerContainer } = require("../src/spinroom-components");
const { resolveClassic } = require("../src/modes/classic");
const { renderWheelPng } = require("../src/wheel/renderer");
const { saveGuildTemplate, getGuildTemplate } = require("../src/stores/templates-store");
const { getGuildSettings, updateGuildSettings } = require("../src/stores/guild-settings-store");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const wheel = createWheel({
  guildId: "test-guild",
  channelId: "test-channel",
  hostId: "user-1",
  title: "Verify Wheel",
  mode: "classic",
  theme: "casino",
});

addOptionToWheel(wheel, { label: "Alpha", emoji: "🅰️", addedBy: "user-1" });
addOptionToWheel(wheel, { label: "Beta", emoji: "🅱️", addedBy: "user-1" });
toggleVote(wheel, wheel.options[0].id, "user-2");

const payload = buildWheelPayload(wheel, { includeWheelImage: true });
assert(payload.flags & 32768, "V2 flag missing");
assert(payload.components?.length === 1, "Expected one container");

const png = renderWheelPng(wheel);
assert(png.name === "spinroom-wheel.png", "Wheel PNG name wrong");

wheel.settings.spinning = false;
const result = resolveClassic(wheel);
assert(result.label, "Spin should return a label");

const winnerPayload = buildWinnerContainer(wheel, result);
assert(winnerPayload.files?.length > 0, "Winner payload should include wheel image");

saveGuildTemplate("test-guild", "verify", {
  title: "Saved",
  mode: "classic",
  theme: "neon",
  options: [{ label: "One", emoji: "1️⃣" }],
});
assert(getGuildTemplate("test-guild", "verify"), "Template save failed");

updateGuildSettings("test-guild", { defaultTheme: "ocean" });
assert(getGuildSettings("test-guild").defaultTheme === "ocean", "Settings update failed");

console.log("✅ All verify checks passed");
console.log(`   Wheel code: ${wheel.code}`);
console.log(`   Spin result: ${result.emoji} ${result.label}`);
