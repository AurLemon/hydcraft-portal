import { prisma } from '../../../../../../utils/db/prisma'
import { requireAdminUser } from '../../../../../../utils/auth/session'
import { portalBridgeManager } from '../../../../../../utils/portal-bridge/client'
import { isPortalBridgeCommandAction } from '../../../../../../utils/portal-bridge/protocol'

interface SendPortalBridgeCommandBody {
	action: string
	args?: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<SendPortalBridgeCommandBody>(event)

	if (!isPortalBridgeCommandAction(body.action)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Unsupported PortalBridge command action',
		})
	}

	const bridgeConfig = await prisma.portalBridgeConfig.findFirst({
		where: {
			minecraftServer: {
				serverId,
			},
		},
	})

	if (!bridgeConfig) {
		throw createError({
			statusCode: 404,
			statusMessage: 'PortalBridge config not found',
		})
	}

	const commandId = portalBridgeManager.sendCommand(
		bridgeConfig.id,
		body.action,
		body.args,
	)

	return {
		commandId,
	}
})
