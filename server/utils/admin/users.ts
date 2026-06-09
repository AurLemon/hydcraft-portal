import { createError } from 'h3'
import type {
	Prisma,
	User,
	UserRole,
	UserStatus,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { ensureUserProfileDefaults } from '../profile/defaults'
import {
	normalizeBio,
	normalizeBirthday,
	normalizeBoolean,
	normalizeCountryOrRegion,
	normalizeDisplayName,
	normalizeLanguage,
	normalizeOptionalText,
	normalizePublicEmail,
	normalizeTimezone,
	normalizeTimezoneMode,
	normalizeUrl,
	normalizeUsername,
} from '../profile/validation'

const USER_ROLES = new Set<UserRole>(['USER', 'MEMBER', 'ADMIN', 'OWNER'])
const USER_STATUSES = new Set<UserStatus>([
	'PENDING',
	'ACTIVE',
	'DISABLED',
	'BANNED',
])
const USER_SORT_FIELDS = new Set([
	'createdAt',
	'updatedAt',
	'username',
	'displayName',
	'hydrolineId',
	'role',
	'status',
])

const pickDefined = <TData extends Record<string, unknown>>(
	data: TData,
): Partial<TData> =>
	Object.fromEntries(
		Object.entries(data).filter(([, value]) => value !== undefined),
	) as Partial<TData>

const badRequest = (message: string) =>
	createError({
		statusCode: 400,
		statusMessage: message,
	})

const ownerRoleError = () =>
	createError({
		statusCode: 403,
		statusMessage: 'OWNER_ROLE_REQUIRES_OWNER',
		message: '只有 OWNER 可以授予或移除 OWNER 角色',
	})

const normalizeRole = (value: unknown): UserRole | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !USER_ROLES.has(value as UserRole)) {
		throw badRequest('role is invalid')
	}

	return value as UserRole
}

const normalizeStatus = (value: unknown): UserStatus | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !USER_STATUSES.has(value as UserStatus)) {
		throw badRequest('status is invalid')
	}

	return value as UserStatus
}

const normalizeBadgeIds = (value: unknown): string[] | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw badRequest('badgeIds is invalid')
	}

	return [...new Set(value.map((item) => item.trim()).filter(Boolean))]
}

const normalizePreferenceData = (preferences: Record<string, unknown>) =>
	pickDefined({
		language: normalizeLanguage(preferences.language),
		timezoneMode: normalizeTimezoneMode(preferences.timezoneMode),
		timezone: normalizeTimezone(preferences.timezone),
	})

const normalizeSocialData = (social: Record<string, unknown>) =>
	pickDefined({
		h2wikiPageName: normalizeOptionalText(
			social.h2wikiPageName,
			80,
			'h2wikiPageName',
		),
		githubUsername: normalizeOptionalText(
			social.githubUsername,
			80,
			'githubUsername',
		),
		websiteUrl: normalizeUrl(social.websiteUrl, 'websiteUrl'),
		bilibiliUrl: normalizeUrl(social.bilibiliUrl, 'bilibiliUrl', [
			'bilibili.com',
		]),
		publicEmail: normalizePublicEmail(social.publicEmail),
	})

const normalizePrivacyData = (privacy: Record<string, unknown>) =>
	pickDefined({
		publicProfile: normalizeBoolean(privacy.publicProfile, 'publicProfile'),
		showHydrolineId: normalizeBoolean(
			privacy.showHydrolineId,
			'showHydrolineId',
		),
		showJoinedAt: normalizeBoolean(privacy.showJoinedAt, 'showJoinedAt'),
		showLocation: normalizeBoolean(privacy.showLocation, 'showLocation'),
		showCountryOrRegion: normalizeBoolean(
			privacy.showCountryOrRegion,
			'showCountryOrRegion',
		),
		showBirthday: normalizeBoolean(privacy.showBirthday, 'showBirthday'),
		showBadges: normalizeBoolean(privacy.showBadges, 'showBadges'),
		showBio: normalizeBoolean(privacy.showBio, 'showBio'),
		showMinecraftProfileLink: normalizeBoolean(
			privacy.showMinecraftProfileLink,
			'showMinecraftProfileLink',
		),
		showSocialLinks: normalizeBoolean(
			privacy.showSocialLinks,
			'showSocialLinks',
		),
		showActivityStatus: normalizeBoolean(
			privacy.showActivityStatus,
			'showActivityStatus',
		),
		searchableInUserDirectory: normalizeBoolean(
			privacy.searchableInUserDirectory,
			'searchableInUserDirectory',
		),
		allowMinecraftProfileDiscovery: normalizeBoolean(
			privacy.allowMinecraftProfileDiscovery,
			'allowMinecraftProfileDiscovery',
		),
	})

export const adminUserInclude = {
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
		take: 5,
	},
	createdAttachments: {
		orderBy: {
			createdAt: 'desc',
		},
		take: 8,
		include: {
			variants: true,
		},
	},
} satisfies Prisma.UserInclude

type AdminUserEntity = Prisma.UserGetPayload<{
	include: typeof adminUserInclude
}>

export const serializeAdminUser = (user: AdminUserEntity) => ({
	id: user.id,
	handle: user.handle,
	username: user.username,
	usernameChangedAt: user.usernameChangedAt,
	hydrolineId: user.hydrolineId,
	displayName: user.displayName,
	email: user.email,
	emailVerifiedAt: user.emailVerifiedAt,
	avatarUrl: user.avatarUrl,
	coverUrl: user.coverUrl,
	avatarAttachmentId: user.avatarAttachmentId,
	coverAttachmentId: user.coverAttachmentId,
	bio: user.bio,
	location: user.location,
	countryOrRegion: user.countryOrRegion,
	birthday: user.birthday,
	role: user.role,
	status: user.status,
	statusReason: user.statusReason,
	title: user.title,
	verified: user.verified,
	verifiedTextZhCn: user.verifiedTextZhCn,
	verifiedTextZhTw: user.verifiedTextZhTw,
	verifiedTextEnUs: user.verifiedTextEnUs,
	verifiedTextJaJp: user.verifiedTextJaJp,
	lastLoginAt: user.lastLoginAt,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
	profile: user.profile,
	preferences: user.preferences,
	privacy: user.privacy,
	badges: user.badges,
	minecraftAccounts: user.minecraftAccounts,
	attachments: user.createdAttachments.map((attachment) => ({
		id: attachment.id,
		category: attachment.category,
		purpose: attachment.purpose,
		status: attachment.status,
		objectKey: attachment.objectKey,
		createdAt: attachment.createdAt,
		variantCount: attachment.variants.length,
	})),
})

export const listAdminUsers = async (input: {
	page: number
	pageSize: number
	search?: string
	role?: string
	status?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const where: Prisma.UserWhereInput = {
		...(input.role ? { role: input.role as UserRole } : {}),
		...(input.status ? { status: input.status as UserStatus } : {}),
		...(input.search
			? {
					OR: [
						{ username: { contains: input.search, mode: 'insensitive' } },
						{ handle: { contains: input.search, mode: 'insensitive' } },
						{ hydrolineId: { contains: input.search, mode: 'insensitive' } },
						{ email: { contains: input.search, mode: 'insensitive' } },
						{ displayName: { contains: input.search, mode: 'insensitive' } },
					],
				}
			: {}),
	}
	const sortField = input.sortField ?? 'createdAt'
	const sortDirection = input.sortDirection ?? 'desc'
	const orderBy: Prisma.UserOrderByWithRelationInput = USER_SORT_FIELDS.has(
		sortField,
	)
		? { [sortField]: sortDirection }
		: { createdAt: 'desc' }

	const [total, users] = await Promise.all([
		prisma.user.count({ where }),
		prisma.user.findMany({
			where,
			orderBy,
			skip: (input.page - 1) * input.pageSize,
			take: input.pageSize,
			include: adminUserInclude,
		}),
	])

	return {
		items: users.map(serializeAdminUser),
		page: input.page,
		pageSize: input.pageSize,
		total,
		pageCount: Math.max(Math.ceil(total / input.pageSize), 1),
	}
}

export const getAdminUser = async (userId: string) => {
	await ensureUserProfileDefaults(userId)
	const user = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		include: adminUserInclude,
	})

	if (!user) {
		throw createError({
			statusCode: 404,
			statusMessage: 'USER_NOT_FOUND',
			message: '用户不存在',
		})
	}

	return serializeAdminUser(user)
}

interface AdminUserUpdateBody {
	username?: unknown
	displayName?: unknown
	bio?: unknown
	location?: unknown
	countryOrRegion?: unknown
	birthday?: unknown
	role?: unknown
	status?: unknown
	statusReason?: unknown
	title?: unknown
	verified?: unknown
	verifiedTextZhCn?: unknown
	verifiedTextZhTw?: unknown
	verifiedTextEnUs?: unknown
	verifiedTextJaJp?: unknown
	resetAvatar?: unknown
	resetCover?: unknown
	badgeIds?: unknown
	preferences?: Record<string, unknown>
	social?: Record<string, unknown>
	privacy?: Record<string, unknown>
}

export const updateAdminUser = async (
	actingUser: User,
	userId: string,
	body: AdminUserUpdateBody,
) => {
	const targetUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			role: true,
		},
	})

	if (!targetUser) {
		throw createError({
			statusCode: 404,
			statusMessage: 'USER_NOT_FOUND',
			message: '用户不存在',
		})
	}

	await ensureUserProfileDefaults(userId)
	const username = normalizeUsername(body.username)
	const displayName = normalizeDisplayName(body.displayName)
	const bio = normalizeBio(body.bio)
	const location = normalizeOptionalText(body.location, 80, 'location')
	const countryOrRegion = normalizeCountryOrRegion(body.countryOrRegion)
	const birthday = normalizeBirthday(body.birthday)
	const role = normalizeRole(body.role)
	const status = normalizeStatus(body.status)
	const statusReason = normalizeOptionalText(
		body.statusReason,
		200,
		'statusReason',
	)
	const title = normalizeOptionalText(body.title, 80, 'title')
	const verified = normalizeBoolean(body.verified, 'verified')
	const verifiedTextZhCn = normalizeOptionalText(
		body.verifiedTextZhCn,
		120,
		'verifiedTextZhCn',
	)
	const verifiedTextZhTw = normalizeOptionalText(
		body.verifiedTextZhTw,
		120,
		'verifiedTextZhTw',
	)
	const verifiedTextEnUs = normalizeOptionalText(
		body.verifiedTextEnUs,
		120,
		'verifiedTextEnUs',
	)
	const verifiedTextJaJp = normalizeOptionalText(
		body.verifiedTextJaJp,
		120,
		'verifiedTextJaJp',
	)
	const resetAvatar = normalizeBoolean(body.resetAvatar, 'resetAvatar')
	const resetCover = normalizeBoolean(body.resetCover, 'resetCover')
	const badgeIds = normalizeBadgeIds(body.badgeIds)
	const preferences = body.preferences ?? {}
	const social = body.social ?? {}
	const privacy = body.privacy ?? {}
	const preferenceData = normalizePreferenceData(preferences)
	const socialData = normalizeSocialData(social)
	const privacyData = normalizePrivacyData(privacy)

	if (
		role !== undefined &&
		(role === 'OWNER' || targetUser.role === 'OWNER') &&
		actingUser.role !== 'OWNER'
	) {
		throw ownerRoleError()
	}

	const userData = {
		...(username !== undefined ? { username } : {}),
		...(displayName !== undefined ? { displayName } : {}),
		...(bio !== undefined ? { bio } : {}),
		...(location !== undefined ? { location } : {}),
		...(countryOrRegion !== undefined ? { countryOrRegion } : {}),
		...(birthday !== undefined ? { birthday } : {}),
		...(role !== undefined ? { role } : {}),
		...(status !== undefined ? { status } : {}),
		...(statusReason !== undefined ? { statusReason } : {}),
		...(title !== undefined ? { title } : {}),
		...(verified !== undefined ? { verified } : {}),
		...(verifiedTextZhCn !== undefined ? { verifiedTextZhCn } : {}),
		...(verifiedTextZhTw !== undefined ? { verifiedTextZhTw } : {}),
		...(verifiedTextEnUs !== undefined ? { verifiedTextEnUs } : {}),
		...(verifiedTextJaJp !== undefined ? { verifiedTextJaJp } : {}),
		...(resetAvatar ? { avatarUrl: null, avatarAttachmentId: null } : {}),
		...(resetCover ? { coverUrl: null, coverAttachmentId: null } : {}),
	}

	if (username) {
		const exists = await prisma.user.findFirst({
			where: {
				username,
				id: {
					not: userId,
				},
			},
			select: {
				id: true,
			},
		})

		if (exists) {
			throw createError({
				statusCode: 409,
				statusMessage: 'USERNAME_TAKEN',
				message: '该用户名已被使用',
			})
		}
	}

	await prisma.$transaction(async (tx) => {
		if (Object.keys(userData).length) {
			await tx.user.update({
				where: {
					id: userId,
				},
				data: userData,
			})
		}

		if (Object.keys(preferenceData).length) {
			await tx.userProfilePreferences.update({
				where: {
					userId,
				},
				data: preferenceData,
			})
		}

		if (Object.keys(socialData).length) {
			await tx.userProfile.update({
				where: {
					userId,
				},
				data: socialData,
			})
		}

		if (Object.keys(privacyData).length) {
			await tx.userProfilePrivacy.update({
				where: {
					userId,
				},
				data: privacyData,
			})
		}

		if (badgeIds) {
			await tx.userProfileBadge.deleteMany({
				where: {
					userId,
				},
			})

			if (badgeIds.length) {
				await tx.userProfileBadge.createMany({
					data: badgeIds.map((badgeId, index) => ({
						userId,
						badgeId,
						sortOrder: index,
					})),
				})
			}
		}
	})

	return await getAdminUser(userId)
}
