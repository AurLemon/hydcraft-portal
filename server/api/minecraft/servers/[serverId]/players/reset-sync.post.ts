import { requireAdminUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import { resetAndResyncServerPlayers } from '../../../../../utils/admin/server-player-sync-reset'

interface ResetServerPlayerSyncBody {
	sources?: {
		portalBridge?: boolean
		authme?: boolean
		luckperms?: boolean
	}
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const body = await readBody<ResetServerPlayerSyncBody>(event)
	const sources = {
		portalBridge: body.sources?.portalBridge !== false,
		authme: body.sources?.authme !== false,
		luckperms: body.sources?.luckperms !== false,
	}

	if (!sources.portalBridge && !sources.authme && !sources.luckperms) {
		throw createBadRequestError('RESET_SYNC_SOURCE_REQUIRED')
	}

	return await resetAndResyncServerPlayers({
		serverId,
		sources,
	})
})
