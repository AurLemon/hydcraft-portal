<template>
	<div
		class="server-overview-sparkline pointer-events-none absolute top-0 right-0 h-42 w-[44%] min-w-40 rounded-tr-xl"
		aria-hidden="true"
	>
		<svg
			class="absolute inset-0 h-full w-full overflow-visible"
			viewBox="0 0 240 112"
			preserveAspectRatio="none"
		>
			<path
				:d="baselinePath"
				fill="none"
				:stroke="baselineColor"
				stroke-width="1"
			/>
			<path
				:d="pathData"
				fill="none"
				:stroke="glowColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="6"
				pathLength="100"
				:stroke-dasharray="dashLength"
				:stroke-dashoffset="dashOffset"
				opacity="0.12"
			/>
			<path
				:d="pathData"
				fill="none"
				:stroke="lineColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2.4"
				pathLength="100"
				:stroke-dasharray="dashLength"
				:stroke-dashoffset="dashOffset"
				class="server-overview-sparkline-line"
			/>
		</svg>
	</div>
</template>

<script setup lang="ts">
import type { ServerOverviewBridgeStatus } from '~/utils/server/overview'

interface Props {
	bridgeStatus: ServerOverviewBridgeStatus
}

interface Point {
	x: number
	y: number
}

const props = defineProps<Props>()

const WIDTH = 240
const HEIGHT = 112
const PADDING_X = 10
const PADDING_TOP = 16
const PADDING_BOTTOM = 18
const MIN_RATIO = 0.18
const MAX_RATIO = 0.84

const dashLength = 100
const dashOffset = ref(dashLength)
const hasMounted = ref(false)

const values = computed(() => {
	const history = props.bridgeStatus.onlineHistory.map(
		(point) => point.onlinePlayers,
	)
	const latest = props.bridgeStatus.onlineCount
	const next = history.length > 0 ? [...history] : [latest]

	if (next.at(-1) !== latest) {
		next.push(latest)
	}

	if (next.length < 2) {
		next.unshift(latest)
	}

	return next
})

const axisMax = computed(() => {
	const max = Math.max(...values.value, 0)
	return Math.max(1, Math.ceil(max * 1.15), 1)
})

const drawableHeight = computed(() => HEIGHT - PADDING_TOP - PADDING_BOTTOM)
const baselineY = computed(
	() => PADDING_TOP + drawableHeight.value * (1 - MIN_RATIO),
)

const points = computed<Point[]>(() => {
	const stepX =
		values.value.length > 1
			? (WIDTH - PADDING_X * 2) / (values.value.length - 1)
			: 0

	return values.value.map((value, index) => {
		const ratio = MIN_RATIO + (value / axisMax.value) * (MAX_RATIO - MIN_RATIO)

		return {
			x: PADDING_X + stepX * index,
			y: PADDING_TOP + drawableHeight.value * (1 - ratio),
		}
	})
})

const pathData = computed(() => {
	const currentPoints = points.value

	if (currentPoints.length === 0) {
		return ''
	}

	if (currentPoints.length === 1) {
		const point = currentPoints[0]
		return point ? `M ${point.x} ${point.y}` : ''
	}

	return currentPoints.reduce((path, point, index) => {
		if (index === 0) {
			return `M ${point.x} ${point.y}`
		}

		const previous = currentPoints[index - 1]
		if (!previous) {
			return path
		}

		const controlX = (previous.x + point.x) / 2
		return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`
	}, '')
})

const baselinePath = computed(
	() =>
		`M ${PADDING_X} ${baselineY.value} L ${WIDTH - PADDING_X} ${baselineY.value}`,
)

const baselineColor = computed(() => {
	if (props.bridgeStatus.connected) {
		return toRgba(16, 185, 129, 0.12)
	}

	if (
		props.bridgeStatus.lastConnectionState === 'ERROR' ||
		props.bridgeStatus.lastConnectionState === 'REJECTED'
	) {
		return toRgba(244, 63, 94, 0.12)
	}

	if (props.bridgeStatus.running || props.bridgeStatus.manualRequired) {
		return toRgba(245, 158, 11, 0.12)
	}

	return toRgba(148, 163, 184, 0.16)
})

const lineColor = computed(() => {
	if (!props.bridgeStatus.enabled) {
		return toRgba(148, 163, 184, 0.55)
	}

	if (props.bridgeStatus.connected) {
		return toRgba(16, 185, 129, 0.82)
	}

	if (
		props.bridgeStatus.lastConnectionState === 'ERROR' ||
		props.bridgeStatus.lastConnectionState === 'REJECTED'
	) {
		return toRgba(244, 63, 94, 0.82)
	}

	if (props.bridgeStatus.running || props.bridgeStatus.manualRequired) {
		return toRgba(245, 158, 11, 0.82)
	}

	return toRgba(148, 163, 184, 0.62)
})

const glowColor = computed(() => {
	if (!props.bridgeStatus.enabled) {
		return toRgba(148, 163, 184, 0.14)
	}

	if (props.bridgeStatus.connected) {
		return toRgba(16, 185, 129, 0.14)
	}

	if (
		props.bridgeStatus.lastConnectionState === 'ERROR' ||
		props.bridgeStatus.lastConnectionState === 'REJECTED'
	) {
		return toRgba(244, 63, 94, 0.14)
	}

	if (props.bridgeStatus.running || props.bridgeStatus.manualRequired) {
		return toRgba(245, 158, 11, 0.14)
	}

	return toRgba(148, 163, 184, 0.14)
})

function toRgba(r: number, g: number, b: number, alpha: number): string {
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const valuesSignature = computed(() => values.value.join(','))

const playReveal = () => {
	dashOffset.value = dashLength

	if (!import.meta.client) {
		return
	}

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			dashOffset.value = 0
		})
	})
}

watch(valuesSignature, () => {
	if (!hasMounted.value) {
		return
	}

	playReveal()
})

onMounted(() => {
	hasMounted.value = true
	playReveal()
})
</script>

<style scoped>
.server-overview-sparkline {
	overflow: hidden;
	mask-image: radial-gradient(
		138% 118% at 100% 0%,
		rgba(0, 0, 0, 0.96) 0%,
		rgba(0, 0, 0, 0.92) 36%,
		rgba(0, 0, 0, 0.56) 68%,
		transparent 100%
	);
	-webkit-mask-image: radial-gradient(
		138% 118% at 100% 0%,
		rgba(0, 0, 0, 0.96) 0%,
		rgba(0, 0, 0, 0.92) 36%,
		rgba(0, 0, 0, 0.56) 68%,
		transparent 100%
	);
}

.server-overview-sparkline-line {
	transition: stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
