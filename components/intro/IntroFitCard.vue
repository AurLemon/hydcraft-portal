<template>
	<section>
		<div class="grid gap-4 md:grid-cols-3 lg:gap-6">
			<div
				class="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:px-5 sm:py-5"
			>
				<div class="pointer-events-none absolute inset-0">
					<div
						class="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(16,185,129,0.14)_0%,rgba(45,212,191,0.08)_45%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.18)_0%,rgba(45,212,191,0.10)_45%,rgba(2,6,23,0)_100%)]"
					/>
					<div
						class="absolute -left-8 top-6 size-24 rounded-full bg-emerald-300/20 blur-2xl dark:bg-emerald-400/15"
					/>
					<div
						class="absolute right-0 top-0 size-28 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-400/10"
					/>
				</div>
				<div class="relative z-10 flex items-center gap-2.5">
					<UIcon
						name="i-lucide-sprout"
						class="size-4 shrink-0 text-emerald-500 sm:size-5"
					/>
					<h3
						class="font-arkpixel text-base leading-tight tracking-wide text-emerald-600 dark:text-emerald-300 sm:text-xl"
					>
						{{ fitColumnTitle }}
					</h3>
				</div>
				<ul class="relative z-10 flex flex-col gap-2">
					<li
						v-for="(item, index) in fitItems"
						:key="`intro-fit-good-${index}`"
						class="flex gap-2 text-base leading-8 sm:gap-2.5"
					>
						<UIcon
							name="i-lucide-check"
							class="mt-1.5 size-4 shrink-0 text-emerald-500 sm:size-5"
						/>
						<span>{{ item }}</span>
					</li>
				</ul>
			</div>

			<div
				class="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:px-5 sm:py-5"
			>
				<div class="pointer-events-none absolute inset-0">
					<div
						class="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(100,116,139,0.16)_0%,rgba(148,163,184,0.08)_50%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(100,116,139,0.20)_0%,rgba(148,163,184,0.10)_50%,rgba(2,6,23,0)_100%)]"
					/>
					<div
						class="absolute -left-10 top-5 size-24 rounded-full bg-slate-300/20 blur-2xl dark:bg-slate-400/10"
					/>
					<div
						class="absolute right-2 top-2 size-24 rounded-full bg-zinc-300/15 blur-3xl dark:bg-slate-300/10"
					/>
				</div>
				<div class="relative z-10 flex items-center gap-2.5">
					<UIcon
						name="i-lucide-ban"
						class="size-4 shrink-0 text-slate-400 sm:size-5"
					/>
					<h3
						class="font-arkpixel text-base leading-tight tracking-wide text-slate-600 dark:text-slate-300 sm:text-xl"
					>
						{{ unfitColumnTitle }}
					</h3>
				</div>
				<ul class="relative z-10 flex flex-col gap-2">
					<li
						v-for="(item, index) in unfitItems"
						:key="`intro-fit-bad-${index}`"
						class="flex gap-2 text-base leading-8 sm:gap-2.5"
					>
						<UIcon
							name="i-lucide-minus"
							class="mt-1.5 size-4 shrink-0 text-slate-400 sm:size-5"
						/>
						<span>{{ item }}</span>
					</li>
				</ul>
			</div>

			<div
				class="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 py-4 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:px-5 sm:py-5"
			>
				<div class="pointer-events-none absolute inset-0">
					<div
						class="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(244,63,94,0.16)_0%,rgba(251,113,133,0.08)_45%,rgba(255,255,255,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(244,63,94,0.22)_0%,rgba(251,113,133,0.10)_45%,rgba(2,6,23,0)_100%)]"
					/>
					<div
						class="absolute -left-8 top-4 size-24 rounded-full bg-rose-300/20 blur-2xl dark:bg-rose-400/15"
					/>
					<div
						class="absolute right-0 top-0 size-28 rounded-full bg-orange-300/15 blur-3xl dark:bg-red-400/10"
					/>
				</div>
				<div class="relative z-10 flex items-center gap-2.5">
					<h3
						class="flex items-center gap-2.5 font-arkpixel text-base leading-tight tracking-wide text-rose-600 dark:text-rose-300 sm:text-xl"
					>
						<UIcon
							name="i-lucide-shield-check"
							class="size-4 shrink-0 text-rose-500 sm:size-5"
						/>
						{{ baselineTitle }}
					</h3>
					<UButton
						:to="charterLinkTo"
						color="error"
						variant="link"
						size="xs"
						trailing-icon="i-lucide-arrow-right"
						class="ml-auto shrink-0"
					>
						{{ charterLinkLabel }}
					</UButton>
				</div>
				<ul class="relative z-10 flex flex-col gap-2">
					<li
						v-for="(item, index) in baselineItems"
						:key="`intro-fit-baseline-${index}`"
						class="flex gap-2 text-base leading-8 sm:gap-2.5"
					>
						<UIcon
							name="i-lucide-minus"
							class="mt-1.5 size-4 shrink-0 text-rose-400 sm:size-5"
						/>
						<span>{{ item }}</span>
					</li>
				</ul>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const FIT_COUNT = 5
const UNFIT_COUNT = 5
const BASELINE_COUNT = 3

// 与 IntroParticipationMapClient 一致：用 t() 按索引取值，避免 tm() 对数组返回处理过的 message。
const fitColumnTitle = computed(() => t('content.intro.fit.fitColumn.title'))
const unfitColumnTitle = computed(() =>
	t('content.intro.fit.unfitColumn.title'),
)
const baselineTitle = computed(() => t('content.intro.fit.baseline.title'))
const charterLinkLabel = computed(() =>
	t('content.intro.fit.baseline.charterLinkLabel'),
)
const charterLinkTo = computed(() => localePath('/server/community-covenant'))

const fitItems = computed(() =>
	Array.from({ length: FIT_COUNT }, (_, index) =>
		t(`content.intro.fit.fitColumn.items.${index}`),
	),
)
const unfitItems = computed(() =>
	Array.from({ length: UNFIT_COUNT }, (_, index) =>
		t(`content.intro.fit.unfitColumn.items.${index}`),
	),
)
const baselineItems = computed(() =>
	Array.from({ length: BASELINE_COUNT }, (_, index) =>
		t(`content.intro.fit.baseline.items.${index}`),
	),
)
</script>
