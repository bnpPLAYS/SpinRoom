# EmbedForge (in SpinRoom repo) — visual embed builder for Discord

Build **normal embeds** and **Components V2** messages in Discord with buttons and modals.

> This repo is named **SpinRoom** on GitHub/VPS for convenience — the bot is now **EmbedForge**.

## Commands

| Command | Description |
|---------|-------------|
| `/embed create` | Open the visual builder panel |
| `/embed quick` | One-shot title + description embed |
| `/embed template` | Load a saved template |
| `/embed templates` | List guild + personal templates |
| `/embed convert` | Convert draft between normal ↔ V2 |
| `/ping` | Health check |

## Builder panel

- **Title & Description** — modal editor
- **Color** — hex or named colors (`blurple`, `green`, `red`)
- **Images** — thumbnail, main image, V2 gallery URLs
- **Footer**
- **Add Field** — normal embed fields
- **Add V2 Section** — section + optional thumbnail
- **Link Button** — URL buttons (up to 25)
- **Toggle type** — switch normal ↔ Components V2
- **Preview** — ephemeral preview before sending
- **Send** — post to channel
- **Save Template** — guild or personal scope
- **Clear** — reset draft

## Setup

```bash
npm install
copy .env.example .env
# Add DISCORD_TOKEN and CLIENT_ID
npm start
```

Optional: `GUILD_ID` for instant slash command updates during development.

## Invite permissions

Scopes: `bot`, `applications.commands`

Permissions: Send Messages, Embed Links, Attach Files, Use Slash Commands

## Deploy 24/7

```bash
pm2 start src/index.js --name embedforge
pm2 save
```
