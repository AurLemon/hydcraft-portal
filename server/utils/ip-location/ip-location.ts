import { existsSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Searcher } from 'ip2region.js'
import { parseIpAddressChain } from './ip-normalizer'

export interface IpLocationResult {
	raw: string | null
	country: string | null
	countryCode: string | null
	region: string | null
	province: string | null
	city: string | null
	district: string | null
	isp: string | null
	display: string | null
}

interface IpLocationSearchers {
	v4: Searcher | null
	v6: Searcher | null
}

interface Ip2RegionModule {
	IPv4: { id: number }
	IPv6: { id: number }
	parseIP(ip: string): Buffer
	versionFromHeader(header: unknown): { id: number; name: string } | null
	loadHeaderFromFile(dbPath: string): unknown
	loadContentFromFile(dbPath: string): Buffer
	newWithBuffer(version: unknown, content: Buffer): Searcher
}

const DB_BASE_DIR = 'ip2region'
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE_NAMES = {
	v4: ['ip2region_v4.xdb', 'ip2region.xdb'],
	v6: ['ip2region_v6.xdb'],
} as const

let ip2regionModule: Ip2RegionModule | null = null
let searchers: IpLocationSearchers = { v4: null, v6: null }
let initializing: Promise<void> | null = null
const locationCache = new Map<string, IpLocationResult | null>()

export const normalizeIpAddressForDisplay = (
	ipAddress: string | null | undefined,
): string | null => parseIpAddressChain(ipAddress).display

export const lookupIpLocation = async (
	ipAddress: string | null | undefined,
): Promise<IpLocationResult | null> => {
	const lookupIp = parseIpAddressChain(ipAddress).lookup

	if (!lookupIp) {
		return null
	}

	if (locationCache.has(lookupIp)) {
		return locationCache.get(lookupIp) ?? null
	}

	await ensureInitialized()

	if (!ip2regionModule) {
		locationCache.set(lookupIp, null)
		return null
	}

	try {
		const version =
			ip2regionModule.parseIP(lookupIp).length === 16 ? 'v6' : 'v4'
		const searcher = searchers[version]

		if (!searcher) {
			locationCache.set(lookupIp, null)
			return null
		}

		const regionText = toRegionString(
			await Promise.resolve(searcher.search(lookupIp)),
		)
		const result = regionText ? parseRegion(regionText) : null
		locationCache.set(lookupIp, result)

		return result
	} catch {
		locationCache.set(lookupIp, null)
		return null
	}
}

const ensureInitialized = async (): Promise<void> => {
	if (ip2regionModule && (searchers.v4 || searchers.v6)) {
		return
	}

	if (initializing) {
		await initializing
		return
	}

	initializing = initializeSearchers()

	try {
		await initializing
	} finally {
		initializing = null
	}
}

const initializeSearchers = async (): Promise<void> => {
	try {
		ip2regionModule = (await import('ip2region.js')) as Ip2RegionModule
		searchers = {
			v4: await createSearcher('v4', ip2regionModule),
			v6: await createSearcher('v6', ip2regionModule),
		}
	} catch {
		ip2regionModule = null
		searchers = { v4: null, v6: null }
	}
}

const createSearcher = async (
	version: keyof IpLocationSearchers,
	module: Ip2RegionModule,
): Promise<Searcher | null> => {
	const dbPath = await resolveDbPath(version)

	if (!dbPath) {
		return null
	}

	try {
		const header = module.loadHeaderFromFile(dbPath)
		const detectedVersion = module.versionFromHeader(header)

		if (!detectedVersion) {
			return null
		}

		const expectedId = version === 'v4' ? module.IPv4.id : module.IPv6.id
		const content = module.loadContentFromFile(dbPath)

		return module.newWithBuffer(
			detectedVersion.id === expectedId
				? detectedVersion
				: version === 'v4'
					? module.IPv4
					: module.IPv6,
			content,
		)
	} catch {
		return null
	}
}

const resolveDbPath = async (
	version: keyof IpLocationSearchers,
): Promise<string | null> => {
	const fileNames = DB_FILE_NAMES[version]
	const candidates = new Set<string>()
	const envSpecific =
		version === 'v4'
			? process.env.IP2REGION_V4_DB_PATH
			: process.env.IP2REGION_V6_DB_PATH
	const envGeneric = process.env.IP2REGION_DB_PATH

	const addCandidate = (candidate: string | null | undefined): void => {
		if (candidate) {
			candidates.add(candidate)
		}
	}

	addCandidate(envSpecific)

	if (envGeneric) {
		addCandidate(envGeneric)
		for (const fileName of fileNames) {
			addCandidate(path.join(envGeneric, fileName))
		}
	}

	for (const baseDir of getDbBaseDirs()) {
		for (const fileName of fileNames) {
			addCandidate(path.join(baseDir, fileName))
		}
	}

	for (const candidate of candidates) {
		if (isReadableFile(candidate)) {
			return candidate
		}
	}

	return await extractServerAsset(version)
}

const getDbBaseDirs = (): string[] => [
	path.resolve(process.cwd(), 'data', DB_BASE_DIR),
	path.resolve(process.cwd(), '.output', 'server', 'data', DB_BASE_DIR),
	path.resolve(process.cwd(), '..', 'data', DB_BASE_DIR),
	path.resolve(process.cwd(), '..', 'public', 'data', DB_BASE_DIR),
	path.resolve(CURRENT_DIR, '..', '..', 'data', DB_BASE_DIR),
	path.resolve(CURRENT_DIR, '..', '..', '..', 'data', DB_BASE_DIR),
]

const extractServerAsset = async (
	version: keyof IpLocationSearchers,
): Promise<string | null> => {
	const storage = useStorage<Buffer | Uint8Array | string>('assets')
	const targetDir = path.join(tmpdir(), 'hydcraft-portal-ip2region')

	for (const fileName of DB_FILE_NAMES[version]) {
		const asset = await storage.getItem(`${DB_BASE_DIR}/${fileName}`)

		if (!asset) {
			continue
		}

		const outputPath = path.join(targetDir, fileName)
		const buffer = Buffer.isBuffer(asset)
			? asset
			: typeof asset === 'string'
				? Buffer.from(asset, 'binary')
				: Buffer.from(asset)

		await mkdir(targetDir, { recursive: true })
		await writeFile(outputPath, new Uint8Array(buffer))

		if (isReadableFile(outputPath)) {
			return outputPath
		}
	}

	return null
}

const isReadableFile = (candidate: string): boolean => {
	try {
		return existsSync(candidate) && statSync(candidate).isFile()
	} catch {
		return false
	}
}

const parseRegion = (regionText: string): IpLocationResult => {
	const parts = regionText.split('|').map((part) => part.trim())
	let country: string | null = null
	const region: string | null = null
	let province: string | null = null
	let city: string | null = null
	let isp: string | null = null
	let countryCode: string | null = null

	const lastPart = normalizeRegionPart(parts.at(-1))
	const hasCountryCode = Boolean(lastPart?.match(/^[A-Z]{2}$/))
	const regionParts = hasCountryCode ? parts.slice(0, -1) : parts

	if (hasCountryCode) {
		countryCode = lastPart
	}

	if (regionParts.length >= 4) {
		country = normalizeRegionPart(regionParts[0])
		province = normalizeRegionPart(regionParts[1])
		city = normalizeRegionPart(regionParts[2])
		isp = normalizeRegionPart(regionParts[3])
	} else if (regionParts.length === 3) {
		country = normalizeRegionPart(regionParts[0])
		province = normalizeRegionPart(regionParts[1])
		city = normalizeRegionPart(regionParts[2])
	} else if (regionParts.length === 2) {
		country = normalizeRegionPart(regionParts[0])
		isp = normalizeRegionPart(regionParts[1])
	} else if (regionParts.length === 1) {
		isp = normalizeRegionPart(regionParts[0])
	}

	const district = region && region !== province ? region : null
	const locationPieces = formatLocationPieces({
		country,
		countryCode,
		province,
		city,
	})
	const base = locationPieces.join(' ')
	const display = base && isp ? `${base} ${isp}` : base || isp || null

	return {
		raw: regionText || null,
		country,
		countryCode,
		region,
		province,
		city,
		district,
		isp,
		display,
	}
}

const formatLocationPieces = ({
	country,
	countryCode,
	province,
	city,
}: Pick<
	IpLocationResult,
	'country' | 'countryCode' | 'province' | 'city'
>): string[] => {
	const isChina =
		countryCode === 'CN' || country === '中国' || country === 'China'
	const pieces = isChina ? [province, city] : [country, province, city]

	return dedupeLocationPieces(
		pieces.filter((part): part is string => Boolean(part)),
	)
}

const dedupeLocationPieces = (pieces: string[]): string[] => {
	const result: string[] = []

	for (const piece of pieces) {
		const previous = result.at(-1)

		if (previous && isSameLocationPart(previous, piece)) {
			result[result.length - 1] =
				piece.length >= previous.length ? piece : previous
			continue
		}

		result.push(piece)
	}

	return result
}

const isSameLocationPart = (left: string, right: string): boolean =>
	normalizeLocationPartForCompare(left) ===
	normalizeLocationPartForCompare(right)

const normalizeLocationPartForCompare = (part: string): string =>
	part
		.replace(
			/(省|市|特别行政区|自治区|壮族自治区|回族自治区|维吾尔自治区)$/u,
			'',
		)
		.trim()

const normalizeRegionPart = (
	part: string | null | undefined,
): string | null => {
	const value = part?.trim()

	if (!value || value === '0') {
		return null
	}

	return value
}

const toRegionString = (input: unknown): string | null => {
	if (typeof input === 'string') {
		return input
	}

	if (Buffer.isBuffer(input)) {
		return input.toString('utf8')
	}

	if (input instanceof Uint8Array) {
		return Buffer.from(input).toString('utf8')
	}

	if (Array.isArray(input)) {
		return input.map((value) => String(value ?? '')).join('|')
	}

	if (input && typeof input === 'object') {
		const record = input as Record<string, unknown>

		if (typeof record.region === 'string') {
			return record.region
		}

		if (typeof record.text === 'string') {
			return record.text
		}
	}

	return null
}
