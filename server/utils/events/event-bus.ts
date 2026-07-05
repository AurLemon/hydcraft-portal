type EventHandler<TPayload> = (payload: TPayload) => Promise<void> | void

interface EventMap {
	'user.auth-activity.observed': {
		userId: string
		observedAt: Date
		source: 'LOGIN' | 'REFRESH' | 'AUTHENTICATED_REQUEST'
	}
	'server-player-identity-evidence.created': {
		serverId: string
		uuid?: string | null
		username?: string | null
		normalizedUsername?: string | null
		uuidSource?: string | null
		observedAt: Date
	}
	'server-player.authme-synced': {
		serverId: string
		uuid?: string | null
		playerId: string
		syncedAt: Date
	}
	'server-player.luckperms-synced': {
		serverId: string
		uuid: string
		playerId: string
		syncedAt: Date
	}
	'server-player.playerdata-synced': {
		serverId: string
		uuid: string
		playerId: string
		syncedAt: Date
	}
	'server-player.stats-synced': {
		serverId: string
		uuid: string
		playerId: string
		snapshotId: string
		observedAt: Date
	}
	'server-player.advancements-synced': {
		serverId: string
		uuid: string
		playerId: string
		snapshotId: string
		observedAt: Date
	}
	'minecraft-server.portal-bridge-config.saved': {
		configId: string
	}
	'user.profile.updated': {
		userId: string
		changedFields: string[]
		updatedAt: Date
	}
	'user.profile.avatar-updated': {
		userId: string
		avatarUrl: string | null
		updatedAt: Date
	}
	'user.profile.cover-updated': {
		userId: string
		coverUrl: string | null
		updatedAt: Date
	}
	'user.profile.attachment-replaced': {
		userId: string
		purpose: 'user-avatar' | 'user-cover' | 'external-account-avatar'
		activeAttachmentId: string | null
		updatedAt: Date
	}
	'user.profile.username-changed': {
		userId: string
		previousUsername: string
		nextUsername: string
		updatedAt: Date
	}
	'user.profile.privacy-updated': {
		userId: string
		changedFields: string[]
		updatedAt: Date
	}
	'user.security-event.created': {
		userId: string
		type: string
		createdAt: Date
	}
	'user.email.verification-requested': {
		userId: string
		email: string
		purpose: string
		code?: string
		token?: string
		locale: string
		expiresAt?: Date
		createdAt: Date
	}
	'auth.password-reset.requested': {
		userId: string
		email: string
		displayName: string | null
		handle: string
		locale: string | null
		requestedAt: Date
	}
	'user.oauth.linked': {
		userId: string
		provider: string
		providerAccountId: string
		externalAccountId: string
		updatedAt: Date
	}
	'user.oauth.attachment-replaced': {
		userId: string
		externalAccountId: string
		activeAttachmentId: string | null
		updatedAt: Date
	}
	'user.oauth.unlinked': {
		userId: string
		provider: string
		externalAccountId: string
		avatarAttachmentId: string | null
		avatarUrl: string | null
		updatedAt: Date
	}
	'minecraft.account.bound': {
		userId: string
		minecraftAccountId: string
		occurredAt: Date
	}
	'minecraft.account.primary-set': {
		userId: string
		minecraftAccountId: string
		occurredAt: Date
	}
	'minecraft.account.unbound': {
		userId: string
		minecraftAccountId: string
		occurredAt: Date
	}
	'user.registered': {
		userId: string
		occurredAt: Date
	}
	'partner.created': {
		partnerId: string
		actorUserId: string
		createdAt: Date
	}
	'partner.updated': {
		partnerId: string
		actorUserId: string
		changedFields: string[]
		updatedAt: Date
	}
	'partner.attachment-replaced': {
		partnerId: string
		purpose: 'partner-avatar' | 'partner-cover'
		activeAttachmentId: string | null
		updatedAt: Date
	}
	'partner.editor-assigned': {
		partnerId: string
		userId: string
		actorUserId: string
		createdAt: Date
	}
	'partner.editor-revoked': {
		partnerId: string
		userId: string
		actorUserId: string
		revokedAt: Date
	}
	'partner.core-members-synced': {
		partnerId: string
		userIds: string[]
		actorUserId: string
		occurredAt: Date
	}
	'partner.reordered': {
		section: 'COMMUNITY' | 'SUPPORT_ACKNOWLEDGEMENTS'
		actorUserId: string
		orderedIds: string[]
		occurredAt: Date
	}
	'friend-link.created': {
		linkId: string
		actorUserId: string
		createdAt: Date
	}
	'friend-link.updated': {
		linkId: string
		actorUserId: string
		changedFields: string[]
		updatedAt: Date
	}
	'friend-link.deleted': {
		linkId: string
		actorUserId: string
		deletedAt: Date
	}
	'friend-link.reordered': {
		category: 'BUSINESS' | 'PERSONAL' | 'ORGANIZATION'
		actorUserId: string
		orderedIds: string[]
		occurredAt: Date
	}
	'friend-link.application.draft-created': {
		applicationId: string
		applicantUserId: string
		createdAt: Date
	}
	'friend-link.application.submitted': {
		applicationId: string
		applicantUserId: string
		submittedAt: Date
	}
	'friend-link.application.reviewed': {
		applicationId: string
		reviewerUserId: string
		status: 'APPROVED' | 'REJECTED'
		reviewedAt: Date
	}
	'friend-link.application.expired': {
		applicationId: string
		previousStatus: 'DRAFT' | 'PENDING_REVIEW'
		expiredAt: Date
	}
}

const handlers = new Map<
	keyof EventMap,
	EventHandler<EventMap[keyof EventMap]>[]
>()

export const onEvent = <TEvent extends keyof EventMap>(
	event: TEvent,
	handler: EventHandler<EventMap[TEvent]>,
): void => {
	const eventHandlers = handlers.get(event) ?? []
	eventHandlers.push(handler as EventHandler<EventMap[keyof EventMap]>)
	handlers.set(event, eventHandlers)
}

export const emitEvent = async <TEvent extends keyof EventMap>(
	event: TEvent,
	payload: EventMap[TEvent],
): Promise<void> => {
	for (const handler of handlers.get(event) ?? []) {
		await handler(payload)
	}
}
