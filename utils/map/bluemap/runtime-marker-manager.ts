import type { PlayerPresenceMarker } from './player-marker'
import { BLUE_MAP_RUNTIME } from './runtime-constants'
import type {
	BlueMapRuntimeAnimationScheduler,
	BlueMapRuntimeEasing,
	BlueMapRuntimeMapControls,
	BlueMapRuntimePlayerMarkerFactory,
	BlueMapRuntimePlayerSkinLoader,
	BlueMapRuntimeViewer,
	BlueMapRuntimeWorldMarkerFactory,
	WorldPlayerMarkerEntry,
} from './runtime-types'
import type {
	BlueMapPlayerMarker,
	BlueMapViewMode,
	BlueMapWorldPlayerMarker,
	BlueMapWorldPlayerMarkerClickEventPayload,
} from './types'

const WORLD_PLAYER_MARKER_TRANSITION_MS = 320

interface RuntimeMarkerManagerDependencies {
	getViewer: () => BlueMapRuntimeViewer | null
	getContainer: () => HTMLElement | null
	getMapControls: () => BlueMapRuntimeMapControls | null
	getMode: () => BlueMapViewMode
	getTerrainHeight: (x: number, z: number) => number
	getAnimationScheduler: () => BlueMapRuntimeAnimationScheduler | null
	getEasing: () => BlueMapRuntimeEasing | null
}

export class BlueMapRuntimeMarkerManager {
	private readonly dependencies: RuntimeMarkerManagerDependencies
	private createPlayerMarker: BlueMapRuntimePlayerMarkerFactory | null = null
	private loadPlayerSkin: BlueMapRuntimePlayerSkinLoader | null = null
	private createWorldPlayerMarker: BlueMapRuntimeWorldMarkerFactory | null =
		null
	private playerAnimation: { cancel(): void } | null = null
	private readonly worldPlayerMarkerEntries = new Map<
		string,
		WorldPlayerMarkerEntry
	>()
	private readonly worldPlayerMarkerExitTimers = new Map<string, number>()
	private worldPlayerMarkerHitTestCleanup: (() => void) | null = null
	private onWorldPlayerMarkerClick:
		| ((payload: BlueMapWorldPlayerMarkerClickEventPayload) => void)
		| null = null
	playerMarker: PlayerPresenceMarker | null = null
	playerPresence: BlueMapPlayerMarker | null = null
	worldPlayerMarkerDefinitions: readonly BlueMapWorldPlayerMarker[] = []

	constructor(dependencies: RuntimeMarkerManagerDependencies) {
		this.dependencies = dependencies
	}

	setPlayerMarkerFactory(
		factory: BlueMapRuntimePlayerMarkerFactory | null,
	): void {
		this.createPlayerMarker = factory
	}

	setPlayerSkinLoader(loader: BlueMapRuntimePlayerSkinLoader | null): void {
		this.loadPlayerSkin = loader
	}

	setWorldPlayerMarkerFactory(
		factory: BlueMapRuntimeWorldMarkerFactory | null,
	): void {
		this.createWorldPlayerMarker = factory
	}

	setWorldPlayerMarkerClickHandler(
		handler:
			| ((payload: BlueMapWorldPlayerMarkerClickEventPayload) => void)
			| null,
	): void {
		this.onWorldPlayerMarkerClick = handler
	}

	setPresence(player: BlueMapPlayerMarker | null): void {
		this.playerPresence = player
		const viewer = this.dependencies.getViewer()
		if (!viewer) return
		if (!player) {
			this.playerAnimation?.cancel()
			this.playerAnimation = null
			if (this.playerMarker) {
				viewer.markers.remove(this.playerMarker)
				this.playerMarker.dispose()
			}
			this.playerMarker = null
			return
		}

		if (!this.playerMarker && this.createPlayerMarker) {
			this.playerMarker = this.createPlayerMarker()
			viewer.markers.add(this.playerMarker)
		}
		const marker = this.playerMarker
		if (!marker) return
		const yaw = Number.isFinite(player.yaw) ? (player.yaw ?? 0) : 0
		const yawRadians = (yaw * Math.PI) / 180
		marker.modelAnchor.rotation.y = -yawRadians
		marker.setDetailLabels({
			coordinates: player.detailLabels?.coordinates ?? '',
			direction: player.detailLabels?.direction ?? '',
			playerId: player.detailLabels?.playerId ?? player.label ?? '',
		})
		marker.setDirection(yawRadians)
		if (player.skinUrl) this.loadPlayerSkin?.(marker, player.skinUrl)
		this.updatePlayerMarkerAppearance()
		const savedY = Number.isFinite(player.y)
			? (player.y ?? 0)
			: this.dependencies.getTerrainHeight(player.x, player.z)
		const target = {
			x: player.x,
			y: savedY + BLUE_MAP_RUNTIME.PLAYER_MARKER_HEIGHT_OFFSET,
			z: player.z,
		}
		const isNewMarker =
			marker.position.x === 0 &&
			marker.position.y === 0 &&
			marker.position.z === 0
		const animate = this.dependencies.getAnimationScheduler()
		const easing = this.dependencies.getEasing()
		if (isNewMarker || !animate || !easing) {
			marker.position.set(target.x, target.y, target.z)
			return
		}
		if (
			Math.abs(marker.position.x - target.x) < 0.01 &&
			Math.abs(marker.position.y - target.y) < 0.01 &&
			Math.abs(marker.position.z - target.z) < 0.01
		) {
			return
		}

		const start = { ...marker.position }
		this.playerAnimation?.cancel()
		this.playerAnimation = animate(
			(progress) => {
				const eased = easing.easeInOutQuad(progress)
				marker.position.set(
					start.x + (target.x - start.x) * eased,
					start.y + (target.y - start.y) * eased,
					start.z + (target.z - start.z) * eased,
				)
			},
			520,
			(finished) => {
				if (!finished) return
				this.playerAnimation = null
				marker.position.set(target.x, target.y, target.z)
			},
		)
	}

	setWorldPlayerMarkers(markers: readonly BlueMapWorldPlayerMarker[]): void {
		this.worldPlayerMarkerDefinitions = [...markers]
		const viewer = this.dependencies.getViewer()
		const createMarker = this.createWorldPlayerMarker
		if (!viewer || !createMarker) return

		const nextMarkerIds = new Set(markers.map((marker) => marker.id))
		for (const [markerId, entry] of this.worldPlayerMarkerEntries) {
			const exitTimer = this.worldPlayerMarkerExitTimers.get(markerId)
			if (nextMarkerIds.has(markerId)) {
				if (exitTimer !== undefined) {
					window.clearTimeout(exitTimer)
					this.worldPlayerMarkerExitTimers.delete(markerId)
				}
				entry.marker.visible = true
				continue
			}
			if (exitTimer !== undefined) continue

			entry.marker.element.style.opacity = '0'
			this.worldPlayerMarkerExitTimers.set(
				markerId,
				window.setTimeout(() => {
					const exitingEntry = this.worldPlayerMarkerEntries.get(markerId)
					if (!exitingEntry || nextMarkerIds.has(markerId)) return
					exitingEntry.unbind()
					viewer.markers.remove(exitingEntry.marker)
					this.worldPlayerMarkerEntries.delete(markerId)
					this.worldPlayerMarkerExitTimers.delete(markerId)
				}, WORLD_PLAYER_MARKER_TRANSITION_MS),
			)
		}

		for (const definition of markers) {
			let entry = this.worldPlayerMarkerEntries.get(definition.id)
			let createdEntry = false
			if (entry && entry.definition.playerId !== definition.playerId) {
				entry.unbind()
				viewer.markers.remove(entry.marker)
				this.worldPlayerMarkerEntries.delete(definition.id)
				entry = undefined
			}

			if (!entry) {
				const marker = createMarker(definition)
				marker.element.style.opacity = '0'
				const activate = (event: Event) => {
					event.preventDefault()
					event.stopPropagation()
					const current = this.worldPlayerMarkerEntries.get(definition.id)
					if (!current) return
					this.onWorldPlayerMarkerClick?.({ marker: current.definition })
				}
				const handleKeydown = (event: KeyboardEvent) => {
					if (event.key !== 'Enter' && event.key !== ' ') return
					activate(event)
				}
				marker.element.addEventListener('click', activate)
				marker.element.addEventListener('keydown', handleKeydown)
				entry = {
					definition,
					marker,
					unbind: () => {
						marker.element.removeEventListener('click', activate)
						marker.element.removeEventListener('keydown', handleKeydown)
					},
				}
				const newEntry = entry
				createdEntry = true
				this.worldPlayerMarkerEntries.set(definition.id, newEntry)
				viewer.markers.add(marker)
				requestAnimationFrame(() => {
					if (
						this.worldPlayerMarkerEntries.get(definition.id) === newEntry &&
						!this.worldPlayerMarkerExitTimers.has(definition.id)
					) {
						newEntry.marker.element.style.opacity =
							newEntry.definition.isFocused === false
								? '0.34'
								: newEntry.definition.isFocused === true
									? '0.8'
									: '1'
					}
				})
			}

			entry.definition = definition
			const marker = entry.marker
			marker.visible = true
			marker.element.style.pointerEvents = 'auto'
			marker.element.dataset.worldPlayerMarkerId = definition.id
			marker.element.dataset.homeAdministrator = String(
				definition.isAdministrator === true,
			)
			marker.element.dataset.homeFocused = String(
				definition.isFocused !== false,
			)
			marker.element.style.setProperty(
				'--home-marker-mobile-screen-offset-y',
				definition.mobileScreenOffsetY ?? '0px',
			)
			if (!createdEntry) {
				marker.element.style.opacity =
					definition.isFocused === false
						? '0.34'
						: definition.isFocused === true
							? '0.8'
							: '1'
			}
			marker.element.style.transform =
				definition.isFocused === false
					? 'translate(-50%, calc(-100% + var(--home-marker-screen-offset-y))) scale(0.72)'
					: 'translate(-50%, calc(-100% + var(--home-marker-screen-offset-y))) scale(1)'
			marker.element.setAttribute('role', 'button')
			marker.element.setAttribute('aria-label', definition.label)
			marker.element.tabIndex = 0
			marker.playerHeadElement.style.display = ''
			marker.playerHeadElement.src = definition.avatarUrl
			marker.playerHeadElement.alt = definition.label
			marker.updateFromData({
				uuid: definition.playerId,
				name: ' ',
				foreign: false,
				position: { x: definition.x, y: definition.y, z: definition.z },
				rotation: { yaw: 0, pitch: 0, roll: 0 },
			})
			marker.playerNameElement.textContent = definition.label
		}

		viewer.redraw()
	}

	enableWorldPlayerMarkerHitTesting(): void {
		if (
			this.worldPlayerMarkerHitTestCleanup ||
			!this.dependencies.getContainer()
		) {
			return
		}

		const resolveMarkerAt = (x: number, y: number) => {
			for (const entry of this.worldPlayerMarkerEntries.values()) {
				const bounds = entry.marker.element.getBoundingClientRect()
				if (
					x >= bounds.left &&
					x <= bounds.right &&
					y >= bounds.top &&
					y <= bounds.bottom
				) {
					return entry
				}
			}
			return null
		}
		const clearHoveredMarker = () => {
			for (const entry of this.worldPlayerMarkerEntries.values()) {
				delete entry.marker.element.dataset.homeMarkerHovered
			}
		}
		const updateHoveredMarker = (event: PointerEvent) => {
			const hoveredMarker = resolveMarkerAt(event.clientX, event.clientY)
			for (const entry of this.worldPlayerMarkerEntries.values()) {
				if (entry === hoveredMarker) {
					entry.marker.element.dataset.homeMarkerHovered = 'true'
				} else {
					delete entry.marker.element.dataset.homeMarkerHovered
				}
			}
			document.documentElement.style.cursor = hoveredMarker ? 'pointer' : ''
		}
		const activateMarker = (event: MouseEvent) => {
			const marker = resolveMarkerAt(event.clientX, event.clientY)
			if (!marker) return
			event.preventDefault()
			event.stopImmediatePropagation()
			this.onWorldPlayerMarkerClick?.({ marker: marker.definition })
		}

		window.addEventListener('pointermove', updateHoveredMarker, true)
		window.addEventListener('click', activateMarker, true)
		this.worldPlayerMarkerHitTestCleanup = () => {
			window.removeEventListener('pointermove', updateHoveredMarker, true)
			window.removeEventListener('click', activateMarker, true)
			document.documentElement.style.cursor = ''
			clearHoveredMarker()
		}
	}

	updatePlayerMarkerAppearance(distance?: number): void {
		const marker = this.playerMarker
		const cameraDistance =
			distance ?? this.dependencies.getViewer()?.controlsManager.distance
		if (!marker || !Number.isFinite(cameraDistance)) return

		const modelOpacity = marker.skinReady
			? Math.max(
					0,
					Math.min(
						1,
						(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE -
							(cameraDistance ?? Number.POSITIVE_INFINITY)) /
							(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE -
								BLUE_MAP_RUNTIME.PLAYER_MODEL_SWITCH_DISTANCE),
					),
				)
			: 0
		const modelVisible = modelOpacity > 0.001
		marker.modelAnchor.visible = modelVisible
		marker.detailAnchor.visible = modelVisible
		marker.directionArrow.visible = modelVisible
		marker.setPresentationOpacity(modelOpacity)
		marker.dot.material.opacity = 1 - modelOpacity
		marker.dot.visible = marker.dot.material.opacity > 0.001
		if (!marker.modelAnchor.visible) return
		marker.modelAnchor.scale.setScalar(BLUE_MAP_RUNTIME.PLAYER_MODEL_SCALE)
	}

	getPlayerViewingMinAngle(distance: number): number {
		const progress = Math.max(
			0,
			Math.min(
				1,
				(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE - distance) /
					(BLUE_MAP_RUNTIME.PLAYER_MODEL_HIDDEN_DISTANCE -
						BLUE_MAP_RUNTIME.PERSPECTIVE_MIN_DISTANCE),
			),
		)
		return progress * BLUE_MAP_RUNTIME.PLAYER_VIEW_MAX_ANGLE
	}

	dispose(): void {
		this.worldPlayerMarkerHitTestCleanup?.()
		this.worldPlayerMarkerHitTestCleanup = null
		const viewer = this.dependencies.getViewer()
		for (const entry of this.worldPlayerMarkerEntries.values()) {
			entry.unbind()
			if (viewer) viewer.markers.remove(entry.marker)
			else entry.marker.dispose()
		}
		for (const timer of this.worldPlayerMarkerExitTimers.values()) {
			window.clearTimeout(timer)
		}
		this.worldPlayerMarkerExitTimers.clear()
		this.worldPlayerMarkerEntries.clear()
		this.playerAnimation?.cancel()
		this.playerAnimation = null
		if (this.playerMarker && viewer) viewer.markers.remove(this.playerMarker)
		this.playerMarker?.dispose()
		this.playerMarker = null
		this.playerPresence = null
		this.worldPlayerMarkerDefinitions = []
		this.createPlayerMarker = null
		this.loadPlayerSkin = null
		this.createWorldPlayerMarker = null
		this.onWorldPlayerMarkerClick = null
	}
}
