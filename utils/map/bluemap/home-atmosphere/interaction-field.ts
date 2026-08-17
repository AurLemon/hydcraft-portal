import { Vector2 } from 'three'
import type { ShaderMaterial, WebGLRenderer } from 'three'
import type { FullscreenPassRenderer } from './fullscreen-pass-renderer'
import { createMaterial, createRenderTarget } from './render-utils'
import { interactionFragmentShader } from './shaders'
import type { BlueMapPostProcessingViewer } from './types'

export class HomeAtmosphereInteractionField {
	private readonly viewer: BlueMapPostProcessingViewer
	private readonly renderer: WebGLRenderer
	private readonly passRenderer: FullscreenPassRenderer
	private readonly targetA = createRenderTarget(false)
	private readonly targetB = createRenderTarget(false)
	private readTarget = this.targetA
	private writeTarget = this.targetB
	private readonly material: ShaderMaterial
	private readonly latestPointerUv = new Vector2()
	private readonly renderedPointerUv = new Vector2()
	private readonly pointerVelocity = new Vector2()
	private readonly pointerSampleUv = new Vector2()
	private readonly pointerMovement = new Vector2()
	private boundsLeft = 0
	private boundsTop = 0
	private boundsWidth = 0
	private boundsHeight = 0
	private lastRenderSeconds = Number.NEGATIVE_INFINITY
	private lastPointerEventMilliseconds = 0
	private pendingPointerStrength = 0
	private pointerPositionReady = false
	private pointerPresent = false
	private needsReset = true
	private enabled = false
	private listenersBound = false
	private disposed = false

	private readonly handlePointerMove = (event: PointerEvent) => {
		if (!this.enabled || event.pointerType !== 'mouse') return
		if (this.boundsWidth <= 0 || this.boundsHeight <= 0) {
			this.updatePointerBounds()
		}
		if (this.boundsWidth <= 0 || this.boundsHeight <= 0) return
		if (
			event.clientX < this.boundsLeft ||
			event.clientX > this.boundsLeft + this.boundsWidth ||
			event.clientY < this.boundsTop ||
			event.clientY > this.boundsTop + this.boundsHeight
		) {
			this.deactivatePointer()
			return
		}

		this.pointerSampleUv.set(
			(event.clientX - this.boundsLeft) / this.boundsWidth,
			1 - (event.clientY - this.boundsTop) / this.boundsHeight,
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
				this.pointerMovement.x * this.boundsWidth,
				this.pointerMovement.y * this.boundsHeight,
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
		passRenderer: FullscreenPassRenderer,
	) {
		this.viewer = viewer
		this.renderer = viewer.renderer
		this.passRenderer = passRenderer
		this.material = createMaterial(interactionFragmentShader, {
			tPrevious: { value: this.readTarget.texture },
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
	}

	get texture() {
		return this.readTarget.texture
	}

	setEnabled(enabled: boolean): void {
		const changed = this.enabled !== enabled
		this.enabled = enabled
		if (changed) {
			this.needsReset = true
			this.lastRenderSeconds = Number.NEGATIVE_INFINITY
			if (!enabled) this.deactivatePointer()
			this.viewer.redraw()
		}
		this.syncListeners()
	}

	resize(width: number, height: number, qualityScale: number): void {
		const interactionWidth = this.enabled
			? Math.max(2, Math.floor(width * qualityScale))
			: 2
		const interactionHeight = this.enabled
			? Math.max(2, Math.floor(height * qualityScale))
			: 2
		this.targetA.setSize(interactionWidth, interactionHeight)
		this.targetB.setSize(interactionWidth, interactionHeight)
		this.material.uniforms.viewportAspect!.value = width / height
		this.needsReset = true
		this.updatePointerBounds()
		this.deactivatePointer()
	}

	update(deltaSeconds: number, elapsedSeconds: number): void {
		if (!this.enabled && !this.needsReset) return
		const interactionDelta = Number.isFinite(this.lastRenderSeconds)
			? elapsedSeconds - this.lastRenderSeconds
			: deltaSeconds
		this.material.uniforms.tPrevious!.value = this.readTarget.texture
		;(this.material.uniforms.pointerFrom!.value as Vector2).copy(
			this.renderedPointerUv,
		)
		;(this.material.uniforms.pointerTo!.value as Vector2).copy(
			this.latestPointerUv,
		)
		;(this.material.uniforms.pointerVelocity!.value as Vector2).copy(
			this.pointerVelocity,
		)
		;(this.material.uniforms.pointerPosition!.value as Vector2).copy(
			this.latestPointerUv,
		)
		this.material.uniforms.pointerStrength!.value = this.enabled
			? this.pendingPointerStrength
			: 0
		this.material.uniforms.pointerPresence!.value =
			this.enabled && this.pointerPresent ? 1 : 0
		this.material.uniforms.decay!.value = Math.exp(-interactionDelta * 1.9)
		this.material.uniforms.reset!.value = this.needsReset ? 1 : 0
		this.passRenderer.renderMaterial(this.material, this.writeTarget)

		const completedTarget = this.writeTarget
		this.writeTarget = this.readTarget
		this.readTarget = completedTarget
		if (this.pendingPointerStrength > 0) {
			this.renderedPointerUv.copy(this.latestPointerUv)
		}
		this.pendingPointerStrength = 0
		this.needsReset = false
		this.lastRenderSeconds = elapsedSeconds
	}

	dispose(): void {
		if (this.disposed) return
		this.disposed = true
		this.enabled = false
		this.syncListeners()
		this.targetA.dispose()
		this.targetB.dispose()
		this.material.dispose()
	}

	private syncListeners(): void {
		if (this.enabled === this.listenersBound) return
		if (this.enabled) {
			window.addEventListener('pointermove', this.handlePointerMove, {
				passive: true,
			})
			window.addEventListener('blur', this.handleWindowBlur)
			document.documentElement.addEventListener(
				'pointerleave',
				this.handlePointerLeave,
			)
		} else {
			window.removeEventListener('pointermove', this.handlePointerMove)
			window.removeEventListener('blur', this.handleWindowBlur)
			document.documentElement.removeEventListener(
				'pointerleave',
				this.handlePointerLeave,
			)
		}
		this.listenersBound = this.enabled
	}

	private updatePointerBounds(): void {
		const bounds = this.renderer.domElement.getBoundingClientRect()
		this.boundsLeft = bounds.left
		this.boundsTop = bounds.top
		this.boundsWidth = bounds.width
		this.boundsHeight = bounds.height
	}

	private deactivatePointer(): void {
		if (!this.pointerPresent && !this.pointerPositionReady) return
		this.pointerPresent = false
		this.pointerPositionReady = false
		this.pointerVelocity.set(0, 0)
		this.pendingPointerStrength = 0
		this.viewer.redraw()
	}
}
