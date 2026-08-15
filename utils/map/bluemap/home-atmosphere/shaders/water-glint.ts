export const waterGlintFragmentShader = /* glsl */ `
	uniform sampler2D tScene;
	uniform sampler2D tLight;
	uniform sampler2D tInteraction;
	uniform vec2 sunPosition;
	uniform vec2 waterLightDirection;
	uniform float viewportAspect;
	uniform float time;
	uniform float waveSeed;
	uniform float irregularity;
	uniform float reflectionWidth;
	uniform float glintDensity;
	uniform float glintSharpness;
	uniform float enabled;
	varying vec2 vUv;

	float waterMaskForColor(vec3 color) {
		float blueBalance = min(color.b - color.r, color.b - color.g);
		float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
		float blueWater = smoothstep(0.035, 0.13, blueBalance);
		float visibleSurface = smoothstep(0.045, 0.14, luminance)
			* (1.0 - smoothstep(0.72, 0.94, luminance));
		return blueWater * visibleSurface;
	}

	float lightLevel(vec4 lightSample) {
		return lightSample.a
			+ dot(lightSample.rgb, vec3(0.4, 0.45, 0.15));
	}

	float hash21(vec2 point) {
		return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
	}

	void main() {
		vec3 sceneColor = texture2D(tScene, vUv).rgb;
		float waterMask = waterMaskForColor(sceneColor) * enabled;
		if (waterMask < 0.001) {
			gl_FragColor = vec4(0.0);
			return;
		}

		vec4 interaction = texture2D(tInteraction, vUv);
		vec2 interactionFlow = (interaction.rg * 2.0 - 1.0) * interaction.a;
		vec2 point = vUv * vec2(viewportAspect, 1.0)
			+ interactionFlow * vec2(viewportAspect, 1.0) * 0.12;
		vec2 slowWarp = vec2(
			sin(point.y * 7.1 - time * 0.17 + waveSeed),
			cos(point.x * 5.7 + time * 0.14 + waveSeed * 0.71)
		) * irregularity * 0.045;
		point += slowWarp;

		vec2 slope = vec2(0.0);
		slope += vec2(0.91, 0.41)
			* cos(dot(point, vec2(0.91, 0.41)) * 39.0 + time * 0.71 + waveSeed)
			* 0.42;
		slope += vec2(-0.37, 0.93)
			* cos(dot(point, vec2(-0.37, 0.93)) * 61.0 - time * 0.96 + waveSeed * 1.7)
			* 0.31;
		slope += vec2(0.68, -0.73)
			* cos(dot(point, vec2(0.68, -0.73)) * 91.0 + time * 1.19 + waveSeed * 2.3)
			* 0.22;
		slope += vec2(-0.86, -0.51)
			* cos(dot(point, vec2(-0.86, -0.51)) * 127.0 - time * 1.43 + waveSeed * 3.1)
			* 0.15;
		slope += interactionFlow * 0.48;

		vec2 reflectionDirection = normalize(waterLightDirection + vec2(0.0001));
		float facingLight = clamp(
			0.52 + dot(slope * irregularity, reflectionDirection) * 0.72,
			0.0,
			1.0
		);
		float threshold = mix(0.82, 0.58, glintDensity);
		float sparkle = smoothstep(threshold, 1.0, facingLight);
		sparkle = pow(sparkle, mix(2.8, 1.2, glintDensity));

		float interference = 0.5
			+ sin(dot(point, vec2(183.0, -107.0)) + time * 1.71 + waveSeed) * 0.25
			+ sin(dot(point, vec2(-139.0, 211.0)) - time * 1.27 + waveSeed * 0.47) * 0.25;
		float breakupThreshold = mix(0.72, 0.4, glintDensity);
		float breakup = smoothstep(breakupThreshold, 0.96, interference);
		sparkle *= mix(0.22, 1.0, breakup);
		sparkle = pow(clamp(sparkle, 0.0, 1.0), mix(1.2, 4.2, glintSharpness));
		vec2 reflectionAcross = vec2(-reflectionDirection.y, reflectionDirection.x);
		vec2 glintSpace = vec2(
			dot(point, reflectionAcross),
			dot(point, reflectionDirection)
		);
		vec2 glintGrid = glintSpace * vec2(78.0, 124.0);
		vec2 glintCell = floor(glintGrid);
		vec2 glintLocal = fract(glintGrid) - 0.5;
		glintLocal -= vec2(
			hash21(glintCell + waveSeed + 1.7) - 0.5,
			hash21(glintCell + waveSeed + 8.3) - 0.5
		) * 0.9;
		float glintRandom = hash21(glintCell + waveSeed * 2.7);
		float glintFlicker = 0.5 + 0.5 * sin(
			time * (1.35 + glintRandom * 1.8) + glintRandom * 6.28318
		);
		float glintPresence = smoothstep(
			mix(0.88, 0.48, glintDensity),
			1.0,
			glintRandom * 0.48 + glintFlicker * 0.52
		);
		float microSparkle = exp(-(
			glintLocal.x * glintLocal.x * 95.0
			+ glintLocal.y * glintLocal.y * 8.0
		)) * glintPresence;
		sparkle = max(
			sparkle,
			microSparkle * (0.3 + facingLight * 0.58)
		);

		vec2 reflectionOffset = reflectionAcross * reflectionWidth;
		float lightEnvelope = lightLevel(texture2D(tLight, vUv));
		lightEnvelope = max(
			lightEnvelope,
			lightLevel(texture2D(tLight, vUv + reflectionOffset)) * 0.82
		);
		lightEnvelope = max(
			lightEnvelope,
			lightLevel(texture2D(tLight, vUv - reflectionOffset)) * 0.82
		);
		lightEnvelope = smoothstep(0.012, 0.22, lightEnvelope);

		vec2 fromSun = (vUv - sunPosition) * vec2(viewportAspect, 1.0);
		vec2 reflectionForward = -reflectionDirection;
		float distanceAlongReflection = dot(fromSun, reflectionForward);
		float distanceAcrossReflection = abs(dot(fromSun, reflectionAcross));
		float roadWidth = reflectionWidth
			+ max(distanceAlongReflection, 0.0) * 0.22;
		float reflectionRoad = 1.0 - smoothstep(
			roadWidth * 0.34,
			roadWidth,
			distanceAcrossReflection
		);
		reflectionRoad *= smoothstep(-0.04, 0.1, distanceAlongReflection)
			* (1.0 - smoothstep(0.82, 1.46, distanceAlongReflection));
		float envelope = max(lightEnvelope * 0.72, reflectionRoad);

		float glint = waterMask * envelope * sparkle;
		glint *= 1.0 - interaction.a * 0.32;
		vec3 glintColor = mix(
			vec3(0.48, 0.84, 0.9),
			vec3(1.0, 0.9, 0.7),
			facingLight * envelope
		);
		gl_FragColor = vec4(glintColor * glint, glint);
	}
`
