import { BLUE_MAP_RUNTIME } from './runtime-constants'
import type { IdleAnimation, NameTagObject, PlayerObject } from 'skinview3d'
import type { Material } from 'three'

type ThreeModule = typeof import('three')
type Skinview3dModule = typeof import('skinview3d')
type SkinviewUtilsModule = typeof import('skinview-utils')

export interface PlayerPresenceMarker {
	position: {
		x: number
		y: number
		z: number
		set(x: number, y: number, z: number): void
	}
	dot: {
		visible: boolean
		material: { opacity: number }
	}
	modelAnchor: {
		visible: boolean
		rotation: { y: number }
		scale: { setScalar(scale: number): void }
	}
	detailAnchor: {
		visible: boolean
		quaternion: { copy(quaternion: unknown): void }
	}
	directionArrow: {
		visible: boolean
		setDirection(direction: { x: number; y: number; z: number }): void
	}
	detailLabels: {
		coordinates: NameTagObject
		direction: NameTagObject
		playerId: NameTagObject
	}
	setDetailLabels(labels: {
		coordinates: string
		direction: string
		playerId: string
	}): void
	setDirection(yawRadians: number): void
	setPresentationOpacity(opacity: number): void
	playerModel: PlayerObject
	idleAnimation: IdleAnimation
	skinTexture: { dispose(): void } | null
	skinUrl: string | null
	skinReady: boolean
	skinLoadGeneration: number
	dispose(): void
}

interface PlayerRenderMaterial extends Material {
	map?: unknown
}

interface WorldLabelOptions {
	textStyle?: string
	height?: number
	compact?: boolean
	horizontalAnchor?: 0 | 0.5 | 1
}

export const createPlayerMarkerSupport = (
	three: Pick<
		ThreeModule,
		| 'AmbientLight'
		| 'ArrowHelper'
		| 'Points'
		| 'PointsMaterial'
		| 'BufferGeometry'
		| 'Float32BufferAttribute'
		| 'CanvasTexture'
		| 'Group'
		| 'LinearFilter'
		| 'Mesh'
		| 'NearestFilter'
		| 'SRGBColorSpace'
		| 'Vector3'
	>,
	skinview3d: Pick<
		Skinview3dModule,
		'PlayerObject' | 'IdleAnimation' | 'NameTagObject'
	>,
	skinviewUtils: Pick<
		SkinviewUtilsModule,
		'inferModelType' | 'loadImage' | 'loadSkinToCanvas'
	>,
	options: {
		container: HTMLElement
		onSkinReady(): void
	},
) => {
	const {
		AmbientLight,
		ArrowHelper,
		Points,
		PointsMaterial,
		BufferGeometry,
		Float32BufferAttribute,
		CanvasTexture,
		Group,
		LinearFilter,
		Mesh,
		NearestFilter,
		SRGBColorSpace,
		Vector3,
	} = three
	const { PlayerObject, IdleAnimation, NameTagObject } = skinview3d
	const { inferModelType, loadImage, loadSkinToCanvas } = skinviewUtils
	const portalFontFamily =
		getComputedStyle(options.container).fontFamily || 'sans-serif'
	const labelTextureScale = Math.min(
		3,
		Math.max(2, Math.ceil(window.devicePixelRatio || 1)),
	)
	const detailLabelInnerEdgeX = 6
	const createWorldLabel = (
		text: string,
		{
			textStyle = '#ffffff',
			height = 3.2,
			compact = false,
			horizontalAnchor = 0.5,
		}: WorldLabelOptions = {},
	) => {
		const label = new NameTagObject(text || ' ', {
			font: `${compact ? 500 : 600} ${42 * labelTextureScale}px ${portalFontFamily}`,
			margin: (compact ? [0, 0, 0, 0] : [3, 5, 3, 5]).map(
				(value) => value * labelTextureScale,
			) as [number, number, number, number],
			textStyle,
			backgroundStyle: 'rgba(0, 0, 0, 0)',
			height,
		})
		label.material.depthTest = false
		label.material.depthWrite = false
		label.material.map!.colorSpace = SRGBColorSpace
		label.material.map!.magFilter = LinearFilter
		label.material.map!.minFilter = LinearFilter
		label.material.map!.needsUpdate = true
		label.center.set(horizontalAnchor, 0.5)
		label.renderOrder = 1000
		label.userData.labelText = text
		return label
	}
	const setWorldLabelPosition = (
		label: NameTagObject,
		x: number,
		y: number,
		z: number,
	) => {
		label.position.set(x, y, z)
	}
	const setWorldLabelVisible = (label: NameTagObject, visible: boolean) => {
		label.visible = visible
	}
	const setWorldLabelOpacity = (label: NameTagObject, opacity: number) => {
		label.material.opacity = opacity
	}
	const disposeWorldLabel = (label: NameTagObject) => {
		label.material.map?.dispose()
		label.material.dispose()
	}

	const createPlayerMarker = (): PlayerPresenceMarker => {
		const canvas = document.createElement('canvas')
		canvas.width = 96
		canvas.height = 96
		const context = canvas.getContext('2d')
		if (!context) throw new Error('PLAYER_MARKER_CANVAS_UNAVAILABLE')
		context.beginPath()
		context.arc(48, 48, 30, 0, Math.PI * 2)
		context.fillStyle = 'rgba(255, 255, 255, 0.42)'
		context.fill()
		context.beginPath()
		context.arc(48, 48, 18, 0, Math.PI * 2)
		context.fillStyle = '#0ea5e9'
		context.fill()
		context.lineWidth = 7
		context.strokeStyle = '#ffffff'
		context.stroke()

		const geometry = new BufferGeometry()
		geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3))
		const point = new Points(
			geometry,
			new PointsMaterial({
				map: new CanvasTexture(canvas),
				transparent: true,
				alphaTest: 0.01,
				size: 32,
				sizeAttenuation: false,
				depthTest: false,
				depthWrite: false,
			}),
		)
		point.renderOrder = 1000

		const root = new Group()
		root.add(point)
		const modelAnchor = new Group()
		modelAnchor.visible = false
		modelAnchor.position.y = -8
		const playerModel = new PlayerObject()
		playerModel.position.y = 16
		playerModel.cape.visible = false
		playerModel.elytra.visible = false
		playerModel.ears.visible = false
		modelAnchor.add(playerModel)
		root.add(modelAnchor)
		root.add(new AmbientLight(0xffffff, 1))

		const depthResetGeometry = new BufferGeometry()
		depthResetGeometry.setAttribute(
			'position',
			new Float32BufferAttribute([0, 0, 0], 3),
		)
		const depthResetMaterial = new PointsMaterial({
			size: 1,
			sizeAttenuation: false,
			depthTest: false,
			depthWrite: false,
		})
		depthResetMaterial.colorWrite = false
		const depthResetPoint = new Points(depthResetGeometry, depthResetMaterial)
		depthResetPoint.frustumCulled = false
		depthResetPoint.renderOrder = 999
		depthResetPoint.onBeforeRender = (renderer) => renderer.clearDepth()
		modelAnchor.add(depthResetPoint)

		const modelGeometries = new Set<{ dispose(): void }>()
		const modelMaterialStates = new Map<
			PlayerRenderMaterial,
			{ opacity: number; transparent: boolean }
		>()
		const playerMeshes: InstanceType<typeof Mesh>[] = []
		playerModel.traverse((object) => {
			if (!(object instanceof Mesh)) return
			playerMeshes.push(object)
			modelGeometries.add(object.geometry)
		})
		for (const mesh of playerMeshes) {
			const sourceMaterials = (
				Array.isArray(mesh.material) ? mesh.material : [mesh.material]
			) as PlayerRenderMaterial[]
			for (const source of sourceMaterials) {
				if (!modelMaterialStates.has(source)) {
					modelMaterialStates.set(source, {
						opacity: source.opacity,
						transparent: source.transparent,
					})
				}
			}
			mesh.renderOrder = 1000
		}

		const directionArrow = new ArrowHelper(
			new Vector3(0, 0, 1),
			new Vector3(0, -7.7, 0),
			BLUE_MAP_RUNTIME.PLAYER_DIRECTION_LENGTH,
			0x38bdf8,
			4,
			2,
		)
		directionArrow.visible = false
		directionArrow.line.renderOrder = 1000
		directionArrow.cone.renderOrder = 1000
		for (const material of [
			directionArrow.line.material,
			directionArrow.cone.material,
		].flat()) {
			material.depthTest = false
			material.depthWrite = false
			material.opacity = 0
			material.transparent = true
		}
		root.add(directionArrow)

		const detailAnchor = new Group()
		detailAnchor.position.y = 8
		detailAnchor.visible = false
		const coordinateLabel = createWorldLabel(' ', { horizontalAnchor: 1 })
		setWorldLabelPosition(coordinateLabel, -detailLabelInnerEdgeX, 0, 0)
		const playerIdLabel = createWorldLabel(' ', { horizontalAnchor: 0 })
		setWorldLabelPosition(playerIdLabel, detailLabelInnerEdgeX, 0, 0)
		detailAnchor.add(coordinateLabel, playerIdLabel)
		root.add(detailAnchor)

		const directionLabel = createWorldLabel(' ', {
			textStyle: '#bae6fd',
			height: 2.25,
			compact: true,
		})
		setWorldLabelPosition(directionLabel, 0, -7.55, 9)
		setWorldLabelVisible(directionLabel, false)
		root.add(directionLabel)

		const marker = root as unknown as PlayerPresenceMarker
		marker.dot = point
		marker.modelAnchor = modelAnchor
		marker.detailAnchor = detailAnchor
		marker.directionArrow = directionArrow
		marker.detailLabels = {
			coordinates: coordinateLabel,
			direction: directionLabel,
			playerId: playerIdLabel,
		}
		marker.setDetailLabels = (labels) => {
			const replaceLabel = (
				key: keyof PlayerPresenceMarker['detailLabels'],
				text: string,
				parent: typeof root,
				position: { x: number; y: number; z: number },
				options: WorldLabelOptions = {},
			) => {
				const current = marker.detailLabels[key]
				if (current.userData.labelText === text) return
				parent.remove(current)
				disposeWorldLabel(current)
				const next = createWorldLabel(text, options)
				setWorldLabelPosition(next, position.x, position.y, position.z)
				parent.add(next)
				marker.detailLabels[key] = next
			}

			replaceLabel(
				'coordinates',
				labels.coordinates,
				detailAnchor,
				{
					x: -detailLabelInnerEdgeX,
					y: 0,
					z: 0,
				},
				{ horizontalAnchor: 1 },
			)
			replaceLabel(
				'playerId',
				labels.playerId,
				detailAnchor,
				{
					x: detailLabelInnerEdgeX,
					y: 0,
					z: 0,
				},
				{ horizontalAnchor: 0 },
			)
			replaceLabel(
				'direction',
				labels.direction,
				root,
				marker.detailLabels.direction.position,
				{
					textStyle: '#bae6fd',
					height: 2.25,
					compact: true,
				},
			)
		}
		marker.setDirection = (yawRadians) => {
			const x = -Math.sin(yawRadians)
			const z = Math.cos(yawRadians)
			directionArrow.setDirection(new Vector3(x, 0, z))
			setWorldLabelPosition(
				marker.detailLabels.direction,
				x * (BLUE_MAP_RUNTIME.PLAYER_DIRECTION_LENGTH / 2),
				-7.55,
				z * (BLUE_MAP_RUNTIME.PLAYER_DIRECTION_LENGTH / 2),
			)
		}
		marker.setPresentationOpacity = (opacity) => {
			const visible = opacity > 0.001
			setWorldLabelVisible(marker.detailLabels.direction, visible)
			for (const [material, state] of modelMaterialStates) {
				material.opacity = state.opacity * opacity
				const transparent = state.transparent || opacity < 0.999
				if (material.transparent !== transparent) {
					material.transparent = transparent
					material.needsUpdate = true
				}
			}
			for (const label of Object.values(marker.detailLabels)) {
				setWorldLabelOpacity(label, opacity)
			}
			for (const material of [
				directionArrow.line.material,
				directionArrow.cone.material,
			].flat()) {
				material.opacity = opacity
			}
		}
		marker.playerModel = playerModel
		marker.idleAnimation = new IdleAnimation()
		marker.skinTexture = null
		marker.skinUrl = null
		marker.skinReady = false
		marker.skinLoadGeneration = 0
		marker.dispose = () => {
			marker.skinLoadGeneration += 1
			marker.skinTexture?.dispose()
			for (const label of Object.values(marker.detailLabels)) {
				disposeWorldLabel(label)
			}
			directionArrow.dispose()
			point.material.map?.dispose()
			point.material.dispose()
			point.geometry.dispose()
			depthResetMaterial.dispose()
			depthResetGeometry.dispose()
			for (const material of modelMaterialStates.keys()) material.dispose()
			for (const modelGeometry of modelGeometries) modelGeometry.dispose()
		}
		return marker
	}

	const loadPlayerSkin = (marker: PlayerPresenceMarker, skinUrl: string) => {
		if (marker.skinUrl === skinUrl) return
		marker.skinUrl = skinUrl
		marker.skinReady = false
		marker.modelAnchor.visible = false
		marker.dot.visible = true
		marker.dot.material.opacity = 1
		const generation = ++marker.skinLoadGeneration

		void (async () => {
			try {
				const image = await loadImage(skinUrl)
				if (generation !== marker.skinLoadGeneration) return
				const skinCanvas = document.createElement('canvas')
				skinCanvas.width = 64
				skinCanvas.height = 64
				loadSkinToCanvas(skinCanvas, image)
				const texture = new CanvasTexture(skinCanvas)
				texture.magFilter = NearestFilter
				texture.minFilter = NearestFilter
				texture.colorSpace = SRGBColorSpace
				marker.skinTexture?.dispose()
				marker.skinTexture = texture
				marker.playerModel.skin.map = texture
				marker.playerModel.skin.modelType = inferModelType(skinCanvas)
				marker.skinReady = true
				options.onSkinReady()
			} catch {
				if (generation !== marker.skinLoadGeneration) return
				marker.skinReady = false
				marker.modelAnchor.visible = false
			}
		})()
	}

	return { createPlayerMarker, loadPlayerSkin }
}
