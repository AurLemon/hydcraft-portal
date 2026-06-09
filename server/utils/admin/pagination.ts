import { getQuery } from 'h3'
import type { H3Event } from 'h3'

const clamp = (value: number, min: number, max: number): number =>
	Math.min(Math.max(value, min), max)

const parseNumber = (value: unknown, fallback: number): number => {
	if (typeof value !== 'string') {
		return fallback
	}

	const parsed = Number.parseInt(value, 10)

	return Number.isFinite(parsed) ? parsed : fallback
}

export const getPaginationQuery = (
	event: H3Event,
	options: {
		defaultPageSize?: number
		maxPageSize?: number
	} = {},
) => {
	const query = getQuery(event)
	const maxPageSize = options.maxPageSize ?? 100
	const pageSize = clamp(
		parseNumber(query.pageSize, options.defaultPageSize ?? 20),
		1,
		maxPageSize,
	)
	const page = Math.max(parseNumber(query.page, 1), 1)

	return {
		query,
		page,
		pageSize,
	}
}

export const getOptionalQueryString = (value: unknown): string | undefined =>
	typeof value === 'string' && value.trim() ? value.trim() : undefined

export const getSortDirection = (value: unknown): 'asc' | 'desc' | undefined =>
	value === 'asc' || value === 'desc' ? value : undefined
