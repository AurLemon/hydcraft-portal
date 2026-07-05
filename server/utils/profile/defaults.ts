import { prisma } from '../db/prisma'
import type { UserProfilePrivacySummary } from './types'

export const defaultProfilePrivacy: UserProfilePrivacySummary = {
	publicProfile: true,
	showHydrolineId: true,
	showJoinedAt: true,
	showLocation: true,
	showCountryOrRegion: true,
	showBirthday: true,
	showBadges: true,
	showBio: true,
	showMinecraftProfileLink: true,
	showSocialLinks: true,
	showActivityStatus: true,
	searchableInUserDirectory: true,
	allowMinecraftProfileDiscovery: true,
}

export const ensureUserProfileDefaults = async (
	userId: string,
): Promise<void> => {
	await prisma.userProfile.upsert({
		where: {
			userId,
		},
		create: {
			userId,
		},
		update: {},
	})
	await prisma.userProfilePreferences.upsert({
		where: {
			userId,
		},
		create: {
			userId,
			language: 'ZH_CN',
			timezoneMode: 'AUTO',
			timezone: 'Asia/Shanghai',
		},
		update: {},
	})
	await prisma.userProfilePrivacy.upsert({
		where: {
			userId,
		},
		create: {
			userId,
			...defaultProfilePrivacy,
		},
		update: {},
	})
}
