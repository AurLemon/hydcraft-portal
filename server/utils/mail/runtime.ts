import { getPublicSiteOrigin } from '../runtime/site-url'

export interface MailRuntimeConfig {
	enabled: boolean
	host: string | null
	port: number | null
	secure: boolean
	user: string | null
	pass: string | null
	from: string
	replyTo: string | null
	siteUrl: string
}

const parseBoolean = (
	value: string | null | undefined,
	defaultValue: boolean,
): boolean => {
	if (value === undefined || value === null || value.trim() === '') {
		return defaultValue
	}

	return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

const parsePort = (value: string | null | undefined): number | null => {
	const port = Number(value)

	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		return null
	}

	return port
}

const trimOptional = (value: string | null | undefined): string | null => {
	const normalized = value?.trim()
	return normalized ? normalized : null
}

export const getMailRuntimeConfig = (): MailRuntimeConfig => {
	const host = trimOptional(process.env.MAIL_SMTP_HOST)
	const port = parsePort(process.env.MAIL_SMTP_PORT)
	const user = trimOptional(process.env.MAIL_SMTP_USER)
	const pass = trimOptional(process.env.MAIL_SMTP_PASSWORD)
	const secure = parseBoolean(process.env.MAIL_SMTP_SECURE, port === 465)
	const enabled = parseBoolean(process.env.MAIL_ENABLED, true)

	return {
		enabled,
		host,
		port,
		secure,
		user,
		pass,
		from:
			trimOptional(process.env.MAIL_FROM) ??
			'HydCraft <no-reply@hydcraft.local>',
		replyTo: trimOptional(process.env.MAIL_REPLY_TO),
		siteUrl: getPublicSiteOrigin(),
	}
}

export const isMailRuntimeConfigured = (
	config = getMailRuntimeConfig(),
): boolean =>
	Boolean(
		config.enabled &&
		config.host &&
		config.port &&
		config.user &&
		config.pass &&
		config.from,
	)
