<template>
	<article :class="cardClass">
		<UTooltip :disabled="!tooltip" :text="tooltip">
			<NuxtLink v-if="to" :to="to" :class="contentClass">
				<div
					class="absolute top-0 -left-2 right-0 bottom-0 flex items-end justify-end"
				>
					<SkeletonImage
						:src="backgroundSrc"
						:alt="backgroundAlt"
						class="block h-full w-full"
						:image-class="imageClass"
					/>
				</div>
				<div
					class="absolute inset-0 z-10 flex flex-col justify-end bg-[linear-gradient(180deg,rgba(12,18,25,0.04)_0%,rgba(13,20,28,0.1)_65%,rgba(15,22,30,1)_100%)] p-4"
				>
					<div
						class="text-2xl leading-tight truncate font-semibold tracking-tight text-white sm:text-3xl"
					>
						{{ title }}
					</div>
					<div class="text-base leading-relaxed truncate text-white/78">
						{{ description }}
					</div>
				</div>
			</NuxtLink>
			<div v-else :class="contentClass">
				<div
					class="absolute top-0 -left-2 right-0 bottom-0 flex items-end justify-end"
				>
					<SkeletonImage
						:src="backgroundSrc"
						:alt="backgroundAlt"
						class="block h-full w-full"
						:image-class="imageClass"
					/>
				</div>
				<div
					class="absolute inset-0 z-10 flex flex-col justify-end bg-[linear-gradient(180deg,rgba(12,18,25,0.04)_0%,rgba(13,20,28,0.1)_65%,rgba(15,22,30,1)_100%)] p-4"
				>
					<div
						class="text-2xl leading-tight truncate font-semibold tracking-tight text-white sm:text-3xl"
					>
						{{ title }}
					</div>
					<div class="text-base leading-relaxed truncate text-white/78">
						{{ description }}
					</div>
				</div>
			</div>
		</UTooltip>
	</article>
</template>

<script setup lang="ts">
import SkeletonImage from '~/components/common/SkeletonImage.vue'

interface HomeInfoCardProps {
	title: string
	description: string
	backgroundSrc?: string
	backgroundAlt?: string
	backgroundClass?: string
	to?: string
	tooltip?: string
}

const props = withDefaults(defineProps<HomeInfoCardProps>(), {
	backgroundSrc: '',
	backgroundAlt: '',
	backgroundClass: '',
	to: '',
	tooltip: '',
})

const isInteractive = computed(() => Boolean(props.to || props.tooltip))

const cardClass = computed(() => [
	'group relative h-46 overflow-hidden rounded-[1.15rem] border-6 bg-white/80 text-left backdrop-blur-xl transition duration-100 dark:bg-slate-950/80',
	isInteractive.value
		? 'border-slate-400/80 hover:border-slate-500/70 dark:border-slate-800/80 hover:dark:border-slate-700/80'
		: 'border-slate-400/80 dark:border-slate-800/80',
])

const contentClass = computed(() =>
	[
		'relative block h-full w-full overflow-hidden text-left',
		props.to ? 'cursor-pointer' : 'cursor-default',
	].join(' '),
)

const imageClass = computed(() =>
	[
		'select-none block h-full w-full object-cover brightness-[0.85] saturate-[0.95] !transition-all !duration-350',
		isInteractive.value
			? 'lg:group-hover:brightness-100 lg:group-hover:saturate-125 lg:group-hover:translate-x-2 lg:group-hover:scale-[1.02]'
			: '',
		props.backgroundClass,
	]
		.filter(Boolean)
		.join(' '),
)
</script>
