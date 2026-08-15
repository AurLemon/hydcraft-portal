export const vertexShader = /* glsl */ `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}
`

export const blurFragmentShader = /* glsl */ `
	uniform sampler2D tDiffuse;
	uniform vec2 texelSize;
	uniform vec2 direction;
	varying vec2 vUv;

	void main() {
		vec2 offset = texelSize * direction;
		vec4 color = texture2D(tDiffuse, vUv) * 0.227027;
		color += texture2D(tDiffuse, vUv + offset * 1.384615) * 0.316216;
		color += texture2D(tDiffuse, vUv - offset * 1.384615) * 0.316216;
		color += texture2D(tDiffuse, vUv + offset * 3.230769) * 0.070270;
		color += texture2D(tDiffuse, vUv - offset * 3.230769) * 0.070270;
		gl_FragColor = color;
	}
`

export const bloomFragmentShader = /* glsl */ `
	uniform sampler2D tDiffuse;
	uniform vec2 texelSize;
	uniform float radius;
	varying vec2 vUv;

	void main() {
		vec2 offset = texelSize * radius;
		vec3 color = texture2D(tDiffuse, vUv).rgb * 0.2;
		color += texture2D(tDiffuse, vUv + vec2(offset.x, 0.0)).rgb * 0.1;
		color += texture2D(tDiffuse, vUv - vec2(offset.x, 0.0)).rgb * 0.1;
		color += texture2D(tDiffuse, vUv + vec2(0.0, offset.y)).rgb * 0.1;
		color += texture2D(tDiffuse, vUv - vec2(0.0, offset.y)).rgb * 0.1;
		color += texture2D(tDiffuse, vUv + offset).rgb * 0.075;
		color += texture2D(tDiffuse, vUv - offset).rgb * 0.075;
		color += texture2D(tDiffuse, vUv + vec2(offset.x, -offset.y)).rgb * 0.075;
		color += texture2D(tDiffuse, vUv + vec2(-offset.x, offset.y)).rgb * 0.075;
		color += texture2D(tDiffuse, vUv + vec2(offset.x * 2.0, 0.0)).rgb * 0.025;
		color += texture2D(tDiffuse, vUv - vec2(offset.x * 2.0, 0.0)).rgb * 0.025;
		color += texture2D(tDiffuse, vUv + vec2(0.0, offset.y * 2.0)).rgb * 0.025;
		color += texture2D(tDiffuse, vUv - vec2(0.0, offset.y * 2.0)).rgb * 0.025;
		gl_FragColor = vec4(color, 1.0);
	}
`

export const interactionFragmentShader = /* glsl */ `
	uniform sampler2D tPrevious;
	uniform vec2 pointerFrom;
	uniform vec2 pointerTo;
	uniform vec2 pointerVelocity;
	uniform vec2 pointerPosition;
	uniform float pointerStrength;
	uniform float pointerPresence;
	uniform float viewportAspect;
	uniform float decay;
	uniform float reset;
	varying vec2 vUv;

	float distanceToSegment(vec2 point, vec2 start, vec2 end) {
		vec2 segment = end - start;
		float segmentLengthSquared = max(dot(segment, segment), 0.000001);
		float projection = clamp(
			dot(point - start, segment) / segmentLengthSquared,
			0.0,
			1.0
		);
		return length(point - (start + segment * projection));
	}

	void main() {
		if (reset > 0.5) {
			gl_FragColor = vec4(0.0);
			return;
		}

		vec4 previous = texture2D(tPrevious, vUv);
		float previousStrength = previous.a * decay;
		vec2 previousFlow = (previous.rg * 2.0 - 1.0) * previousStrength;

		vec2 aspectScale = vec2(viewportAspect, 1.0);
		float trailDistance = distanceToSegment(
			vUv * aspectScale,
			pointerFrom * aspectScale,
			pointerTo * aspectScale
		);
		float trailRadius = mix(0.018, 0.042, pointerStrength);
		float splat = exp(
			-trailDistance * trailDistance
			/ max(trailRadius * trailRadius, 0.000001)
		) * pointerStrength;
		float pointerDistance = length(
			(vUv - pointerPosition) * aspectScale
		);
		float presenceRadius = 0.034;
		float presenceSplat = exp(
			-pointerDistance * pointerDistance
			/ (presenceRadius * presenceRadius)
		) * pointerPresence * 0.72;
		vec2 incomingFlow = pointerVelocity * splat;
		float combinedStrength = clamp(
			max(max(previousStrength, splat), presenceSplat),
			0.0,
			1.0
		);
		vec2 combinedFlow = previousFlow + incomingFlow;
		if (combinedStrength > 0.0001) {
			combinedFlow /= combinedStrength;
		}
		combinedFlow = clamp(combinedFlow, vec2(-1.0), vec2(1.0));

		gl_FragColor = vec4(
			combinedFlow * 0.5 + 0.5,
			0.0,
			combinedStrength
		);
	}
`
