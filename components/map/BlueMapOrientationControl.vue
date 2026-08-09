<template>
	<button
		type="button"
		class="orientation-control group relative size-14 cursor-pointer touch-manipulation text-white focus-visible:rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
		:aria-label="t('minecraftAccounts.map.orientation.alignNorth')"
		:title="t('minecraftAccounts.map.orientation.hint')"
		@click="scheduleAlignNorth"
		@dblclick.prevent="resetView"
	>
		<span class="sr-only">
			{{ t('minecraftAccounts.map.orientation.hint') }}
		</span>
		<span class="absolute inset-0 [perspective:180px]" aria-hidden="true">
			<span
				class="absolute top-1/2 left-1/2 z-10 size-0 [transform-style:preserve-3d] transition-transform duration-100"
				:style="orientationStyle"
			>
				<span class="orientation-cube-face orientation-cube-front" />
				<span class="orientation-cube-face orientation-cube-back" />
				<span class="orientation-cube-face orientation-cube-left" />
				<span class="orientation-cube-face orientation-cube-right" />
				<span class="orientation-cube-face orientation-cube-top">N</span>
				<span class="orientation-cube-face orientation-cube-bottom" />
			</span>
			<span
				v-for="axis in projectedAxes"
				:key="`axis-${axis.name}`"
				class="orientation-axis absolute top-1/2 left-1/2"
				:class="`orientation-axis-${axis.name}`"
				:style="axis.lineStyle"
			/>
			<span
				v-for="axis in projectedAxes"
				:key="`label-${axis.name}`"
				class="orientation-axis-label absolute top-1/2 left-1/2 z-20"
				:class="`orientation-axis-label-${axis.name}`"
				:style="axis.labelStyle"
			>
				{{ axis.name.toUpperCase() }}
			</span>
		</span>
	</button>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { BlueMapViewChangedEventPayload } from '~/utils/map'

interface BlueMapOrientationControlProps {
	view: BlueMapViewChangedEventPayload
}

const props = defineProps<BlueMapOrientationControlProps>()
const emit = defineEmits<{
	alignNorth: []
	reset: []
}>()
const { t } = useI18n()
let clickTimer: ReturnType<typeof setTimeout> | null = null

const radiansToDegrees = (radians: number): number => (radians * 180) / Math.PI

const orientationStyle = computed<StyleValue>(() => ({
	transform: `rotateZ(${-radiansToDegrees(props.view.tilt)}deg) rotateX(${-radiansToDegrees(props.view.angle)}deg) rotateZ(${-radiansToDegrees(props.view.rotation)}deg)`,
}))

interface AxisVector {
	x: number
	y: number
	z: number
}

const AXIS_LENGTH = 18
const MIN_AXIS_LENGTH = 16
const LABEL_OFFSET = 5

const rotateZ = (vector: AxisVector, radians: number): AxisVector => ({
	x: vector.x * Math.cos(radians) - vector.y * Math.sin(radians),
	y: vector.x * Math.sin(radians) + vector.y * Math.cos(radians),
	z: vector.z,
})

const rotateX = (vector: AxisVector, radians: number): AxisVector => ({
	x: vector.x,
	y: vector.y * Math.cos(radians) - vector.z * Math.sin(radians),
	z: vector.y * Math.sin(radians) + vector.z * Math.cos(radians),
})

const projectAxisEndpoint = (
	vector: AxisVector,
	fallback: { x: number; y: number },
): { x: number; y: number; length: number; angle: number } => {
	const rotatedForHeading = rotateZ(vector, -props.view.rotation)
	const rotatedForAngle = rotateX(rotatedForHeading, -props.view.angle)
	const projected = rotateZ(rotatedForAngle, -props.view.tilt)
	const projectedLength = Math.hypot(projected.x, projected.y)
	const direction =
		projectedLength > 0.001
			? {
					x: projected.x / projectedLength,
					y: projected.y / projectedLength,
				}
			: fallback
	const visibleLength = Math.max(
		Math.min(projectedLength, AXIS_LENGTH),
		MIN_AXIS_LENGTH,
	)

	return {
		x: direction.x,
		y: direction.y,
		length: visibleLength,
		angle: Math.atan2(direction.y, direction.x),
	}
}

const projectedAxes = computed(() =>
	(
		[
			{
				name: 'x',
				vector: { x: AXIS_LENGTH, y: 0, z: 0 },
				fallback: { x: 1, y: 0 },
			},
			{
				name: 'y',
				vector: { x: 0, y: 0, z: -AXIS_LENGTH },
				fallback: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 },
			},
			{
				name: 'z',
				vector: { x: 0, y: AXIS_LENGTH, z: 0 },
				fallback: { x: 0, y: 1 },
			},
		] as const
	).map(({ name, vector, fallback }) => {
		const projection = projectAxisEndpoint(vector, fallback)
		const labelRadius = projection.length + LABEL_OFFSET
		return {
			name,
			lineStyle: {
				width: `${projection.length}px`,
				transform: `translateY(-50%) rotate(${projection.angle}rad)`,
			} satisfies StyleValue,
			labelStyle: {
				transform: `translate(calc(-50% + ${projection.x * labelRadius}px), calc(-50% + ${projection.y * labelRadius}px))`,
			} satisfies StyleValue,
		}
	}),
)

const clearClickTimer = () => {
	if (!clickTimer) return
	clearTimeout(clickTimer)
	clickTimer = null
}

const scheduleAlignNorth = () => {
	clearClickTimer()
	clickTimer = setTimeout(() => {
		clickTimer = null
		emit('alignNorth')
	}, 260)
}

const resetView = () => {
	clearClickTimer()
	emit('reset')
}

onBeforeUnmount(clearClickTimer)
</script>

<style scoped>
.orientation-control {
	filter: drop-shadow(0 0 2px rgb(125 211 252 / 34%));
	transition: filter 180ms ease;
}

.orientation-control:hover {
	filter: drop-shadow(0 0 3px rgb(186 230 253 / 46%));
}

.orientation-axis {
	display: block;
	height: 2px;
	transform-origin: left center;
	transition:
		width 100ms,
		transform 100ms;
	will-change: width, transform;
}

.orientation-axis::after {
	position: absolute;
	top: -2px;
	right: -1px;
	width: 0;
	height: 0;
	border-top: 3px solid transparent;
	border-bottom: 3px solid transparent;
	border-left: 5px solid currentColor;
	content: '';
}

.orientation-axis-x {
	color: #fb7185;
	background: currentColor;
	box-shadow: 0 0 3px rgb(251 113 133 / 64%);
}

.orientation-axis-y {
	color: #4ade80;
	background: currentColor;
	box-shadow: 0 0 3px rgb(74 222 128 / 64%);
}

.orientation-axis-z {
	color: #60a5fa;
	background: currentColor;
	box-shadow: 0 0 3px rgb(96 165 250 / 68%);
}

.orientation-axis-label {
	font-size: 9px;
	font-weight: 700;
	line-height: 1;
	text-shadow: 0 1px 3px rgb(0 0 0 / 80%);
	transition: transform 100ms;
	will-change: transform;
}

.orientation-axis-label-x {
	color: #fb7185;
	text-shadow:
		0 0 2px rgb(251 113 133 / 58%),
		0 1px 3px rgb(0 0 0 / 80%);
}

.orientation-axis-label-y {
	color: #4ade80;
	text-shadow:
		0 0 2px rgb(74 222 128 / 58%),
		0 1px 3px rgb(0 0 0 / 80%);
}

.orientation-axis-label-z {
	color: #60a5fa;
	text-shadow:
		0 0 2px rgb(96 165 250 / 58%),
		0 1px 3px rgb(0 0 0 / 80%);
}

.orientation-cube-face {
	position: absolute;
	top: -11px;
	left: -11px;
	display: flex;
	width: 22px;
	height: 22px;
	align-items: center;
	justify-content: center;
	border: 1px solid rgb(255 255 255 / 38%);
	background: linear-gradient(
		145deg,
		rgb(100 116 139 / 26%),
		rgb(30 41 59 / 32%)
	);
	box-shadow:
		inset 0 0 7px rgb(186 230 253 / 12%),
		0 0 3px rgb(125 211 252 / 18%);
	font-size: 8px;
	font-weight: 700;
	line-height: 1;
	backface-visibility: visible;
}

.orientation-cube-front {
	transform: translateZ(11px);
	border-color: rgb(186 230 253 / 58%);
	background: linear-gradient(
		145deg,
		rgb(125 211 252 / 42%),
		rgb(59 130 246 / 24%)
	);
	box-shadow:
		inset 0 0 8px rgb(224 242 254 / 24%),
		0 0 3px rgb(56 189 248 / 24%);
}

.orientation-cube-back {
	transform: rotateY(180deg) translateZ(11px);
}

.orientation-cube-left {
	transform: rotateY(-90deg) translateZ(11px);
}

.orientation-cube-right {
	transform: rotateY(90deg) translateZ(11px);
	border-color: rgb(147 197 253 / 52%);
	background: linear-gradient(
		145deg,
		rgb(96 165 250 / 34%),
		rgb(37 99 235 / 20%)
	);
	box-shadow:
		inset 0 0 7px rgb(219 234 254 / 20%),
		0 0 3px rgb(59 130 246 / 22%);
}

.orientation-cube-top {
	transform: rotateX(90deg) translateZ(11px);
	border-color: rgb(224 242 254 / 72%);
	background: linear-gradient(
		145deg,
		rgb(224 242 254 / 56%),
		rgb(56 189 248 / 30%)
	);
	box-shadow:
		inset 0 0 9px rgb(255 255 255 / 30%),
		0 0 4px rgb(125 211 252 / 32%);
	color: rgb(240 249 255 / 94%);
	text-shadow: 0 0 4px rgb(255 255 255 / 82%);
}

.orientation-cube-bottom {
	transform: rotateX(-90deg) translateZ(11px);
}
</style>
