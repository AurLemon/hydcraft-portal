import { requireAdminUser } from '../../../../../utils/auth/session'
import {
	createApiError,
	createBadRequestError,
} from '../../../../../utils/errors'
import {
	parseAdminExternalSyncSourceName,
	readAdminExternalSyncSourceStatus,
} from '../../../../../utils/external-sync/admin-source-status'
import {
	syncAuthMeSources,
	syncLuckPermsSources,
} from '../../../../../utils/external-sync/orchestrator'
import {
	readAuthMeSourceConfig,
	readLuckPermsSourceConfig,
} from '../../../../../utils/external-sync/source-config'

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const source = parseAdminExternalSyncSourceName(
		getRouterParam(event, 'source') ?? '',
	)

	if (!source) {
		throw createBadRequestError('MYSQL_SOURCE_UNSUPPORTED')
	}

	const config =
		source === 'authme' ? readAuthMeSourceConfig() : readLuckPermsSourceConfig()

	if (!config.enabled || !config.databaseUrl) {
		throw createApiError({
			statusCode: 404,
			code:
				source === 'authme'
					? 'AUTHME_SOURCE_CONFIG_NOT_FOUND'
					: 'LUCKPERMS_SOURCE_CONFIG_NOT_FOUND',
		})
	}

	const result =
		source === 'authme'
			? await syncAuthMeSources('MANUAL')
			: await syncLuckPermsSources('MANUAL')

	if (result.serversRead === 0) {
		throw createApiError({
			statusCode: 409,
			code:
				source === 'authme'
					? 'AUTHME_SYNC_ALREADY_RUNNING'
					: 'LUCKPERMS_SYNC_ALREADY_RUNNING',
		})
	}

	return await readAdminExternalSyncSourceStatus(source)
})
