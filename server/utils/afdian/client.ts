import { createHash } from 'node:crypto'
import { getAfdianRuntimeConfig, isAfdianRuntimeConfigured } from './runtime'

interface AfdianApiEnvelope<T> {
	ec?: number
	em?: string
	data?: T
}

interface AfdianSponsorItem {
	user_id?: string
	name?: string
	all_sum_amount?: string | number
	last_pay_time?: number | string
}

interface AfdianSponsorResponseData {
	list?: AfdianSponsorItem[]
	total_count?: number
	total_page?: number
	current_page?: number
}

interface AfdianOrderItem {
	out_trade_no?: string
	show_amount?: string | number
	total_amount?: string | number
	create_time?: number | string
}

interface AfdianOrderResponseData {
	list?: AfdianOrderItem[]
	total_count?: number
	total_page?: number
	current_page?: number
}

export interface AfdianSponsorStatsSnapshot {
	supporterCount: number
	totalAmount: string
	currency: 'CNY'
	asOfDate: string
	sponsorPageUrl: string
}

const DEFAULT_SPONSOR_PAGE_URL = 'https://afdian.com/a/HydCraft'

const toErrorMessage = (error: unknown): string => {
	return error instanceof Error ? error.message : String(error)
}

const toPositiveInteger = (value: unknown): number | null => {
	const numberValue = Number(value)
	if (!Number.isInteger(numberValue) || numberValue <= 0) {
		return null
	}

	return numberValue
}

const toFiniteAmount = (value: unknown): number => {
	const numberValue = Number(value)
	return Number.isFinite(numberValue) ? numberValue : 0
}

const toISOStringFromTimestamp = (value: unknown): string | null => {
	const timestamp = Number(value)
	if (!Number.isFinite(timestamp) || timestamp <= 0) {
		return null
	}

	const milliseconds =
		timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000
	return new Date(milliseconds).toISOString()
}

const formatAmount = (value: number): string => {
	return value.toFixed(2)
}

const createSignature = (options: {
	apiKey: string
	userId: string
	params: string
	ts: number
}): string => {
	return createHash('md5')
		.update(
			`${options.apiKey}params${options.params}ts${options.ts}user_id${options.userId}`,
		)
		.digest('hex')
}

const postAfdian = async <T>(options: {
	endpoint: '/api/open/query-sponsor' | '/api/open/query-order'
	params: Record<string, unknown>
}): Promise<T> => {
	const config = getAfdianRuntimeConfig()

	if (!isAfdianRuntimeConfigured(config)) {
		throw new Error('AFDIAN_RUNTIME_NOT_CONFIGURED')
	}

	const params = JSON.stringify(options.params)
	const ts = Math.floor(Date.now() / 1000)
	const sign = createSignature({
		apiKey: config.apiKey!,
		userId: config.userId!,
		params,
		ts,
	})
	const body = new URLSearchParams({
		user_id: config.userId!,
		params,
		ts: String(ts),
		sign,
	})
	const response = await $fetch<AfdianApiEnvelope<T>>(
		`${config.baseUrl}${options.endpoint}`,
		{
			method: 'POST',
			body: body.toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
			},
			timeout: 15_000,
			retry: 1,
		},
	)

	if (!response || response.ec !== 200 || !response.data) {
		throw new Error(response?.em || `AFDIAN_REQUEST_FAILED:${options.endpoint}`)
	}

	return response.data
}

const fetchSponsorPage = async (
	page: number,
): Promise<AfdianSponsorResponseData> => {
	return await postAfdian<AfdianSponsorResponseData>({
		endpoint: '/api/open/query-sponsor',
		params: { page },
	})
}

const fetchOrderPage = async (
	page: number,
): Promise<AfdianOrderResponseData> => {
	return await postAfdian<AfdianOrderResponseData>({
		endpoint: '/api/open/query-order',
		params: { page },
	})
}

const collectPagedData = async <T>(options: {
	loader: (page: number) => Promise<{
		list?: T[]
		total_count?: number
		total_page?: number
		current_page?: number
	}>
}): Promise<{
	items: T[]
	totalCount: number
	totalPages: number
}> => {
	const firstPage = await options.loader(1)
	const items = [...(firstPage.list ?? [])]
	const totalCount = Math.max(
		0,
		Number(firstPage.total_count ?? items.length) || 0,
	)
	const totalPages =
		toPositiveInteger(firstPage.total_page) ??
		(totalCount > items.length && items.length > 0
			? Math.ceil(totalCount / items.length)
			: 1)

	for (let page = 2; page <= totalPages; page += 1) {
		const currentPage = await options.loader(page)
		items.push(...(currentPage.list ?? []))
	}

	return {
		items,
		totalCount,
		totalPages,
	}
}

export const fetchAfdianSponsorStats =
	async (): Promise<AfdianSponsorStatsSnapshot> => {
		try {
			const [sponsors, orders] = await Promise.all([
				collectPagedData({
					loader: fetchSponsorPage,
				}),
				collectPagedData({
					loader: fetchOrderPage,
				}),
			])

			const latestSponsorPaidAt =
				sponsors.items
					.map((item) => toISOStringFromTimestamp(item.last_pay_time))
					.filter((value): value is string => Boolean(value))
					.sort((left, right) => right.localeCompare(left))[0] ??
				new Date().toISOString()
			const totalAmount = orders.items.reduce((sum, item) => {
				const amount =
					toFiniteAmount(item.show_amount) || toFiniteAmount(item.total_amount)
				return sum + amount
			}, 0)

			return {
				supporterCount: sponsors.totalCount,
				totalAmount: formatAmount(totalAmount),
				currency: 'CNY',
				asOfDate: latestSponsorPaidAt,
				sponsorPageUrl: DEFAULT_SPONSOR_PAGE_URL,
			}
		} catch (error) {
			throw new Error(`AFDIAN_STATS_FETCH_FAILED:${toErrorMessage(error)}`)
		}
	}
