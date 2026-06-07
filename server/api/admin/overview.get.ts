import { requireAdminUser } from '../../utils/auth/session'
import { prisma } from '../../utils/db/prisma'

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
		enabledServerCount,
		serverErrorCount,
		firstServer,
		userCount,
		usersCreatedToday,
		firstUser,
		authMeCount,
		enabledAuthMeCount,
		authMeErrorCount,
		luckPermsCount,
		enabledLuckPermsCount,
		luckPermsErrorCount,
		portalBridgeCount,
		enabledPortalBridgeCount,
		portalBridgeErrorCount,
	] = await Promise.all([
		prisma.minecraftServer.count(),
		prisma.minecraftServer.count({
			where: {
				enabled: true,
			},
		}),
		prisma.minecraftServer.count({
			where: {
				enabled: true,
				OR: [
					{ authMe: { is: { lastError: { not: null } } } },
					{ luckPerms: { is: { lastError: { not: null } } } },
					{ portalBridge: { is: { lastError: { not: null } } } },
					{
						portalBridge: {
							is: {
								enabled: true,
								lastConnectionState: {
									not: 'CONNECTED',
								},
							},
						},
					},
				],
			},
		}),
		prisma.minecraftServer.findFirst({
			orderBy: {
				createdAt: 'asc',
			},
			select: {
				createdAt: true,
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
		prisma.user.findFirst({
			orderBy: {
				createdAt: 'asc',
			},
			select: {
				createdAt: true,
			},
		}),
		prisma.authMeSourceConfig.count(),
		prisma.authMeSourceConfig.count({
			where: {
				enabled: true,
			},
		}),
		prisma.authMeSourceConfig.count({
			where: {
				enabled: true,
				lastError: {
					not: null,
				},
			},
		}),
		prisma.luckPermsSourceConfig.count(),
		prisma.luckPermsSourceConfig.count({
			where: {
				enabled: true,
			},
		}),
		prisma.luckPermsSourceConfig.count({
			where: {
				enabled: true,
				lastError: {
					not: null,
				},
			},
		}),
		prisma.portalBridgeConfig.count(),
		prisma.portalBridgeConfig.count({
			where: {
				enabled: true,
			},
		}),
		prisma.portalBridgeConfig.count({
			where: {
				enabled: true,
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

	const runningSince = [firstServer?.createdAt, firstUser?.createdAt]
		.filter((value): value is Date => Boolean(value))
		.sort((a, b) => a.getTime() - b.getTime())[0]
	const serverStatus: OverviewStatus =
		serverErrorCount > 0
			? 'error'
			: serverCount === 0 || enabledServerCount < serverCount
				? 'inactive'
				: 'normal'
	const authMeStatus: OverviewStatus =
		authMeErrorCount > 0
			? 'error'
			: authMeCount === 0 || enabledAuthMeCount === 0
				? 'inactive'
				: 'normal'
	const luckPermsStatus: OverviewStatus =
		luckPermsErrorCount > 0
			? 'error'
			: luckPermsCount === 0 || enabledLuckPermsCount === 0
				? 'inactive'
				: 'normal'
	const portalBridgeStatus: OverviewStatus =
		portalBridgeErrorCount > 0
			? 'error'
			: portalBridgeCount === 0 || enabledPortalBridgeCount === 0
				? 'inactive'
				: 'normal'
	const postgresqlStatus: OverviewStatus = process.env.DATABASE_URL
		? 'normal'
		: 'inactive'

	return {
		serverCount,
		enabledServerCount,
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
				enabledCount: enabledPortalBridgeCount,
			},
		],
	}
})
