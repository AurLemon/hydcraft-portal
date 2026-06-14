<template>
	<form class="space-y-5" @submit.prevent="submit">
		<div v-if="!embedded">
			<NuxtLink
				:to="localePath('/login')"
				class="inline-flex w-fit items-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-500 dark:text-sky-300 dark:hover:text-sky-200"
			>
				<UIcon name="i-lucide-arrow-left" class="size-4" />
				{{ t('forgotPassword.actions.backToLogin') }}
			</NuxtLink>
		</div>

		<div v-if="!embedded">
			<h1
				class="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white"
			>
				{{ t('forgotPassword.title') }}
			</h1>
			<p class="text-sm leading-6 text-slate-600 dark:text-slate-300/80">
				{{ t('forgotPassword.description') }}
			</p>
		</div>

		<label
			class="flex flex-col gap-1.5 text-sm font-medium text-slate-800 dark:text-slate-100"
		>
			<span>{{ t('forgotPassword.fields.email') }}</span>
			<UInput
				v-model="form.email"
				type="email"
				required
				autocomplete="email"
				:placeholder="t('forgotPassword.placeholders.email')"
				size="lg"
				variant="outline"
			/>
		</label>

		<CapWidget ref="captchaWidgetRef" v-model="captcha.token.value" />

		<UButton
			type="submit"
			icon="i-lucide-mail"
			:loading="submitting"
			:disabled="submitDisabled"
			size="lg"
			class="w-full justify-center"
		>
			{{ t('forgotPassword.actions.submit') }}
		</UButton>
	</form>
</template>

<script setup lang="ts">
interface ForgotPasswordFormProps {
	embedded?: boolean
}

interface ForgotPasswordFormState {
	email: string
}

withDefaults(defineProps<ForgotPasswordFormProps>(), {
	embedded: false,
})

const localePath = useLocalePath()
const { locale } = useI18n()
const { requestPasswordReset } = usePortalAuth()
const { notifyError, notifySuccess } = useAdminToast()
const submitting = ref(false)
const captcha = useCap(true)
const captchaWidgetRef = ref<{ reset: () => void } | null>(null)
const form = reactive<ForgotPasswordFormState>({
	email: '',
})
const normalizedEmail = computed(() => form.email.trim())
const submitDisabled = computed(
	() => !normalizedEmail.value || !captcha.token.value || submitting.value,
)

const resetCaptcha = (): void => {
	captcha.reset(true)
	captchaWidgetRef.value?.reset()
}

const submit = async (): Promise<void> => {
	if (submitDisabled.value) {
		return
	}

	submitting.value = true

	try {
		await requestPasswordReset({
			email: normalizedEmail.value,
			locale: locale.value,
			captchaToken: captcha.consumeToken(),
		})
		resetCaptcha()
		notifySuccess({
			title: t('forgotPassword.notifications.successTitle'),
			description: t('forgotPassword.notifications.successDescription'),
		})
	} catch (error) {
		resetCaptcha()
		notifyError(error, {
			title: t('forgotPassword.notifications.failedTitle'),
			description: t('forgotPassword.notifications.failedDescription'),
		})
	} finally {
		submitting.value = false
	}
}
</script>
