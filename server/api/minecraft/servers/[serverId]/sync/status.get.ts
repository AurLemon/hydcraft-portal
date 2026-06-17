import type { ExternalSyncSource } from '~/generated/prisma/client'
import { requireAdminUser } from '../../../../../utils/auth/session'
import { prisma } from '../../../../../utils/db/prisma'

const sourceGroups = {
	portalBridge: [
		'PORTAL_BRIDGE_PLAYERS',
		'PORTAL_BRIDGE_PLAYERDATA',
		'PORTAL_BRIDGE_STATS',
		'PORTAL_BRIDGE_ADVANCEMENTS',
	],
	authme: ['AUTHME'],
	luckperms: ['LUCKPERMS'],
} satisfies Record<string, ExternalSyncSource[]>

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)
	const serverId = getRouterParam(event, 'serverId') ?? ''
	const group = getQuery(event).group
	const sources =
		typeof group === 'string' && group in sourceGroups
			? sourceGroups[group as keyof typeof sourceGroups]
			: Object.values(sourceGroups).flat()
	const globalSources = sources.filter(
		(source) => source === 'AUTHME' || source === 'LUCKPERMS',
	)
	const serverSources = sources.filter(
		(source) => source !== 'AUTHME' && source !== 'LUCKPERMS',
	)

	const [serverStates, globalStates] = await Promise.all([
		serverSources.length
			? prisma.externalSyncTaskState.findMany({
					where: {
						serverId,
						source: {
							in: serverSources,
						},
					},
					orderBy: [
						{
							source: 'asc',
						},
					],
				})
			: [],
		globalSources.length
			? prisma.externalSyncState.findMany({
					where: {
						source: {
							in: globalSources,
						},
					},
					orderBy: [
						{
							source: 'asc',
						},
					],
				})
			: [],
	])

	return {
		tasks: [
			...serverStates.map((state) => ({
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
			})),
			...globalStates.map((state) => ({
				taskKey: state.source.toLowerCase(),
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
			})),
		],
	}
})
