const WEBGL_INFO_LOG_NORMALIZED = Symbol.for(
	'hydcraft.bluemap.webgl-info-log-normalized',
)

/**
 * Three r147 calls `.trim()` on WebGL diagnostic results. Chromium can return
 * `null` for an empty info log, even though the corresponding program is
 * usable. Normalize that browser edge case while keeping Three's actual shader
 * error reporting enabled.
 */
export const normalizeWebGlInfoLogs = () => {
	const contextTypes = [
		window.WebGLRenderingContext,
		window.WebGL2RenderingContext,
	]

	for (const contextType of contextTypes) {
		if (!contextType) continue
		const prototype = contextType.prototype
		if (Reflect.get(prototype, WEBGL_INFO_LOG_NORMALIZED)) continue

		for (const method of ['getProgramInfoLog', 'getShaderInfoLog'] as const) {
			const original = Reflect.get(prototype, method)
			if (typeof original !== 'function') continue

			Reflect.set(
				prototype,
				method,
				function (this: unknown, ...args: unknown[]) {
					return Reflect.apply(original, this, args) ?? ''
				},
			)
		}

		Reflect.set(prototype, WEBGL_INFO_LOG_NORMALIZED, true)
	}
}
