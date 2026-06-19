import { createHash, timingSafeEqual } from 'node:crypto'

const sha256 = (value: string): Buffer =>
	createHash('sha256').update(value, 'utf8').digest()

interface AuthMePasswordSegments {
	algorithm: string
	salt: string
	hash: string
}

const normalizePasswordSegments = (
	storedPassword: string | null | undefined,
): AuthMePasswordSegments | null => {
	if (!storedPassword?.startsWith('$')) {
		return null
	}

	const parts = storedPassword.split('$')

	if (parts.length < 4) {
		return null
	}

	const [, algorithm, salt, hash] = parts

	if (!algorithm || !salt || !hash) {
		return null
	}

	return {
		algorithm: algorithm.toUpperCase(),
		salt,
		hash,
	}
}

export const verifyAuthMeShaPassword = (
	storedPassword: string | null | undefined,
	plainPassword: string,
): boolean => {
	const segments = normalizePasswordSegments(storedPassword)

	if (!segments || segments.algorithm !== 'SHA') {
		return false
	}

	const stageOneHex = sha256(plainPassword).toString('hex')
	const stageTwoHex = sha256(`${stageOneHex}${segments.salt}`).toString('hex')
	const candidate = new Uint8Array(Buffer.from(stageTwoHex, 'utf8'))
	const expected = new Uint8Array(Buffer.from(segments.hash, 'utf8'))

	try {
		return timingSafeEqual(candidate, expected)
	} catch {
		return false
	}
}
