import {
	Mesh,
	OrthographicCamera,
	PlaneGeometry,
	Scene,
	type ShaderMaterial,
	type Texture,
	type Vector2,
	type WebGLRenderer,
	type WebGLRenderTarget,
} from 'three'

export class FullscreenPassRenderer {
	private readonly scene = new Scene()
	private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
	private readonly geometry = new PlaneGeometry(2, 2)
	private readonly quad: Mesh

	constructor(
		private readonly renderer: WebGLRenderer,
		initialMaterial: ShaderMaterial,
	) {
		this.quad = new Mesh(this.geometry, initialMaterial)
		this.quad.frustumCulled = false
		this.scene.add(this.quad)
	}

	renderPass(
		texture: Texture,
		material: ShaderMaterial,
		target: WebGLRenderTarget,
		directionX: number,
		directionY: number,
	) {
		material.uniforms.tDiffuse!.value = texture
		;(material.uniforms.direction!.value as Vector2).set(directionX, directionY)
		this.renderMaterial(material, target)
	}

	renderMaterial(material: ShaderMaterial, target: WebGLRenderTarget | null) {
		this.quad.material = material
		this.renderer.setRenderTarget(target)
		this.renderer.clear()
		this.renderer.render(this.scene, this.camera)
	}

	dispose() {
		this.geometry.dispose()
	}
}
