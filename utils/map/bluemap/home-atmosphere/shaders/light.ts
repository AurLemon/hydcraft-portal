export const lightFragmentShader = /* glsl */ `
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
