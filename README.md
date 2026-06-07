# hydcraft-portal

HydCraft portal site, built with Nuxt and TypeScript. It keeps the original home page experience while moving the project to a modern Nuxt application structure.

## Structure

This repository uses a single Nuxt application structure.

```
root
├── assets/           # Fonts, resources, and global styles
├── components/       # Reusable Vue components
├── layouts/          # Page header and footer
├── pages/            # Application routes
├── public/           # Static public assets
├── server/           # Nitro server routes, tasks, and server-only utilities
└── utils/            # Frontend-safe/shared utilities
```

## Tech Stack

- Nuxt 4 + Vue 3 + TypeScript
- Nuxt UI + Nuxt Content + Nuxt SEO + TailwindCSS
- Vite + pnpm
- MiSans + Rubik + Literata + HydCraft wordmark fonts

## Database

- Prisma ORM 7
- PostgreSQL
- Portal-side Minecraft multi-server registry
- Per-server PortalBridge, AuthMe MySQL, and LuckPerms MySQL connection config

Sensitive per-server config values are stored in the database with field-level
encryption. Keep `CONFIG_ENCRYPTION_KEY` in the runtime environment and do not
commit it.

### Commands

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma db push
pnpm prisma:seed
pnpm prisma:studio
```

### Initialization

Development and fresh local databases can use the seed script to create the
default OWNER account and the default `hydcraft-main` Minecraft server:

```bash
pnpm prisma:seed
```

Set `DEFAULT_OWNER_PASSWORD` when you want the seed script to also create or
refresh the default OWNER password credential. Normal request paths never create
the first user automatically.

The seed is intentionally explicit and command-driven. Normal request paths
must not create the first user automatically, because the first visitor should
not implicitly become part of the install flow.

Production initialization should use a one-time initialization command or a
dedicated initialization endpoint to create the first OWNER account. If the
system has no users, admin surfaces should show an uninitialized state instead
of creating users as a side effect.

### Environment Variables

```bash
NUXT_SITE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hydcraft_portal?schema=public
JWT_SECRET=change-me
JWT_EXPIRES_IN_SECONDS=900
REFRESH_TOKEN_EXPIRES_IN_SECONDS=2592000
CONFIG_ENCRYPTION_KEY=change-me-with-a-long-random-secret
DEFAULT_OWNER_PASSWORD=
```

`JWT_SECRET` signs short-lived auth tokens. `REFRESH_TOKEN_EXPIRES_IN_SECONDS`
controls the persistent refresh-token session cookie. `CONFIG_ENCRYPTION_KEY`
encrypts PortalBridge secrets and per-server MySQL passwords before they are
written to the database.

AuthMe and LuckPerms connection information is configured per Minecraft server
from the Portal database, not from global env variables.

## PortalBridge

The current Portal side treats a Minecraft server as a first-class integration
domain:

- Minecraft game address: host, port, stable `serverId`, and display code.
- PortalBridge: WebSocket URL, bridge id, module, encrypted secret, requested
  topics, allowed topics, and last connection state.
- AuthMe MySQL: per-server host, port, database, username, encrypted password.
- LuckPerms MySQL: per-server host, port, database, username, encrypted
  password.

PortalBridge uses standard WebSocket and JSON envelopes. Socket.IO is not used.
The Nitro backend can connect to enabled PortalBridge configs, send
`bridge.hello`, sign the hello payload with HMAC, handle `bridge.accepted` /
`bridge.rejected`, and immediately send `bridge.ack` for envelopes with
`requiresAck=true`.

Server-observed identity evidence is stored as evidence only. It can project a
current `ServerPlayerIdentity` for alignment, but it must not automatically
verify a `MinecraftAccount`, bind a Portal user, or change `User.role`.

## PortalBridge Schema Smoke Test

This test does not connect to a real Minecraft server and does not start a
WebSocket client. It only verifies Portal-side schema fields and Prisma
connectivity with explicit test fixtures.

```bash
pnpm test:portal-bridge
```
