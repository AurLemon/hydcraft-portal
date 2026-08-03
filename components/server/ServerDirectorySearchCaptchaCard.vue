<template>
	<div
		class="grid gap-4 rounded-lg border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-950/70"
	>
		<div class="grid gap-1">
			<h2 class="text-base font-medium text-slate-900 dark:text-white">
				{{ title }}
			</h2>
			<p class="text-sm leading-6 text-slate-500 dark:text-slate-400">
				{{ description }}
			</p>
		</div>

		<div class="max-w-md">
			<TurnstileWidget
				ref="captchaWidgetRef"
				v-model="captcha.token.value"
				:action="TURNSTILE_ACTIONS.DIRECTORY_SEARCH"
			/>
		</div>

		<div class="flex flex-wrap items-center gap-3">
			<span
				v-if="submitting"
				class="text-sm text-slate-500 dark:text-slate-400"
			>
				{{ $t('content.serverOverview.directories.searchCaptcha.verifying') }}
			</span>
			<span v-if="errorMessage" class="text-sm text-red-600 dark:text-red-300">
				{{ errorMessage }}
			</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { TURNSTILE_ACTIONS } from '~/utils/security/turnstile-actions'
interface ServerDirectorySearchCaptchaCardProps {
	title: string
	description: string
}

defineProps<ServerDirectorySearchCaptchaCardProps>()

const emit = defineEmits<{
	verified: []
}>()

const { getErrorMessage } = useApiError()
const captcha = useTurnstile(true)
const captchaWidgetRef = captcha.widgetRef
const submitting = ref(false)
const errorMessage = ref('')

const submit = async (): Promise<void> => {
	if (!captcha.token.value || submitting.value) {
		return
	}

	submitting.value = true
	errorMessage.value = ''

	try {
		await $fetch('/api/public/server/search-access', {
			method: 'POST',
			body: {
				captchaToken: captcha.consumeToken(),
			},
		})

		captcha.reset(true)
		emit('verified')
	} catch (error) {
		errorMessage.value = getErrorMessage(error)
		captcha.reset(true)
	} finally {
		submitting.value = false
	}
}

watch(
	() => captcha.token.value,
	async (token) => {
		if (!token || submitting.value) {
			return
		}

		await submit()
	},
)
</script>
