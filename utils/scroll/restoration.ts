export interface ScrollSnapshot {
	top: number
	progress: number
}

interface ScrollPosition {
	left: number
	top: number
}

interface AbsoluteScrollRestore {
	key: string
	type: 'absolute'
	top: number
}

interface ProgressScrollRestore {
	key: string
	type: 'progress'
	progress: number
}

type PendingScrollRestore = AbsoluteScrollRestore | ProgressScrollRestore

const LOCALE_PREFIX_RE = /^\/(?:zh-CN|zh-TW|ja-JP|en-US)(?=\/|$)/
const FALLBACK_RESTORE_INTERVAL_MS = 120
const FALLBACK_RESTORE_TIMEOUT_MS = 2000
const SESSION_STORAGE_KEY = 'hydcraft:scroll-snapshots'
const SCROLL_INTENT_KEYS = new Set([
	' ',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'ArrowUp',
	'End',
	'Home',
	'PageDown',
	'PageUp',
])

const scrollSnapshots = new Map<string, ScrollSnapshot>()

let pendingRestore: PendingScrollRestore | null = null
let pendingRestoreTimer: ReturnType<typeof setTimeout> | null = null
let pendingRestoreExpiresAt = 0
let userScrollIntentListenerActive = false
let persistenceInitialized = false

const stripHash = (fullPath: string | undefined): string =>
	(fullPath ?? '').split('#', 1)[0] ?? ''

const readPersistedScrollSnapshots = (): Record<string, ScrollSnapshot> => {
	if (!import.meta.client) {
		return {}
	}

	const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)

	if (!raw) {
		return {}
	}

	try {
		const parsed = JSON.parse(raw) as Record<string, ScrollSnapshot>

		return parsed && typeof parsed === 'object' ? parsed : {}
	} catch {
		return {}
	}
}

const persistScrollSnapshots = (): void => {
	if (!import.meta.client) {
		return
	}

	const nextSnapshots = Object.fromEntries(scrollSnapshots.entries())
	window.sessionStorage.setItem(
		SESSION_STORAGE_KEY,
		JSON.stringify(nextSnapshots),
	)
}

const initializeScrollSnapshotPersistence = (): void => {
	if (!import.meta.client || persistenceInitialized) {
		return
	}

	persistenceInitialized = true

	for (const [key, snapshot] of Object.entries(
		readPersistedScrollSnapshots(),
	)) {
		scrollSnapshots.set(key, snapshot)
	}

	window.addEventListener('pagehide', () => {
		const currentPath = window.location.pathname + window.location.search
		scrollSnapshots.set(getScrollRouteKey(currentPath), readScrollSnapshot())

		persistScrollSnapshots()
	})
}

export const normalizeScrollPath = (fullPath: string | undefined): string => {
	const pathWithoutHash = stripHash(fullPath)
	const normalizedPath = pathWithoutHash.replace(LOCALE_PREFIX_RE, '')

	return normalizedPath || '/'
}

export const getScrollRouteKey = (fullPath: string | undefined): string => {
	return stripHash(fullPath) || '/'
}

export const isHomeScrollPath = (fullPath: string | undefined): boolean =>
	normalizeScrollPath(fullPath) === '/'

export const readScrollSnapshot = (): ScrollSnapshot => {
	const maxScroll = Math.max(
		document.documentElement.scrollHeight - window.innerHeight,
		0,
	)
	const top = window.scrollY
	const progress = maxScroll > 0 ? Math.min(top / maxScroll, 1) : 0

	return { top, progress }
}

export const saveScrollSnapshot = (fullPath: string | undefined): void => {
	initializeScrollSnapshotPersistence()

	if (!import.meta.client) {
		return
	}

	scrollSnapshots.set(getScrollRouteKey(fullPath), readScrollSnapshot())
	persistScrollSnapshots()
}

export const getScrollSnapshot = (
	fullPath: string | undefined,
): ScrollSnapshot | undefined => {
	initializeScrollSnapshotPersistence()

	return scrollSnapshots.get(getScrollRouteKey(fullPath))
}

const resolvePendingRestorePosition = (
	restore: PendingScrollRestore,
): ScrollPosition => {
	if (restore.type === 'absolute') {
		return { left: 0, top: restore.top }
	}

	const maxScroll = Math.max(
		document.documentElement.scrollHeight - window.innerHeight,
		0,
	)

	return {
		left: 0,
		top: Math.round(maxScroll * restore.progress),
	}
}

const clearPendingRestoreTimer = (): void => {
	if (pendingRestoreTimer === null) {
		return
	}

	clearTimeout(pendingRestoreTimer)
	pendingRestoreTimer = null
}

const applyPendingRestore = (): boolean => {
	if (!import.meta.client || !pendingRestore) {
		return false
	}

	const position = resolvePendingRestorePosition(pendingRestore)
	window.scrollTo(position)

	return true
}

const settlePendingRestore = (): void => {
	clearPendingRestoreTimer()
	pendingRestore = null
	pendingRestoreExpiresAt = 0
	stopUserScrollIntentListeners()
}

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) {
		return false
	}

	return (
		target.isContentEditable ||
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement
	)
}

const cancelPendingRestoreForUserIntent = (): void => {
	if (!pendingRestore) {
		return
	}

	settlePendingRestore()
}

const handleUserScrollKeydown = (event: KeyboardEvent): void => {
	if (event.defaultPrevented || isEditableTarget(event.target)) {
		return
	}

	if (SCROLL_INTENT_KEYS.has(event.key)) {
		cancelPendingRestoreForUserIntent()
	}
}

const startUserScrollIntentListeners = (): void => {
	if (!import.meta.client || userScrollIntentListenerActive) {
		return
	}

	userScrollIntentListenerActive = true
	window.addEventListener('wheel', cancelPendingRestoreForUserIntent, {
		passive: true,
	})
	window.addEventListener('touchmove', cancelPendingRestoreForUserIntent, {
		passive: true,
	})
	window.addEventListener('pointerdown', cancelPendingRestoreForUserIntent, {
		passive: true,
	})
	window.addEventListener('keydown', handleUserScrollKeydown)
}

const stopUserScrollIntentListeners = (): void => {
	if (!import.meta.client || !userScrollIntentListenerActive) {
		return
	}

	userScrollIntentListenerActive = false
	window.removeEventListener('wheel', cancelPendingRestoreForUserIntent)
	window.removeEventListener('touchmove', cancelPendingRestoreForUserIntent)
	window.removeEventListener('pointerdown', cancelPendingRestoreForUserIntent)
	window.removeEventListener('keydown', handleUserScrollKeydown)
}

const schedulePendingRestoreFallback = (): void => {
	clearPendingRestoreTimer()

	if (!pendingRestore) {
		return
	}

	pendingRestoreTimer = setTimeout(() => {
		if (!pendingRestore) {
			return
		}

		applyPendingRestore()

		if (Date.now() >= pendingRestoreExpiresAt) {
			settlePendingRestore()
			return
		}

		schedulePendingRestoreFallback()
	}, FALLBACK_RESTORE_INTERVAL_MS)
}

export const queueAbsoluteScrollRestore = (
	fullPath: string | undefined,
	top: number,
): void => {
	if (!import.meta.client) {
		return
	}

	initializeScrollSnapshotPersistence()

	pendingRestore = {
		key: getScrollRouteKey(fullPath),
		type: 'absolute',
		top,
	}
	pendingRestoreExpiresAt = Date.now() + FALLBACK_RESTORE_TIMEOUT_MS
	startUserScrollIntentListeners()
	schedulePendingRestoreFallback()
}

export const queueProgressScrollRestore = (
	fullPath: string | undefined,
	progress: number,
): void => {
	if (!import.meta.client) {
		return
	}

	initializeScrollSnapshotPersistence()

	pendingRestore = {
		key: getScrollRouteKey(fullPath),
		type: 'progress',
		progress,
	}
	pendingRestoreExpiresAt = Date.now() + FALLBACK_RESTORE_TIMEOUT_MS
	startUserScrollIntentListeners()
	schedulePendingRestoreFallback()
}

export const clearPendingScrollRestore = (): void => {
	settlePendingRestore()
}

export const notifyScrollRestoreReady = (
	fullPath: string | undefined,
): boolean => {
	if (!import.meta.client || !pendingRestore) {
		return false
	}

	if (pendingRestore.key !== getScrollRouteKey(fullPath)) {
		return false
	}

	applyPendingRestore()
	settlePendingRestore()

	return true
}
