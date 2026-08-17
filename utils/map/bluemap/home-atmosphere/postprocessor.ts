import { Vector2, Vector3 } from 'three'
import type { ShaderMaterial, WebGLRenderer } from 'three'
import type { BlueMapHomeAtmospherePostProcessing } from '../types'
import { FullscreenPassRenderer } from './fullscreen-pass-renderer'
import { HomeAtmosphereInteractionField } from './interaction-field'
import { createMaterial, createRenderTarget } from './render-utils'
import {
	blurFragmentShader,
	bloomFragmentShader,
	compositeFragmentShader,
	lightFragmentShader,
	waterGlintFragmentShader,
} from './shaders'
import { HomeAtmosphereWorldLightProjector } from './world-light-projector'
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
	private readonly passRenderer: FullscreenPassRenderer
	private readonly targetSize = new Vector2()
	private readonly blurMaterial: ShaderMaterial
	private readonly lightMaterial: ShaderMaterial
	private readonly waterGlintMaterial: ShaderMaterial
	private readonly bloomMaterial: ShaderMaterial
	private readonly compositeMaterial: ShaderMaterial
	private readonly interactionField: HomeAtmosphereInteractionField
	private readonly worldLightProjector: HomeAtmosphereWorldLightProjector
	private options: BlueMapHomeAtmospherePostProcessing
	private qualityScale: number
	private waterGlintSpeed: number
	private waterEffectsEnabled: boolean
	private waterEffectsActive = true
	private waterCompositeActive = true
	private atmosphereEffectsActive = true
	private waterEffectFrameInterval: number
	private presentationProgress = 0
	private readonly reducedMotion: boolean
	private elapsedSeconds = 0
	private lastWaterEffectRenderSeconds = Number.NEGATIVE_INFINITY
	private renderActive = true
	private disposed = false

	constructor(
		viewer: BlueMapPostProcessingViewer,
		options: BlueMapHomeAtmospherePostProcessing,
	) {
		this.viewer = viewer
		this.renderer = viewer.renderer
		this.originalRender = viewer.render
		this.nativeRender = viewer.render.bind(viewer)
		this.options = options
		const isMobile = window.matchMedia('(max-width: 639px)').matches
		this.reducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches
		this.qualityScale = isMobile
			? options.mobileQualityScale
			: options.desktopQualityScale
		this.waterEffectsEnabled = Boolean(options.water)
		this.waterEffectFrameInterval = 1 / (isMobile ? 24 : 30)
		this.waterGlintSpeed = this.reducedMotion
			? 0
			: (options.water?.glintSpeed ?? 0)

		const initialSunPosition = new Vector2(options.sunX, options.sunY)
		const initialBeamDirection = new Vector2(
			Math.sin(options.beamAngle),
			-Math.cos(options.beamAngle),
		).normalize()
		const initialBeamWidth = isMobile
			? options.mobileBeamWidth
			: options.desktopBeamWidth
		const waterLightDirection = initialBeamDirection.clone().multiplyScalar(-1)
		this.blurMaterial = createMaterial(blurFragmentShader, {
			tDiffuse: { value: null },
			texelSize: { value: new Vector2(0.5, 0.5) },
			direction: { value: new Vector2(1, 0) },
		})
		this.lightMaterial = createMaterial(lightFragmentShader, {
			tDiffuse: { value: this.blurTargetB.texture },
			tInteraction: { value: null },
			sunPosition: { value: initialSunPosition.clone() },
			beamDirection: { value: initialBeamDirection.clone() },
			beamForwardBasis: {
				value: initialBeamDirection.clone().multiplyScalar(0.5),
			},
			beamAcrossBasis: {
				value: new Vector2(
					-initialBeamDirection.y,
					initialBeamDirection.x,
				).multiplyScalar(initialBeamWidth),
			},
			beamWidth: { value: initialBeamWidth },
			beamSpread: { value: options.beamSpread },
			viewportAspect: { value: 1 },
			time: { value: 0 },
			intensity: { value: options.intensity },
		})
		this.waterGlintMaterial = createMaterial(waterGlintFragmentShader, {
			tScene: { value: this.sceneTarget.texture },
			tLight: { value: this.lightTarget.texture },
			tInteraction: { value: null },
			sunPosition: { value: initialSunPosition.clone() },
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
			tInteraction: { value: null },
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
			waterReflectionWidth: { value: options.water?.reflectionWidth ?? 0 },
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
		this.interactionField = new HomeAtmosphereInteractionField(
			viewer,
			this.passRenderer,
		)
		this.worldLightProjector = new HomeAtmosphereWorldLightProjector({
			viewer,
			lightMaterial: this.lightMaterial,
			waterGlintMaterial: this.waterGlintMaterial,
			compositeMaterial: this.compositeMaterial,
			reducedMotion: this.reducedMotion,
		})
		this.worldLightProjector.setOptions(options, isMobile)
		this.syncInteractionTexture()
		this.resize()
		this.setAtmosphereProgress(0)
		viewer.render = (delta) => this.render(delta)
	}

	resize(): void {
		if (this.disposed) return
		const previousQualityScale = this.qualityScale
		this.syncViewportProfile()
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
		this.interactionField.resize(
			width,
			height,
			Math.min(this.qualityScale, 0.25),
		)
		;(this.blurMaterial.uniforms.texelSize!.value as Vector2).set(
			1 / effectWidth,
			1 / effectHeight,
		)
		;(this.bloomMaterial.uniforms.texelSize!.value as Vector2).set(
			1 / effectWidth,
			1 / effectHeight,
		)
		this.setViewportAspect(width / height)
		;(this.compositeMaterial.uniforms.sceneTexelSize!.value as Vector2).set(
			1 / width,
			1 / height,
		)
		if (previousQualityScale !== this.qualityScale) {
			this.worldLightProjector.invalidate()
		}
	}

	setAtmosphereProgress(progress: number): void {
		const clampedProgress = Math.min(Math.max(progress, 0), 1)
		this.presentationProgress = clampedProgress
		const effectStrength = 1 - clampedProgress
		const isMobile = window.matchMedia('(max-width: 639px)').matches
		this.compositeMaterial.uniforms.hazeStrength!.value =
			this.options.hazeStrength * effectStrength
		this.compositeMaterial.uniforms.blurStrength!.value =
			this.options.blurStrength * effectStrength
		this.compositeMaterial.uniforms.beamStrength!.value =
			this.options.beamStrength * effectStrength
		this.compositeMaterial.uniforms.waterRippleStrength!.value =
			(this.options.water?.rippleStrength ?? 0) * effectStrength
		this.compositeMaterial.uniforms.waterReflectionStrength!.value =
			(this.options.water?.reflectionStrength ?? 0) * effectStrength
		this.compositeMaterial.uniforms.waterGlintStrength!.value =
			(this.options.water?.glintStrength ?? 0) *
			(isMobile ? 0.82 : 1) *
			effectStrength
		this.compositeMaterial.uniforms.waterBloomStrength!.value =
			(this.options.water?.bloomStrength ?? 0) *
			(isMobile ? 0.76 : 1) *
			effectStrength
		this.waterGlintMaterial.uniforms.enabled!.value =
			this.options.water && effectStrength > 0.001 ? 1 : 0
		this.waterEffectsActive = effectStrength > 0.001
		this.waterCompositeActive = Boolean(this.options.water)
		this.atmosphereEffectsActive = effectStrength > 0.001
		this.interactionField.setEnabled(
			!isMobile && !this.reducedMotion && clampedProgress < 0.98,
		)
	}

	setOptions(options: BlueMapHomeAtmospherePostProcessing): void {
		const previousQualityScale = this.qualityScale
		this.options = options
		this.waterEffectsEnabled = Boolean(options.water)
		this.waterGlintSpeed = this.reducedMotion
			? 0
			: (options.water?.glintSpeed ?? 0)
		const isMobile = window.matchMedia('(max-width: 639px)').matches
		this.worldLightProjector.setOptions(options, isMobile)
		this.lightMaterial.uniforms.intensity!.value = options.intensity
		this.compositeMaterial.uniforms.waterReflectionWidth!.value =
			options.water?.reflectionWidth ?? 0
		this.waterGlintMaterial.uniforms.waveSeed!.value =
			options.water?.waveSeed ?? 0
		this.waterGlintMaterial.uniforms.irregularity!.value =
			options.water?.irregularity ?? 0
		this.waterGlintMaterial.uniforms.reflectionWidth!.value =
			options.water?.reflectionWidth ?? 0
		this.waterGlintMaterial.uniforms.glintSharpness!.value =
			options.water?.glintSharpness ?? 0
		this.bloomMaterial.uniforms.radius!.value = options.water?.bloomRadius ?? 0
		this.compositeMaterial.uniforms.waterWaveSeed!.value =
			options.water?.waveSeed ?? 0
		this.compositeMaterial.uniforms.waterIrregularity!.value =
			options.water?.irregularity ?? 0
		this.compositeMaterial.uniforms.waterTintColor!.value = new Vector3(
			...(options.water?.tintColor ?? [0, 0, 0]),
		)
		this.compositeMaterial.uniforms.waterTintStrength!.value =
			options.water?.tintStrength ?? 0
		this.compositeMaterial.uniforms.waterTransmissionStrength!.value =
			options.water?.transmissionStrength ?? 0
		this.resize()
		this.setAtmosphereProgress(this.presentationProgress)
		if (previousQualityScale === this.qualityScale) {
			this.worldLightProjector.invalidate()
		}
		this.viewer.redraw()
	}

	setRenderActive(active: boolean): void {
		if (this.renderActive === active) return
		this.renderActive = active
		if (active) this.viewer.redraw()
	}

	invalidateWorldAnchors(): void {
		this.worldLightProjector.invalidate()
	}

	dispose(): void {
		if (this.disposed) return
		this.disposed = true
		this.viewer.render = this.originalRender
		this.interactionField.dispose()
		this.sceneTarget.dispose()
		this.blurTargetA.dispose()
		this.blurTargetB.dispose()
		this.lightTarget.dispose()
		this.waterGlintTarget.dispose()
		this.waterBloomTarget.dispose()
		this.blurMaterial.dispose()
		this.lightMaterial.dispose()
		this.waterGlintMaterial.dispose()
		this.bloomMaterial.dispose()
		this.compositeMaterial.dispose()
		this.passRenderer.dispose()
	}

	private render(delta: number): void {
		if (!this.renderActive || this.disposed) return
		const deltaSeconds = Math.min(Math.max(delta, 0), 100) / 1000
		this.elapsedSeconds += deltaSeconds
		if (!this.atmosphereEffectsActive && !this.waterCompositeActive) {
			this.renderer.setRenderTarget(null)
			this.nativeRender(delta)
			return
		}

		this.renderer.setRenderTarget(this.sceneTarget)
		this.nativeRender(delta)
		if (this.atmosphereEffectsActive) {
			this.worldLightProjector.update(this.elapsedSeconds)
			this.interactionField.update(deltaSeconds, this.elapsedSeconds)
			this.syncInteractionTexture()
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
				this.elapsedSeconds * this.options.animationSpeed
			this.passRenderer.renderMaterial(this.lightMaterial, this.lightTarget)
		}
		this.compositeMaterial.uniforms.tBlurred!.value = this
			.atmosphereEffectsActive
			? this.blurTargetB.texture
			: this.sceneTarget.texture
		this.compositeMaterial.uniforms.time!.value =
			this.elapsedSeconds * (this.options.water?.animationSpeed ?? 0)
		if (
			this.waterEffectsEnabled &&
			this.waterEffectsActive &&
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

	private syncInteractionTexture(): void {
		const interactionTexture = this.interactionField.texture
		this.lightMaterial.uniforms.tInteraction!.value = interactionTexture
		this.waterGlintMaterial.uniforms.tInteraction!.value = interactionTexture
		this.compositeMaterial.uniforms.tInteraction!.value = interactionTexture
	}

	private setViewportAspect(aspect: number): void {
		this.lightMaterial.uniforms.viewportAspect!.value = aspect
		this.waterGlintMaterial.uniforms.viewportAspect!.value = aspect
		this.compositeMaterial.uniforms.viewportAspect!.value = aspect
	}

	private syncViewportProfile(): void {
		const isMobile = window.matchMedia('(max-width: 639px)').matches
		this.qualityScale = isMobile
			? this.options.mobileQualityScale
			: this.options.desktopQualityScale
		this.waterEffectFrameInterval = 1 / (isMobile ? 24 : 30)
		this.waterGlintMaterial.uniforms.glintDensity!.value =
			(this.options.water?.glintDensity ?? 0) * (isMobile ? 0.72 : 1)
		this.bloomMaterial.uniforms.radius!.value =
			(this.options.water?.bloomRadius ?? 0) * (isMobile ? 0.86 : 1)
		this.compositeMaterial.uniforms.waterGlintStrength!.value =
			(this.options.water?.glintStrength ?? 0) *
			(isMobile ? 0.82 : 1) *
			(1 - this.presentationProgress)
		this.compositeMaterial.uniforms.waterBloomStrength!.value =
			(this.options.water?.bloomStrength ?? 0) *
			(isMobile ? 0.76 : 1) *
			(1 - this.presentationProgress)
		this.interactionField.setEnabled(
			!isMobile && !this.reducedMotion && this.presentationProgress < 0.98,
		)
		this.worldLightProjector.setOptions(this.options, isMobile)
	}
}

export const createHomeAtmospherePostProcessor = (
	viewer: BlueMapPostProcessingViewer,
	options: BlueMapHomeAtmospherePostProcessing,
) => new HomeAtmospherePostProcessor(viewer, options)
