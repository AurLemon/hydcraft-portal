import { getRequestIP, type H3Event } from 'h3'

export interface IpAddressChain {
	items: string[]
	lookup: string | null
	display: string | null
}

const normalizeSingleIpAddress = (ip: string): string | null => {
	const trimmed = ip.trim()

	if (!trimmed) {
		return null
	}

	const lower = trimmed.toLowerCase()
	const dottedMatch = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)

	if (dottedMatch) {
		return dottedMatch[1] ?? null
	}

	const hexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)

	if (hexMatch?.[1] && hexMatch[2]) {
		const high = Number.parseInt(hexMatch[1], 16)
		const low = Number.parseInt(hexMatch[2], 16)

		if (Number.isFinite(high) && Number.isFinite(low)) {
			return [
				(high >> 8) & 0xff,
				high & 0xff,
				(low >> 8) & 0xff,
				low & 0xff,
			].join('.')
		}
	}

	return trimmed
}

export const parseIpAddressChain = (
	value: string | null | undefined,
): IpAddressChain => {
	const items = (value ?? '')
		.split('|||')
		.flatMap((part) => part.split(','))
		.map((part) => normalizeSingleIpAddress(part))
		.filter((part): part is string => Boolean(part))

	return {
		items,
		lookup: items[0] ?? null,
		display: items.length ? items.join(' / ') : null,
	}
}

export const getClientIpAddress = (event: H3Event): string | null => {
	const rawIp = getRequestIP(event, { xForwardedFor: true }) ?? null

	return parseIpAddressChain(rawIp).display
}
