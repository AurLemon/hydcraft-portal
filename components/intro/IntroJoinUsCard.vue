<template>
	<article
		class="relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
	>
		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_28%)]"
		/>
		<div
			class="relative flex flex-col gap-6 backdrop-blur-xl px-6 py-6 sm:px-8 sm:py-8"
		>
			<div class="max-w-3xl">
				<h3
					class="font-arkpixel text-2xl leading-tight tracking-wide text-slate-950 dark:text-slate-50 sm:text-3xl"
				>
					{{ t('content.intro.joinUs.title') }}
				</h3>
			</div>

			<div class="flex flex-col items-start gap-3">
				<UButton
					class="select-none text-white"
					variant="solid"
					size="lg"
					@click="handleJoinGroup"
				>
					<img
						:src="qqLogoUrl"
						alt="QQ"
						class="size-5 shrink-0 filter-[invert(1)]"
					/>
					<span class="leading-[normal]"
						>{{ t('content.intro.joinUs.actions.qq') }}
						{{ qqGroupNumber }}</span
					>
				</UButton>

				<div
					class="flex flex-col text-xs leading-6 text-slate-700/88 dark:text-slate-200/78"
				>
					<p>
						<span class="mr-1 select-none">*</span
						>{{ t('content.intro.joinUs.notes.client') }}
					</p>
					<p>
						<span class="mr-1 select-none">*</span
						>{{ t('content.intro.joinUs.notes.source') }}
					</p>
				</div>
			</div>
		</div>
	</article>
</template>

<script setup lang="ts">
import qqLogoUrl from '~/assets/resources/brands/logo_QQ.svg'

const qqGroupNumber = '895248412'

const { t } = useI18n()
const toast = useToast()

const handleJoinGroup = async (): Promise<void> => {
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
