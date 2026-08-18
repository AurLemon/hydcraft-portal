import {
	homeImmersiveOverview,
	homeImmersiveScenes,
} from '~/utils/home/immersive-scenes'
import type { HomePortalAccountSummary } from '~/utils/home/portal-accounts'
import { prisma } from '../db/prisma'

const listConfiguredPortalUsernames = (): string[] => {
	const usernames = new Map<string, string>()
	const addUsername = (username: string | undefined): void => {
		if (!username) return
		usernames.set(username.toLowerCase(), username)
	}

	for (const member of homeImmersiveOverview.members) {
		addUsername(member.portalUsername)
	}
	for (const scene of homeImmersiveScenes) {
		for (const player of scene.players) addUsername(player.portalUsername)
	}

	return [...usernames.values()]
}

export const listHomePortalAccounts = async (): Promise<
	HomePortalAccountSummary[]
> => {
	const configuredUsernames = listConfiguredPortalUsernames()
	if (configuredUsernames.length === 0) return []

	const users = await prisma.user.findMany({
		where: {
			OR: configuredUsernames.map((username) => ({
				username: { equals: username, mode: 'insensitive' },
			})),
		},
		select: {
			username: true,
			avatarUrl: true,
			privacy: {
				select: { publicProfile: true },
			},
		},
	})
	const usersByUsername = new Map(
		users.map((user) => [user.username.toLowerCase(), user] as const),
	)

	return configuredUsernames.flatMap((configuredUsername) => {
		const user = usersByUsername.get(configuredUsername.toLowerCase())
		if (!user || user.privacy?.publicProfile === false) return []

		return [{ username: user.username, avatarUrl: user.avatarUrl }]
	})
}
