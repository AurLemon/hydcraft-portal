<template>
	<article
		class="group relative h-46 overflow-hidden rounded-[1.15rem] border-6 border-slate-400/80 hover:border-slate-500/70 dark:border-slate-800/80 hover:dark:border-slate-700/80 bg-white/80 dark:bg-slate-950/80 text-left backdrop-blur-xl transition duration-100"
	>
		<div
			class="absolute top-0 -left-2 right-0 bottom-0 flex items-end justify-end"
		>
			<img
				:src="backgroundSrc"
				:alt="backgroundAlt"
				class="select-none block object-cover brightness-[0.85] saturate-[0.95] transition duration-350 lg:group-hover:brightness-100 lg:group-hover:saturate-125 lg:group-hover:translate-x-2 lg:group-hover:scale-[1.02]"
				:class="backgroundClass"
				draggable="false"
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
	</article>
</template>

<script setup lang="ts">
withDefaults(
	defineProps<{
		title: string
		description: string
		backgroundSrc?: string
		backgroundAlt?: string
		backgroundClass?: string
	}>(),
	{
		backgroundSrc: '',
		backgroundAlt: '',
		backgroundClass: '',
	},
)
</script>
