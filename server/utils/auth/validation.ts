import { createBadRequestError } from '../errors'

export const normalizeHandle = (handle: string): string =>
	handle.trim().toLowerCase()

export const assertHandle = (handle: string): string => {
	const normalized = normalizeHandle(handle)

	if (!/^[a-z0-9_][a-z0-9_-]{2,31}$/.test(normalized)) {
		throw createBadRequestError('HANDLE_INVALID')
	}

	return normalized
}

export const assertPassword = (password: string): string => {
	if (password.length < 8) {
		throw createBadRequestError('PASSWORD_TOO_SHORT')
	}

	return password
}

export const normalizeEmail = (
	email: string | null | undefined,
): string | null => {
	const normalized = email?.trim().toLowerCase()

	return normalized || null
}
