<template>
	<section
		class="relative isolate h-104 w-full overflow-hidden rounded-xl bg-slate-900 sm:h-120 border border-slate-200 dark:border-slate-800"
		@mouseenter="handleUserInteraction"
		@mousemove="handleUserInteraction"
	>
		<BlueMapViewport
			:assets-base-url="assetsBaseUrl ?? ''"
			:initial-distance="1500"
			mode="perspective"
		/>

		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-998 h-2/3 bg-linear-to-t from-slate-500/78 dark:from-slate-950/78 via-transparent dark:via-slate-950/1 to-transparent backdrop-blur-xl mask-[linear-gradient(to_top,black_0%,rgba(0,0,0,0.96)_18%,rgba(0,0,0,0.78)_34%,rgba(0,0,0,0.38)_56%,transparent_100%)]"
		/>

		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-999 flex justify-center px-6 pb-6 sm:px-10 sm:pb-8"
		>
			<div class="flex w-full max-w-3xl flex-col items-center gap-4">
				<Transition name="rule-fade" mode="out-in">
					<div
						:key="currentIndex"
						class="flex w-full flex-col items-center gap-1.5 text-center"
					>
						<div class="flex items-center gap-3">
							<span
								class="font-arkpixel text-2xl leading-none text-primary-300/90 [text-shadow:0_2px_10px_rgba(15,23,42,0.5)]"
							>
								{{ String(currentIndex + 1).padStart(2, '0') }}
							</span>
							<span
								class="font-arkpixel text-2xl leading-tight tracking-wider text-white [text-shadow:0_2px_10px_rgba(15,23,42,0.5)] sm:text-3xl"
							>
								{{ currentRule.title }}
							</span>
						</div>
						<p
							class="max-w-2xl text-sm leading-6 text-white [text-shadow:0_1px_2px_rgba(15,23,42,0.5)]"
						>
							{{ currentRule.desc }}
						</p>
					</div>
				</Transition>

				<div
					class="pointer-events-auto flex items-center gap-3 rounded-full bg-slate-950/40 px-2 py-1.5 backdrop-blur-md"
				>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-chevron-left"
						class="text-white/85 hover:bg-white/12 hover:text-white focus-visible:bg-white/12 active:bg-white/16"
						:aria-label="t('content.intro.participation.prev')"
						@click="goPrev"
					/>
					<div class="flex items-center gap-1.5">
						<button
							v-for="index in RULE_COUNT"
							:key="`participation-dot-${index}`"
							type="button"
							class="block size-1.5 rounded-full transition-all duration-200"
							:class="
								index - 1 === currentIndex
									? 'bg-white'
									: 'bg-white/35 hover:bg-white/60'
							"
							:aria-label="
								t('content.intro.participation.goto', {
									index,
								})
							"
							@click="goTo(index - 1)"
						/>
					</div>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-chevron-right"
						class="text-white/85 hover:bg-white/12 hover:text-white focus-visible:bg-white/12 active:bg-white/16"
						:aria-label="t('content.intro.participation.next')"
						@click="goNext"
					/>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
interface Props {
	assetsBaseUrl?: string | null
}

const props = withDefaults(defineProps<Props>(), {
	assetsBaseUrl: null,
})
const assetsBaseUrl = computed(() => props.assetsBaseUrl?.trim() || null)
const { t } = useI18n()
const RULE_COUNT = 6

const AUTO_PLAY_INTERVAL = 3000
const INTERACTION_PAUSE = 3000

const currentIndex = ref(0)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null
let resumeTimer: ReturnType<typeof setTimeout> | null = null

interface ParticipationRule {
	title: string
	desc: string
}

// 用 t() 按 `rules.${index}.title/desc` 索引取，而非 tm() 取整个数组：
// vue-i18n 的 tm() 对对象数组会返回被处理过的 message，模板里直接渲染会打出 JSON 原文。
const rules = computed<ParticipationRule[]>(() =>
	Array.from({ length: RULE_COUNT }, (_, index) => ({
		title: t(`content.intro.participation.rules.${index}.title`),
		desc: t(`content.intro.participation.rules.${index}.desc`),
	})),
)

const currentRule = computed<ParticipationRule>(
	() => rules.value[currentIndex.value] ?? rules.value[0]!,
)

const stopAutoPlay = () => {
	if (autoPlayTimer) {
		clearInterval(autoPlayTimer)
		autoPlayTimer = null
	}
}

const startAutoPlay = () => {
	stopAutoPlay()
	autoPlayTimer = setInterval(() => {
		currentIndex.value = (currentIndex.value + 1) % RULE_COUNT
	}, AUTO_PLAY_INTERVAL)
}

const clearResumeTimer = () => {
	if (resumeTimer) {
		clearTimeout(resumeTimer)
		resumeTimer = null
	}
}

// 用户交互后：停掉自动播放，重置 10s 恢复计时；10s 内再次交互会刷新计时，持续暂停。
const handleUserInteraction = () => {
	stopAutoPlay()
	clearResumeTimer()
	resumeTimer = setTimeout(() => {
		startAutoPlay()
		resumeTimer = null
	}, INTERACTION_PAUSE)
}

const goNext = () => {
	currentIndex.value = (currentIndex.value + 1) % RULE_COUNT
	handleUserInteraction()
}

const goPrev = () => {
	currentIndex.value = (currentIndex.value - 1 + RULE_COUNT) % RULE_COUNT
	handleUserInteraction()
}

const goTo = (index: number) => {
	currentIndex.value = index
	handleUserInteraction()
}

const teardown = () => {
	stopAutoPlay()
	clearResumeTimer()
}

onMounted(() => {
	startAutoPlay()
})

onBeforeUnmount(() => {
	teardown()
})
</script>

<style scoped>
.rule-fade-enter-active,
.rule-fade-leave-active {
	transition:
		opacity 280ms ease-out,
		transform 320ms cubic-bezier(0.16, 1, 0.3, 1),
		filter 280ms ease-out;
}

.rule-fade-enter-from,
.rule-fade-leave-to {
	opacity: 0;
	filter: blur(2px);
	transform: translateY(6px);
}

.rule-fade-enter-to,
.rule-fade-leave-from {
	opacity: 1;
	filter: blur(0);
	transform: translateY(0);
}
</style>
