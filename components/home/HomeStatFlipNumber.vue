<template>
	<span class="home-stat-number" :aria-label="formattedValue">
		<span
			v-for="(digit, index) in digits"
			:key="`${digits.length}-${index}`"
			class="home-stat-digit"
			aria-hidden="true"
		>
			<span
				class="home-stat-digit__reel"
				:style="{
					transform: `translate3d(0, -${Number(digit) * digitStepEm}em, 0)`,
					transitionDelay: `${index * 35}ms`,
				}"
			>
				<span
					v-for="digitCharacter in digitCharacters"
					:key="digitCharacter"
					class="home-stat-digit__value"
				>
					{{ digitCharacter }}
				</span>
			</span>
		</span>
	</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface HomeStatFlipNumberProps {
	value: number
}

const props = defineProps<HomeStatFlipNumberProps>()
const digitCharacters = Array.from({ length: 10 }, (_, index) => `${index}`)
const digitStepEm = 1.2
const displayedValue = ref(0)
let revealTimer: ReturnType<typeof setTimeout> | null = null

const normalizeValue = (value: number): number =>
	Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
const formattedValue = computed(() => String(normalizeValue(props.value)))
const digits = computed(() =>
	String(displayedValue.value)
		.padStart(formattedValue.value.length, '0')
		.split(''),
)

onMounted(() => {
	revealTimer = setTimeout(() => {
		displayedValue.value = normalizeValue(props.value)
		revealTimer = null
	}, 560)
})

watch(
	() => props.value,
	(value) => {
		if (revealTimer) return
		displayedValue.value = normalizeValue(value)
	},
)

onBeforeUnmount(() => {
	if (revealTimer) clearTimeout(revealTimer)
})
</script>

<style scoped>
.home-stat-number {
	display: inline-flex;
	font-variant-numeric: tabular-nums;
	font-feature-settings: 'tnum';
}

.home-stat-digit {
	display: inline-block;
	width: 0.62em;
	height: 1.2em;
	overflow: hidden;
	overflow: clip;
	clip-path: inset(0);
	contain: paint;
	line-height: 1.2em;
	text-align: center;
	vertical-align: -0.16em;
}

.home-stat-digit__reel {
	display: flex;
	flex-direction: column;
	line-height: 1.2em;
	transition: transform 650ms cubic-bezier(0.22, 1, 0.36, 1);
	will-change: transform;
}

.home-stat-digit__value {
	display: block;
	width: 100%;
	height: 1.2em;
	line-height: 1.2em;
	text-align: center;
}

@media (prefers-reduced-motion: reduce) {
	.home-stat-digit__reel {
		transition: none;
	}
}
</style>
