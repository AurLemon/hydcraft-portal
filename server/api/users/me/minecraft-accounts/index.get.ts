import { prisma } from '../../../../utils/db/prisma'
import { requireCurrentUser } from '../../../../utils/auth/session'

export default defineEventHandler(async (event) => {
	const currentUser = await requireCurrentUser(event)
	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			userId: currentUser.id,
			unlinkedAt: null,
		},
		orderBy: [
			{
				isPrimary: 'desc',
			},
			{
				updatedAt: 'desc',
			},
		],
	})
	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			uuid: {
				in: accounts
					.map((account) => account.uuid)
					.filter((uuid): uuid is string => !!uuid),
			},
		},
		include: {
			playerData: true,
		},
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
	})
	const preferredPlayerByUuid = new Map<string, (typeof players)[number]>()

	for (const player of players) {
		if (!preferredPlayerByUuid.has(player.uuid)) {
			preferredPlayerByUuid.set(player.uuid, player)
		}
	}

	return {
		accounts: accounts.map((account) => {
			const player = account.uuid
				? (preferredPlayerByUuid.get(account.uuid) ?? null)
				: null

			return {
				...account,
				presence: player
					? {
							online: player.online,
							lastOnlineAt: player.lastOnlineAt,
							lastOfflineAt: player.lastOfflineAt,
							onlineLocation: {
								worldName: player.lastOnlineWorldName,
								dimension: player.lastOnlineDimension,
								x: player.lastOnlineX,
								y: player.lastOnlineY,
								z: player.lastOnlineZ,
								observedAt: player.lastOnlineAt,
							},
							lastSavedLocation: {
								worldName: player.playerData?.lastWorldName ?? null,
								dimension: player.playerData?.lastDimension ?? null,
								x: player.playerData?.lastX ?? null,
								y: player.playerData?.lastY ?? null,
								z: player.playerData?.lastZ ?? null,
								yaw: player.playerData?.lastYaw ?? null,
								pitch: player.playerData?.lastPitch ?? null,
								observedAt: player.playerData?.syncedAt ?? null,
							},
						}
					: null,
			}
		}),
	}
})
