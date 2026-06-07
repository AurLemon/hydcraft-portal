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
