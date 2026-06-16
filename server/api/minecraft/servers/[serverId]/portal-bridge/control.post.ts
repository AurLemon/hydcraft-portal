import { prisma } from '../../../../../utils/db/prisma'
import { requireAdminUser } from '../../../../../utils/auth/session'
import {
	createApiError,
	createBadRequestError,
} from '../../../../../utils/errors'
import { portalBridgeManager } from '../../../../../utils/portal-bridge/client'

interface PortalBridgeControlBody {
	action: 'connect' | 'disconnect' | 'reconnect'
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<PortalBridgeControlBody>(event)

	if (!['connect', 'disconnect', 'reconnect'].includes(body.action)) {
		throw createBadRequestError('PORTAL_BRIDGE_CONTROL_ACTION_UNSUPPORTED')
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

	if (body.action === 'disconnect') {
		portalBridgeManager.disconnect(bridgeConfig.id)
	} else if (body.action === 'reconnect') {
		await portalBridgeManager.reconnect(bridgeConfig.id)
	} else {
		await portalBridgeManager.connect(bridgeConfig.id)
	}

	return {
		runtime: portalBridgeManager.getStatus(bridgeConfig.id),
	}
})
