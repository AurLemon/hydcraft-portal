<template>
	<section
		class="home-outro-layer isolate w-full overflow-hidden text-white"
		:class="
			mode === 'story'
				? 'absolute inset-0 h-full min-h-160 bg-transparent'
				: 'relative min-h-[96dvh] bg-[var(--color-surface-0)]'
		"
	>
		<div
			class="home-outro-section relative h-full min-h-[96dvh] w-full overflow-hidden"
		>
			<div
				class="home-outro-surface pointer-events-none absolute inset-0 z-0 bg-slate-950/72"
				:style="{ opacity: backgroundProgress }"
			>
				<SkeletonImage
					:src="backgroundSrc"
					:alt="t('home.immersive.outro.screenshotAlt', { index: 1 })"
					class="absolute inset-0 h-full w-full"
					:style="imageStyle"
					image-class="h-full w-full object-cover"
					skeleton-class="rounded-none"
				/>
			</div>

			<div
				class="immersive-site-shell relative z-10 grid min-h-[96dvh] items-center gap-10 py-18 will-change-[opacity,filter,transform] lg:grid-cols-[minmax(0,0.86fr)_minmax(24rem,1.14fr)] lg:gap-16 lg:py-22"
				:style="contentStyle"
			>
				<div class="order-2 max-w-2xl lg:order-1">
					<h2
						class="text-5xl leading-none font-medium drop-shadow-[0_4px_18px_rgba(2,6,23,0.52)] sm:text-6xl lg:text-7xl"
					>
						<span class="block text-3xl sm:inline sm:text-5xl">This is </span>
						<span class="block sm:inline">
							<span class="font-semibold text-hydcraft-red">Hyd</span>
							<span class="font-semibold text-hydcraft-blue">Craft</span>.
						</span>
					</h2>
					<div
						class="mt-6 flex flex-wrap gap-2 text-sm text-white [text-shadow:0_2px_10px_rgba(2,6,23,0.9)]"
					>
						<span
							class="rounded-md border border-white/18 bg-slate-950/72 px-2.5 py-1"
						>
							Minecraft 1.21.1
						</span>
						<span
							class="rounded-md border border-white/18 bg-slate-950/72 px-2.5 py-1"
						>
							NeoForge
						</span>
						<span
							class="rounded-md border border-white/18 bg-slate-950/72 px-2.5 py-1"
						>
							内存 ≥ 16 GB
						</span>
						<span
							class="rounded-md border border-white/18 bg-slate-950/72 px-2.5 py-1"
						>
							八周目
						</span>
					</div>
					<p
						class="mt-5 max-w-xl text-base leading-7 text-white [text-shadow:0_2px_12px_rgba(2,6,23,0.9)] sm:text-lg"
					>
						{{ t('home.immersive.outro.description') }}
					</p>
					<UButton
						type="button"
						color="neutral"
						variant="solid"
						class="mt-7 min-w-44 justify-center !bg-[#ffffff] !text-[#1e293b] hover:!bg-[#f1f5f9]"
						:class="
							outroInteractive ? 'pointer-events-auto' : 'pointer-events-none'
						"
						@click="copyQqGroup"
					>
						<QqLogo aria-hidden="true" class="size-5 shrink-0 fill-current" />
						{{ t('home.immersive.outro.copyQq') }}
					</UButton>
				</div>

				<div
					class="order-1 grid grid-cols-3 gap-2 self-center lg:order-2 lg:mt-0 mt-20"
					:class="
						outroInteractive ? 'pointer-events-auto' : 'pointer-events-none'
					"
				>
					<div
						v-for="(screenshot, index) in screenshots"
						:key="screenshot.src"
						class="group relative overflow-hidden rounded-lg border border-white/18 bg-slate-900/72 shadow-[0_14px_30px_rgba(2,6,23,0.36)]"
						:class="index === 1 ? '-translate-y-5 sm:-translate-y-8' : ''"
					>
						<SkeletonImage
							:src="screenshot.src"
							:alt="screenshot.alt"
							class="h-full w-full"
							image-class="aspect-[3/4] h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.045]"
							skeleton-class="rounded-none"
						/>
						<span
							class="pointer-events-none absolute inset-0 bg-slate-950/0 transition-colors duration-300 ease-out group-hover:bg-slate-950/14"
						/>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import QqLogo from '~/assets/resources/brands/logo_QQ.svg'

export interface HomeOverviewScreenshot {
	src: string
	alt: string
}

interface HomeOutroSectionProps {
	screenshots: readonly HomeOverviewScreenshot[]
	backgroundSrc: string
	mode?: 'story' | 'section'
	progress?: number
}

const props = withDefaults(defineProps<HomeOutroSectionProps>(), {
	mode: 'section',
	progress: 1,
})
const visualProgress = computed(() =>
	props.mode === 'story' ? Math.min(Math.max(props.progress, 0), 1) : 1,
)
const outroInteractive = computed(
	() => props.mode !== 'story' || visualProgress.value >= 0.35,
)
const backgroundProgress = computed(() =>
	props.mode === 'story' ? visualProgress.value : 1,
)
const imageStyle = computed(() => ({
	filter: 'grayscale(0.42) saturate(0.72) brightness(0.84)',
	opacity: 1,
	transform: `translate3d(0, ${(1 - backgroundProgress.value) * 12}px, 0) scale(${1.02 - backgroundProgress.value * 0.02})`,
}))
const contentStyle = computed(() => {
	const progress = props.mode === 'story' ? visualProgress.value : 1

	return {
		opacity: progress,
		filter: `blur(${(1 - progress) * 8}px)`,
		transform: `translate3d(0, ${(1 - progress) * 16}px, 0)`,
	}
})
const { t } = useI18n()
const toast = useToast()
const qqGroupNumber = '895248412'

const copyQqGroup = async (): Promise<void> => {
	try {
		await navigator.clipboard.writeText(qqGroupNumber)
		toast.add({
			title: t('content.intro.joinUs.notifications.copied'),
			color: 'success',
			icon: 'i-lucide-check',
		})
	} catch {
		toast.add({
			title: t('content.intro.joinUs.notifications.copyFailed'),
			color: 'error',
			icon: 'i-lucide-circle-alert',
		})
	}
}
</script>

<style scoped>
.home-outro-surface {
	-webkit-mask-image: linear-gradient(
		to bottom,
		black 0%,
		black 58%,
		rgb(0 0 0 / 0.92) 68%,
		rgb(0 0 0 / 0.62) 80%,
		rgb(0 0 0 / 0.24) 92%,
		transparent 100%
	);
	mask-image: linear-gradient(
		to bottom,
		black 0%,
		black 58%,
		rgb(0 0 0 / 0.92) 68%,
		rgb(0 0 0 / 0.62) 80%,
		rgb(0 0 0 / 0.24) 92%,
		transparent 100%
	);
}
</style>
