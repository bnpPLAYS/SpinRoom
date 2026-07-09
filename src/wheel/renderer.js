const { createCanvas } = require("@napi-rs/canvas");
const { AttachmentBuilder } = require("discord.js");
const { WHEEL_FILENAME } = require("../constants");
const { getActiveOptions } = require("./store");

const COLORS = [
  "#FF6B35", "#00F5D4", "#FFB5E8", "#0077B6", "#2D6A4F",
  "#FF8500", "#5A189A", "#E63946", "#06D6A0", "#FFD166",
  "#118AB2", "#EF476F", "#073B4C", "#8338EC", "#FB5607",
];

function renderWheelPng(wheel, { highlightId = null } = {}) {
  const options = getActiveOptions(wheel);
  const size = 480;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;

  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, size, size);

  if (!options.length) {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Add options to spin!", cx, cy);
    return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: WHEEL_FILENAME });
  }

  const totalWeight = options.reduce(
    (sum, opt) => sum + Math.max(1, Object.values(opt.votes).reduce((s, v) => s + v, 0)),
    0,
  );

  let startAngle = -Math.PI / 2;
  options.forEach((opt, index) => {
    const weight = Math.max(1, Object.values(opt.votes).reduce((s, v) => s + v, 0));
    const sliceAngle = (weight / totalWeight) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    const color = COLORS[index % COLORS.length];

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = opt.id === highlightId ? "#ffffff" : color;
    ctx.fill();
    ctx.strokeStyle = "#0d0d1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    const midAngle = startAngle + sliceAngle / 2;
    const textX = cx + Math.cos(midAngle) * (radius * 0.65);
    const textY = cy + Math.sin(midAngle) * (radius * 0.65);
    ctx.save();
    ctx.translate(textX, textY);
    ctx.rotate(midAngle + Math.PI / 2);
    ctx.fillStyle = opt.id === highlightId ? "#1a1a2e" : "#ffffff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    const label = `${opt.emoji} ${opt.label}`.slice(0, 14);
    ctx.fillText(label, 0, 0);
    ctx.restore();

    startAngle = endAngle;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ff6b35";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, 8);
  ctx.lineTo(cx - 12, 36);
  ctx.lineTo(cx + 12, 36);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: WHEEL_FILENAME });
}

module.exports = { renderWheelPng };
