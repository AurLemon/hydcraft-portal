import type { MinecraftServerSnapshotKind } from '~/generated/prisma/client'
import { requireAdminUser } from '../../../../../utils/auth/session'
import { prisma } from '../../../../../utils/db/prisma'
import {
	createApiError,
	createBadRequestError,
} from '../../../../../utils/errors'
import { getMinecraftServerOverview } from '../../../../../utils/minecraft/server-overview'
import { portalBridgeManager } from '../../../../../utils/portal-bridge/client'
import type { PortalBridgeCommandAction } from '../../../../../utils/portal-bridge/protocol'

type PortalBridgeInspectTarget = 'snapshots' | 'bridge'

interface PortalBridgeInspectBody {
	target: PortalBridgeInspectTarget
}

const inspectActionByTarget: Record<
	PortalBridgeInspectTarget,
	PortalBridgeCommandAction
> = {
	snapshots: 'sync.players.now',
	bridge: 'bridge.ping',
}

const sleep = (milliseconds: number): Promise<void> =>
	new Promise((resolve) => {
		setTimeout(resolve, milliseconds)
	})

const waitForSnapshot = async (input: {
	serverId: string
	startedAt: Date
	timeoutMs: number
}) => {
	const deadline = Date.now() + input.timeoutMs
	const kinds: MinecraftServerSnapshotKind[] = [
		'PLAYER_SNAPSHOT',
		'ONLINE_PLAYERS',
		'SERVER_STATUS',
	]

	while (Date.now() < deadline) {
		const snapshot = await prisma.minecraftServerSnapshot.findFirst({
			where: {
				serverId: input.serverId,
				kind: {
					in: kinds,
				},
				createdAt: {
					gte: input.startedAt,
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		if (snapshot) {
			return {
				id: snapshot.id,
				kind: snapshot.kind,
				observedAt: snapshot.observedAt,
				createdAt: snapshot.createdAt,
				payload: snapshot.payload,
			}
		}

		await sleep(400)
	}

	return null
}

const waitForBridgeReceipt = async (input: {
	bridgeConfigId: string
	startedAt: Date
	timeoutMs: number
}) => {
	const deadline = Date.now() + input.timeoutMs

	while (Date.now() < deadline) {
		const receipt = await prisma.portalBridgeMessageReceipt.findFirst({
			where: {
				bridgeConfigId: input.bridgeConfigId,
				receivedAt: {
					gte: input.startedAt,
				},
			},
			orderBy: {
				receivedAt: 'desc',
			},
		})

		if (receipt) {
			return {
				id: receipt.id,
				topic: receipt.topic,
				streamEpoch: receipt.streamEpoch,
				seq: receipt.seq?.toString() ?? null,
				receivedAt: receipt.receivedAt,
				ackedAt: receipt.ackedAt,
				payload: receipt.payload,
			}
		}

		await sleep(400)
	}

	return null
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<PortalBridgeInspectBody>(event)

	if (body.target !== 'snapshots' && body.target !== 'bridge') {
		throw createBadRequestError('PORTAL_BRIDGE_INSPECT_TARGET_INVALID')
	}

	const bridgeConfig = await prisma.portalBridgeConfig.findFirst({
		where: {
			minecraftServer: {
				serverId,
			},
		},
	})

	if (!bridgeConfig) {
		throw createApiError({
			statusCode: 404,
			code: 'PORTAL_BRIDGE_CONFIG_NOT_FOUND',
		})
	}

	const startedAt = new Date()
	const action = inspectActionByTarget[body.target]
	const commandId = await portalBridgeManager.sendCommand(
		bridgeConfig.id,
		action,
	)
	const observed =
		body.target === 'snapshots'
			? await waitForSnapshot({
					serverId,
					startedAt,
					timeoutMs: 8_000,
				})
			: await waitForBridgeReceipt({
					bridgeConfigId: bridgeConfig.id,
					startedAt,
					timeoutMs: 8_000,
				})

	return {
		command: {
			action,
			commandId,
			sentAt: startedAt,
			timedOut: observed === null,
		},
		observed,
		overview: await getMinecraftServerOverview(serverId),
	}
})
