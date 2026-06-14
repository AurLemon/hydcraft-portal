type OAuthProxyBodyType = 'json' | 'text' | 'binary'

interface OAuthProxyPacket {
	ok: boolean
	status: number
	headers: Record<string, string>
	bodyType: OAuthProxyBodyType
	body: string
}

const readString = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() ? value.trim() : null

const getOAuthProxyConfig = (): {
	proxyUrl: string
	proxyKey: string
} | null => {
	const proxyUrl = readString(
		process.env.OAUTH_PROXY_URL ?? process.env.PROXY_URL,
	)
	const proxyKey = readString(
		process.env.OAUTH_PROXY_KEY ?? process.env.PROXY_KEY,
	)

	if (!proxyUrl || !proxyKey) {
		return null
	}

	return { proxyUrl, proxyKey }
}

const isOAuthProxyPacket = (value: unknown): value is OAuthProxyPacket => {
	if (!value || typeof value !== 'object') {
		return false
	}

	const packet = value as Partial<OAuthProxyPacket>

	return (
		typeof packet.status === 'number' && typeof packet.bodyType === 'string'
	)
}

const base64ToArrayBuffer = (value: string): ArrayBuffer => {
	const buffer = Buffer.from(value, 'base64')
	const arrayBuffer = new ArrayBuffer(buffer.byteLength)
	new Uint8Array(arrayBuffer).set(buffer)
	return arrayBuffer
}

const unwrapOAuthProxyResponse = async (
	response: Response,
): Promise<Response> => {
	const contentType = response.headers.get('content-type') ?? ''

	if (!contentType.includes('application/json')) {
		return response
	}

	let packet: unknown

	try {
		packet = await response.json()
	} catch {
		return response
	}

	if (!isOAuthProxyPacket(packet)) {
		return new Response(JSON.stringify(packet ?? null), {
			status: response.status,
			headers: response.headers,
		})
	}

	const headers = new Headers()

	for (const [key, value] of Object.entries(packet.headers ?? {})) {
		headers.set(key, value)
	}

	if (!headers.has('content-type')) {
		if (packet.bodyType === 'json') {
			headers.set('content-type', 'application/json')
		} else if (packet.bodyType === 'text') {
			headers.set('content-type', 'text/plain; charset=utf-8')
		}
	}

	if (packet.bodyType === 'binary') {
		return new Response(base64ToArrayBuffer(packet.body ?? ''), {
			status: packet.status,
			headers,
		})
	}

	return new Response(packet.body ?? '', {
		status: packet.status,
		headers,
	})
}

export const oauthProxyFetch = async (
	targetUrl: string,
	init: RequestInit,
	proxyEnabled: boolean,
): Promise<Response> => {
	const proxyConfig = getOAuthProxyConfig()

	if (!proxyEnabled || !proxyConfig) {
		return fetch(targetUrl, init)
	}

	const body = init.body
	const proxyBody = {
		url: targetUrl,
		method: init.method ?? 'GET',
		headers: init.headers ?? {},
		bodyType: body instanceof URLSearchParams ? 'form' : 'raw',
		body: body instanceof URLSearchParams ? body.toString() : body,
		key: proxyConfig.proxyKey,
	}

	const response = await fetch(proxyConfig.proxyUrl, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(proxyBody),
	})

	return unwrapOAuthProxyResponse(response)
}
