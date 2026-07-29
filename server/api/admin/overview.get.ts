import { requireAdminUser } from '../../utils/auth/session'
import { prisma } from '../../utils/db/prisma'
import {
	readAuthMeSourceConfig,
	readLuckPermsSourceConfig,
} from '../../utils/external-sync/source-config'
import { getPortalRuntimeStartedAt } from '../../utils/runtime/portal-runtime'

type OverviewStatus = 'normal' | 'error' | 'inactive'

const DAY_MS = 24 * 60 * 60 * 1000

const startOfToday = (): Date => {
	const now = new Date()
	return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const getUptimeDays = (runningSince: Date | null): number | null => {
	if (!runningSince) {
		return null
	}

	return Math.max(0, Math.floor((Date.now() - runningSince.getTime()) / DAY_MS))
}

export default defineEventHandler(async (event) => {
	await requireAdminUser(event)

	const todayStart = startOfToday()
	const [
		serverCount,
		onlineServerCount,
		onlineConnectedBridgeCount,
		serverErrorCount,
		userCount,
		usersCreatedToday,
		authMeState,
		luckPermsState,
		portalBridgeCount,
		onlinePortalBridgeCount,
		portalBridgeErrorCount,
	] = await Promise.all([
		prisma.minecraftServer.count(),
		prisma.minecraftServer.count({
			where: { status: 'ONLINE' },
		}),
		prisma.portalBridgeConfig.count({
			where: {
				minecraftServer: { status: 'ONLINE' },
				lastConnectionState: 'CONNECTED',
			},
		}),
		prisma.minecraftServer.count({
			where: {
				status: 'ONLINE',
				OR: [
					{ portalBridge: { is: { lastError: { not: null } } } },
					{
						portalBridge: {
							is: {
								lastConnectionState: {
									not: 'CONNECTED',
								},
							},
						},
					},
				],
			},
		}),
		prisma.user.count(),
		prisma.user.count({
			where: {
				createdAt: {
					gte: todayStart,
				},
			},
		}),
		prisma.externalSyncState.findUnique({
			where: {
				source: 'AUTHME',
			},
		}),
		prisma.externalSyncState.findUnique({
			where: {
				source: 'LUCKPERMS',
			},
		}),
		prisma.portalBridgeConfig.count(),
		prisma.portalBridgeConfig.count({
			where: { minecraftServer: { status: 'ONLINE' } },
		}),
		prisma.portalBridgeConfig.count({
			where: {
				minecraftServer: { status: 'ONLINE' },
				OR: [
					{
						lastError: {
							not: null,
						},
					},
					{
						lastConnectionState: {
							not: 'CONNECTED',
						},
					},
				],
			},
		}),
	])

	const runningSince = getPortalRuntimeStartedAt()
	const authMeConfig = readAuthMeSourceConfig()
	const luckPermsConfig = readLuckPermsSourceConfig()
	const authMeCount = authMeConfig.databaseUrl ? 1 : 0
	const enabledAuthMeCount = authMeConfig.enabled ? 1 : 0
	const luckPermsCount = luckPermsConfig.databaseUrl ? 1 : 0
	const enabledLuckPermsCount = luckPermsConfig.enabled ? 1 : 0
	const serverStatus: OverviewStatus =
		onlineServerCount > 0 && onlineConnectedBridgeCount === onlineServerCount
			? 'normal'
			: serverErrorCount > 0
				? 'error'
				: 'inactive'
	const authMeStatus: OverviewStatus = authMeState?.lastError
		? 'error'
		: authMeCount === 0 || enabledAuthMeCount === 0
			? 'inactive'
			: 'normal'
	const luckPermsStatus: OverviewStatus = luckPermsState?.lastError
		? 'error'
		: luckPermsCount === 0 || enabledLuckPermsCount === 0
			? 'inactive'
			: 'normal'
	const portalBridgeStatus: OverviewStatus =
		portalBridgeErrorCount > 0
			? 'error'
			: portalBridgeCount === 0 || onlinePortalBridgeCount === 0
				? 'inactive'
				: 'normal'
	const postgresqlStatus: OverviewStatus = process.env.DATABASE_URL
		? 'normal'
		: 'inactive'

	return {
		serverCount,
		serverStatus,
		userCount,
		userDeltaSinceYesterday: usersCreatedToday,
		uptimeDays: getUptimeDays(runningSince ?? null),
		runningSince: runningSince?.toISOString() ?? null,
		services: [
			{
				key: 'postgresql',
				status: postgresqlStatus,
			},
			{
				key: 'authme',
				status: authMeStatus,
				configuredCount: authMeCount,
				enabledCount: enabledAuthMeCount,
			},
			{
				key: 'luckperms',
				status: luckPermsStatus,
				configuredCount: luckPermsCount,
				enabledCount: enabledLuckPermsCount,
			},
			{
				key: 'portalBridge',
				status: portalBridgeStatus,
				configuredCount: portalBridgeCount,
				enabledCount: onlinePortalBridgeCount,
			},
		],
	}
})
