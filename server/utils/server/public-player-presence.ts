import { prisma } from '~/server/utils/db/prisma'
import { createApiError } from '~/server/utils/errors'
import { normalizePlayerSessionHistory } from '~/server/utils/minecraft/player-session-history'
import type { ServerOverviewPlayerPresenceResponse } from '~/utils/server/overview'

export const getPublicServerPlayerPresence = async (
	serverId: string,
	uuid: string,
): Promise<ServerOverviewPlayerPresenceResponse> => {
	const server = await prisma.minecraftServer.findFirst({
		where: {
			serverId,
			enabled: true,
		},
		select: {
			serverId: true,
			name: true,
		},
	})

	if (!server) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_SERVER_NOT_FOUND',
		})
	}

	const player = await prisma.minecraftServerPlayer.findUnique({
		where: {
			serverId_uuid: {
				serverId,
				uuid,
			},
		},
		select: {
			uuid: true,
			username: true,
			online: true,
		},
	})

	if (!player) {
		throw createApiError({
			statusCode: 404,
			code: 'PLAYER_NOT_FOUND',
		})
	}

	const recentSessions = await prisma.serverPlayerSession.findMany({
		where: {
			serverId,
			uuid,
		},
		orderBy: {
			openedAt: 'desc',
		},
		take: 5,
		select: {
			sessionId: true,
			openedAt: true,
			closedAt: true,
		},
	})
	const normalizedSessions = await normalizePlayerSessionHistory(
		recentSessions.map((session) => ({
			serverId,
			serverName: server.name,
			sessionId: session.sessionId,
			openedAt: session.openedAt,
			closedAt: session.closedAt,
		})),
	)

	return {
		server,
		player,
		currentSessionOpenedAt: null,
		totalOnlineSeconds: 0,
		recentSessions: normalizedSessions,
	}
}
