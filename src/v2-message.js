const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SeparatorBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const { DEFAULT_EMBED_COLOR } = require("./constants");

const MAX_TEXT_DISPLAY = 4000;

function truncateV2Text(text, maxLength = MAX_TEXT_DISPLAY) {
  const value = String(text ?? "").trim();
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function addTextToContainer(container, text) {
  const normalized = String(text ?? "").trim();
  if (!normalized) return;

  let remaining = normalized;
  while (remaining.length > 0) {
    const chunk = remaining.slice(0, MAX_TEXT_DISPLAY);
    remaining = remaining.slice(MAX_TEXT_DISPLAY);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk));
  }
}

function buildV2Container(options = {}) {
  const {
    content,
    accentColor = DEFAULT_EMBED_COLOR,
    imageUrls = [],
    attachmentFilenames = [],
    actionRows = [],
    sections = [],
    separators = [],
  } = options;

  const container = new ContainerBuilder().setAccentColor(accentColor);
  const files = options.files ?? [];

  for (const filename of attachmentFilenames) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(`attachment://${filename}`),
      ),
    );
  }

  for (const url of imageUrls) {
    if (!url) continue;
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(url)),
    );
  }

  if (content) {
    addTextToContainer(container, content);
  }

  for (const section of sections) {
    container.addSectionComponents(section);
  }

  for (const separator of separators) {
    container.addSeparatorComponents(separator);
  }

  if (actionRows.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    for (const row of actionRows) {
      container.addActionRowComponents(row);
    }
  }

  return { container, files };
}

function buildV2Payload(options = {}) {
  const { container, files = [] } = options.container
    ? { container: options.container, files: options.files ?? [] }
    : buildV2Container(options);

  const { ephemeral = false, allowedMentions, includeFiles = true } = options;

  let flags = MessageFlags.IsComponentsV2;
  if (ephemeral) {
    flags |= MessageFlags.Ephemeral;
  }

  const payload = {
    flags,
    components: [container],
  };

  if (includeFiles && files.length > 0) {
    payload.files = files;
  }
  if (allowedMentions) {
    payload.allowedMentions = allowedMentions;
  }

  return payload;
}

function buildV2EditPayload(options = {}) {
  return buildV2Payload({ ...options, includeFiles: false });
}

module.exports = {
  MAX_TEXT_DISPLAY,
  truncateV2Text,
  addTextToContainer,
  buildV2Container,
  buildV2Payload,
  buildV2EditPayload,
};
