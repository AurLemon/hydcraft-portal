interface ManagedCacheEntry<T> {
	data: T
	expiresAt: number
	updatedAt: number
}

interface ManagedCacheInFlight {
	promise: Promise<void>
}

interface ManagedCacheStore {
	entries: Map<string, ManagedCacheEntry<unknown>>
	inFlight: Map<string, ManagedCacheInFlight>
}

interface CleanupManagedCacheOptions {
	namespace: string
	now?: number
	keepKey?: string
	maxEntries: number
}

interface RefreshManagedCacheOptions<T> {
	namespace: string
	key: string
	loader: () => Promise<T>
	ttlMs: number
	silent?: boolean
	onError?: (error: unknown) => void
	maxEntries: number
}

interface ManagedCacheReadResult<T> {
	entry: ManagedCacheEntry<T> | null
	isFresh: boolean
}

declare global {
	var __managedMemoryCacheStore__: ManagedCacheStore | undefined
}

const managedMemoryCacheStore = globalThis.__managedMemoryCacheStore__ ?? {
	entries: new Map<string, ManagedCacheEntry<unknown>>(),
	inFlight: new Map<string, ManagedCacheInFlight>(),
}

if (!globalThis.__managedMemoryCacheStore__) {
	globalThis.__managedMemoryCacheStore__ = managedMemoryCacheStore
}

const namespacedKey = (namespace: string, key: string): string => {
	return `${namespace}:${key}`
}

export const cleanupManagedCache = (
	options: CleanupManagedCacheOptions,
): void => {
	const now = options.now ?? Date.now()
	const keepKey = options.keepKey
	const scopedKeepKey = keepKey
		? namespacedKey(options.namespace, keepKey)
		: undefined
	const namespacePrefix = `${options.namespace}:`

	for (const [key, entry] of managedMemoryCacheStore.entries.entries()) {
		if (!key.startsWith(namespacePrefix)) {
			continue
		}

		if (entry.expiresAt <= now && key !== scopedKeepKey) {
			managedMemoryCacheStore.entries.delete(key)
		}
	}

	const scopedEntries = [...managedMemoryCacheStore.entries.entries()].filter(
		([key]) => key.startsWith(namespacePrefix),
	)

	if (scopedEntries.length <= options.maxEntries) {
		return
	}

	const candidates = scopedEntries
		.filter(([key]) => key !== scopedKeepKey)
		.sort((a, b) => a[1].expiresAt - b[1].expiresAt)

	const removeCount = scopedEntries.length - options.maxEntries
	for (let index = 0; index < removeCount; index += 1) {
		const candidate = candidates[index]
		if (!candidate) {
			break
		}

		managedMemoryCacheStore.entries.delete(candidate[0])
	}
}

export const readManagedCache = <T>(options: {
	namespace: string
	key: string
	now?: number
}): ManagedCacheReadResult<T> => {
	const now = options.now ?? Date.now()
	const scopedKey = namespacedKey(options.namespace, options.key)
	const entry = managedMemoryCacheStore.entries.get(scopedKey) as
		| ManagedCacheEntry<T>
		| undefined

	if (!entry) {
		return {
			entry: null,
			isFresh: false,
		}
	}

	return {
		entry,
		isFresh: entry.expiresAt > now,
	}
}

export const refreshManagedCache = async <T>(
	options: RefreshManagedCacheOptions<T>,
): Promise<void> => {
	cleanupManagedCache({
		namespace: options.namespace,
		keepKey: options.key,
		maxEntries: options.maxEntries,
	})

	const scopedKey = namespacedKey(options.namespace, options.key)
	const existing = managedMemoryCacheStore.inFlight.get(scopedKey)
	if (existing) {
		return existing.promise
	}

	const promise = (async () => {
		try {
			const data = await options.loader()
			managedMemoryCacheStore.entries.set(scopedKey, {
				data,
				expiresAt: Date.now() + options.ttlMs,
				updatedAt: Date.now(),
			})
			cleanupManagedCache({
				namespace: options.namespace,
				keepKey: options.key,
				maxEntries: options.maxEntries,
			})
		} catch (error) {
			if (options.onError) {
				options.onError(error)
			}
			if (!options.silent) {
				console.error(
					`[managed-cache][${options.namespace}] refresh failed for key ${options.key}`,
					error,
				)
			}
			throw error
		} finally {
			managedMemoryCacheStore.inFlight.delete(scopedKey)
		}
	})()

	managedMemoryCacheStore.inFlight.set(scopedKey, { promise })
	return promise
}
