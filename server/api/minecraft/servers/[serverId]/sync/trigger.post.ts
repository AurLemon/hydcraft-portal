import { requireAdminUser } from '../../../../../utils/auth/session'
import { prisma } from '../../../../../utils/db/prisma'
import {
	createApiError,
	createBadRequestError,
} from '../../../../../utils/errors'
import {
	triggerAuthMeSyncForServer,
	triggerLuckPermsSyncForServer,
} from '../../../../../utils/external-sync/orchestrator'
import { portalBridgeManager } from '../../../../../utils/portal-bridge/client'

type ManualSyncTarget = 'portalBridge' | 'authme' | 'luckperms'

interface ManualSyncBody {
	target: ManualSyncTarget
}

const isManualSyncTarget = (value: unknown): value is ManualSyncTarget =>
	value === 'portalBridge' || value === 'authme' || value === 'luckperms'

const readTasks = async (serverId: string, target: ManualSyncTarget) => {
	if (target === 'authme' || target === 'luckperms') {
		const source = target === 'authme' ? 'AUTHME' : 'LUCKPERMS'
		const state = await prisma.externalSyncState.findUnique({
			where: {
				source,
			},
		})

		return state
			? [
					{
						taskKey: source.toLowerCase(),
						source: state.source,
						reason: state.reason,
						running: state.running,
						intervalSeconds: state.intervalSeconds,
						lastStartedAt: state.lastStartedAt,
						lastFinishedAt: state.lastFinishedAt,
						lastSuccessAt: state.lastSuccessAt,
						lastError: state.lastError,
						rowsRead: state.rowsRead,
						rowsMatched: state.rowsMatched,
						rowsChanged: state.rowsChanged,
						rowsSkipped: state.rowsSkipped,
					},
				]
			: []
	}

	const sources =
		target === 'portalBridge'
			? ([
					'PORTAL_BRIDGE_PLAYERS',
					'PORTAL_BRIDGE_PLAYERDATA',
					'PORTAL_BRIDGE_STATS',
					'PORTAL_BRIDGE_ADVANCEMENTS',
				] as const)
			: []

	const states = await prisma.externalSyncTaskState.findMany({
		where: {
			serverId,
			source: {
				in: [...sources],
			},
		},
		orderBy: [
			{
				source: 'asc',
			},
		],
	})

	return states.map((state) => ({
		taskKey: state.taskKey,
		source: state.source,
		reason: state.reason,
		running: state.running,
		intervalSeconds: state.intervalSeconds,
		lastStartedAt: state.lastStartedAt,
		lastFinishedAt: state.lastFinishedAt,
		lastSuccessAt: state.lastSuccessAt,
		lastError: state.lastError,
		rowsRead: state.rowsRead,
		rowsMatched: state.rowsMatched,
		rowsChanged: state.rowsChanged,
		rowsSkipped: state.rowsSkipped,
	}))
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<ManualSyncBody>(event)

	if (!isManualSyncTarget(body.target)) {
		throw createBadRequestError('MANUAL_SYNC_TARGET_UNSUPPORTED')
	}

	if (body.target === 'portalBridge') {
		const bridgeConfig = await prisma.portalBridgeConfig.findFirst({
			where: {
				minecraftServer: {
					serverId,
					enabled: true,
				},
				enabled: true,
			},
		})

		if (!bridgeConfig) {
			throw createApiError({
				statusCode: 404,
				code: 'PORTAL_BRIDGE_CONFIG_NOT_FOUND',
			})
		}

		await portalBridgeManager.syncCoreNow(bridgeConfig.id)

		return {
			tasks: await readTasks(serverId, body.target),
		}
	}

	if (body.target === 'authme') {
		const result = await triggerAuthMeSyncForServer({
			serverId,
			reason: 'MANUAL',
		})

		if (!result) {
			throw createApiError({
				statusCode: 404,
				code: 'AUTHME_SOURCE_CONFIG_NOT_FOUND',
			})
		}

		return {
			tasks: await readTasks(serverId, body.target),
		}
	}

	const result = await triggerLuckPermsSyncForServer({
		serverId,
		reason: 'MANUAL',
	})

	if (!result) {
		throw createApiError({
			statusCode: 404,
			code: 'LUCKPERMS_SOURCE_CONFIG_NOT_FOUND',
		})
	}

	return {
		tasks: await readTasks(serverId, body.target),
	}
})
