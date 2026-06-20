import type {
	TimezoneMode,
	UserGender,
	UserProfileLanguage,
} from '~/generated/prisma/client'
import { createBadRequestError } from '../errors'

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
const SUPPORTED_GENDERS = new Set<UserGender>(['UNSPECIFIED', 'MALE', 'FEMALE'])
const SUPPORTED_COUNTRIES_OR_REGIONS = new Set([
	'中国内地',
	'中国香港',
	'中国台湾',
	'中国澳门',
	'海外地区',
])

const badRequest = (code: string) => createBadRequestError(code)

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
		throw badRequest('INVALID_FIELD_TYPE')
	}

	const normalized = value.trim()

	if (!normalized) {
		return null
	}

	if (normalized.length > maxLength) {
		throw badRequest('FIELD_TOO_LONG')
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
		throw badRequest('INVALID_FIELD_TYPE')
	}

	const normalized = value.trim()

	if (!normalized) {
		throw badRequest('FIELD_REQUIRED')
	}

	if (normalized.length > maxLength) {
		throw badRequest('FIELD_TOO_LONG')
	}

	return normalized
}

export const normalizeUsername = (value: unknown): string | undefined => {
	const username = normalizeRequiredText(value, 24, 'username')

	if (username === undefined) {
		return undefined
	}

	if (username.length < 3) {
		throw badRequest('USERNAME_TOO_SHORT')
	}

	if (!USERNAME_PATTERN.test(username)) {
		throw badRequest('USERNAME_INVALID_CHARACTERS')
	}

	return username
}

export const normalizeUsernameForComparison = (username: string): string =>
	username.toLowerCase()

export const normalizeDisplayName = (value: unknown): string | undefined =>
	normalizeRequiredText(value, 32, 'displayName')

export const normalizeBio = (value: unknown): string | null | undefined =>
	normalizeOptionalText(value, 300, 'bio')

export const normalizeSchoolOrCompany = (
	value: unknown,
): string | null | undefined =>
	normalizeOptionalText(value, 120, 'schoolOrCompany')

export const normalizeOccupationOrMajor = (
	value: unknown,
): string | null | undefined =>
	normalizeOptionalText(value, 120, 'occupationOrMajor')

export const normalizeCountryOrRegion = (
	value: unknown,
): string | null | undefined => {
	const countryOrRegion = normalizeOptionalText(value, 80, 'countryOrRegion')

	if (countryOrRegion && !SUPPORTED_COUNTRIES_OR_REGIONS.has(countryOrRegion)) {
		throw badRequest('COUNTRY_OR_REGION_INVALID')
	}

	return countryOrRegion
}

export const normalizeGender = (value: unknown): UserGender | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (
		typeof value !== 'string' ||
		!SUPPORTED_GENDERS.has(value as UserGender)
	) {
		throw badRequest('GENDER_INVALID')
	}

	return value as UserGender
}

export const normalizeBirthday = (value: unknown): Date | null | undefined => {
	if (value === undefined) {
		return undefined
	}

	if (value === null || value === '') {
		return null
	}

	if (typeof value !== 'string') {
		throw badRequest('BIRTHDAY_INVALID')
	}

	const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)

	if (Number.isNaN(date.getTime())) {
		throw badRequest('BIRTHDAY_INVALID')
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
		throw badRequest('LANGUAGE_INVALID')
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
		throw badRequest('TIMEZONE_MODE_INVALID')
	}

	return value as TimezoneMode
}

export const normalizeTimezone = (
	value: unknown,
): string | null | undefined => {
	const timezone = normalizeOptionalText(value, 64, 'timezone')

	if (timezone && !SUPPORTED_TIMEZONES.has(timezone)) {
		throw badRequest('TIMEZONE_INVALID')
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
		throw badRequest('URL_INVALID')
	}

	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw badRequest('URL_INVALID')
	}

	if (
		allowedHosts?.length &&
		!allowedHosts.some(
			(host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
		)
	) {
		throw badRequest('URL_INVALID')
	}

	return url.toString()
}

export const normalizePublicEmail = (
	value: unknown,
): string | null | undefined => {
	const email = normalizeOptionalText(value, 254, 'publicEmail')

	if (email && !EMAIL_PATTERN.test(email)) {
		throw badRequest('EMAIL_INVALID')
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
		throw badRequest('INVALID_FIELD_TYPE')
	}

	return value
}
