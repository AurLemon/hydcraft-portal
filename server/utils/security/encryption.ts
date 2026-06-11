import {
	createCipheriv,
	createDecipheriv,
	createSecretKey,
	randomBytes,
	scryptSync,
} from 'node:crypto'
import { createApiError } from '../errors'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16

const getEncryptionKey = (): ReturnType<typeof createSecretKey> => {
	const secret = process.env.CONFIG_ENCRYPTION_KEY

	if (!secret) {
		throw createApiError({
			statusCode: 500,
			code: 'CONFIG_ENCRYPTION_KEY_MISSING',
		})
	}

	return createSecretKey(
		Uint8Array.from(scryptSync(secret, 'hydcraft-portal-config', 32)),
	)
}

export const encryptConfigValue = (
	value: string | null | undefined,
): string | null => {
	if (!value) {
		return null
	}

	const iv = Uint8Array.from(randomBytes(IV_BYTES))
	const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv, {
		authTagLength: TAG_BYTES,
	})
	const ciphertext = `${cipher.update(value, 'utf8', 'base64url')}${cipher.final(
		'base64url',
	)}`
	const tag = cipher.getAuthTag().toString('base64url')

	return [Buffer.from(iv).toString('base64url'), tag, ciphertext].join('.')
}

export const decryptConfigValue = (
	encrypted: string | null | undefined,
): string | null => {
	if (!encrypted) {
		return null
	}

	const [ivText, tagText, ciphertextText] = encrypted.split('.')

	if (!ivText || !tagText || !ciphertextText) {
		throw createApiError({
			statusCode: 500,
			code: 'ENCRYPTED_CONFIG_MALFORMED',
		})
	}

	const decipher = createDecipheriv(
		ALGORITHM,
		getEncryptionKey(),
		Uint8Array.from(Buffer.from(ivText, 'base64url')),
		{
			authTagLength: TAG_BYTES,
		},
	)
	decipher.setAuthTag(Uint8Array.from(Buffer.from(tagText, 'base64url')))

	return `${decipher.update(ciphertextText, 'base64url', 'utf8')}${decipher.final(
		'utf8',
	)}`
}
