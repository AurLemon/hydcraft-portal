import {
	LinearFilter,
	RGBAFormat,
	ShaderMaterial,
	WebGLRenderTarget,
} from 'three'
import { vertexShader } from './shaders'

export const createRenderTarget = (depthBuffer: boolean): WebGLRenderTarget => {
	const target = new WebGLRenderTarget(2, 2, {
		depthBuffer,
		stencilBuffer: false,
		format: RGBAFormat,
		minFilter: LinearFilter,
		magFilter: LinearFilter,
	})
	target.texture.generateMipmaps = false
	return target
}

export const createMaterial = (
	fragmentShader: string,
	uniforms: Record<string, { value: unknown }>,
): ShaderMaterial =>
	new ShaderMaterial({
		vertexShader,
		fragmentShader,
		uniforms,
		depthTest: false,
		depthWrite: false,
		transparent: false,
	})
