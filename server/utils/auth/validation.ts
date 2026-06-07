import { createError } from 'h3'

export const normalizeHandle = (handle: string): string =>
	handle.trim().toLowerCase()

export const assertHandle = (handle: string): string => {
	const normalized = normalizeHandle(handle)

	if (!/^[a-z0-9_][a-z0-9_-]{2,31}$/.test(normalized)) {
		throw createError({
			statusCode: 400,
			statusMessage:
				'handle must be 3-32 characters and only contain lowercase letters, numbers, underscores, or hyphens',
		})
	}

	return normalized
}

export const assertPassword = (password: string): string => {
	if (password.length < 8) {
		throw createError({
			statusCode: 400,
			statusMessage: 'password must be at least 8 characters',
		})
	}

	return password
}

export const normalizeEmail = (
	email: string | null | undefined,
): string | null => {
	const normalized = email?.trim().toLowerCase()

	return normalized || null
}
