import type { MinecraftServerStatus } from '~/generated/prisma/client'

export const isArchivedMinecraftServer = (
	server: Pick<{ status: MinecraftServerStatus }, 'status'>,
): boolean => server.status === 'ARCHIVED'

export const shouldRunMinecraftPortalBridge = (
	server: Pick<{ status: MinecraftServerStatus }, 'status'>,
): boolean => server.status === 'ONLINE'
