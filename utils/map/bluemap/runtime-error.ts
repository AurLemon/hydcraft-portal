import type { BlueMapErrorEventPayload } from './types'

export class BlueMapRuntimeError extends Error {
	readonly code: BlueMapErrorEventPayload['code']

	constructor(
		message: string,
		code: BlueMapErrorEventPayload['code'] = 'WEBAPP_RUNTIME_UNAVAILABLE',
	) {
		super(message)
		this.name = 'BlueMapRuntimeError'
		this.code = code
	}
}
