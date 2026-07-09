const { createDraft, normalToV2Draft, parseColor } = require("../src/builder/draft");
const { renderDraft } = require("../src/builder/render");
const { buildBuilderPanel } = require("../src/builder/panel");

const draft = createDraft({ userId: "u1", guildId: "g1", channelId: "c1", type: "normal" });
draft.title = "Hello";
draft.description = "World";
draft.fields.push({ name: "Field", value: "Value", inline: false });

const normal = renderDraft(draft);
if (!normal.embeds?.length) throw new Error("normal embed missing");

const v2draft = normalToV2Draft({ ...draft, fields: [...draft.fields] });
const v2 = renderDraft(v2draft);
if (!(v2.flags & 32768)) throw new Error("V2 flag missing");

const panel = buildBuilderPanel(draft);
if (!(panel.flags & 32768)) throw new Error("builder panel should be V2");

parseColor("#ff0000");
parseColor("blurple");

console.log("✅ EmbedForge verify passed");
