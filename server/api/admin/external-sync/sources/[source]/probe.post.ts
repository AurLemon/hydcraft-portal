import { requireAdminUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import {
	parseAdminExternalSyncSourceName,
	readAdminExternalSyncSourceStatus,
} from '../../../../../utils/external-sync/admin-source-status'

interface ProbeBody {
	action?: 'connect' | 'reconnect'
}

const isProbeAction = (
	value: ProbeBody['action'],
): value is NonNullable<ProbeBody['action']> =>
	value === 'connect' || value === 'reconnect'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const source = parseAdminExternalSyncSourceName(
		getRouterParam(event, 'source') ?? '',
	)

	if (!source) {
		throw createBadRequestError('MYSQL_SOURCE_UNSUPPORTED')
	}

	const body = await readBody<ProbeBody>(event)

	if (!isProbeAction(body.action)) {
		throw createBadRequestError('EXTERNAL_SYNC_PROBE_ACTION_UNSUPPORTED')
	}

	return await readAdminExternalSyncSourceStatus(source)
})
