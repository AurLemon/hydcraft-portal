import type { ExternalSyncSource } from '~/generated/prisma/client'
import { requireAdminUser } from '../../../utils/auth/session'
import { prisma } from '../../../utils/db/prisma'
import {
	readAuthMeSourceConfig,
	readLuckPermsSourceConfig,
} from '../../../utils/external-sync/source-config'

const serializeState = (
	source: Extract<ExternalSyncSource, 'AUTHME' | 'LUCKPERMS'>,
) => {
	const config =
		source === 'AUTHME' ? readAuthMeSourceConfig() : readLuckPermsSourceConfig()

	return {
		source,
		configured: Boolean(config.databaseUrl),
		enabled: config.enabled,
		database: config.database || null,
		intervalSeconds: config.intervalSeconds,
	}
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const states = await prisma.externalSyncState.findMany({
		where: {
			source: {
				in: ['AUTHME', 'LUCKPERMS'],
			},
		},
	})
	const statesBySource = new Map(states.map((state) => [state.source, state]))

	return {
		sources: (['AUTHME', 'LUCKPERMS'] as const).map((source) => {
			const config = serializeState(source)
			const state = statesBySource.get(source)

			return {
				...config,
				running: state?.running ?? false,
				lastStartedAt: state?.lastStartedAt?.toISOString() ?? null,
				lastFinishedAt: state?.lastFinishedAt?.toISOString() ?? null,
				lastSuccessAt: state?.lastSuccessAt?.toISOString() ?? null,
				lastError: state?.lastError ?? null,
				rowsRead: state?.rowsRead ?? 0,
				rowsMatched: state?.rowsMatched ?? 0,
				rowsChanged: state?.rowsChanged ?? 0,
				rowsSkipped: state?.rowsSkipped ?? 0,
			}
		}),
	}
})
