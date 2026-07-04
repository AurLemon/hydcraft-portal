import { prisma } from '../db/prisma'

export interface NormalizedPlayerSessionHistoryItem {
	serverId: string
	serverName: string | null
	openedAt: string
	closedAt: string | null
}

interface SessionHistoryRow {
	serverId: string
	serverName: string | null
	sessionId: string | null
	openedAt: Date
	closedAt: Date | null
}

const resolveReceiptClosedAtBySessionId = async (
	sessions: Array<{ serverId: string; sessionId: string }>,
): Promise<Map<string, string>> => {
	if (sessions.length === 0) {
		return new Map()
	}

	const sessionIds = [...new Set(sessions.map((session) => session.sessionId))]

	const rows = await prisma.$queryRaw<
		Array<{
			serverId: string | null
			sessionId: string
			closedAt: string | null
		}>
	>`
		SELECT
			(payload::jsonb->'source'->>'serverId') AS "serverId",
			(payload::jsonb->'payload'->>'sessionId') AS "sessionId",
			COALESCE(
				payload::jsonb->'payload'->>'closedAt',
				payload::jsonb->'payload'->>'endedAt'
			) AS "closedAt"
		FROM "PortalBridgeMessageReceipt"
		WHERE topic = 'mc.player.session.closed'
			AND payload::jsonb->'payload'->>'sessionId' = ANY(${sessionIds})
	`

	return new Map(
		rows.flatMap((row) =>
			row.serverId && row.sessionId && row.closedAt
				? [[`${row.serverId}:${row.sessionId}`, row.closedAt]]
				: [],
		),
	)
}

export const normalizePlayerSessionHistory = async (
	rows: SessionHistoryRow[],
): Promise<NormalizedPlayerSessionHistoryItem[]> => {
	const receiptClosedAtBySessionId = await resolveReceiptClosedAtBySessionId(
		rows.flatMap((session) =>
			session.sessionId
				? [
						{
							serverId: session.serverId,
							sessionId: session.sessionId,
						},
					]
				: [],
		),
	)

	return rows.map((session) => {
		const receiptClosedAt = session.sessionId
			? receiptClosedAtBySessionId.get(
					`${session.serverId}:${session.sessionId}`,
				)
			: null

		return {
			serverId: session.serverId,
			serverName: session.serverName,
			openedAt: session.openedAt.toISOString(),
			closedAt:
				session.closedAt?.toISOString() ??
				(receiptClosedAt ? new Date(receiptClosedAt).toISOString() : null),
		}
	})
}
