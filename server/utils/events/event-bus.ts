type EventHandler<TPayload> = (payload: TPayload) => Promise<void> | void

interface EventMap {
	'server-player-identity-evidence.created': {
		serverId: string
		uuid?: string | null
		username?: string | null
		normalizedUsername?: string | null
		uuidSource?: string | null
		observedAt: Date
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
