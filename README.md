# SpinRoom Discord Bot

Advanced group decision wheel bot built entirely with **Discord Components V2** (Containers, Sections, Media Galleries).

## Features

- **7 game modes:** Classic, Elimination, Bracket, Team Split, Dare Wheel, Roulette, Ban Round
- **8 themes** with dynamic accent colors
- **Canvas wheel images** rendered on spin
- **Room codes** — share wheels with `/join SPIN-XXXX`
- **Templates** — built-in presets + save/load custom templates
- **Import/Export** — JSON wheel sharing
- **Stats & audit log** — server analytics and optional winner channel
- **Guild settings** — role gates, cooldowns, defaults

## Setup

1. Create a new app at [Discord Developer Portal](https://discord.com/developers/applications)
2. Copy **Bot Token** and **Application ID** (Client ID)
3. Copy `.env.example` to `.env` and fill in values
4. Invite bot with `bot` + `applications.commands` scopes

```bash
npm install
npm start
```

For faster slash command updates during development, set `GUILD_ID` in `.env`.

## Commands

| Command | Description |
|---------|-------------|
| `/spin` | Create a wheel panel |
| `/join` | Open a wheel by room code |
| `/template` | Save, load, list, delete templates |
| `/stats` | Server or user statistics |
| `/settings` | Guild configuration |
| `/export` | Export wheel as JSON |
| `/import` | Import wheel from JSON |
| `/ping` | Health check |

## Deploy (24/7)

```bash
pm2 start src/index.js --name spinroom-bot
pm2 save
```

## Project structure

See plan for full architecture. Core V2 builders live in `src/spinroom-components.js` and `src/v2-message.js`.
