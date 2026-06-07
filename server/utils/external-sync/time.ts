export function parseUnixTimestamp(value: bigint | number | null | undefined) {
	if (value === null || value === undefined) {
		return null
	}

	const timestamp = Number(value)

	if (!Number.isFinite(timestamp) || timestamp <= 0) {
		return null
	}

	const milliseconds =
		timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp

	return new Date(milliseconds)
}

export function parseLuckPermsExpiry(value: bigint | number) {
	const timestamp = Number(value)

	if (!Number.isFinite(timestamp) || timestamp <= 0) {
		return null
	}

	return new Date(timestamp * 1000)
}
