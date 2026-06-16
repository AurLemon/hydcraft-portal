import { prisma } from '../../../../../../utils/db/prisma'
import { requireAdminUser } from '../../../../../../utils/auth/session'
import {
	createApiError,
	createBadRequestError,
} from '../../../../../../utils/errors'
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
		throw createBadRequestError('PORTAL_BRIDGE_COMMAND_ACTION_UNSUPPORTED')
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

	const commandId = await portalBridgeManager.sendCommand(
		bridgeConfig.id,
		body.action,
		body.args,
	)

	return {
		commandId,
	}
})
