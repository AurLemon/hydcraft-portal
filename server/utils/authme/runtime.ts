interface AuthMeVerificationConfig {
	enabled: boolean
	databaseUrl: string | null
	tableName: string
}

const readBooleanEnv = (value: string | undefined): boolean =>
	value === '1' || value?.toLowerCase() === 'true'

export const readAuthMeVerificationConfig = (): AuthMeVerificationConfig => {
	const databaseUrl =
		process.env.AUTHME_VERIFY_DATABASE_URL?.trim() ||
		process.env.AUTHME_DATABASE_URL?.trim() ||
		null
	const explicitEnabled = process.env.AUTHME_VERIFY_ENABLED

	return {
		enabled:
			explicitEnabled == null
				? Boolean(databaseUrl)
				: readBooleanEnv(explicitEnabled),
		databaseUrl,
		tableName: process.env.AUTHME_VERIFY_TABLE?.trim() || 'authme',
	}
}
