export const compositeFragmentShader = /* glsl */ `
	uniform sampler2D tScene;
	uniform sampler2D tBlurred;
	uniform sampler2D tLight;
	uniform sampler2D tInteraction;
	uniform sampler2D tWaterGlint;
	uniform sampler2D tWaterBloom;
	uniform float blurStrength;
	uniform float beamStrength;
	uniform float hazeStrength;
	uniform float viewportAspect;
	uniform float time;
	uniform float waterRippleStrength;
	uniform float waterReflectionStrength;
	uniform float waterReflectionWidth;
	uniform float waterWaveSeed;
	uniform float waterIrregularity;
	uniform vec2 waterLightDirection;
	uniform vec2 sceneTexelSize;
	uniform vec3 waterTintColor;
	uniform float waterTintStrength;
	uniform float waterTransmissionStrength;
	uniform float waterGlintStrength;
	uniform float waterBloomStrength;
	varying vec2 vUv;

	vec3 sampleWave(
		vec2 point,
		vec2 direction,
		float frequency,
		float speed,
		float amplitude,
		float phase,
		float seedFactor
	) {
		float wavePhase = dot(point, direction) * frequency
			+ time * speed
			+ phase
			+ waterWaveSeed * seedFactor;
		float height = sin(wavePhase) * amplitude;
		vec2 gradient = direction * cos(wavePhase) * amplitude;
		return vec3(height, gradient);
	}

	vec3 waterWaveField(vec2 point) {
		vec2 slowWarp = vec2(
			sin(point.y * 6.7 - time * 0.19 + waterWaveSeed),
			cos(point.x * 5.3 + time * 0.16 + waterWaveSeed * 0.73)
		) * waterIrregularity * 0.055;
		vec2 warpedPoint = point + slowWarp;
		vec3 field = vec3(0.0);
		field += sampleWave(
			warpedPoint, vec2(0.92, 0.39), 16.8, 0.48, 0.9, 0.7, 0.13
		) * 0.32;
		field += sampleWave(
			warpedPoint, vec2(-0.31, 0.95), 23.7, -0.63, 0.78, 2.1, 0.19
		) * 0.27;
		field += sampleWave(
			warpedPoint, vec2(0.73, -0.68), 31.4, 0.78, 0.69, 4.4, 0.29
		) * 0.2;
		field += sampleWave(
			warpedPoint, vec2(-0.83, -0.56), 38.6, -0.91, 0.58, 1.3, 0.37
		) * 0.15;
		field += sampleWave(
			warpedPoint, vec2(0.18, 0.98), 45.9, 1.08, 0.5, 5.2, 0.43
		) * 0.11;
		field += sampleWave(
			warpedPoint, vec2(0.98, -0.22), 52.3, -1.24, 0.42, 3.6, 0.53
		) * 0.08;
		return field;
	}

	float waterMaskForColor(vec3 color) {
		float blueBalance = min(color.b - color.r, color.b - color.g);
		float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
		float blueWater = smoothstep(0.035, 0.13, blueBalance);
		float visibleSurface = smoothstep(0.045, 0.14, luminance)
			* (1.0 - smoothstep(0.72, 0.94, luminance));
		return blueWater * visibleSurface;
	}

	void main() {
		vec3 sceneColor = texture2D(tScene, vUv).rgb;
		vec3 blurredColor = texture2D(tBlurred, vUv).rgb;
		vec4 light = texture2D(tLight, vUv);
		vec4 interaction = texture2D(tInteraction, vUv);
		vec2 interactionFlow = (interaction.rg * 2.0 - 1.0) * interaction.a;
		float waterMask = waterMaskForColor(sceneColor);

		if (waterRippleStrength > 0.0 && waterMask > 0.001) {
			vec2 waterCoordinate = vUv * vec2(viewportAspect, 1.0)
				+ interactionFlow * vec2(viewportAspect, 1.0) * 0.1;
			vec3 waveField = waterWaveField(waterCoordinate);
			vec2 surfaceSlope = waveField.yz * waterIrregularity
				+ interactionFlow * 0.56;
			vec2 refractionOffset = surfaceSlope * waterRippleStrength * 0.00205
				+ interactionFlow * 0.00125;
			vec3 refractedColor = texture2D(tScene, vUv + refractionOffset).rgb;
			vec3 transmittedBlur = texture2D(
				tBlurred,
				vUv + refractionOffset * 0.42
			).rgb;
			float sourceLuminance = dot(
				refractedColor,
				vec3(0.2126, 0.7152, 0.0722)
			);
			float surfacePulse = 0.96 + waveField.x * 0.12;
			vec3 transmissionColor = mix(
				refractedColor,
				transmittedBlur,
				waterTransmissionStrength * 0.2
			);
			vec3 absorptionColor = waterTintColor
				* mix(0.72, 1.2, smoothstep(0.04, 0.42, sourceLuminance));
			vec3 glassWaterColor = mix(
				transmissionColor,
				absorptionColor,
				waterTintStrength
			) * surfacePulse;
			float transmission = waterMask * waterTransmissionStrength;
			sceneColor = mix(
				sceneColor,
				glassWaterColor,
				transmission
			);

			vec2 shoreSampleOffset = sceneTexelSize * 10.0;
			float surroundingWater = min(
				min(
					waterMaskForColor(texture2D(tScene, vUv + vec2(shoreSampleOffset.x, 0.0)).rgb),
					waterMaskForColor(texture2D(tScene, vUv - vec2(shoreSampleOffset.x, 0.0)).rgb)
				),
				min(
					waterMaskForColor(texture2D(tScene, vUv + vec2(0.0, shoreSampleOffset.y)).rgb),
					waterMaskForColor(texture2D(tScene, vUv - vec2(0.0, shoreSampleOffset.y)).rgb)
				)
			);
			float shallowShine = waterMask
				* (1.0 - surroundingWater)
				* waterTransmissionStrength;
			sceneColor += waterTintColor
				* shallowShine
				* (0.16 + max(waveField.x, 0.0) * 0.06);

			vec2 reflectionDirection = normalize(
				waterLightDirection + vec2(0.0001)
			);
			float facingLight = clamp(
				0.5 + dot(surfaceSlope, reflectionDirection) * 0.64,
				0.0,
				1.0
			);
			float broadSpecular = smoothstep(0.42, 0.88, facingLight);
			broadSpecular *= broadSpecular;
			float softReflection = 0.34
				+ broadSpecular * 0.88
				+ clamp(waveField.x * 0.09, -0.06, 0.08);
			vec2 reflectionAcross = vec2(
				-reflectionDirection.y,
				reflectionDirection.x
			);
			vec4 sideLightA = texture2D(
				tLight,
				vUv + reflectionAcross * waterReflectionWidth
			);
			vec4 sideLightB = texture2D(
				tLight,
				vUv - reflectionAcross * waterReflectionWidth
			);
			float reflectedEnergy = light.a
				+ dot(light.rgb, vec3(0.4, 0.45, 0.15));
			reflectedEnergy = max(
				reflectedEnergy,
				(sideLightA.a + dot(sideLightA.rgb, vec3(0.4, 0.45, 0.15))) * 0.74
			);
			reflectedEnergy = max(
				reflectedEnergy,
				(sideLightB.a + dot(sideLightB.rgb, vec3(0.4, 0.45, 0.15))) * 0.74
			);
			float reflectedLight = smoothstep(
				0.01,
				0.36,
				reflectedEnergy
			);
			float reflection = waterMask
				* reflectedLight
				* waterReflectionStrength
				* softReflection;
			vec3 coolReflection = mix(
				waterTintColor * 1.15,
				vec3(0.62, 0.88, 0.94),
				broadSpecular
			);
			sceneColor += coolReflection * reflection * 0.34;
			sceneColor += light.rgb * reflection * 0.22;
			sceneColor += vec3(1.0, 0.83, 0.58)
				* reflection
				* (0.022 + broadSpecular * 0.068);
		}

		vec3 waterGlint = texture2D(tWaterGlint, vUv).rgb;
		vec3 waterBloom = texture2D(tWaterBloom, vUv).rgb;
		sceneColor += waterGlint * waterGlintStrength;
		sceneColor += waterBloom * waterBloomStrength;

		float diffusion = blurStrength * light.a * 0.14;
		vec3 color = mix(sceneColor, blurredColor, diffusion);

		color += light.rgb * beamStrength * (0.22 + hazeStrength * 0.28);

		float atmosphericDepth = light.a * hazeStrength * 0.085;
		color = mix(color, vec3(0.48, 0.53, 0.48), atmosphericDepth);
		gl_FragColor = vec4(color, 1.0);
	}
`
