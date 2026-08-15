import type { Camera, WebGLRenderer } from 'three'

export interface BlueMapPostProcessingViewer {
	renderer: WebGLRenderer
	camera: Camera
	controlsManager: {
		position: {
			y: number
		}
	}
	redraw(): void
	render(delta: number): void
}
