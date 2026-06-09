import type { Prisma } from '~/generated/prisma/client'
import { prisma } from '../db/prisma'

export const PROFILE_INCLUDE = {
	profile: true,
	preferences: true,
	privacy: true,
	badges: {
		orderBy: {
			sortOrder: 'asc',
		},
		include: {
			badge: true,
		},
	},
	minecraftAccounts: {
		where: {
			unlinkedAt: null,
		},
		orderBy: [
			{
				isPrimary: 'desc',
			},
			{
				updatedAt: 'desc',
			},
		],
		take: 1,
	},
} satisfies Prisma.UserInclude

export const findUserProfileById = async (id: string) =>
	await prisma.user.findUnique({
		where: {
			id,
		},
		include: PROFILE_INCLUDE,
	})

export const findUserProfileByUsername = async (username: string) =>
	await prisma.user.findUnique({
		where: {
			username,
		},
		include: PROFILE_INCLUDE,
	})

export type ProfileUser = NonNullable<
	Awaited<ReturnType<typeof findUserProfileByUsername>>
>
