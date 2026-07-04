import { requireAdminUser } from '../../../../../utils/auth/session'
import { createBadRequestError } from '../../../../../utils/errors'
import {
	parseAdminExternalSyncSourceName,
	readAdminExternalSyncSourceStatus,
} from '../../../../../utils/external-sync/admin-source-status'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const source = parseAdminExternalSyncSourceName(
		getRouterParam(event, 'source') ?? '',
	)

	if (!source) {
		throw createBadRequestError('MYSQL_SOURCE_UNSUPPORTED')
	}

	return await readAdminExternalSyncSourceStatus(source)
})
