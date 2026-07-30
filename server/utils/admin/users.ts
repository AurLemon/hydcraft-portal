import type { H3Event } from 'h3'
import type {
	BuilderRank,
	Prisma,
	User,
	UserRole,
	UserStatus,
} from '~/generated/prisma/client'
import { prisma } from '../db/prisma'
import { getPublicAttachmentUrl } from '../attachment/runtime'
import { findPrimaryVariant } from '../attachment/variants'
import { createApiError, createBadRequestError } from '../errors'
import { queuePostCommitEvent } from '../events/post-commit'
import { ensureUserProfileDefaults } from '../profile/defaults'
import { createUniqueHydrolineId } from '../profile/hydroline-id'
import {
	normalizeAuthMeUsername,
	readVerifiedAuthMeAccountByUsername,
} from '../authme/verification'
import {
	bindMinecraftAccountToUser,
	recordMinecraftAccountVerification,
	setPrimaryMinecraftAccount,
	syncMinecraftAccountFromVerifiedAuthMe,
	unbindMinecraftAccountFromUser,
} from '../minecraft/account-binding'
import {
	buildMinecraftAccountSummary,
	minecraftAccountSummaryPlayerInclude,
} from '../minecraft/account-summary'
import { getHistoricalMinecraftAccountsForUser } from '../minecraft/historical-accounts'
import { normalizeMinecraftUsername } from '../minecraft/normalize'
import { createLuckPermsPrimaryGroupResolver } from '../luckperms/primary-group'
import { readLuckPermsSnapshotBundle } from '../luckperms/snapshot'
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
	normalizeUsernameForComparison,
} from '../profile/validation'
import { assertPassword } from '../auth/validation'
import { hashPassword } from '../auth/password'
import {
	lookupIpLocation,
	normalizeIpAddressForDisplay,
} from '../ip-location/ip-location'
import { recordSecurityEvent } from '../security/security-events'

const USER_ROLES = new Set<UserRole>(['USER', 'MEMBER', 'ADMIN', 'OWNER'])
const USER_STATUSES = new Set<UserStatus>([
	'PENDING',
	'ACTIVE',
	'DISABLED',
	'BANNED',
])
const BUILDER_RANKS = new Set<BuilderRank>([
	'CHIEF',
	'SENIOR',
	'PRACTICING',
	'APPRENTICE',
])
const USER_SORT_FIELDS = new Set([
	'joinedAt',
	'createdAt',
	'updatedAt',
	'username',
	'displayName',
	'hydrolineId',
	'role',
	'status',
	'builderRank',
])
const MINECRAFT_UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const pickDefined = <TData extends Record<string, unknown>>(
	data: TData,
): Partial<TData> =>
	Object.fromEntries(
		Object.entries(data).filter(([, value]) => value !== undefined),
	) as Partial<TData>

const badRequest = (code: string) => createBadRequestError(code)

const normalizeMinecraftUuidLookup = (value: string): string | null => {
	const normalized = value.trim().toLowerCase()
	return MINECRAFT_UUID_PATTERN.test(normalized) ? normalized : null
}

const ownerRoleError = () =>
	createApiError({
		statusCode: 403,
		code: 'OWNER_ROLE_REQUIRES_OWNER',
	})

const normalizeRole = (value: unknown): UserRole | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !USER_ROLES.has(value as UserRole)) {
		throw badRequest('ROLE_INVALID')
	}

	return value as UserRole
}

const normalizeStatus = (value: unknown): UserStatus | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !USER_STATUSES.has(value as UserStatus)) {
		throw badRequest('STATUS_INVALID')
	}

	return value as UserStatus
}

const normalizeBuilderRank = (
	value: unknown,
): BuilderRank | null | undefined => {
	if (value === undefined || value === null) {
		return value
	}

	if (typeof value !== 'string' || !BUILDER_RANKS.has(value as BuilderRank)) {
		throw badRequest('BUILDER_RANK_INVALID')
	}

	return value as BuilderRank
}

const normalizeJoinedAt = (value: unknown): Date | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw badRequest('JOINED_AT_INVALID')
	}

	const joinedAt = new Date(`${value}T00:00:00.000Z`)

	if (
		Number.isNaN(joinedAt.getTime()) ||
		joinedAt.toISOString().slice(0, 10) !== value
	) {
		throw badRequest('JOINED_AT_INVALID')
	}

	return joinedAt
}

const normalizeAttachmentId = (
	value: unknown,
	fieldName: string,
): string | null | undefined => normalizeOptionalText(value, 64, fieldName)

const normalizeRegenerateHydrolineId = (value: unknown): boolean => {
	if (value === undefined) {
		return false
	}

	return normalizeBoolean(value, 'regenerateHydrolineId') ?? false
}

const resolveReadyAttachmentUrl = async (
	attachmentId: string | null | undefined,
	userId: string,
	purpose: 'user-avatar' | 'user-cover',
): Promise<string | null | undefined> => {
	if (attachmentId === undefined) {
		return undefined
	}

	if (attachmentId === null) {
		return null
	}

	const attachment = await prisma.attachment.findUnique({
		where: {
			id: attachmentId,
		},
		include: {
			variants: true,
		},
	})

	if (
		!attachment ||
		attachment.ownerType !== 'user' ||
		attachment.ownerId !== userId ||
		attachment.purpose !== purpose ||
		attachment.status !== 'READY'
	) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_NOT_FOUND',
		})
	}

	const primaryVariant = findPrimaryVariant(purpose, attachment.variants)

	if (!primaryVariant) {
		throw createApiError({
			statusCode: 400,
			code: 'ATTACHMENT_VARIANT_NOT_FOUND',
		})
	}

	return getPublicAttachmentUrl(primaryVariant.objectKey)
}

const normalizeBadgeIds = (value: unknown): string[] | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw badRequest('BADGE_IDS_INVALID')
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
		qqNumber: normalizeOptionalText(social.qqNumber, 32, 'qqNumber'),
		wechatId: normalizeOptionalText(social.wechatId, 64, 'wechatId'),
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
	builderRank: {
		rank: user.builderRank,
		comments: {
			zhCn: user.builderRankCommentZhCn,
			zhTw: user.builderRankCommentZhTw,
			enUs: user.builderRankCommentEnUs,
			jaJp: user.builderRankCommentJaJp,
		},
		managedByAdmin: user.builderRankManagedByAdmin,
	},
	role: user.role,
	status: user.status,
	statusReason: user.statusReason,
	verified: user.verified,
	verifiedTextZhCn: user.verifiedTextZhCn,
	verifiedTextZhTw: user.verifiedTextZhTw,
	verifiedTextEnUs: user.verifiedTextEnUs,
	verifiedTextJaJp: user.verifiedTextJaJp,
	lastLoginAt: user.lastLoginAt,
	joinedAt: user.joinedAt,
	createdAt: user.createdAt,
	updatedAt: user.updatedAt,
	profile: user.profile,
	preferences: user.preferences,
	privacy: user.privacy,
	badges: user.badges,
	minecraftAccounts: [],
	historicalMinecraftAccounts: [],
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

const readAdminMinecraftAccountSummaries = async (userId: string) => {
	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			userId,
			unlinkedAt: null,
			identityKind: 'AUTHENTICATED',
		},
		include: {
			authMeAccount: true,
		},
		orderBy: [
			{
				isPrimary: 'desc',
			},
			{
				updatedAt: 'desc',
			},
		],
	})

	if (!accounts.length) {
		return []
	}

	const players = await prisma.minecraftServerPlayer.findMany({
		where: {
			OR: [
				{
					uuid: {
						in: accounts
							.map((account) => account.uuid)
							.filter((uuid): uuid is string => Boolean(uuid)),
					},
				},
				{
					normalizedUsername: {
						in: accounts.map((account) => account.normalizedUsername),
					},
				},
			],
		},
		include: minecraftAccountSummaryPlayerInclude,
		orderBy: [{ online: 'desc' }, { bridgeSyncedAt: 'desc' }],
	})
	const histories = await prisma.minecraftAccountBindingHistory.findMany({
		where: {
			minecraftAccountId: {
				in: accounts.map((account) => account.id),
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	})
	const historyByAccountId = new Map<string, typeof histories>()

	for (const history of histories) {
		const bucket = historyByAccountId.get(history.minecraftAccountId) ?? []
		bucket.push(history)
		historyByAccountId.set(history.minecraftAccountId, bucket)
	}

	const accountNormalizedUsernames = [
		...new Set(accounts.map((account) => account.normalizedUsername)),
	]
	const luckPermsResolver = createLuckPermsPrimaryGroupResolver(
		await readLuckPermsSnapshotBundle({
			uuids: accounts.flatMap((account) => account.uuid ?? []),
			normalizedUsernames: accountNormalizedUsernames,
		}),
	)

	return accounts.map((account) =>
		buildMinecraftAccountSummary(
			account,
			players,
			historyByAccountId.get(account.id) ?? [],
			luckPermsResolver,
		),
	)
}

export const listAdminUsers = async (input: {
	page: number
	pageSize: number
	search?: string
	role?: string
	status?: string
	builderRank?: string
	sortField?: string
	sortDirection?: 'asc' | 'desc'
}) => {
	const where: Prisma.UserWhereInput = {
		...(input.role ? { role: input.role as UserRole } : {}),
		...(input.status ? { status: input.status as UserStatus } : {}),
		...(input.builderRank === 'NONE'
			? { builderRank: null }
			: input.builderRank && BUILDER_RANKS.has(input.builderRank as BuilderRank)
				? { builderRank: input.builderRank as BuilderRank }
				: {}),
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
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	return {
		...serializeAdminUser(user),
		minecraftAccounts: await readAdminMinecraftAccountSummaries(userId),
		historicalMinecraftAccounts:
			await getHistoricalMinecraftAccountsForUser(userId),
	}
}

export const listAdminBindableMinecraftAccounts = async (input: {
	search?: string
	pageSize?: number
}) => {
	const search = input.search?.trim() ?? ''
	const normalizedUsername = normalizeMinecraftUsername(search)
	const uuidLookup = normalizeMinecraftUuidLookup(search)
	const pageSize = Math.min(Math.max(input.pageSize ?? 8, 1), 20)
	const accounts = await prisma.minecraftAccount.findMany({
		where: {
			unlinkedAt: null,
			identityKind: 'AUTHENTICATED',
			userId: null,
			...(search
				? {
						OR: [
							{
								username: {
									contains: search,
									mode: 'insensitive',
								},
							},
							{
								authmeName: {
									contains: search,
									mode: 'insensitive',
								},
							},
							...(normalizedUsername
								? [
										{
											normalizedUsername: {
												contains: normalizedUsername,
											},
										},
									]
								: []),
							...(uuidLookup
								? [
										{
											uuid: uuidLookup,
										},
									]
								: []),
						],
					}
				: {}),
		},
		orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
		take: pageSize,
	})

	return {
		items: accounts.map((account) => {
			const descriptionParts = [
				account.authmeName ? `AuthMe: ${account.authmeName}` : null,
				account.uuid,
			].filter((part): part is string => Boolean(part))

			return {
				id: account.id,
				value: account.uuid ?? account.username,
				label: account.username,
				description: descriptionParts.join(' · ') || account.source,
				username: account.username,
				uuid: account.uuid,
			}
		}),
	}
}

export const adminBindMinecraftAccountToUser = async (input: {
	actingUser: User
	userId: string
	username: string
}) => {
	const bindingKey = input.username.trim()

	if (!bindingKey) {
		throw createApiError({
			statusCode: 400,
			code: 'MINECRAFT_USERNAME_REQUIRED',
		})
	}

	const uuidLookup = normalizeMinecraftUuidLookup(bindingKey)
	const targetUser = await prisma.user.findUnique({
		where: {
			id: input.userId,
		},
		select: {
			id: true,
		},
	})

	if (!targetUser) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	const observedPlayer = uuidLookup
		? await prisma.minecraftServerPlayer.findFirst({
				where: {
					uuid: uuidLookup,
				},
				select: {
					normalizedUsername: true,
				},
			})
		: null
	const normalizedUsername = uuidLookup
		? (observedPlayer?.normalizedUsername ?? null)
		: normalizeAuthMeUsername(bindingKey)
	const resolvedNormalizedUsername =
		observedPlayer?.normalizedUsername ?? normalizedUsername

	const existingAccount =
		(await prisma.minecraftAccount.findFirst({
			where: {
				OR: [
					...(uuidLookup
						? [
								{
									uuid: uuidLookup,
								},
							]
						: []),
					...(resolvedNormalizedUsername
						? [
								{
									normalizedUsername: resolvedNormalizedUsername,
								},
							]
						: []),
				],
			},
		})) ??
		(resolvedNormalizedUsername
			? await prisma.minecraftAccount.findFirst({
					where: {
						authMeAccount: {
							username: {
								equals: resolvedNormalizedUsername,
								mode: 'insensitive',
							},
						},
					},
				})
			: null)
	const minecraftAccount =
		existingAccount ??
		(await prisma.$transaction(async (tx) => {
			if (!resolvedNormalizedUsername) {
				throw createApiError({
					statusCode: 404,
					code: 'MINECRAFT_ACCOUNT_NOT_FOUND',
				})
			}

			const verifiedAccount = await readVerifiedAuthMeAccountByUsername(
				resolvedNormalizedUsername,
			)

			if (!verifiedAccount) {
				throw createApiError({
					statusCode: 404,
					code: 'AUTHME_ACCOUNT_NOT_FOUND',
				})
			}

			return await syncMinecraftAccountFromVerifiedAuthMe(verifiedAccount, tx)
		}))

	if (minecraftAccount.userId && minecraftAccount.userId !== input.userId) {
		throw createApiError({
			statusCode: 409,
			code: 'MINECRAFT_ACCOUNT_ALREADY_BOUND',
		})
	}

	await recordMinecraftAccountVerification({
		minecraftAccountId: minecraftAccount.id,
		actorUserId: input.actingUser.id,
		targetUserId: input.userId,
		reason: 'admin-bind',
		metadata: {
			username: minecraftAccount.username,
			normalizedUsername: minecraftAccount.normalizedUsername,
		},
	})

	return await bindMinecraftAccountToUser({
		minecraftAccountId: minecraftAccount.id,
		userId: input.userId,
		actorUserId: input.actingUser.id,
		reason: 'admin-bind',
	})
}

export const adminSetPrimaryMinecraftAccount = async (input: {
	actingUser: User
	userId: string
	minecraftAccountId: string
}) => {
	const targetUser = await prisma.user.findUnique({
		where: {
			id: input.userId,
		},
		select: {
			id: true,
		},
	})

	if (!targetUser) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	return await setPrimaryMinecraftAccount({
		minecraftAccountId: input.minecraftAccountId,
		userId: input.userId,
		actorUserId: input.actingUser.id,
		reason: 'admin-primary-set',
	})
}

export const adminUnbindMinecraftAccountFromUser = async (input: {
	actingUser: User
	userId: string
	minecraftAccountId: string
}) => {
	const account = await prisma.minecraftAccount.findFirst({
		where: {
			id: input.minecraftAccountId,
			userId: input.userId,
			unlinkedAt: null,
		},
		select: {
			id: true,
		},
	})

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'MINECRAFT_ACCOUNT_NOT_FOUND',
		})
	}

	return await unbindMinecraftAccountFromUser({
		minecraftAccountId: input.minecraftAccountId,
		actorUserId: input.actingUser.id,
		reason: 'admin-unbind',
	})
}

interface AdminUserUpdateBody {
	username?: unknown
	displayName?: unknown
	joinedAt?: unknown
	createdAt?: unknown
	bio?: unknown
	location?: unknown
	countryOrRegion?: unknown
	birthday?: unknown
	role?: unknown
	status?: unknown
	statusReason?: unknown
	verified?: unknown
	verifiedTextZhCn?: unknown
	verifiedTextZhTw?: unknown
	verifiedTextEnUs?: unknown
	verifiedTextJaJp?: unknown
	builderRank?: unknown
	builderRankCommentZhCn?: unknown
	builderRankCommentZhTw?: unknown
	builderRankCommentEnUs?: unknown
	builderRankCommentJaJp?: unknown
	resetAvatar?: unknown
	resetCover?: unknown
	avatarAttachmentId?: unknown
	coverAttachmentId?: unknown
	regenerateHydrolineId?: unknown
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
			id: true,
			role: true,
			joinedAt: true,
			createdAt: true,
		},
	})

	if (!targetUser) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	await ensureUserProfileDefaults(userId)
	const username = normalizeUsername(body.username)
	const displayName = normalizeDisplayName(body.displayName)
	const joinedAt = normalizeJoinedAt(body.joinedAt)
	const createdAt = normalizeJoinedAt(body.createdAt)
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
	const builderRank = normalizeBuilderRank(body.builderRank)
	const builderRankCommentZhCn = normalizeOptionalText(
		body.builderRankCommentZhCn,
		240,
		'builderRankCommentZhCn',
	)
	const builderRankCommentZhTw = normalizeOptionalText(
		body.builderRankCommentZhTw,
		240,
		'builderRankCommentZhTw',
	)
	const builderRankCommentEnUs = normalizeOptionalText(
		body.builderRankCommentEnUs,
		240,
		'builderRankCommentEnUs',
	)
	const builderRankCommentJaJp = normalizeOptionalText(
		body.builderRankCommentJaJp,
		240,
		'builderRankCommentJaJp',
	)
	const hasBuilderRankUpdate = [
		builderRank,
		builderRankCommentZhCn,
		builderRankCommentZhTw,
		builderRankCommentEnUs,
		builderRankCommentJaJp,
	].some((value) => value !== undefined)
	const resetAvatar = normalizeBoolean(body.resetAvatar, 'resetAvatar')
	const resetCover = normalizeBoolean(body.resetCover, 'resetCover')
	const avatarAttachmentId = normalizeAttachmentId(
		body.avatarAttachmentId,
		'avatarAttachmentId',
	)
	const coverAttachmentId = normalizeAttachmentId(
		body.coverAttachmentId,
		'coverAttachmentId',
	)
	const regenerateHydrolineId = normalizeRegenerateHydrolineId(
		body.regenerateHydrolineId,
	)
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

	const generatedHydrolineId = regenerateHydrolineId
		? await createUniqueHydrolineId({
				userId,
				joinedAt: joinedAt ?? targetUser.joinedAt,
				errorCode: 'HYDROLINE_ID_GENERATION_FAILED',
			})
		: undefined
	const avatarUrl = resetAvatar
		? null
		: await resolveReadyAttachmentUrl(avatarAttachmentId, userId, 'user-avatar')
	const coverUrl = resetCover
		? null
		: await resolveReadyAttachmentUrl(coverAttachmentId, userId, 'user-cover')

	const userData = {
		...(username !== undefined ? { username } : {}),
		...(generatedHydrolineId !== undefined
			? { hydrolineId: generatedHydrolineId }
			: {}),
		...(displayName !== undefined ? { displayName } : {}),
		...(joinedAt !== undefined ? { joinedAt } : {}),
		...(createdAt !== undefined ? { createdAt } : {}),
		...(bio !== undefined ? { bio } : {}),
		...(location !== undefined ? { location } : {}),
		...(countryOrRegion !== undefined ? { countryOrRegion } : {}),
		...(birthday !== undefined ? { birthday } : {}),
		...(role !== undefined ? { role } : {}),
		...(status !== undefined ? { status } : {}),
		...(statusReason !== undefined ? { statusReason } : {}),
		...(verified !== undefined ? { verified } : {}),
		...(verifiedTextZhCn !== undefined ? { verifiedTextZhCn } : {}),
		...(verifiedTextZhTw !== undefined ? { verifiedTextZhTw } : {}),
		...(verifiedTextEnUs !== undefined ? { verifiedTextEnUs } : {}),
		...(verifiedTextJaJp !== undefined ? { verifiedTextJaJp } : {}),
		...(builderRank !== undefined ? { builderRank } : {}),
		...(builderRankCommentZhCn !== undefined ? { builderRankCommentZhCn } : {}),
		...(builderRankCommentZhTw !== undefined ? { builderRankCommentZhTw } : {}),
		...(builderRankCommentEnUs !== undefined ? { builderRankCommentEnUs } : {}),
		...(builderRankCommentJaJp !== undefined ? { builderRankCommentJaJp } : {}),
		...(hasBuilderRankUpdate ? { builderRankManagedByAdmin: true } : {}),
		...(resetAvatar ? { avatarUrl: null, avatarAttachmentId: null } : {}),
		...(resetCover ? { coverUrl: null, coverAttachmentId: null } : {}),
		...(avatarAttachmentId !== undefined
			? { avatarAttachmentId, avatarUrl }
			: {}),
		...(coverAttachmentId !== undefined ? { coverAttachmentId, coverUrl } : {}),
	}

	if (username) {
		const normalizedUsername = normalizeUsernameForComparison(username)
		const exists = await prisma.user.findFirst({
			where: {
				username: {
					equals: normalizedUsername,
					mode: 'insensitive',
				},
				id: {
					not: userId,
				},
			},
			select: {
				id: true,
			},
		})

		if (exists) {
			throw createApiError({
				statusCode: 409,
				code: 'USERNAME_TAKEN',
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

	if (avatarAttachmentId !== undefined || resetAvatar) {
		queuePostCommitEvent('user.profile.attachment-replaced', {
			userId,
			purpose: 'user-avatar',
			activeAttachmentId: resetAvatar ? null : (avatarAttachmentId ?? null),
		})
	}

	if (coverAttachmentId !== undefined || resetCover) {
		queuePostCommitEvent('user.profile.attachment-replaced', {
			userId,
			purpose: 'user-cover',
			activeAttachmentId: resetCover ? null : (coverAttachmentId ?? null),
		})
	}

	return await getAdminUser(userId)
}

const ADMIN_SECURITY_EVENT_LIMIT = 10

const getTargetUserForAdminAction = async (userId: string) => {
	const targetUser = await prisma.user.findUnique({
		where: {
			id: userId,
		},
		select: {
			id: true,
			username: true,
			displayName: true,
			email: true,
			emailVerifiedAt: true,
			role: true,
			status: true,
			lastLoginAt: true,
		},
	})

	if (!targetUser) {
		throw createApiError({
			statusCode: 404,
			code: 'USER_NOT_FOUND',
		})
	}

	return targetUser
}

const assertOwnerSecurityActionAllowed = (
	actingUser: User,
	targetUserRole: UserRole,
): void => {
	if (targetUserRole === 'OWNER' && actingUser.role !== 'OWNER') {
		throw createApiError({
			statusCode: 403,
			code: 'OWNER_SECURITY_ACTION_REQUIRES_OWNER',
		})
	}
}

const ensurePrimaryEmailRecord = async (input: {
	userId: string
	email: string | null
	emailVerifiedAt: Date | null
}): Promise<void> => {
	if (!input.email) {
		return
	}

	await prisma.userEmail.upsert({
		where: {
			email: input.email,
		},
		create: {
			userId: input.userId,
			email: input.email,
			kind: 'PRIMARY',
			verifiedAt: input.emailVerifiedAt,
		},
		update: {
			userId: input.userId,
			kind: 'PRIMARY',
			verifiedAt: input.emailVerifiedAt,
		},
	})
}

const serializeIpLocation = (
	location: Awaited<ReturnType<typeof lookupIpLocation>>,
) =>
	location
		? {
				raw: location.raw,
				country: location.country,
				countryCode: location.countryCode,
				region: location.region,
				province: location.province,
				city: location.city,
				district: location.district,
				isp: location.isp,
				display: location.display,
			}
		: null

const readSecuritySessions = async (
	userId: string,
	currentSessionId?: string | null,
) => {
	const sessions = await prisma.refreshToken.findMany({
		where: {
			userId,
			revokedAt: null,
			expiresAt: {
				gt: new Date(),
			},
		},
		orderBy: {
			updatedAt: 'desc',
		},
		select: {
			id: true,
			userAgent: true,
			ipAddress: true,
			expiresAt: true,
			createdAt: true,
			updatedAt: true,
		},
	})

	return await Promise.all(
		sessions.map(async (session) => ({
			...session,
			ipAddress:
				normalizeIpAddressForDisplay(session.ipAddress) ?? session.ipAddress,
			ipLocation: serializeIpLocation(
				await lookupIpLocation(session.ipAddress),
			),
			current: session.id === currentSessionId,
		})),
	)
}

const readSecurityEvents = async (userId: string) => {
	const events = await prisma.securityEvent.findMany({
		where: {
			userId,
		},
		orderBy: {
			createdAt: 'desc',
		},
		take: ADMIN_SECURITY_EVENT_LIMIT,
	})

	return await Promise.all(
		events.map(async (securityEvent) => ({
			...securityEvent,
			ipAddress:
				normalizeIpAddressForDisplay(securityEvent.ipAddress) ??
				securityEvent.ipAddress,
			ipLocation: serializeIpLocation(
				await lookupIpLocation(securityEvent.ipAddress),
			),
		})),
	)
}

export const getAdminUserSecurity = async (
	userId: string,
	currentSessionId?: string | null,
) => {
	const targetUser = await getTargetUserForAdminAction(userId)

	await ensurePrimaryEmailRecord({
		userId: targetUser.id,
		email: targetUser.email,
		emailVerifiedAt: targetUser.emailVerifiedAt,
	})

	const [
		credential,
		emails,
		oauthConnections,
		sessions,
		events,
		securityEventCount,
	] = await Promise.all([
		prisma.userCredential.findUnique({
			where: {
				userId,
			},
			select: {
				id: true,
			},
		}),
		prisma.userEmail.findMany({
			where: {
				userId,
			},
			orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
		}),
		prisma.externalAccount.findMany({
			where: {
				userId,
			},
			orderBy: [{ disconnectedAt: 'asc' }, { connectedAt: 'desc' }],
			select: {
				id: true,
				provider: true,
				providerAccountId: true,
				providerUsername: true,
				providerEmail: true,
				avatarAttachmentId: true,
				avatarUrl: true,
				scope: true,
				connectedAt: true,
				lastUsedAt: true,
				disconnectedAt: true,
				createdAt: true,
				updatedAt: true,
			},
		}),
		readSecuritySessions(userId, currentSessionId),
		readSecurityEvents(userId),
		prisma.securityEvent.count({
			where: {
				userId,
			},
		}),
	])

	return {
		security: {
			overview: {
				status: targetUser.status,
				role: targetUser.role,
				primaryEmail: targetUser.email,
				emailVerifiedAt: targetUser.emailVerifiedAt,
				hasPassword: Boolean(credential),
				lastLoginAt: targetUser.lastLoginAt,
				activeSessionCount: sessions.length,
				securityEventCount,
			},
			oauthConnections,
			emails,
			sessions,
			events,
		},
	}
}

export const adminSetUserPassword = async (input: {
	event: H3Event
	actingUser: User
	userId: string
	password: string
}) => {
	const targetUser = await getTargetUserForAdminAction(input.userId)
	assertOwnerSecurityActionAllowed(input.actingUser, targetUser.role)

	const password = assertPassword(input.password)
	const passwordHash = await hashPassword(password)

	await prisma.userCredential.upsert({
		where: {
			userId: input.userId,
		},
		create: {
			userId: input.userId,
			passwordHash,
		},
		update: {
			passwordHash,
		},
	})

	await recordSecurityEvent({
		event: input.event,
		userId: input.userId,
		type: 'PASSWORD_CHANGED',
		title: 'Password changed',
		description: `Reset by admin ${input.actingUser.username}`,
		metadata: {
			source: 'admin',
			actorUserId: input.actingUser.id,
		},
	})

	return {
		ok: true,
	}
}

export const adminSetPrimaryEmail = async (input: {
	event: H3Event
	actingUser: User
	userId: string
	emailId: string
}) => {
	const targetUser = await getTargetUserForAdminAction(input.userId)
	assertOwnerSecurityActionAllowed(input.actingUser, targetUser.role)

	const email = await prisma.userEmail.findFirst({
		where: {
			id: input.emailId,
			userId: input.userId,
		},
	})

	if (!email) {
		throw createApiError({
			statusCode: 404,
			code: 'EMAIL_NOT_FOUND',
		})
	}

	if (!email.verifiedAt) {
		throw createApiError({
			statusCode: 400,
			code: 'EMAIL_NOT_VERIFIED',
		})
	}

	await prisma.$transaction(async (tx) => {
		await tx.userEmail.updateMany({
			where: {
				userId: input.userId,
				kind: 'PRIMARY',
			},
			data: {
				kind: 'SECONDARY',
			},
		})
		await tx.userEmail.update({
			where: {
				id: email.id,
			},
			data: {
				kind: 'PRIMARY',
			},
		})
		await tx.user.update({
			where: {
				id: input.userId,
			},
			data: {
				email: email.email,
				emailVerifiedAt: email.verifiedAt,
			},
		})
	})

	await recordSecurityEvent({
		event: input.event,
		userId: input.userId,
		type: 'PRIMARY_EMAIL_CHANGED',
		title: 'Primary email changed',
		description: email.email,
		metadata: {
			source: 'admin',
			actorUserId: input.actingUser.id,
			emailId: email.id,
			email: email.email,
		},
	})

	return {
		ok: true,
		primaryEmail: email.email,
	}
}

export const adminDeleteSecondaryEmail = async (input: {
	event: H3Event
	actingUser: User
	userId: string
	emailId: string
}) => {
	const targetUser = await getTargetUserForAdminAction(input.userId)
	assertOwnerSecurityActionAllowed(input.actingUser, targetUser.role)

	const email = await prisma.userEmail.findFirst({
		where: {
			id: input.emailId,
			userId: input.userId,
		},
	})

	if (!email) {
		throw createApiError({
			statusCode: 404,
			code: 'EMAIL_NOT_FOUND',
		})
	}

	if (email.kind === 'PRIMARY') {
		throw badRequest('PRIMARY_EMAIL_CANNOT_BE_REMOVED')
	}

	await prisma.userEmail.delete({
		where: {
			id: email.id,
		},
	})

	await recordSecurityEvent({
		event: input.event,
		userId: input.userId,
		type: 'SECONDARY_EMAIL_REMOVED',
		title: 'Secondary email removed',
		description: email.email,
		metadata: {
			source: 'admin',
			actorUserId: input.actingUser.id,
			emailId: email.id,
			email: email.email,
		},
	})

	return {
		ok: true,
	}
}

export const adminRevokeUserSession = async (input: {
	event: H3Event
	actingUser: User
	userId: string
	sessionId: string
	currentSessionId?: string | null
}) => {
	const targetUser = await getTargetUserForAdminAction(input.userId)
	assertOwnerSecurityActionAllowed(input.actingUser, targetUser.role)

	const session = await prisma.refreshToken.findFirst({
		where: {
			id: input.sessionId,
			userId: input.userId,
			revokedAt: null,
		},
	})

	if (!session) {
		throw createApiError({
			statusCode: 404,
			code: 'SESSION_NOT_FOUND',
		})
	}

	await prisma.refreshToken.update({
		where: {
			id: session.id,
		},
		data: {
			revokedAt: new Date(),
		},
	})

	const isCurrentSession = input.currentSessionId === session.id

	await recordSecurityEvent({
		event: input.event,
		userId: input.userId,
		type: 'SESSION_REVOKED',
		title: isCurrentSession
			? 'Current login device revoked'
			: 'Login device revoked',
		description: session.userAgent,
		metadata: {
			source: 'admin',
			actorUserId: input.actingUser.id,
			sessionId: session.id,
			current: isCurrentSession,
		},
	})

	return {
		ok: true,
		current: isCurrentSession,
	}
}

export const adminRevokeAllUserSessions = async (input: {
	event: H3Event
	actingUser: User
	userId: string
	currentSessionId?: string | null
}) => {
	const targetUser = await getTargetUserForAdminAction(input.userId)
	assertOwnerSecurityActionAllowed(input.actingUser, targetUser.role)

	const preserveCurrentSession =
		input.currentSessionId && input.actingUser.id === input.userId
			? input.currentSessionId
			: null
	const result = await prisma.refreshToken.updateMany({
		where: {
			userId: input.userId,
			revokedAt: null,
			id: preserveCurrentSession
				? {
						not: preserveCurrentSession,
					}
				: undefined,
		},
		data: {
			revokedAt: new Date(),
		},
	})

	await recordSecurityEvent({
		event: input.event,
		userId: input.userId,
		type: 'SESSIONS_REVOKED',
		title: 'Other login devices revoked',
		description: `Revoked ${result.count} device(s)`,
		metadata: {
			source: 'admin',
			actorUserId: input.actingUser.id,
			count: result.count,
			preservedSessionId: preserveCurrentSession,
		},
	})

	return {
		ok: true,
		count: result.count,
	}
}

export const adminUnlinkOAuthConnection = async (input: {
	event: H3Event
	actingUser: User
	userId: string
	connectionId: string
}) => {
	const targetUser = await getTargetUserForAdminAction(input.userId)
	assertOwnerSecurityActionAllowed(input.actingUser, targetUser.role)

	const account = await prisma.externalAccount.findFirst({
		where: {
			id: input.connectionId,
			userId: input.userId,
		},
	})

	if (!account) {
		throw createApiError({
			statusCode: 404,
			code: 'OAUTH_CONNECTION_NOT_FOUND',
		})
	}

	if (!account.disconnectedAt) {
		const [credential, otherActiveExternalAccounts] = await Promise.all([
			prisma.userCredential.findUnique({
				where: {
					userId: input.userId,
				},
				select: {
					id: true,
				},
			}),
			prisma.externalAccount.count({
				where: {
					userId: input.userId,
					disconnectedAt: null,
					id: {
						not: account.id,
					},
				},
			}),
		])

		if (!credential && otherActiveExternalAccounts < 1) {
			throw createApiError({
				statusCode: 400,
				code: 'LAST_LOGIN_METHOD_REQUIRED',
			})
		}

		await prisma.externalAccount.update({
			where: {
				id: account.id,
			},
			data: {
				disconnectedAt: new Date(),
				avatarAttachmentId: null,
				avatarUrl: null,
			},
		})
	}

	await recordSecurityEvent({
		event: input.event,
		userId: input.userId,
		type: 'OAUTH_UNLINKED',
		title: 'OAuth account unlinked',
		description: account.provider,
		metadata: {
			source: 'admin',
			actorUserId: input.actingUser.id,
			provider: account.provider,
			providerAccountId: account.providerAccountId,
			accountId: account.id,
		},
	})

	queuePostCommitEvent('user.oauth.unlinked', {
		userId: input.userId,
		provider: account.provider,
		externalAccountId: account.id,
		avatarAttachmentId: account.avatarAttachmentId,
		avatarUrl: account.avatarUrl,
	})

	return {
		ok: true,
	}
}

const readAdminUserDeletePreviewData = async (userId: string) => {
	const user = await getTargetUserForAdminAction(userId)
	const externalAccountIds = (
		await prisma.externalAccount.findMany({
			where: {
				userId,
			},
			select: {
				id: true,
			},
		})
	).map((account) => account.id)

	const [
		emails,
		oauthConnections,
		refreshTokens,
		securityEvents,
		minecraftAccounts,
		profileAttachments,
		externalAccountAttachments,
	] = await Promise.all([
		prisma.userEmail.count({
			where: {
				userId,
			},
		}),
		prisma.externalAccount.count({
			where: {
				userId,
			},
		}),
		prisma.refreshToken.count({
			where: {
				userId,
			},
		}),
		prisma.securityEvent.count({
			where: {
				userId,
			},
		}),
		prisma.minecraftAccount.count({
			where: {
				userId,
			},
		}),
		prisma.attachment.count({
			where: {
				ownerType: 'user',
				ownerId: userId,
			},
		}),
		externalAccountIds.length
			? prisma.attachment.count({
					where: {
						ownerType: 'external-account',
						ownerId: {
							in: externalAccountIds,
						},
					},
				})
			: Promise.resolve(0),
	])

	return {
		user: {
			id: user.id,
			username: user.username,
			displayName: user.displayName,
			email: user.email,
			role: user.role,
		},
		impact: {
			emails,
			oauthConnections,
			refreshTokens,
			securityEvents,
			minecraftAccounts,
			attachments: profileAttachments + externalAccountAttachments,
		},
		externalAccountIds,
	}
}

export const previewAdminUserDeletion = async (
	actingUser: User,
	userId: string,
) => {
	if (actingUser.role !== 'OWNER') {
		throw ownerRoleError()
	}

	const preview = await readAdminUserDeletePreviewData(userId)

	if (actingUser.id === userId) {
		throw createApiError({
			statusCode: 400,
			code: 'ADMIN_SELF_DELETE_FORBIDDEN',
		})
	}

	return {
		user: preview.user,
		impact: preview.impact,
	}
}

export const adminDeleteUser = async (input: {
	actingUser: User
	userId: string
}) => {
	if (input.actingUser.role !== 'OWNER') {
		throw ownerRoleError()
	}

	if (input.actingUser.id === input.userId) {
		throw createApiError({
			statusCode: 400,
			code: 'ADMIN_SELF_DELETE_FORBIDDEN',
		})
	}

	const preview = await readAdminUserDeletePreviewData(input.userId)

	await prisma.user.delete({
		where: {
			id: input.userId,
		},
	})

	queuePostCommitEvent('admin.user.deleted', {
		userId: input.userId,
		externalAccountIds: preview.externalAccountIds,
	})

	return {
		ok: true,
		deletedUser: preview.user,
		impact: preview.impact,
	}
}
