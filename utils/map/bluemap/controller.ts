import {
	BlueMapAssetsError,
	getBlueMapCapabilities,
	isBlueMapModeEnabled,
	loadBlueMapSettings,
} from './assets'
import { OfficialBlueMapRuntime } from './official-runtime'
import { BlueMapRuntimeError } from './runtime-error'
import type {
	BlueMapAssetsSource,
	BlueMapCapabilities,
	BlueMapController,
	BlueMapErrorEventPayload,
	BlueMapEventPayloadMap,
	BlueMapFocus,
	BlueMapMapSettings,
	BlueMapPlayerMarker,
	BlueMapRuntime,
	BlueMapRuntimeFactory,
	BlueMapRuntimeMountOptions,
	BlueMapViewOrientation,
	BlueMapViewMode,
} from './types'

const defaultRuntimeFactory: BlueMapRuntimeFactory = {
	create: () => new OfficialBlueMapRuntime(),
}

export class BlueMapControllerImpl implements BlueMapController {
	private readonly runtimeFactory: BlueMapRuntimeFactory
	private runtime: BlueMapRuntime | null = null
	private mountGeneration = 0
	private settings: BlueMapMapSettings | null = null
	private capabilities: BlueMapCapabilities = {
		flat: false,
		perspective: false,
		freeFlight: false,
	}
	private assetsBaseUrl = ''
	private readonly listeners: {
		[K in keyof BlueMapEventPayloadMap]: Set<
			(payload: BlueMapEventPayloadMap[K]) => void
		>
	} = {
		ready: new Set(),
		modeChanged: new Set(),
		focusChanged: new Set(),
		viewChanged: new Set(),
		error: new Set(),
		destroy: new Set(),
	}

	constructor(runtimeFactory: BlueMapRuntimeFactory = defaultRuntimeFactory) {
		this.runtimeFactory = runtimeFactory
	}

	async mount(options: {
		container: HTMLElement
		assets: BlueMapAssetsSource
		mode?: BlueMapViewMode
		appendCacheBust?: boolean
		initialDistance?: number
		focus?: BlueMapFocus
		initialOrientation?: BlueMapViewOrientation
		unrestrictedPerspectiveAngle?: boolean
		player?: BlueMapPlayerMarker | null
	}) {
		const mountGeneration = ++this.mountGeneration
		this.destroyRuntime()
		try {
			const loaded = await loadBlueMapSettings(options.assets)
			if (!this.isCurrentMount(mountGeneration)) return
			this.assetsBaseUrl = loaded.assetsBaseUrl
			this.settings = loaded.settings
			this.capabilities = getBlueMapCapabilities(loaded.settings)
			const mode = options.mode ?? 'perspective'
			if (!isBlueMapModeEnabled(this.capabilities, mode)) {
				throw new BlueMapRuntimeError(
					`BlueMap 当前地图未启用 ${mode} 模式。`,
					'MAP_MODE_UNAVAILABLE',
				)
			}

			const runtime = this.runtimeFactory.create()
			const runtimeOptions: BlueMapRuntimeMountOptions = {
				container: options.container,
				assetsBaseUrl: this.assetsBaseUrl,
				settings: loaded.settings,
				mode,
				appendCacheBust: options.appendCacheBust ?? false,
				initialDistance: options.initialDistance,
				initialFocus: options.focus,
				focusHeightOffset: options.focusHeightOffset,
				initialOrientation: options.initialOrientation,
				unrestrictedPerspectiveAngle: options.unrestrictedPerspectiveAngle,
				player: options.player,
				onViewChanged: (view) => this.emit('viewChanged', view),
			}
			await runtime.mount(runtimeOptions)
			if (!this.isCurrentMount(mountGeneration)) {
				runtime.destroy()
				return
			}
			this.runtime = runtime
			this.emit('ready', {
				assetsBaseUrl: this.assetsBaseUrl,
				settings: loaded.settings,
				capabilities: this.capabilities,
			})
		} catch (error) {
			if (!this.isCurrentMount(mountGeneration)) return
			this.emit('error', this.toErrorPayload(error))
			throw error
		}
	}

	async setMode(mode: BlueMapViewMode) {
		if (!isBlueMapModeEnabled(this.capabilities, mode)) {
			const error = new BlueMapRuntimeError(
				`BlueMap 当前地图未启用 ${mode} 模式。`,
				'MAP_MODE_UNAVAILABLE',
			)
			this.emit('error', this.toErrorPayload(error))
			throw error
		}
		if (!this.runtime) return
		try {
			await this.runtime.setMode(mode)
			this.emit('modeChanged', { mode })
		} catch (error) {
			this.emit('error', this.toErrorPayload(error))
			throw error
		}
	}

	resize() {
		this.runtime?.resize()
	}

	async focus(focus: BlueMapFocus) {
		if (!this.runtime) return
		await this.runtime.focus(focus)
		this.emit('focusChanged', { focus })
	}

	async focusPlayer(focus: BlueMapFocus) {
		if (!this.runtime) return
		await this.runtime.focusPlayer(focus)
		this.emit('focusChanged', { focus })
	}

	cancelFocus() {
		this.runtime?.cancelFocus()
	}

	setPresence(player: BlueMapPlayerMarker | null) {
		this.runtime?.setPresence(player)
	}

	async alignNorth() {
		await this.runtime?.alignNorth()
	}

	async resetView() {
		await this.runtime?.resetView()
	}

	destroy() {
		this.mountGeneration++
		this.destroyRuntime()
		this.emit('destroy', {})
	}

	getSettings() {
		return this.settings
	}

	getCapabilities() {
		return this.capabilities
	}

	on<EventName extends keyof BlueMapEventPayloadMap>(
		eventName: EventName,
		handler: (payload: BlueMapEventPayloadMap[EventName]) => void,
	) {
		this.listeners[eventName].add(handler)
		return () => this.listeners[eventName].delete(handler)
	}

	private destroyRuntime() {
		this.runtime?.destroy()
		this.runtime = null
		this.settings = null
		this.assetsBaseUrl = ''
		this.capabilities = { flat: false, perspective: false, freeFlight: false }
	}

	private isCurrentMount(mountGeneration: number): boolean {
		return mountGeneration === this.mountGeneration
	}

	private emit<EventName extends keyof BlueMapEventPayloadMap>(
		eventName: EventName,
		payload: BlueMapEventPayloadMap[EventName],
	) {
		for (const listener of this.listeners[eventName]) listener(payload)
	}

	private toErrorPayload(error: unknown): BlueMapErrorEventPayload {
		if (error instanceof BlueMapAssetsError) {
			return { code: error.code, message: error.message, error }
		}
		if (error instanceof BlueMapRuntimeError) {
			return { code: error.code, message: error.message, error }
		}
		return {
			code: 'MAP_RENDER_FAILED',
			message:
				error instanceof Error ? error.message : 'BlueMap 地图渲染失败。',
			error,
		}
	}
}

export const createBlueMapController = (
	runtimeFactory?: BlueMapRuntimeFactory,
): BlueMapController => new BlueMapControllerImpl(runtimeFactory)
