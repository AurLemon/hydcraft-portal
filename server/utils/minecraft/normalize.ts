export const normalizeMinecraftUsername = (
	username: string | null | undefined,
): string | null => {
	const normalized = username?.trim().toLowerCase()

	return normalized || null
}

export const assertMinecraftServerId = (serverId: string): string => {
	const value = serverId.trim()

	if (!/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(value)) {
		throw new Error(
			'serverId must be 3-64 lowercase letters, numbers, or hyphens',
		)
	}

	return value
}
