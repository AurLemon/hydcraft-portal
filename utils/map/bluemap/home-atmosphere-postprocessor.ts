import {
	type Camera,
	LinearFilter,
	Mesh,
	OrthographicCamera,
	Plane,
	PlaneGeometry,
	RGBAFormat,
	Raycaster,
	Scene,
	ShaderMaterial,
	Vector2,
	Vector3,
	WebGLRenderTarget,
	type Texture,
	type WebGLRenderer,
} from 'three'
import type { BlueMapHomeAtmospherePostProcessing } from './types'

interface BlueMapPostProcessingViewer {
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

const vertexShader = /* glsl */ `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = vec4(position.xy, 0.0, 1.0);
	}
`

const blurFragmentShader = /* glsl */ `
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

const bloomFragmentShader = /* glsl */ `
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

const interactionFragmentShader = /* glsl */ `
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

const lightFragmentShader = /* glsl */ `
	uniform sampler2D tDiffuse;
	uniform sampler2D tInteraction;
	uniform vec2 sunPosition;
	uniform vec2 beamDirection;
	uniform vec2 beamForwardBasis;
	uniform vec2 beamAcrossBasis;
	uniform float beamWidth;
	uniform float beamSpread;
	uniform float viewportAspect;
	uniform float time;
	uniform float intensity;
	varying vec2 vUv;

	float softNoise(vec2 uv, float phase) {
		float layerA = sin(uv.x * 5.4 + sin(uv.y * 4.1 - phase * 0.31));
		float layerB = sin(uv.y * 8.2 - uv.x * 2.3 + phase * 0.19);
		return 0.5 + 0.25 * layerA + 0.25 * layerB;
	}

	float fogBlob(vec2 point, vec2 center, vec2 radius) {
		vec2 distance = (point - center) / radius;
		return exp(-dot(distance, distance) * 2.35);
	}

	void main() {
		vec2 toSunUv = sunPosition - vUv;
		vec2 stepVector = toSunUv * 0.025;
		vec3 scattered = vec3(0.0);
		float weight = 1.0;
		float weightSum = 0.0;

		for (int sampleIndex = 0; sampleIndex < 7; sampleIndex++) {
			float offset = float(sampleIndex) + 0.5;
			scattered += texture2D(tDiffuse, vUv + stepVector * offset).rgb * weight;
			weightSum += weight;
			weight *= 0.78;
		}
		scattered /= weightSum;

		vec2 fromSun = (vUv - sunPosition) * vec2(viewportAspect, 1.0);
		float basisDeterminant = beamForwardBasis.x * beamAcrossBasis.y
			- beamForwardBasis.y * beamAcrossBasis.x;
		float signedDistanceAcrossBeam;
		float distanceAlongBeam;
		if (abs(basisDeterminant) > 0.00001) {
			float forwardCoefficient = (fromSun.x * beamAcrossBasis.y
				- fromSun.y * beamAcrossBasis.x) / basisDeterminant;
			float acrossCoefficient = (beamForwardBasis.x * fromSun.y
				- beamForwardBasis.y * fromSun.x) / basisDeterminant;
			distanceAlongBeam = forwardCoefficient * 0.5;
			signedDistanceAcrossBeam = acrossCoefficient * beamWidth;
		} else {
			vec2 beamNormal = vec2(-beamDirection.y, beamDirection.x);
			distanceAlongBeam = dot(fromSun, beamDirection);
			signedDistanceAcrossBeam = dot(fromSun, beamNormal);
		}
		float distanceAcrossBeam = abs(signedDistanceAcrossBeam);
		float widening = beamWidth * 0.58
			+ max(distanceAlongBeam, 0.0) * beamSpread;
		float softBeam = 1.0 - smoothstep(widening * 0.54, widening, distanceAcrossBeam);
		float beamLength = smoothstep(-0.015, 0.1, distanceAlongBeam)
			* (1.0 - smoothstep(0.78, 1.42, distanceAlongBeam));
		float distanceFromSun = length(vec2(signedDistanceAcrossBeam, distanceAlongBeam));
		float sunReach = 1.0 - smoothstep(0.18, 1.34, distanceFromSun);
		float sunCore = exp(-distanceFromSun * 7.2);
		float sunGlow = exp(-distanceFromSun * 2.7);
		float luminance = dot(scattered, vec3(0.2126, 0.7152, 0.0722));
		float sourceLight = smoothstep(0.16, 0.76, luminance);
		vec4 interaction = texture2D(tInteraction, vUv);
		vec2 interactionFlow = (interaction.rg * 2.0 - 1.0) * interaction.a;
		vec2 fogCoordinate = vec2(signedDistanceAcrossBeam, distanceAlongBeam);
		fogCoordinate += interactionFlow * vec2(0.2, 0.16);
		float fogA = fogBlob(
			fogCoordinate,
			vec2(-0.08 + sin(time * 0.92) * 0.17, 0.25 + cos(time * 0.57) * 0.08),
			vec2(0.14, 0.16)
		);
		float fogB = fogBlob(
			fogCoordinate,
			vec2(0.08 + sin(time * 0.78 + 2.1) * 0.19, 0.53 + sin(time * 0.62) * 0.1),
			vec2(0.16, 0.19)
		);
		float fogC = fogBlob(
			fogCoordinate,
			vec2(-0.06 + cos(time * 0.69 + 1.2) * 0.2, 0.82 + cos(time * 0.48) * 0.12),
			vec2(0.18, 0.21)
		);
		float fogD = fogBlob(
			fogCoordinate,
			vec2(0.03 + sin(time * 1.08 + 4.0) * 0.16, 1.08 + sin(time * 0.55) * 0.09),
			vec2(0.13, 0.17)
		);
		float fogDetail = clamp(softNoise(
			vec2(fogCoordinate.x * 4.6, fogCoordinate.y * 3.0),
			time * 1.75
		), 0.0, 1.0);
		float densityPulse = 0.78 + 0.22 * sin(time * 1.02 + distanceAlongBeam * 3.4);
		float fogTexture = mix(0.34, 1.34, smoothstep(0.28, 0.74, fogDetail));
		float fogEnvelope = 1.0 - smoothstep(widening * 0.92, widening * 1.75, distanceAcrossBeam);
		float fogBody = fogA * 1.05 + fogB * 1.0 + fogC * 0.92 + fogD * 0.86;
		float localFog = clamp(fogBody * fogTexture * densityPulse * fogEnvelope, 0.0, 1.0);
		localFog *= 1.0 - interaction.a * 0.72;
		float beamMask = softBeam * beamLength;
		float fogFlow = clamp(localFog + 0.18, 0.0, 1.0);
		float veil = beamMask * mix(0.58, 1.0, fogFlow);
		float lightEnergy = (0.2 + sourceLight * 0.8) * veil * intensity;
		vec3 warmScatter = scattered * vec3(1.12, 0.98, 0.76) * lightEnergy;
		warmScatter += vec3(1.0, 0.82, 0.54)
			* beamMask
			* (0.3 + localFog * 0.24)
			* intensity;
		warmScatter += vec3(0.74, 0.8, 0.72) * localFog * 0.48 * intensity;
		warmScatter += vec3(1.0, 0.67, 0.34) * (sunCore * 0.52 + sunGlow * 0.1) * intensity;
		float hazeMask = clamp(beamMask * 0.16 + localFog * 1.28 + sunReach * 0.06, 0.0, 1.0);

		gl_FragColor = vec4(warmScatter, hazeMask);
	}
`

const waterGlintFragmentShader = /* glsl */ `
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

const compositeFragmentShader = /* glsl */ `
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

const createRenderTarget = (depthBuffer: boolean): WebGLRenderTarget => {
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

const createMaterial = (
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
	private readonly interactionTargetA = createRenderTarget(false)
	private readonly interactionTargetB = createRenderTarget(false)
	private interactionReadTarget = this.interactionTargetA
	private interactionWriteTarget = this.interactionTargetB
	private readonly quadScene = new Scene()
	private readonly quadCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
	private readonly quadGeometry = new PlaneGeometry(2, 2)
	private readonly quad: Mesh
	private readonly targetSize = new Vector2()
	private readonly blurMaterial: ShaderMaterial
	private readonly interactionMaterial: ShaderMaterial
	private readonly lightMaterial: ShaderMaterial
	private readonly waterGlintMaterial: ShaderMaterial
	private readonly bloomMaterial: ShaderMaterial
	private readonly compositeMaterial: ShaderMaterial
	private readonly qualityScale: number
	private readonly waterGlintSpeed: number
	private readonly waterEffectsEnabled: boolean
	private readonly waterEffectFrameInterval: number
	private readonly interactionEnabled: boolean
	private readonly interactionQualityScale: number
	private readonly initialSunPosition: Vector2
	private readonly initialBeamDirection: Vector2
	private readonly initialBeamWidth: number
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
	private readonly latestPointerUv = new Vector2()
	private readonly renderedPointerUv = new Vector2()
	private readonly pointerVelocity = new Vector2()
	private readonly pointerSampleUv = new Vector2()
	private readonly pointerMovement = new Vector2()
	private pointerBoundsLeft = 0
	private pointerBoundsTop = 0
	private pointerBoundsWidth = 0
	private pointerBoundsHeight = 0
	private elapsedSeconds = 0
	private lastWaterEffectRenderSeconds = Number.NEGATIVE_INFINITY
	private lastInteractionRenderSeconds = Number.NEGATIVE_INFINITY
	private lastPointerEventMilliseconds = 0
	private pendingPointerStrength = 0
	private pointerPositionReady = false
	private pointerPresent = false
	private interactionNeedsReset = true
	private worldAnchorsReady = false
	private disposed = false
	private readonly handlePointerMove = (event: PointerEvent) => {
		if (!this.interactionEnabled || event.pointerType !== 'mouse') return
		if (this.pointerBoundsWidth <= 0 || this.pointerBoundsHeight <= 0) {
			this.updatePointerBounds()
		}
		if (this.pointerBoundsWidth <= 0 || this.pointerBoundsHeight <= 0) return
		if (
			event.clientX < this.pointerBoundsLeft ||
			event.clientX > this.pointerBoundsLeft + this.pointerBoundsWidth ||
			event.clientY < this.pointerBoundsTop ||
			event.clientY > this.pointerBoundsTop + this.pointerBoundsHeight
		) {
			this.deactivatePointer()
			return
		}

		this.pointerSampleUv.set(
			(event.clientX - this.pointerBoundsLeft) / this.pointerBoundsWidth,
			1 - (event.clientY - this.pointerBoundsTop) / this.pointerBoundsHeight,
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
				this.pointerMovement.x * this.pointerBoundsWidth,
				this.pointerMovement.y * this.pointerBoundsHeight,
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
		options: BlueMapHomeAtmospherePostProcessing,
	) {
		this.viewer = viewer
		this.renderer = viewer.renderer
		this.originalRender = viewer.render
		this.nativeRender = viewer.render.bind(viewer)
		const isMobile = window.matchMedia('(max-width: 639px)').matches
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches
		this.qualityScale = isMobile
			? options.mobileQualityScale
			: options.desktopQualityScale
		this.waterEffectsEnabled = Boolean(options.water)
		this.waterEffectFrameInterval = 1 / (isMobile ? 24 : 30)
		this.interactionEnabled = !isMobile && !prefersReducedMotion
		this.interactionQualityScale = Math.min(this.qualityScale, 0.25)
		this.waterGlintSpeed = prefersReducedMotion
			? 0
			: (options.water?.glintSpeed ?? 0)

		this.initialSunPosition = new Vector2(options.sunX, options.sunY)
		this.initialBeamDirection = new Vector2(
			Math.sin(options.beamAngle),
			-Math.cos(options.beamAngle),
		).normalize()
		this.initialBeamWidth = isMobile
			? options.mobileBeamWidth
			: options.desktopBeamWidth
		this.blurMaterial = createMaterial(blurFragmentShader, {
			tDiffuse: { value: null },
			texelSize: { value: new Vector2(0.5, 0.5) },
			direction: { value: new Vector2(1, 0) },
		})
		this.interactionMaterial = createMaterial(interactionFragmentShader, {
			tPrevious: { value: this.interactionReadTarget.texture },
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
		this.lightMaterial = createMaterial(lightFragmentShader, {
			tDiffuse: { value: this.blurTargetB.texture },
			tInteraction: { value: this.interactionReadTarget.texture },
			sunPosition: { value: this.initialSunPosition.clone() },
			beamDirection: { value: this.initialBeamDirection.clone() },
			beamForwardBasis: {
				value: this.initialBeamDirection.clone().multiplyScalar(0.5),
			},
			beamAcrossBasis: {
				value: new Vector2(
					-this.initialBeamDirection.y,
					this.initialBeamDirection.x,
				).multiplyScalar(this.initialBeamWidth),
			},
			beamWidth: { value: this.initialBeamWidth },
			beamSpread: { value: options.beamSpread },
			viewportAspect: { value: 1 },
			time: { value: 0 },
			intensity: { value: options.intensity },
		})
		const waterLightDirection = this.initialBeamDirection
			.clone()
			.multiplyScalar(-1)
		this.waterGlintMaterial = createMaterial(waterGlintFragmentShader, {
			tScene: { value: this.sceneTarget.texture },
			tLight: { value: this.lightTarget.texture },
			tInteraction: { value: this.interactionReadTarget.texture },
			sunPosition: { value: this.initialSunPosition.clone() },
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
			tInteraction: { value: this.interactionReadTarget.texture },
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
			waterReflectionWidth: {
				value: options.water?.reflectionWidth ?? 0,
			},
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
		this.quad = new Mesh(this.quadGeometry, this.blurMaterial)
		this.quad.frustumCulled = false
		this.quadScene.add(this.quad)

		this.resize()
		if (this.interactionEnabled) {
			window.addEventListener('pointermove', this.handlePointerMove, {
				passive: true,
			})
			window.addEventListener('blur', this.handleWindowBlur)
			document.documentElement.addEventListener(
				'pointerleave',
				this.handlePointerLeave,
			)
		}
		viewer.render = (delta) => {
			this.render(
				delta,
				options.animationSpeed,
				options.water?.animationSpeed ?? 0,
			)
		}
	}

	resize() {
		if (this.disposed) return
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
		const interactionWidth = this.interactionEnabled
			? Math.max(2, Math.floor(width * this.interactionQualityScale))
			: 2
		const interactionHeight = this.interactionEnabled
			? Math.max(2, Math.floor(height * this.interactionQualityScale))
			: 2
		this.interactionTargetA.setSize(interactionWidth, interactionHeight)
		this.interactionTargetB.setSize(interactionWidth, interactionHeight)
		this.interactionNeedsReset = true
		;(this.blurMaterial.uniforms.texelSize!.value as Vector2).set(
			1 / effectWidth,
			1 / effectHeight,
		)
		;(this.bloomMaterial.uniforms.texelSize!.value as Vector2).set(
			1 / effectWidth,
			1 / effectHeight,
		)
		this.lightMaterial.uniforms.viewportAspect!.value = width / height
		this.interactionMaterial.uniforms.viewportAspect!.value = width / height
		this.waterGlintMaterial.uniforms.viewportAspect!.value = width / height
		this.compositeMaterial.uniforms.viewportAspect!.value = width / height
		this.updatePointerBounds()
		;(this.compositeMaterial.uniforms.sceneTexelSize!.value as Vector2).set(
			1 / width,
			1 / height,
		)
	}

	dispose() {
		if (this.disposed) return
		this.disposed = true
		this.viewer.render = this.originalRender
		if (this.interactionEnabled) {
			window.removeEventListener('pointermove', this.handlePointerMove)
			window.removeEventListener('blur', this.handleWindowBlur)
			document.documentElement.removeEventListener(
				'pointerleave',
				this.handlePointerLeave,
			)
		}
		this.sceneTarget.dispose()
		this.blurTargetA.dispose()
		this.blurTargetB.dispose()
		this.lightTarget.dispose()
		this.waterGlintTarget.dispose()
		this.waterBloomTarget.dispose()
		this.interactionTargetA.dispose()
		this.interactionTargetB.dispose()
		this.blurMaterial.dispose()
		this.interactionMaterial.dispose()
		this.lightMaterial.dispose()
		this.waterGlintMaterial.dispose()
		this.bloomMaterial.dispose()
		this.compositeMaterial.dispose()
		this.quadGeometry.dispose()
	}

	private render(
		delta: number,
		animationSpeed: number,
		waterAnimationSpeed: number,
	) {
		const deltaSeconds = Math.min(Math.max(delta, 0), 100) / 1000
		this.elapsedSeconds += deltaSeconds
		this.renderer.setRenderTarget(this.sceneTarget)
		this.nativeRender(delta)
		this.updateWorldProjection()
		this.updateInteraction(deltaSeconds)

		this.renderPass(
			this.sceneTarget.texture,
			this.blurMaterial,
			this.blurTargetA,
			1,
			0,
		)
		this.renderPass(
			this.blurTargetA.texture,
			this.blurMaterial,
			this.blurTargetB,
			0,
			1,
		)
		this.lightMaterial.uniforms.time!.value =
			this.elapsedSeconds * animationSpeed
		this.compositeMaterial.uniforms.time!.value =
			this.elapsedSeconds * waterAnimationSpeed
		this.renderMaterial(this.lightMaterial, this.lightTarget)
		if (
			this.waterEffectsEnabled &&
			this.elapsedSeconds - this.lastWaterEffectRenderSeconds >=
				this.waterEffectFrameInterval
		) {
			this.waterGlintMaterial.uniforms.time!.value =
				this.elapsedSeconds * this.waterGlintSpeed
			this.renderMaterial(this.waterGlintMaterial, this.waterGlintTarget)
			this.renderMaterial(this.bloomMaterial, this.waterBloomTarget)
			this.lastWaterEffectRenderSeconds = this.elapsedSeconds
		}
		this.renderMaterial(this.compositeMaterial, null)
	}

	private updateInteraction(deltaSeconds: number) {
		if (!this.interactionEnabled && !this.interactionNeedsReset) return

		const interactionDelta = Number.isFinite(this.lastInteractionRenderSeconds)
			? this.elapsedSeconds - this.lastInteractionRenderSeconds
			: deltaSeconds
		this.interactionMaterial.uniforms.tPrevious!.value =
			this.interactionReadTarget.texture
		;(this.interactionMaterial.uniforms.pointerFrom!.value as Vector2).copy(
			this.renderedPointerUv,
		)
		;(this.interactionMaterial.uniforms.pointerTo!.value as Vector2).copy(
			this.latestPointerUv,
		)
		;(this.interactionMaterial.uniforms.pointerVelocity!.value as Vector2).copy(
			this.pointerVelocity,
		)
		;(this.interactionMaterial.uniforms.pointerPosition!.value as Vector2).copy(
			this.latestPointerUv,
		)
		this.interactionMaterial.uniforms.pointerStrength!.value = this
			.interactionEnabled
			? this.pendingPointerStrength
			: 0
		this.interactionMaterial.uniforms.pointerPresence!.value =
			this.interactionEnabled && this.pointerPresent ? 1 : 0
		this.interactionMaterial.uniforms.decay!.value = Math.exp(
			-interactionDelta * 1.9,
		)
		this.interactionMaterial.uniforms.reset!.value = this.interactionNeedsReset
			? 1
			: 0
		this.renderMaterial(this.interactionMaterial, this.interactionWriteTarget)

		const completedTarget = this.interactionWriteTarget
		this.interactionWriteTarget = this.interactionReadTarget
		this.interactionReadTarget = completedTarget
		const interactionTexture = this.interactionReadTarget.texture
		this.lightMaterial.uniforms.tInteraction!.value = interactionTexture
		this.waterGlintMaterial.uniforms.tInteraction!.value = interactionTexture
		this.compositeMaterial.uniforms.tInteraction!.value = interactionTexture

		if (this.pendingPointerStrength > 0) {
			this.renderedPointerUv.copy(this.latestPointerUv)
		}
		this.pendingPointerStrength = 0
		this.interactionNeedsReset = false
		this.lastInteractionRenderSeconds = this.elapsedSeconds
	}

	private updatePointerBounds() {
		const bounds = this.renderer.domElement.getBoundingClientRect()
		this.pointerBoundsLeft = bounds.left
		this.pointerBoundsTop = bounds.top
		this.pointerBoundsWidth = bounds.width
		this.pointerBoundsHeight = bounds.height
	}

	private deactivatePointer() {
		if (!this.pointerPresent && !this.pointerPositionReady) return
		this.pointerPresent = false
		this.pointerPositionReady = false
		this.pendingPointerStrength = 0
		this.viewer.redraw()
	}

	private updateWorldProjection() {
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
		;(this.lightMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.projectedSunUv,
		)
		;(this.waterGlintMaterial.uniforms.sunPosition!.value as Vector2).copy(
			this.projectedSunUv,
		)
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
	) {
		projected.copy(worldAnchor).project(camera)
		targetUv.set((projected.x + 1) * 0.5, (projected.y + 1) * 0.5)
	}

	private renderPass(
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

	private renderMaterial(
		material: ShaderMaterial,
		target: WebGLRenderTarget | null,
	) {
		this.quad.material = material
		this.renderer.setRenderTarget(target)
		this.renderer.clear()
		this.renderer.render(this.quadScene, this.quadCamera)
	}
}

export const createHomeAtmospherePostProcessor = (
	viewer: BlueMapPostProcessingViewer,
	options: BlueMapHomeAtmospherePostProcessing,
) => new HomeAtmospherePostProcessor(viewer, options)
