<template>
	<div class="space-y-3">
		<div
			class="flex items-center gap-3 text-xs text-slate-500 dark:text-white/45"
		>
			<span class="h-px flex-1 bg-slate-200 dark:bg-white/12" />
			<span>{{ t('auth.providers.divider') }}</span>
			<span class="h-px flex-1 bg-slate-200 dark:bg-white/12" />
		</div>

		<div
			class="flex items-start gap-3 rounded-md border border-sky-300/45 bg-sky-50/85 px-4 py-3 text-sm text-slate-700 shadow-[0_0_28px_rgba(56,189,248,0.08)] dark:border-sky-300/35 dark:bg-sky-400/8 dark:text-slate-100"
		>
			<UIcon
				name="i-lucide-info"
				class="mt-0.5 size-5 shrink-0 text-sky-500 dark:text-sky-300"
			/>
			<p class="leading-6 text-slate-600 dark:text-slate-200/85">
				{{ t('auth.providers.placeholder') }}
			</p>
		</div>
	</div>
</template>
