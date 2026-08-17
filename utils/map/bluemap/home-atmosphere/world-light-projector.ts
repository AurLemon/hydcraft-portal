import {
	type Camera,
	Plane,
	Raycaster,
	type ShaderMaterial,
	Vector2,
	Vector3,
} from 'three'
import type { BlueMapHomeAtmospherePostProcessing } from '../types'
import type { BlueMapPostProcessingViewer } from './types'

export class HomeAtmosphereWorldLightProjector {
	private readonly viewer: BlueMapPostProcessingViewer
	private readonly lightMaterial: ShaderMaterial
	private readonly waterGlintMaterial: ShaderMaterial
	private readonly compositeMaterial: ShaderMaterial
	private readonly reducedMotion: boolean
	private readonly initialSunPosition = new Vector2()
	private readonly initialBeamDirection = new Vector2()
	private initialBeamWidth = 0
	private scanXAmplitude = 0
	private scanPeriodSeconds = 1
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
	private worldAnchorsReady = false

	constructor(input: {
		viewer: BlueMapPostProcessingViewer
		lightMaterial: ShaderMaterial
		waterGlintMaterial: ShaderMaterial
		compositeMaterial: ShaderMaterial
		reducedMotion: boolean
	}) {
		this.viewer = input.viewer
		this.lightMaterial = input.lightMaterial
		this.waterGlintMaterial = input.waterGlintMaterial
		this.compositeMaterial = input.compositeMaterial
		this.reducedMotion = input.reducedMotion
	}

	setOptions(
		options: BlueMapHomeAtmospherePostProcessing,
		isMobile: boolean,
	): void {
		this.initialSunPosition.set(options.sunX, options.sunY)
		this.initialBeamDirection
			.set(Math.sin(options.beamAngle), -Math.cos(options.beamAngle))
			.normalize()
		this.initialBeamWidth = isMobile
			? options.mobileBeamWidth
			: options.desktopBeamWidth
		this.scanXAmplitude = options.scanXAmplitude
		this.scanPeriodSeconds = options.scanPeriodSeconds
		;(this.lightMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.initialSunPosition,
		)
		;(this.waterGlintMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.initialSunPosition,
		)
		;(this.lightMaterial.uniforms.beamDirection!.value as Vector2).copy(
			this.initialBeamDirection,
		)
		;(this.lightMaterial.uniforms.beamForwardBasis!.value as Vector2)
			.copy(this.initialBeamDirection)
			.multiplyScalar(0.5)
		;(this.lightMaterial.uniforms.beamAcrossBasis!.value as Vector2).set(
			-this.initialBeamDirection.y * this.initialBeamWidth,
			this.initialBeamDirection.x * this.initialBeamWidth,
		)
		this.lightMaterial.uniforms.beamWidth!.value = this.initialBeamWidth
		this.lightMaterial.uniforms.beamSpread!.value = options.beamSpread
		const waterLightDirection = this.initialBeamDirection
			.clone()
			.multiplyScalar(-1)
		;(
			this.waterGlintMaterial.uniforms.waterLightDirection!.value as Vector2
		).copy(waterLightDirection)
		;(
			this.compositeMaterial.uniforms.waterLightDirection!.value as Vector2
		).copy(waterLightDirection)
		this.invalidate()
	}

	update(elapsedSeconds: number): void {
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
		const scanOffsetX = this.getLightScanOffsetX(elapsedSeconds)
		;(this.lightMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.projectedSunUv,
		).x += scanOffsetX
		;(this.waterGlintMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.projectedSunUv,
		).x += scanOffsetX
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

	invalidate(): void {
		this.worldAnchorsReady = false
	}

	private getLightScanOffsetX(elapsedSeconds: number): number {
		if (this.reducedMotion || this.scanXAmplitude <= 0) return 0
		const periodSeconds = Math.max(this.scanPeriodSeconds, 1)
		return (
			Math.sin((elapsedSeconds / periodSeconds) * Math.PI * 2) *
			this.scanXAmplitude
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
	): void {
		projected.copy(worldAnchor).project(camera)
		targetUv.set((projected.x + 1) * 0.5, (projected.y + 1) * 0.5)
	}
}
