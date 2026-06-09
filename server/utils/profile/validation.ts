import { createError } from 'h3'
import type {
	TimezoneMode,
	UserProfileLanguage,
} from '~/generated/prisma/client'

const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SUPPORTED_LANGUAGES = new Set<UserProfileLanguage>([
	'ZH_CN',
	'ZH_TW',
	'EN_US',
	'JA_JP',
])
const SUPPORTED_TIMEZONES = new Set([
	'Asia/Shanghai',
	'Asia/Singapore',
	'Asia/Tokyo',
	'UTC',
])
const SUPPORTED_TIMEZONE_MODES = new Set<TimezoneMode>(['AUTO', 'MANUAL'])
const SUPPORTED_COUNTRIES_OR_REGIONS = new Set([
	'中国内地',
	'中国香港',
	'中国台湾',
	'中国澳门',
	'海外地区',
])

const badRequest = (message: string) =>
	createError({
		statusCode: 400,
		statusMessage: message,
	})

export const normalizeOptionalText = (
	value: unknown,
	maxLength: number,
	fieldName: string,
): string | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (value === null) {
		return null
	}

	if (typeof value !== 'string') {
		throw badRequest(`${fieldName} must be a string`)
	}

	const normalized = value.trim()

	if (!normalized) {
		return null
	}

	if (normalized.length > maxLength) {
		throw badRequest(`${fieldName} is too long`)
	}

	return normalized
}

export const normalizeRequiredText = (
	value: unknown,
	maxLength: number,
	fieldName: string,
): string | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'string') {
		throw badRequest(`${fieldName} must be a string`)
	}

	const normalized = value.trim()

	if (!normalized) {
		throw badRequest(`${fieldName} is required`)
	}

	if (normalized.length > maxLength) {
		throw badRequest(`${fieldName} is too long`)
	}

	return normalized
}

export const normalizeUsername = (value: unknown): string | undefined => {
	const username = normalizeRequiredText(value, 24, 'username')

	if (username === undefined) {
		return undefined
	}

	if (username.length < 3) {
		throw badRequest('username is too short')
	}

	if (!USERNAME_PATTERN.test(username)) {
		throw badRequest('username contains invalid characters')
	}

	return username.toLowerCase()
}

export const normalizeDisplayName = (value: unknown): string | undefined =>
	normalizeRequiredText(value, 32, 'displayName')

export const normalizeBio = (value: unknown): string | null | undefined =>
	normalizeOptionalText(value, 300, 'bio')

export const normalizeCountryOrRegion = (
	value: unknown,
): string | null | undefined => {
	const countryOrRegion = normalizeOptionalText(value, 80, 'countryOrRegion')

	if (countryOrRegion && !SUPPORTED_COUNTRIES_OR_REGIONS.has(countryOrRegion)) {
		throw badRequest('countryOrRegion is invalid')
	}

	return countryOrRegion
}

export const normalizeBirthday = (value: unknown): Date | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (value === null || value === '') {
		return null
	}

	if (typeof value !== 'string') {
		throw badRequest('birthday must be a date string')
	}

	const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)

	if (Number.isNaN(date.getTime())) {
		throw badRequest('birthday is invalid')
	}

	return date
}

export const normalizeLanguage = (
	value: unknown,
): UserProfileLanguage | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (
		typeof value !== 'string' ||
		!SUPPORTED_LANGUAGES.has(value as UserProfileLanguage)
	) {
		throw badRequest('language is invalid')
	}

	return value as UserProfileLanguage
}

export const normalizeTimezoneMode = (
	value: unknown,
): TimezoneMode | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (
		typeof value !== 'string' ||
		!SUPPORTED_TIMEZONE_MODES.has(value as TimezoneMode)
	) {
		throw badRequest('timezoneMode is invalid')
	}

	return value as TimezoneMode
}

export const normalizeTimezone = (
	value: unknown,
): string | null | undefined => {
	const timezone = normalizeOptionalText(value, 64, 'timezone')

	if (timezone && !SUPPORTED_TIMEZONES.has(timezone)) {
		throw badRequest('timezone is invalid')
	}

	return timezone
}

export const normalizeUrl = (
	value: unknown,
	fieldName: string,
	allowedHosts?: string[],
): string | null | undefined => {
	const normalized = normalizeOptionalText(value, 255, fieldName)

	if (!normalized) {
		return normalized
	}

	let url: URL

	try {
		url = new URL(normalized)
	} catch {
		throw badRequest('请输入有效链接')
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw badRequest('请输入有效链接')
	}

	if (
		allowedHosts?.length &&
		!allowedHosts.some(
			(host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
		)
	) {
		throw badRequest('请输入有效链接')
	}

	return url.toString()
}

export const normalizePublicEmail = (
	value: unknown,
): string | null | undefined => {
	const email = normalizeOptionalText(value, 254, 'publicEmail')

	if (email && !EMAIL_PATTERN.test(email)) {
		throw badRequest('请输入有效邮箱地址')
	}

	return email
}

export const normalizeBoolean = (
	value: unknown,
	fieldName: string,
): boolean | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (typeof value !== 'boolean') {
		throw badRequest(`${fieldName} must be a boolean`)
	}

	return value
}
