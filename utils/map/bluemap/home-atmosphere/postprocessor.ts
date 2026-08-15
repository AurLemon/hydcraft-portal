import {
	type Camera,
	Plane,
	Raycaster,
	type ShaderMaterial,
	Vector2,
	Vector3,
	type WebGLRenderer,
} from 'three'
import type { BlueMapHomeAtmospherePostProcessing } from '../types'
import { FullscreenPassRenderer } from './fullscreen-pass-renderer'
import { createMaterial, createRenderTarget } from './render-utils'
import {
	blurFragmentShader,
	bloomFragmentShader,
	compositeFragmentShader,
	interactionFragmentShader,
	lightFragmentShader,
	waterGlintFragmentShader,
} from './shaders'
import type { BlueMapPostProcessingViewer } from './types'

class HomeAtmospherePostProcessor {
	private readonly renderer: WebGLRenderer
	private readonly viewer: BlueMapPostProcessingViewer
	private readonly originalRender: (delta: number) => void
	private readonly nativeRender: (delta: number) => void
	private readonly sceneTarget = createRenderTarget(true)
	private readonly blurTargetA = createRenderTarget(false)
	private readonly blurTargetB = createRenderTarget(false)
	private readonly lightTarget = createRenderTarget(false)
	private readonly waterGlintTarget = createRenderTarget(false)
	private readonly waterBloomTarget = createRenderTarget(false)
	private readonly interactionTargetA = createRenderTarget(false)
	private readonly interactionTargetB = createRenderTarget(false)
	private interactionReadTarget = this.interactionTargetA
	private interactionWriteTarget = this.interactionTargetB
	private readonly passRenderer: FullscreenPassRenderer
	private readonly targetSize = new Vector2()
	private readonly blurMaterial: ShaderMaterial
	private readonly interactionMaterial: ShaderMaterial
	private readonly lightMaterial: ShaderMaterial
	private readonly waterGlintMaterial: ShaderMaterial
	private readonly bloomMaterial: ShaderMaterial
	private readonly compositeMaterial: ShaderMaterial
	private readonly qualityScale: number
	private readonly waterGlintSpeed: number
	private readonly waterEffectsEnabled: boolean
	private readonly waterEffectFrameInterval: number
	private readonly interactionEnabled: boolean
	private readonly interactionQualityScale: number
	private readonly initialSunPosition: Vector2
	private readonly initialBeamDirection: Vector2
	private readonly initialBeamWidth: number
	private readonly raycaster = new Raycaster()
	private readonly anchorPlane = new Plane(new Vector3(0, 1, 0))
	private readonly worldSunAnchor = new Vector3()
	private readonly worldForwardAnchor = new Vector3()
	private readonly worldAcrossAnchor = new Vector3()
	private readonly projectedSun = new Vector3()
	private readonly projectedForward = new Vector3()
	private readonly projectedAcross = new Vector3()
	private readonly projectedSunUv = new Vector2()
	private readonly projectedForwardUv = new Vector2()
	private readonly projectedAcrossUv = new Vector2()
	private readonly latestPointerUv = new Vector2()
	private readonly renderedPointerUv = new Vector2()
	private readonly pointerVelocity = new Vector2()
	private readonly pointerSampleUv = new Vector2()
	private readonly pointerMovement = new Vector2()
	private pointerBoundsLeft = 0
	private pointerBoundsTop = 0
	private pointerBoundsWidth = 0
	private pointerBoundsHeight = 0
	private elapsedSeconds = 0
	private lastWaterEffectRenderSeconds = Number.NEGATIVE_INFINITY
	private lastInteractionRenderSeconds = Number.NEGATIVE_INFINITY
	private lastPointerEventMilliseconds = 0
	private pendingPointerStrength = 0
	private pointerPositionReady = false
	private pointerPresent = false
	private interactionNeedsReset = true
	private worldAnchorsReady = false
	private disposed = false
	private readonly handlePointerMove = (event: PointerEvent) => {
		if (!this.interactionEnabled || event.pointerType !== 'mouse') return
		if (this.pointerBoundsWidth <= 0 || this.pointerBoundsHeight <= 0) {
			this.updatePointerBounds()
		}
		if (this.pointerBoundsWidth <= 0 || this.pointerBoundsHeight <= 0) return
		if (
			event.clientX < this.pointerBoundsLeft ||
			event.clientX > this.pointerBoundsLeft + this.pointerBoundsWidth ||
			event.clientY < this.pointerBoundsTop ||
			event.clientY > this.pointerBoundsTop + this.pointerBoundsHeight
		) {
			this.deactivatePointer()
			return
		}

		this.pointerSampleUv.set(
			(event.clientX - this.pointerBoundsLeft) / this.pointerBoundsWidth,
			1 - (event.clientY - this.pointerBoundsTop) / this.pointerBoundsHeight,
		)
		const now = performance.now()
		this.pointerPresent = true
		this.viewer.redraw()
		if (!this.pointerPositionReady) {
			this.latestPointerUv.copy(this.pointerSampleUv)
			this.renderedPointerUv.copy(this.pointerSampleUv)
			this.lastPointerEventMilliseconds = now
			this.pointerPositionReady = true
			return
		}

		this.pointerMovement.copy(this.pointerSampleUv).sub(this.latestPointerUv)
		const elapsedMilliseconds = Math.max(
			now - this.lastPointerEventMilliseconds,
			1,
		)
		const speedPixelsPerMillisecond =
			Math.hypot(
				this.pointerMovement.x * this.pointerBoundsWidth,
				this.pointerMovement.y * this.pointerBoundsHeight,
			) / elapsedMilliseconds
		const normalizedSpeed = Math.min(
			Math.max((speedPixelsPerMillisecond - 0.025) / 1.2, 0),
			1,
		)
		if (this.pointerMovement.lengthSq() > 0.0000001 && normalizedSpeed > 0) {
			this.pointerVelocity.copy(this.pointerMovement).normalize()
			this.pendingPointerStrength = Math.max(
				this.pendingPointerStrength,
				0.2 + normalizedSpeed * 0.8,
			)
		}
		this.latestPointerUv.copy(this.pointerSampleUv)
		this.lastPointerEventMilliseconds = now
	}
	private readonly handlePointerLeave = () => this.deactivatePointer()
	private readonly handleWindowBlur = () => this.deactivatePointer()

	constructor(
		viewer: BlueMapPostProcessingViewer,
		options: BlueMapHomeAtmospherePostProcessing,
	) {
		this.viewer = viewer
		this.renderer = viewer.renderer
		this.originalRender = viewer.render
		this.nativeRender = viewer.render.bind(viewer)
		const isMobile = window.matchMedia('(max-width: 639px)').matches
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches
		this.qualityScale = isMobile
			? options.mobileQualityScale
			: options.desktopQualityScale
		this.waterEffectsEnabled = Boolean(options.water)
		this.waterEffectFrameInterval = 1 / (isMobile ? 24 : 30)
		this.interactionEnabled = !isMobile && !prefersReducedMotion
		this.interactionQualityScale = Math.min(this.qualityScale, 0.25)
		this.waterGlintSpeed = prefersReducedMotion
			? 0
			: (options.water?.glintSpeed ?? 0)

		this.initialSunPosition = new Vector2(options.sunX, options.sunY)
		this.initialBeamDirection = new Vector2(
			Math.sin(options.beamAngle),
			-Math.cos(options.beamAngle),
		).normalize()
		this.initialBeamWidth = isMobile
			? options.mobileBeamWidth
			: options.desktopBeamWidth
		this.blurMaterial = createMaterial(blurFragmentShader, {
			tDiffuse: { value: null },
			texelSize: { value: new Vector2(0.5, 0.5) },
			direction: { value: new Vector2(1, 0) },
		})
		this.interactionMaterial = createMaterial(interactionFragmentShader, {
			tPrevious: { value: this.interactionReadTarget.texture },
			pointerFrom: { value: new Vector2() },
			pointerTo: { value: new Vector2() },
			pointerVelocity: { value: new Vector2() },
			pointerPosition: { value: new Vector2() },
			pointerStrength: { value: 0 },
			pointerPresence: { value: 0 },
			viewportAspect: { value: 1 },
			decay: { value: 0 },
			reset: { value: 1 },
		})
		this.lightMaterial = createMaterial(lightFragmentShader, {
			tDiffuse: { value: this.blurTargetB.texture },
			tInteraction: { value: this.interactionReadTarget.texture },
			sunPosition: { value: this.initialSunPosition.clone() },
			beamDirection: { value: this.initialBeamDirection.clone() },
			beamForwardBasis: {
				value: this.initialBeamDirection.clone().multiplyScalar(0.5),
			},
			beamAcrossBasis: {
				value: new Vector2(
					-this.initialBeamDirection.y,
					this.initialBeamDirection.x,
				).multiplyScalar(this.initialBeamWidth),
			},
			beamWidth: { value: this.initialBeamWidth },
			beamSpread: { value: options.beamSpread },
			viewportAspect: { value: 1 },
			time: { value: 0 },
			intensity: { value: options.intensity },
		})
		const waterLightDirection = this.initialBeamDirection
			.clone()
			.multiplyScalar(-1)
		this.waterGlintMaterial = createMaterial(waterGlintFragmentShader, {
			tScene: { value: this.sceneTarget.texture },
			tLight: { value: this.lightTarget.texture },
			tInteraction: { value: this.interactionReadTarget.texture },
			sunPosition: { value: this.initialSunPosition.clone() },
			waterLightDirection: { value: waterLightDirection.clone() },
			viewportAspect: { value: 1 },
			time: { value: 0 },
			waveSeed: { value: options.water?.waveSeed ?? 0 },
			irregularity: { value: options.water?.irregularity ?? 0 },
			reflectionWidth: { value: options.water?.reflectionWidth ?? 0 },
			glintDensity: {
				value: (options.water?.glintDensity ?? 0) * (isMobile ? 0.72 : 1),
			},
			glintSharpness: { value: options.water?.glintSharpness ?? 0 },
			enabled: { value: options.water ? 1 : 0 },
		})
		this.bloomMaterial = createMaterial(bloomFragmentShader, {
			tDiffuse: { value: this.waterGlintTarget.texture },
			texelSize: { value: new Vector2(0.5, 0.5) },
			radius: {
				value: (options.water?.bloomRadius ?? 0) * (isMobile ? 0.86 : 1),
			},
		})
		this.compositeMaterial = createMaterial(compositeFragmentShader, {
			tScene: { value: this.sceneTarget.texture },
			tBlurred: { value: this.blurTargetB.texture },
			tLight: { value: this.lightTarget.texture },
			tInteraction: { value: this.interactionReadTarget.texture },
			tWaterGlint: { value: this.waterGlintTarget.texture },
			tWaterBloom: { value: this.waterBloomTarget.texture },
			blurStrength: { value: options.blurStrength },
			beamStrength: { value: options.beamStrength },
			hazeStrength: { value: options.hazeStrength },
			viewportAspect: { value: 1 },
			time: { value: 0 },
			waterRippleStrength: { value: options.water?.rippleStrength ?? 0 },
			waterReflectionStrength: {
				value: options.water?.reflectionStrength ?? 0,
			},
			waterReflectionWidth: {
				value: options.water?.reflectionWidth ?? 0,
			},
			waterWaveSeed: { value: options.water?.waveSeed ?? 0 },
			waterIrregularity: { value: options.water?.irregularity ?? 0 },
			waterLightDirection: { value: waterLightDirection.clone() },
			sceneTexelSize: { value: new Vector2(0.5, 0.5) },
			waterTintColor: {
				value: new Vector3(...(options.water?.tintColor ?? [0, 0, 0])),
			},
			waterTintStrength: { value: options.water?.tintStrength ?? 0 },
			waterTransmissionStrength: {
				value: options.water?.transmissionStrength ?? 0,
			},
			waterGlintStrength: {
				value: (options.water?.glintStrength ?? 0) * (isMobile ? 0.82 : 1),
			},
			waterBloomStrength: {
				value: (options.water?.bloomStrength ?? 0) * (isMobile ? 0.76 : 1),
			},
		})
		this.passRenderer = new FullscreenPassRenderer(
			this.renderer,
			this.blurMaterial,
		)

		this.resize()
		if (this.interactionEnabled) {
			window.addEventListener('pointermove', this.handlePointerMove, {
				passive: true,
			})
			window.addEventListener('blur', this.handleWindowBlur)
			document.documentElement.addEventListener(
				'pointerleave',
				this.handlePointerLeave,
			)
		}
		viewer.render = (delta) => {
			this.render(
				delta,
				options.animationSpeed,
				options.water?.animationSpeed ?? 0,
			)
		}
	}

	resize() {
		if (this.disposed) return
		this.renderer.getDrawingBufferSize(this.targetSize)
		const width = Math.max(2, Math.floor(this.targetSize.x))
		const height = Math.max(2, Math.floor(this.targetSize.y))
		const effectWidth = Math.max(2, Math.floor(width * this.qualityScale))
		const effectHeight = Math.max(2, Math.floor(height * this.qualityScale))
		this.sceneTarget.setSize(width, height)
		this.blurTargetA.setSize(effectWidth, effectHeight)
		this.blurTargetB.setSize(effectWidth, effectHeight)
		this.lightTarget.setSize(effectWidth, effectHeight)
		this.waterGlintTarget.setSize(effectWidth, effectHeight)
		this.waterBloomTarget.setSize(effectWidth, effectHeight)
		const interactionWidth = this.interactionEnabled
			? Math.max(2, Math.floor(width * this.interactionQualityScale))
			: 2
		const interactionHeight = this.interactionEnabled
			? Math.max(2, Math.floor(height * this.interactionQualityScale))
			: 2
		this.interactionTargetA.setSize(interactionWidth, interactionHeight)
		this.interactionTargetB.setSize(interactionWidth, interactionHeight)
		this.interactionNeedsReset = true
		;(this.blurMaterial.uniforms.texelSize!.value as Vector2).set(
			1 / effectWidth,
			1 / effectHeight,
		)
		;(this.bloomMaterial.uniforms.texelSize!.value as Vector2).set(
			1 / effectWidth,
			1 / effectHeight,
		)
		this.lightMaterial.uniforms.viewportAspect!.value = width / height
		this.interactionMaterial.uniforms.viewportAspect!.value = width / height
		this.waterGlintMaterial.uniforms.viewportAspect!.value = width / height
		this.compositeMaterial.uniforms.viewportAspect!.value = width / height
		this.updatePointerBounds()
		;(this.compositeMaterial.uniforms.sceneTexelSize!.value as Vector2).set(
			1 / width,
			1 / height,
		)
	}

	dispose() {
		if (this.disposed) return
		this.disposed = true
		this.viewer.render = this.originalRender
		if (this.interactionEnabled) {
			window.removeEventListener('pointermove', this.handlePointerMove)
			window.removeEventListener('blur', this.handleWindowBlur)
			document.documentElement.removeEventListener(
				'pointerleave',
				this.handlePointerLeave,
			)
		}
		this.sceneTarget.dispose()
		this.blurTargetA.dispose()
		this.blurTargetB.dispose()
		this.lightTarget.dispose()
		this.waterGlintTarget.dispose()
		this.waterBloomTarget.dispose()
		this.interactionTargetA.dispose()
		this.interactionTargetB.dispose()
		this.blurMaterial.dispose()
		this.interactionMaterial.dispose()
		this.lightMaterial.dispose()
		this.waterGlintMaterial.dispose()
		this.bloomMaterial.dispose()
		this.compositeMaterial.dispose()
		this.passRenderer.dispose()
	}

	private render(
		delta: number,
		animationSpeed: number,
		waterAnimationSpeed: number,
	) {
		const deltaSeconds = Math.min(Math.max(delta, 0), 100) / 1000
		this.elapsedSeconds += deltaSeconds
		this.renderer.setRenderTarget(this.sceneTarget)
		this.nativeRender(delta)
		this.updateWorldProjection()
		this.updateInteraction(deltaSeconds)

		this.passRenderer.renderPass(
			this.sceneTarget.texture,
			this.blurMaterial,
			this.blurTargetA,
			1,
			0,
		)
		this.passRenderer.renderPass(
			this.blurTargetA.texture,
			this.blurMaterial,
			this.blurTargetB,
			0,
			1,
		)
		this.lightMaterial.uniforms.time!.value =
			this.elapsedSeconds * animationSpeed
		this.compositeMaterial.uniforms.time!.value =
			this.elapsedSeconds * waterAnimationSpeed
		this.passRenderer.renderMaterial(this.lightMaterial, this.lightTarget)
		if (
			this.waterEffectsEnabled &&
			this.elapsedSeconds - this.lastWaterEffectRenderSeconds >=
				this.waterEffectFrameInterval
		) {
			this.waterGlintMaterial.uniforms.time!.value =
				this.elapsedSeconds * this.waterGlintSpeed
			this.passRenderer.renderMaterial(
				this.waterGlintMaterial,
				this.waterGlintTarget,
			)
			this.passRenderer.renderMaterial(
				this.bloomMaterial,
				this.waterBloomTarget,
			)
			this.lastWaterEffectRenderSeconds = this.elapsedSeconds
		}
		this.passRenderer.renderMaterial(this.compositeMaterial, null)
	}

	private updateInteraction(deltaSeconds: number) {
		if (!this.interactionEnabled && !this.interactionNeedsReset) return

		const interactionDelta = Number.isFinite(this.lastInteractionRenderSeconds)
			? this.elapsedSeconds - this.lastInteractionRenderSeconds
			: deltaSeconds
		this.interactionMaterial.uniforms.tPrevious!.value =
			this.interactionReadTarget.texture
		;(this.interactionMaterial.uniforms.pointerFrom!.value as Vector2).copy(
			this.renderedPointerUv,
		)
		;(this.interactionMaterial.uniforms.pointerTo!.value as Vector2).copy(
			this.latestPointerUv,
		)
		;(this.interactionMaterial.uniforms.pointerVelocity!.value as Vector2).copy(
			this.pointerVelocity,
		)
		;(this.interactionMaterial.uniforms.pointerPosition!.value as Vector2).copy(
			this.latestPointerUv,
		)
		this.interactionMaterial.uniforms.pointerStrength!.value = this
			.interactionEnabled
			? this.pendingPointerStrength
			: 0
		this.interactionMaterial.uniforms.pointerPresence!.value =
			this.interactionEnabled && this.pointerPresent ? 1 : 0
		this.interactionMaterial.uniforms.decay!.value = Math.exp(
			-interactionDelta * 1.9,
		)
		this.interactionMaterial.uniforms.reset!.value = this.interactionNeedsReset
			? 1
			: 0
		this.passRenderer.renderMaterial(
			this.interactionMaterial,
			this.interactionWriteTarget,
		)

		const completedTarget = this.interactionWriteTarget
		this.interactionWriteTarget = this.interactionReadTarget
		this.interactionReadTarget = completedTarget
		const interactionTexture = this.interactionReadTarget.texture
		this.lightMaterial.uniforms.tInteraction!.value = interactionTexture
		this.waterGlintMaterial.uniforms.tInteraction!.value = interactionTexture
		this.compositeMaterial.uniforms.tInteraction!.value = interactionTexture

		if (this.pendingPointerStrength > 0) {
			this.renderedPointerUv.copy(this.latestPointerUv)
		}
		this.pendingPointerStrength = 0
		this.interactionNeedsReset = false
		this.lastInteractionRenderSeconds = this.elapsedSeconds
	}

	private updatePointerBounds() {
		const bounds = this.renderer.domElement.getBoundingClientRect()
		this.pointerBoundsLeft = bounds.left
		this.pointerBoundsTop = bounds.top
		this.pointerBoundsWidth = bounds.width
		this.pointerBoundsHeight = bounds.height
	}

	private deactivatePointer() {
		if (!this.pointerPresent && !this.pointerPositionReady) return
		this.pointerPresent = false
		this.pointerPositionReady = false
		this.pendingPointerStrength = 0
		this.viewer.redraw()
	}

	private updateWorldProjection() {
		const camera = this.viewer.camera
		camera.updateMatrixWorld()

		if (!this.worldAnchorsReady && !this.captureWorldAnchors(camera)) return

		this.projectWorldAnchor(
			this.worldSunAnchor,
			camera,
			this.projectedSun,
			this.projectedSunUv,
		)
		this.projectWorldAnchor(
			this.worldForwardAnchor,
			camera,
			this.projectedForward,
			this.projectedForwardUv,
		)
		this.projectWorldAnchor(
			this.worldAcrossAnchor,
			camera,
			this.projectedAcross,
			this.projectedAcrossUv,
		)

		const aspect = this.lightMaterial.uniforms.viewportAspect!.value as number
		;(this.lightMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.projectedSunUv,
		)
		;(this.waterGlintMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.projectedSunUv,
		)
		;(this.lightMaterial.uniforms.beamForwardBasis!.value as Vector2).set(
			(this.projectedForwardUv.x - this.projectedSunUv.x) * aspect,
			this.projectedForwardUv.y - this.projectedSunUv.y,
		)
		;(this.compositeMaterial.uniforms.waterLightDirection!.value as Vector2)
			.copy(this.lightMaterial.uniforms.beamForwardBasis!.value as Vector2)
			.multiplyScalar(-1)
			.normalize()
		;(
			this.waterGlintMaterial.uniforms.waterLightDirection!.value as Vector2
		).copy(
			this.compositeMaterial.uniforms.waterLightDirection!.value as Vector2,
		)
		;(this.lightMaterial.uniforms.beamAcrossBasis!.value as Vector2).set(
			(this.projectedAcrossUv.x - this.projectedSunUv.x) * aspect,
			this.projectedAcrossUv.y - this.projectedSunUv.y,
		)
	}

	private captureWorldAnchors(camera: Camera): boolean {
		const targetY = this.viewer.controlsManager.position.y
		if (!Number.isFinite(targetY)) return false

		const aspect = this.lightMaterial.uniforms.viewportAspect!.value as number
		const beamNormal = new Vector2(
			-this.initialBeamDirection.y,
			this.initialBeamDirection.x,
		)
		const forwardUv = this.initialSunPosition
			.clone()
			.add(
				new Vector2(
					(this.initialBeamDirection.x * 0.5) / aspect,
					this.initialBeamDirection.y * 0.5,
				),
			)
		const acrossUv = this.initialSunPosition
			.clone()
			.add(
				new Vector2(
					(beamNormal.x * this.initialBeamWidth) / aspect,
					beamNormal.y * this.initialBeamWidth,
				),
			)

		this.anchorPlane.constant = -targetY
		const captured =
			this.screenUvToWorld(
				this.initialSunPosition,
				camera,
				this.worldSunAnchor,
			) &&
			this.screenUvToWorld(forwardUv, camera, this.worldForwardAnchor) &&
			this.screenUvToWorld(acrossUv, camera, this.worldAcrossAnchor)
		this.worldAnchorsReady = captured
		return captured
	}

	private screenUvToWorld(
		uv: Vector2,
		camera: Camera,
		target: Vector3,
	): boolean {
		this.raycaster.setFromCamera(
			new Vector2(uv.x * 2 - 1, uv.y * 2 - 1),
			camera,
		)
		return this.raycaster.ray.intersectPlane(this.anchorPlane, target) !== null
	}

	private projectWorldAnchor(
		worldAnchor: Vector3,
		camera: Camera,
		projected: Vector3,
		targetUv: Vector2,
	) {
		projected.copy(worldAnchor).project(camera)
		targetUv.set((projected.x + 1) * 0.5, (projected.y + 1) * 0.5)
	}
}

export const createHomeAtmospherePostProcessor = (
	viewer: BlueMapPostProcessingViewer,
	options: BlueMapHomeAtmospherePostProcessing,
) => new HomeAtmospherePostProcessor(viewer, options)
