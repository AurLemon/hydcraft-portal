export interface ThreeLoadingManager {
	urlModifier?: (url: string) => string
	setURLModifier(transform: (url: string) => string): void
}

const cacheBustFreeAssets = new Map<string, number>()
let cacheBustUrlModifierInstalled = false

const stripBlueMapCacheBust = (url: string): string => {
	try {
		const assetUrl = new URL(url, window.location.href)
		if (!/^\?\d+$/.test(assetUrl.search)) return url

		const assetBaseUrl = `${assetUrl.origin}${assetUrl.pathname}`
		const matchesRegisteredBase = Array.from(cacheBustFreeAssets.keys()).some(
			(baseUrl) =>
				assetBaseUrl === baseUrl || assetBaseUrl.startsWith(`${baseUrl}/`),
		)
		if (!matchesRegisteredBase) return url

		assetUrl.search = ''
		return assetUrl.toString()
	} catch {
		return url
	}
}

export const registerCacheBustFreeAssets = (
	manager: ThreeLoadingManager,
	assetsBaseUrl: string,
) => {
	if (!cacheBustUrlModifierInstalled) {
		const existingModifier = manager.urlModifier
		manager.setURLModifier((url) =>
			stripBlueMapCacheBust(existingModifier ? existingModifier(url) : url),
		)
		cacheBustUrlModifierInstalled = true
	}

	cacheBustFreeAssets.set(
		assetsBaseUrl,
		(cacheBustFreeAssets.get(assetsBaseUrl) ?? 0) + 1,
	)
}

export const unregisterCacheBustFreeAssets = (assetsBaseUrl: string | null) => {
	if (!assetsBaseUrl) return
	const instances = cacheBustFreeAssets.get(assetsBaseUrl) ?? 0
	if (instances <= 1) {
		cacheBustFreeAssets.delete(assetsBaseUrl)
		return
	}
	cacheBustFreeAssets.set(assetsBaseUrl, instances - 1)
}
