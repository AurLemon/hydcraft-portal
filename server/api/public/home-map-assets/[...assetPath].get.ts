import { createError, getRouterParam } from 'h3'
import { defaultHomeImmersiveScene } from '~/utils/home/immersive-scenes'

const forwardedHeaders = [
	'cache-control',
	'content-type',
	'etag',
	'last-modified',
] as const

const isSafeAssetPath = (assetPath: string): boolean =>
	assetPath.length > 0 &&
	assetPath.split('/').every((segment) => {
		const decodedSegment = decodeURIComponent(segment)

		return (
			decodedSegment.length > 0 &&
			decodedSegment !== '.' &&
			decodedSegment !== '..' &&
			!decodedSegment.includes('\\') &&
			!decodedSegment.includes('\u0000')
		)
	})

/**
 * The public map host does not permit browser CORS requests. Keep the target
 * host fixed by the homepage scene config and proxy only its asset subtree so
 * the BlueMap WebApp can load settings, tiles and binary map data same-origin.
 */
export default defineEventHandler(async (event) => {
	const assetPath = getRouterParam(event, 'assetPath') ?? ''

	if (!isSafeAssetPath(assetPath)) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Invalid map asset path',
		})
	}

	const upstreamUrl = new URL(
		assetPath,
		`${defaultHomeImmersiveScene.mapAssetsBaseUrl.replace(/\/$/, '')}/`,
	)
	const response = await fetch(upstreamUrl)
	const headers = new Headers()

	for (const header of forwardedHeaders) {
		const value = response.headers.get(header)
		if (value) headers.set(header, value)
	}

	return new Response(response.body, {
		status: response.status,
		headers,
	})
})
