# hydcraft-portal

The unified portal for HydCraft, connecting its public website,
Hydroline identity system, Minecraft player accounts, and server administration.

It provides account linking, player profiles, server introductions,
live status, data showcases, and administrative tools in one place.

## Stack

- Nuxt 4, Vue 3, TypeScript, Nuxt UI, Tailwind CSS
- PostgreSQL and Prisma 7
- Nuxt Content and Nuxt i18n
- Tencent EdgeOne, GitHub Actions and CNB

## Structure

```text
assets/       fonts, resources, global styles
components/   reusable UI grouped by feature
pages/        public, account, and admin routes
utils/        frontend-safe presentation and interaction utilities
server/api/   thin HTTP handlers
server/utils/ domain services, integrations, persistence, and runtime support
server/plugins/ post-commit reactions and process lifecycle wiring
prisma/       split schema and SQL migrations
```

`server/utils/attachment` owns object-storage access. Business modules must not
construct public object URLs or call a provider SDK directly.

Portal Bridge is configured per Minecraft server. AuthMe and LuckPerms are
read-only global external-sync sources configured through the runtime
environment; they are not per-server Portal records.

## Local Development

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

See [`.env.example`](.env.example) for every supported runtime variable. At a
minimum, configure `DATABASE_URL`, `JWT_SECRET`, and `CONFIG_ENCRYPTION_KEY`.

Useful commands:

```bash
pnpm lint
pnpm format
pnpm build
pnpm prisma:studio
pnpm sync:external
pnpm archive:import --server <serverId> --artifact <path>
```

## Database And Initialization

Development seed data is explicit: `pnpm prisma:seed` creates the default
owner and `hydcraft-main` server. Set `DEFAULT_OWNER_PASSWORD` only when the
seed should create or refresh that account credential.

Production initialization is also explicit and never runs from a normal
request path:

```bash
pnpm prisma:deploy
pnpm data:production-init
```

The deployment workflow packages the built Nitro application, applies Prisma
migrations on the remote host, optionally runs production initialization, and
restarts PM2 with the updated runtime environment.

## Portal Bridge

[Portal Bridge](https://github.com/Hydroline/portal-bridge) uses WebSocket JSON envelopes with HMAC-authenticated hello
messages. Portal stores bridge runtime state and server-observed identity
evidence, but evidence never automatically verifies a Minecraft account, binds
a Portal user, or changes a user role.

`pnpm test:portal-bridge` is a schema smoke check. It does not contact a game
server or start a WebSocket client.
