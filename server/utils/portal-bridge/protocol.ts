import { createHmac, randomUUID } from 'node:crypto'

export type PortalBridgeEnvelopeType =
	| 'hello'
	| 'event'
	| 'snapshot'
	| 'command'
	| 'ack'
	| 'error'

export interface PortalBridgeEndpoint {
	serverId?: string
	bridgeId?: string
	module?: string
	service?: string
}

export interface PortalBridgeEnvelope<TPayload = unknown> {
	v: number
	id: string
	type: PortalBridgeEnvelopeType
	topic: string
	source: PortalBridgeEndpoint
	target?: PortalBridgeEndpoint
	seq?: number
	observedAt: string
	sentAt?: string
	requiresAck?: boolean
	payload: TPayload
}

export interface BridgeHelloPayload {
	bridgeVersion: string
	protocolVersion: number
	minecraftVersion: string | null
	loader: string
	capabilities: string[]
	requestedTopics: string[]
	resumeFromSeq: number
	timestamp: number
	nonce: string
	signature: string
}

export interface BridgeAckPayload {
	messageId: string
	seq?: number
	topic: string
	acknowledgedAt: string
}

export interface CommandRequestPayload {
	commandId: string
	action: string
	args?: Record<string, unknown>
}

export const PORTAL_BRIDGE_PROTOCOL_VERSION = 1

export const DEFAULT_REQUESTED_TOPICS = [
	'bridge.heartbeat',
	'bridge.metrics',
	'mc.server.info.snapshot',
	'mc.server.status.snapshot',
	'mc.server.worlds.snapshot',
	'mc.player.online.snapshot',
	'mc.player.snapshot',
	'mc.player.identity.observed',
	'mc.player.join',
	'mc.player.quit',
	'mc.player.session.opened',
	'mc.player.session.closed',
]

export const COMMAND_ACTIONS = [
	'bridge.ping',
	'sync.serverInfo.now',
	'sync.serverStatus.now',
	'sync.onlinePlayers.now',
	'sync.players.now',
	'sync.worlds.now',
	'sync.playerdata.now',
	'sync.stats.now',
	'sync.advancements.now',
] as const

export type PortalBridgeCommandAction = (typeof COMMAND_ACTIONS)[number]

export const isPortalBridgeCommandAction = (
	action: string,
): action is PortalBridgeCommandAction =>
	COMMAND_ACTIONS.includes(action as PortalBridgeCommandAction)

export const signBridgeHello = (input: {
	serverId: string
	bridgeId: string
	module: string
	protocolVersion: number
	timestamp: number
	nonce: string
	secret: string
}): string => {
	const signingPayload = [
		input.serverId,
		input.bridgeId,
		input.module,
		String(input.protocolVersion),
		String(input.timestamp),
		input.nonce,
	].join('\n')

	return createHmac('sha256', input.secret).update(signingPayload).digest('hex')
}

export const createBridgeHelloEnvelope = (input: {
	serverId: string
	bridgeId: string
	module: string
	secret: string
	requestedTopics: string[]
	resumeFromSeq: number
}): PortalBridgeEnvelope<BridgeHelloPayload> => {
	const timestamp = Date.now()
	const nonce = randomUUID()
	const signature = signBridgeHello({
		serverId: input.serverId,
		bridgeId: input.bridgeId,
		module: input.module,
		protocolVersion: PORTAL_BRIDGE_PROTOCOL_VERSION,
		timestamp,
		nonce,
		secret: input.secret,
	})

	return {
		v: PORTAL_BRIDGE_PROTOCOL_VERSION,
		id: randomUUID(),
		type: 'hello',
		topic: 'bridge.hello',
		source: {
			service: 'portal',
			module: 'portal-backend',
		},
		target: {
			serverId: input.serverId,
			bridgeId: input.bridgeId,
			module: input.module,
		},
		observedAt: new Date().toISOString(),
		sentAt: new Date().toISOString(),
		payload: {
			bridgeVersion: 'hydcraft-portal',
			protocolVersion: PORTAL_BRIDGE_PROTOCOL_VERSION,
			minecraftVersion: null,
			loader: 'portal-backend',
			capabilities: ['portal.bridge.ingestion'],
			requestedTopics: input.requestedTopics,
			resumeFromSeq: input.resumeFromSeq,
			timestamp,
			nonce,
			signature,
		},
	}
}

export const createAckEnvelope = (
	source: PortalBridgeEndpoint,
	target: PortalBridgeEndpoint,
	payload: BridgeAckPayload,
): PortalBridgeEnvelope<BridgeAckPayload> => ({
	v: PORTAL_BRIDGE_PROTOCOL_VERSION,
	id: randomUUID(),
	type: 'ack',
	topic: 'bridge.ack',
	source,
	target,
	observedAt: new Date().toISOString(),
	sentAt: new Date().toISOString(),
	payload,
})

export const createCommandEnvelope = (input: {
	serverId: string
	bridgeId: string
	module: string
	action: PortalBridgeCommandAction
	commandId: string
	args?: Record<string, unknown>
}): PortalBridgeEnvelope<CommandRequestPayload> => ({
	v: PORTAL_BRIDGE_PROTOCOL_VERSION,
	id: randomUUID(),
	type: 'command',
	topic: 'command.request',
	source: {
		service: 'portal',
		module: 'portal-backend',
	},
	target: {
		serverId: input.serverId,
		bridgeId: input.bridgeId,
		module: input.module,
	},
	observedAt: new Date().toISOString(),
	sentAt: new Date().toISOString(),
	payload: {
		commandId: input.commandId,
		action: input.action,
		args: input.args,
	},
})
