import { prisma } from '~/server/utils/db/prisma'
import { createApiError } from '~/server/utils/errors'
import type { ServerOverviewPlayerPresenceResponse } from '~/utils/server/overview'

interface SessionProjectionRow {
	openedAt: Date
	closedAt: Date | null
	sessionId: string | null
}

const resolveReceiptClosedAtBySessionId = async (
	serverId: string,
	sessionIds: string[],
): Promise<Map<string, string>> => {
	if (sessionIds.length === 0) {
		return new Map()
	}

	const rows = await prisma.$queryRaw<
		Array<{ sessionId: string; closedAt: string | null }>
	>`
		SELECT
			(payload::jsonb->'payload'->>'sessionId') AS "sessionId",
			COALESCE(
				payload::jsonb->'payload'->>'closedAt',
				payload::jsonb->'payload'->>'endedAt'
			) AS "closedAt"
		FROM "PortalBridgeMessageReceipt"
		WHERE topic = 'mc.player.session.closed'
			AND payload::jsonb->'source'->>'serverId' = ${serverId}
			AND payload::jsonb->'payload'->>'sessionId' = ANY(${sessionIds})
	`

	return new Map(
		rows.flatMap((row) =>
			row.sessionId && row.closedAt ? [[row.sessionId, row.closedAt]] : [],
		),
	)
}

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
	const receiptClosedAtBySessionId = await resolveReceiptClosedAtBySessionId(
		serverId,
		recentSessions
			.map((session) => session.sessionId)
			.filter((sessionId): sessionId is string => Boolean(sessionId)),
	)
	const normalizedSessions: SessionProjectionRow[] = recentSessions.map(
		(session) => {
			const receiptClosedAt = session.sessionId
				? receiptClosedAtBySessionId.get(session.sessionId)
				: null

			return {
				openedAt: session.openedAt,
				closedAt:
					session.closedAt ??
					(receiptClosedAt ? new Date(receiptClosedAt) : null),
				sessionId: session.sessionId,
			}
		},
	)

	return {
		server,
		player,
		currentSessionOpenedAt: null,
		totalOnlineSeconds: 0,
		recentSessions: normalizedSessions.map((session) => ({
			openedAt: session.openedAt.toISOString(),
			closedAt: session.closedAt?.toISOString() ?? null,
		})),
	}
}
